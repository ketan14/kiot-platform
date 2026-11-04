# KIOT Industrial – Factory & Machine Monitoring Guide

KIOT Industrial provides operational visibility into manufacturing facilities, workshops, and fabrication plants.

---

## 1. Machine Operating Statuses

Each registered machine reflects its real-time operating state:

- 🟢 **Running:** Machine is actively producing parts (spindle turning, current flowing, or digital run signal high).
- 🔴 **Stopped:** Machine is intentionally paused, idle between shifts, or in setup.
- 🟡 **Abnormal:** Sensor thresholds exceeded (e.g. high motor temperature, abnormal vibration, or low coolant level).
- ⚪ **Offline:** Machine power is cut or edge monitoring node is disconnected.

---

## 2. Tracking Operating Hours & Downtime

The platform records runtime hours and status changes automatically:
- **Operating Hours:** Cumulative hours the machine has spent in the `running` state. Used to plan scheduled maintenance intervals (e.g. lubrication every 200 hours).
- **Last Status Change:** Exact timestamp when the machine last transitioned between running and stopped.
- **Downtime Logs:** Records start time, duration, and operator-entered downtime reasons (e.g. *Tool Change*, *Material Starvation*, *Breakdown*).

---

## 3. Real-Time Telemetry & Historical Trends

### Real-Time Live State (Hot Cache):
- Sensor readings (Spindle RPM, Bearing Temperature, Active Power kW) update instantly on the dashboard with sub-second latency via WebSocket streams.
- The latest reading is always accessible even if historical reporting is loading.

### Historical Trend Analysis:
- Charts display aggregated continuous rollups (1-minute, 15-minute, or 1-hour intervals).
- Allows analyzing shift-by-shift energy consumption, temperature spikes, and speed variations over days or weeks.

---

## 4. Sending Machine Control Commands

Authorized operators and managers can issue control commands directly from the dashboard:

1. Navigate to the target machine or device.
2. Select the command action (e.g., *Set Relays*, *Adjust Sampling Rate*, *Trigger Calibration*).
3. The platform dispatches the command with an expiration TTL (Time-To-Live).
4. The dashboard displays the command lifecycle:
   $$\text{PENDING} \longrightarrow \text{SENT} \longrightarrow \text{ACKNOWLEDGED} \longrightarrow \text{SUCCEEDED}$$

