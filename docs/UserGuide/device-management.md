# Device Onboarding & Fleet Management Guide

This comprehensive guide provides a step-by-step walkthrough for onboarding new edge IoT microcontrollers (ESP32, Linux Gateways, Modbus devices), configuring MQTT topics, and managing your fleet.

---

## Method 1: Web UI Onboarding Wizard (Recommended)

The easiest way to register hardware is through the **Industrial Portal UI**.

### Step 1: Open the Device Portal
1. Open your browser and navigate to:
   ```
   http://localhost:5173/
   ```
2. In the left sidebar, click **"Device Portal & Admin"**.
3. In the top-right corner of the portal, click the **"+ Onboard New Device"** button.

---

### Step 2: Hardware Identity (Wizard Step 1)
Fill out the physical specifications of your hardware:
- **Device Identifier (ID):** Enter a unique alphanumeric uppercase identifier (e.g., `DEV-ESP32-003`). This ID becomes part of the device's MQTT publish and subscribe topics.
- **Friendly Name:** A human-readable label (e.g., `Stamping Press #3 Vibration Sensor`).
- **Product Domain:**
  - `Industrial Machinery (IIoT)` (default)
  - `Energy & Power Metering`
  - `Cold Storage & HVAC`
  - `Home Automation`
- **Hardware Architecture:** Select `ESP32 Dual-Core (FreeRTOS)`, `Linux Edge Gateway`, or `Third-Party Modbus / RS485`.
- **Hardware Serial Number:** Factory engraved serial (e.g., `SN-ESP32-992384`).
- **Initial Firmware Version:** Defaults to `1.0.0` or enter your build version (e.g., `1.2.0`).

Click **"Continue to Topology →"**.

---

### Step 3: Factory Topology Assignment (Wizard Step 2)
Map the device to your physical manufacturing plant:
- **Factory Location:** Select the target Site, Building, or Production Line (e.g., `[LINE] Production Line 1`).
- **Assigned Gateway (Optional):** If traffic routes through an on-premise Linux edge gateway aggregator, select it; otherwise leave as *Direct Wi-Fi / Cloud Connection*.
- **Telemetry Sampling Rate:** Loop frequency in milliseconds (e.g., `1000` = 1Hz, `100` = 10Hz).

Click **"Complete Onboarding & Generate Credentials"**.

---

### Step 4: Copy MQTT Provisioning Credentials (Wizard Step 3)
The cloud instantly creates the hardware entry and initializes an empty **Device Shadow** (`desired: {}`, `reported: {}`, `version: 1`).

You will be presented with the generated MQTT connection parameters:

| Parameter | Generated Value Example |
|---|---|
| **Broker URL** | `mqtt://localhost:1883` |
| **Client ID** | `kiot-DEV-ESP32-003` |
| **Telemetry Topic** | `kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-003/telemetry` |
| **Commands Topic** | `kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-003/commands` |
| **Shadow Update Topic** | `kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-003/shadow/update` |

Click **"Copy JSON"** to copy the flash configuration block (`device_config.json`) into your clipboard, then click **"Close & View in Fleet"**.

---

## Method 2: Programmatic REST API Onboarding

For automated assembly lines, bulk provisioning, or factory test benches, devices can be onboarded via curl or HTTP scripts.

### Step 1: Send the Provisioning Request
Run the following curl command:

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-KIOT-Organization-Id: 00000000-0000-4000-a000-000000000001" \
  -d '{
    "id": "DEV-ESP32-003",
    "name": "Hydraulic Stamping Press Sensor",
    "productId": "industrial",
    "hardwareType": "esp32",
    "hardwareSerial": "SN-ESP32-992384",
    "locationId": "00000000-0000-4000-e000-000000000003",
    "firmwareVersion": "1.0.0",
    "metadata": {
      "samplingRateMs": 1000,
      "installedBy": "Automation Team"
    }
  }' \
  "http://localhost:3000/v1/devices"
```

### Step 2: Receive Confirmation & Provisioning Profile
The API returns HTTP status `201 Created` with the registered device record and MQTT credentials:

```json
{
  "device": {
    "id": "DEV-ESP32-003",
    "organization_id": "00000000-0000-4000-a000-000000000001",
    "product_id": "industrial",
    "name": "Hydraulic Stamping Press Sensor",
    "hardware_type": "esp32",
    "hardware_serial": "SN-ESP32-992384",
    "status": "offline",
    "created_at": "2026-11-04T07:31:28.384Z"
  },
  "provisioning": {
    "mqtt": {
      "brokerUrl": "mqtt://localhost:1883",
      "clientId": "kiot-DEV-ESP32-003",
      "telemetryTopic": "kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-003/telemetry",
      "commandsTopic": "kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-003/commands",
      "shadowGetTopic": "kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-003/shadow/get",
      "shadowUpdateTopic": "kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-003/shadow/update"
    }
  }
}
```

---

## Hardware Configuration & Simulator Connection

### Option A: Real ESP32 Microcontroller
Save the copied JSON payload into the ESP32 SPIFFS filesystem or embed it into your FreeRTOS firmware header:

```c
#define MQTT_BROKER_URI    "mqtt://192.168.1.100:1883"
#define MQTT_CLIENT_ID     "kiot-DEV-ESP32-003"
#define MQTT_TELEMETRY_TOPIC "kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-003/telemetry"
```

Once powered and connected to Wi-Fi, the device publishes JSON telemetry packets:
```json
{
  "device_id": "DEV-ESP32-003",
  "timestamp": "2026-11-04T07:35:00.000Z",
  "metrics": {
    "vibration_rms": 1.45,
    "temperature": 52.3,
    "hydraulic_pressure": 142.8
  }
}
```

### Option B: Virtual Edge Simulator
To simulate the newly onboarded device immediately without hardware, publish a test packet via MQTT CLI or Node script:

```bash
docker exec -i kiot-emqx-dev emqx_ctl pub \
  -t "kiot/00000000-0000-4000-a000-000000000001/devices/DEV-ESP32-003/telemetry" \
  -m '{"device_id":"DEV-ESP32-003","timestamp":"2026-11-04T07:35:00Z","metrics":{"vibration_rms":1.2,"temperature":48.5}}'
```

---

## Verifying Onboarding

### 1. In the Web UI
- Navigate to **"Device Portal & Admin"** $\rightarrow$ **"Device Fleet & Provisioning"**.
- Your newly onboarded device appears with its status pill, serial number, and firmware version.
- Click **"Credentials"** at any time to re-inspect or copy MQTT parameters.

### 2. In Adminer Database Browser
- Open: `http://localhost:8085/?pgsql=postgres&username=postgres&db=kiot_dev`
- **Table `devices`:** Verify the row with `id = 'DEV-ESP32-003'` and its assigned `location_id`.
- **Table `device_shadows`:** Verify the initialized shadow record (`version: 1`, `desired: {}`, `reported: {}`).
