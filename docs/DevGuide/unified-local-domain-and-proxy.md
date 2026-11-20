# KIOT Platform - Unified Local Domain & Reverse Proxy Guide (`http://kiot.local:40000`)

This guide explains the unified reverse proxy architecture for the KIOT platform, which consolidates all microservices under a single local domain (**`http://kiot.local:40000`**) using an **Nginx API Gateway**.

---

## 1. Why Unified Gateway on Port `40000`?

In traditional microservices development, developers must juggle multiple ports:
- Frontend on `:5173`
- REST API on `:3000`
- WebSocket Gateway on `:3001`
- Adminer Database UI on `:8085`
- EMQX Console on `:18083`

### Advantages of the Unified Gateway:
1. **Single Entrypoint:** Access the entire platform via **`http://kiot.local:40000`**.
2. **Zero CORS Issues:** Frontend and API share the exact same origin (`http://kiot.local:40000`), eliminating CORS preflight errors and cross-origin WebSocket blocks.
3. **Zero Port Collisions with Other Projects:** While projects like WealthNest run on `:30000`, KIOT is assigned to **`:40000`**. Both full-stack platforms can run concurrently on the same workstation without conflicts.
4. **LAN / Mobile Tablet Ready:** Plant floor engineers can test dashboards on mobile devices or iPad tablets on the local Wi-Fi without configuring separate firewalls for 5 different ports.

---

## 2. Architecture & Service Routing Matrix

```mermaid
flowchart TD
    Client["Browser / Mobile / Tablet\nhttp://kiot.local:40000"] --> Nginx["Nginx Reverse Proxy Container\n(kiot-proxy-dev :40000)"]

    subgraph "Unified Gateway Routes (Port 40000)"
        Nginx -->|"/"| Vite["Industrial Portal (React 19 + Vite HMR)\nhost:5173"]
        Nginx -->|"/v1/"| API["Fastify REST API\nhost:3000"]
        Nginx -->|"/docs"| Docs["Swagger OpenAPI Docs\nhost:3000/docs"]
        Nginx -->|"/ws"| WS["Live Telemetry WebSocket Gateway\nhost:3001"]
        Nginx -->|"/adminer/"| Adminer["Adminer Database Web UI\nadminer:8080"]
        Nginx -.->|"/emqx" (302 Redirect)| EMQX_Dash["EMQX Dashboard\n:18083"]
    end

    subgraph "Dedicated Infrastructure Ports"
        EMQX_Broker["EMQX MQTT Broker: 1883 (TCP) / 8883 (TLS)"]
        Timescale["PostgreSQL + TimescaleDB: 5432"]
        Redis["Redis Cache & Pub/Sub: 6380"]
    end
```

### Routing Table

| Route / Subpath | Target Internal Service | Purpose |
| :--- | :--- | :--- |
| **`/`** | `host.docker.internal:5173` | Industrial Frontend Portal with Vite HMR |
| **`/v1/`** | `host.docker.internal:3000` | Fastify REST API endpoints |
| **`/docs`** | `host.docker.internal:3000/docs` | Interactive Swagger API documentation |
| **`/ws`** | `host.docker.internal:3001` | Real-time WebSocket telemetry stream |
| **`/adminer/`** | `http://adminer:8080/` | Database management UI (phpMyAdmin equivalent) |
| **`/emqx`** | Redirects to `:18083` | EMQX MQTT management console |

---

## 3. Quick Start

### Step 1: Configure Local Domain & Windows Port Forwarding (One-Time)
Run the automated LAN and hosts setup script:
```bash
./scripts/setup-lan.sh
# (or: pnpm setup:lan)
```
*This prompts a Windows Administrator UAC prompt that automatically adds `127.0.0.1 kiot.local` to `C:\Windows\System32\drivers\etc\hosts`, configures `netsh interface portproxy` for port 40000, and enables inbound firewall rules.*

> [!TIP]
> If you prefer manual configuration, simply append `127.0.0.1 kiot.local` to your Windows `hosts` file (`C:\Windows\System32\drivers\etc\hosts`) and your WSL `/etc/hosts`.

---

### Step 2: Start Backing Services & Gateway
Start all Docker containers (PostgreSQL, TimescaleDB, Redis, EMQX, Adminer, and Nginx Proxy):
```bash
pnpm start
# (or: ./scripts/start.sh)
```

---

### Step 3: Start Application Microservices
Launch the frontend and backend services:
```bash
pnpm dev
```

---

### Step 4: Open in Browser
Visit the unified URL:
👉 **[http://kiot.local:40000](http://kiot.local:40000)**

---

## 4. Mobile & Tablet LAN Access

When testing on a tablet or phone connected to the same Wi-Fi network:
1. Run `./scripts/setup-lan.sh` on your workstation.
2. Note your workstation's Wi-Fi IPv4 address (printed by the script, e.g. `192.168.1.15`).
3. Open `http://<YOUR_WIFI_IP>:40000` on your mobile device.

The Nginx proxy and Vite server are pre-configured with:
- `allowedHosts: true` (prevents Vite 6 HTTP Host header rejection)
- WebSocket telemetry auto-negotiation (`window.location.host/ws`)

---

## 5. Technical Implementation Files

- **Nginx Configuration:** [`infrastructure/docker/nginx.conf`](file:///home/ketan/projects/Krisha/kiot-platform/infrastructure/docker/nginx.conf)
- **Docker Compose:** [`infrastructure/docker/docker-compose.dev.yml`](file:///home/ketan/projects/Krisha/kiot-platform/infrastructure/docker/docker-compose.dev.yml) (`kiot-proxy-dev` service)
- **Vite Config:** [`apps/industrial/vite.config.ts`](file:///home/ketan/projects/Krisha/kiot-platform/apps/industrial/vite.config.ts) (`allowedHosts: true`, HMR `clientPort`)
- **WebSocket Hook:** [`apps/industrial/src/hooks/useRealtimeTelemetry.ts`](file:///home/ketan/projects/Krisha/kiot-platform/apps/industrial/src/hooks/useRealtimeTelemetry.ts) (auto-routes through `/ws`)
- **Setup Scripts:** 
  - [`scripts/setup-lan.sh`](file:///home/ketan/projects/Krisha/kiot-platform/scripts/setup-lan.sh)
  - [`scripts/setup-lan-portproxy.ps1`](file:///home/ketan/projects/Krisha/kiot-platform/scripts/setup-lan-portproxy.ps1)
  - [`scripts/start.sh`](file:///home/ketan/projects/Krisha/kiot-platform/scripts/start.sh)
  - [`scripts/stop.sh`](file:///home/ketan/projects/Krisha/kiot-platform/scripts/stop.sh)

---

## 6. Shutdown
To stop the platform and release all ports:
```bash
pnpm stop
# (or: ./scripts/stop.sh)
```
