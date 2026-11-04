# Device & Gateway Management Guide

This guide describes how to register, configure, and monitor IoT devices and edge gateways on the KIOT Platform.

---

## 1. Registering Devices

Devices can be registered via the Customer Admin Portal or via the REST API (`POST /v1/devices`).

### Required Device Fields:
- **Device ID:** Unique identifier for the device (e.g. `DEV-ESP32-001`).
- **Product:** Target product line (`industrial`, `cold`, `home`, `energy`).
- **Hardware Serial:** Physical manufacturer serial number (e.g. `SN-ESP32-849201`).
- **Hardware Type:** `esp32`, `linux_gateway`, or `third_party`.
- **Firmware Version:** Current running firmware version (e.g. `1.2.0`).
- **Location:** The specific site, building, or line where the device is physically mounted.
- **Gateway (Optional):** The parent industrial gateway bridging this device's communications.

---

## 2. Device Connectivity Statuses

The platform automatically computes and displays connectivity status based on heartbeats and telemetry:

| Status | Meaning | Automatic Transition Rule |
|---|---|---|
| 🟢 **Online** | Active and transmitting telemetry. | Updated whenever a valid telemetry or state message arrives. |
| 🔴 **Offline** | Disconnected or power lost. | Triggered when no message has been received within the configured heartbeat timeout (e.g. 5 minutes). |
| 🟡 **Degraded** | Intermittent connection or packet loss. | Device is communicating but error rates or latency exceed thresholds. |
| ⚪ **Provisioning** | Registered in the cloud but not yet claimed. | Initial state before physical onboarding via BLE or SoftAP. |

---

## 3. Working with Device Shadows (Digital Twins)

The Device Shadow provides a reliable control mechanism over unreliable industrial network connections:

1. **Setting Desired State:**
   - When an operator changes a setting in the dashboard, the cloud records the change in `desired` state.
   - Example:
     ```json
     {
       "desired": { "relay_coolant": "ON", "sample_rate_ms": 1000 }
     }
     ```
2. **Device State Reconciliation:**
   - When the device receives the instruction, it physically executes the change and publishes its new `reported` state back to the cloud.
   - Example:
     ```json
     {
       "reported": { "relay_coolant": "ON", "sample_rate_ms": 1000 }
     }
     ```
3. **Handling Disconnections (Delta):**
   - If a machine is turned off when a setting change is made, the difference remains stored in the shadow's `delta` field.
   - The moment the machine powers back on, it automatically requests its shadow delta and applies the pending settings.

