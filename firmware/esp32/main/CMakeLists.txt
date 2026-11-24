idf_component_register(
  SRCS "main.c"
  INCLUDE_DIRS "."
  REQUIRES mqtt nvs_flash esp_wifi esp_https_ota app_update json
)
