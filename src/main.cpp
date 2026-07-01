#include <Arduino.h>
#include <Wire.h>
#include <esp_task_wdt.h>
#include <esp_wifi.h>

#include "BleWeatherService.h"
#include "LPS22HH.h"
#include "SHT41.h"
#include "config.h"

SHT41 sht(Wire);
LPS22HH lps(Wire);
BleWeatherService* weatherService = nullptr;
float lastValidPressure = NAN;

bool isRealisticPressure(float pressure) {
  return pressure >= PRESSURE_MIN_HPA && pressure <= PRESSURE_MAX_HPA;
}

float reducePressure(float pressure) {
  return pressure + PRESSURE_REDUCTION_HPA;
}

float readBatteryVoltage() {
  const int raw = analogRead(BATTERY_ADC_PIN);
  return static_cast<float>(raw) * 3.3f / 4095.0f * BATTERY_VOLTAGE_DIVIDER;
}

int batteryPercentFromVoltage(float voltage) {
  const float percent = (voltage - BATTERY_EMPTY_VOLTAGE) * 100.0f
      / (BATTERY_FULL_VOLTAGE - BATTERY_EMPTY_VOLTAGE);
  return constrain(static_cast<int>(roundf(percent)), 0, 100);
}

Measurement readValues() {
  float tempSht = NAN;
  float humidity = NAN;
  if (!sht.read(tempSht, humidity)) {
    Serial.println("Blad odczytu SHT41");
    tempSht = 0.0f;
    humidity = 0.0f;
  }

  float tempLps = tempSht;
  float pressure = NAN;

  for (int attempt = 0; attempt < PRESSURE_READ_ATTEMPTS; attempt++) {
    float readPressure = NAN;
    float readTempLps = tempLps;

    if (lps.read(readPressure, readTempLps)) {
      tempLps = readTempLps;

      if (isRealisticPressure(readPressure)) {
        pressure = readPressure;
        lastValidPressure = readPressure;
        break;
      }

      Serial.print("Nierealistyczne cisnienie: ");
      Serial.print(readPressure);
      Serial.print(" hPa, proba ");
      Serial.println(attempt + 1);
    } else {
      Serial.print("Blad odczytu LPS22HH, proba ");
      Serial.println(attempt + 1);
    }

    delay(50);
  }

  if (isnan(pressure)) {
    if (!isnan(lastValidPressure)) {
      pressure = lastValidPressure;
    } else {
      pressure = PRESSURE_FALLBACK_HPA;
    }

    Serial.print("Uzywam zastepczego cisnienia: ");
    Serial.print(pressure);
    Serial.println(" hPa");
  }

  Measurement measurement;
  measurement.temperature = tempSht;
  measurement.humidity = humidity;
  measurement.pressure = reducePressure(pressure);
  measurement.batteryVoltage = readBatteryVoltage();
  measurement.batteryPercent = batteryPercentFromVoltage(measurement.batteryVoltage);
  return measurement;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  esp_task_wdt_init(60, true);
  esp_task_wdt_add(nullptr);

  esp_wifi_stop();
  esp_wifi_deinit();

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQUENCY);

  if (!lps.begin()) {
    Serial.println("Nie udalo sie zainicjalizowac LPS22HH");
  }

  analogReadResolution(12);
  analogSetPinAttenuation(BATTERY_ADC_PIN, ADC_11db);
  pinMode(BATTERY_ADC_PIN, INPUT);

  static BleWeatherService service(readValues);
  weatherService = &service;
  weatherService->begin();
}

void loop() {
  esp_task_wdt_reset();

  if (weatherService != nullptr) {
    weatherService->handle();
  }

  delay(250);
}
