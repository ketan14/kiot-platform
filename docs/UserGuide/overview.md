# KIOT Platform – User & Operator Guide (`UserGuide`)

**Tagline:** Connected Intelligence for the Physical World  
**Target Audience:** Tenant Administrators, Plant Managers, Field Operators, Integrators  

---

## 1. Platform Overview

KIOT is a modular, multi-tenant IoT SaaS platform designed to connect, monitor, manage, and automate physical hardware, machines, and environments.

### Product Lines:
1. **KIOT Industrial:** Supervisory monitoring of factory machines (CNC milling, lathes, fabrication), tracking operating hours, machine status, downtime, and electrical metrics.
2. **KIOT Cold:** Continuous cold-chain temperature and humidity logging with automated compliance reporting and excursion alerts.
3. **KIOT Home:** Smart switch and environmental automation for residential environments.
4. **KIOT Energy:** Sub-metering, live power consumption (kW, kVA), power quality, and tariff calculation.

---

## 2. Core Concepts

### Organizations (Tenants)
An Organization represents an isolated enterprise or customer account. All users, locations, devices, telemetry data, and audit records belong to an organization. Users can belong to multiple organizations and switch between them.

### Locations Hierarchy
Locations allow organizing assets across physical spaces:
$$\text{Organization} \longrightarrow \text{Site / Factory} \longrightarrow \text{Building} \longrightarrow \text{Production Line / Room}$$

### Edge Gateways
Industrial gateways (e.g. Moxa, Advantech) running the KIOT Edge Agent. Gateways act as physical protocol bridges translating field Modbus RTU (RS-485) and Modbus TCP signals into encrypted MQTT traffic.

### Devices
Physical sensors, ESP32 microcontrollers, or smart energy meters connected directly to the cloud or bridged through a gateway.

### Industrial Machines
Physical assets (CNC mills, robotic arms, injection molding machines) tracked for operating status (`running`, `stopped`, `abnormal`, `offline`), operating hours, and telemetry sensor feeds.

### Device Shadows (Digital Twin)
A digital state document representing the configuration of a device:
- **Desired State:** What the operator wants the device to be (e.g. *Coolant Pump: ON*).
- **Reported State:** The actual physical state reported back by the device.
- **Delta:** The difference between desired and reported states.

