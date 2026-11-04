# IoT Device Ingestion Worker Pipeline

The Device Ingestion Worker (`services/device-worker`) constitutes the **Data Plane** of the KIOT Platform. It handles high-throughput MQTT ingestion, payload normalization, in-memory batch buffering, TimescaleDB persistence, and Redis cache synchronization.

---

## 1. High-Throughput Pipeline

```
[ Edge Devices & Gateways ]
             │
             │ MQTT over TLS (8883)
             ▼
      [ EMQX Broker ]
             │
             │ Shared Subscriptions ($share/ingestion_group/...)
             ▼
     [ Device Worker ]
             │
             ├─► In-Memory Buffer ──► Bulk Insert (250ms / 500 rows) ──► TimescaleDB
             ├─► Hot State Cache ──► HSET ──────────────────────────────► Redis (`device:{id}:latest`)
             ├─► Live Push ────────► PUBLISH ───────────────────────────► Redis Pub/Sub (`org:{id}:telemetry`)
             └─► Device Heartbeat ─► UPDATE ────────────────────────────► PostgreSQL (`status='online'`)
```

---

## 2. Topic Architecture & Shared Subscriptions

The worker subscribes to three topic hierarchies using EMQX Shared Subscriptions. This allows horizontal scaling of worker instances without message duplication:

| Shared Subscription Topic Pattern | Purpose |
|---|---|
| `$share/ingestion_group/kiot/+/devices/+/telemetry` | High-frequency sensor telemetry readings. |
| `$share/ingestion_group/kiot/+/devices/+/state` | Device shadow reported state updates. |
| `$share/ingestion_group/kiot/+/devices/+/commands/+/ack` | Edge device command execution acknowledgements. |

### Concrete Topic Examples:
- **Telemetry:** `kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-001/telemetry`
- **State Sync:** `kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-001/state`
- **Command Dispatch:** `kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-001/commands`
- **Command ACK:** `kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-001/commands/{command_id}/ack`

---

## 3. In-Memory Batch Buffer

To protect PostgreSQL and TimescaleDB from disk I/O exhaustion under high message rates (e.g. 5,000+ msgs/sec), the worker buffers readings in memory:

```typescript
// services/device-worker/src/buffer.ts
export class TelemetryBatchBuffer {
  // Flushes when queue reaches 500 items OR every 250 milliseconds
  constructor(
    private readonly maxSize: number = 500,
    private readonly flushIntervalMs: number = 250
  ) {}
}
```

- When the flush triggers, a single multi-row `INSERT INTO telemetry_readings (...) VALUES (...), (...) ON CONFLICT DO NOTHING;` is executed.
- If a database failure occurs, items are safely preserved in the queue and retried to eliminate data loss.

---

## 4. Device Shadow Synchronization

When an edge node publishes its reported state to `.../state`:
1. The worker fetches the `desired` state JSON from the database.
2. It calculates the `delta` between reported and desired values.
3. It increments the shadow `version` and writes the record to `device_shadows`.
4. It refreshes the device's `last_seen_at` heartbeat timestamp.

---

## 5. Command Acknowledgment Handling

When an edge node finishes executing a command, it publishes an acknowledgement to `.../commands/{commandId}/ack`:
- **`status: "SUCCEEDED"`:** Sets `device_commands.status = 'SUCCEEDED'` and records `completed_at = now()`.
- **`status: "FAILED"`:** Sets `status = 'FAILED'`, records the `error_message`, and updates `completed_at`.
- **`status: "ACKNOWLEDGED"`:** Updates `status = 'ACKNOWLEDGED'` and records `acknowledged_at = now()`.

