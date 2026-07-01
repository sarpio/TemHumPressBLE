#pragma once

#include <stddef.h>
#include <stdint.h>

constexpr int I2C_SDA_PIN = 5;
constexpr int I2C_SCL_PIN = 6;
constexpr uint32_t I2C_FREQUENCY = 400000;

constexpr int BATTERY_ADC_PIN = 1;
constexpr float BATTERY_VOLTAGE_DIVIDER = 2.156f;
constexpr float BATTERY_EMPTY_VOLTAGE = 3.3f;
constexpr float BATTERY_FULL_VOLTAGE = 4.2f;

constexpr float PRESSURE_MIN_HPA = 850.0f;
constexpr float PRESSURE_MAX_HPA = 1100.0f;
constexpr float PRESSURE_REDUCTION_HPA = 0.0f;
constexpr float PRESSURE_FALLBACK_HPA = 1013.25f;
constexpr int PRESSURE_READ_ATTEMPTS = 3;

constexpr const char* BLE_DEVICE_NAME = "SarpioWeather";
constexpr const char* BLE_WEATHER_SERVICE_UUID = "7e57b300-8f7b-4a8f-9f2a-21f9a98c3f10";
constexpr const char* BLE_WEATHER_CHARACTERISTIC_UUID = "7e57b301-8f7b-4a8f-9f2a-21f9a98c3f10";
constexpr uint32_t BLE_UPDATE_INTERVAL_MS = 60000;
