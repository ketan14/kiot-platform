#ifndef KIOT_CONFIG_H
#define KIOT_CONFIG_H

/**
 * KIOT Platform - ESP32 Industrial Node Configuration
 * Target Framework: ESP-IDF v5.x (FreeRTOS)
 * Supports: BLE/SoftAP Provisioning, MQTT over TLS (Port 8883), Device Shadow & OTA
 */

#define KIOT_FIRMWARE_VERSION         "1.2.0"
#define KIOT_HARDWARE_TYPE            "esp32"
#define KIOT_PRODUCT_ID               "industrial"

/* Default Provisioned Identity (Overridden at runtime via NVS Flash partition) */
#define KIOT_DEFAULT_ORG_ID           "00000000-0000-4000-a000-000000000001"
#define KIOT_DEFAULT_DEVICE_ID        "DEV-ESP32-001"
#define KIOT_DEFAULT_GATEWAY_ID       "GW-PUN-001"
#define KIOT_MQTT_BROKER_URI          "mqtts://mqtt.kiot.io:8883"

/* Multi-Tenant Isolated MQTT Topic Templates */
#define KIOT_TOPIC_TELEMETRY_FMT      "kiot/%s/devices/%s/telemetry"
#define KIOT_TOPIC_STATE_FMT          "kiot/%s/devices/%s/state"
#define KIOT_TOPIC_COMMANDS_FMT       "kiot/%s/devices/%s/commands"
#define KIOT_TOPIC_COMMAND_ACK_FMT    "kiot/%s/devices/%s/commands/%s/ack"

/* Telemetry Sampling & Ring-Buffer Configuration */
#define KIOT_TELEMETRY_INTERVAL_MS    1000
#define KIOT_NVS_NAMESPACE            "kiot_prov"

#endif /* KIOT_CONFIG_H */
