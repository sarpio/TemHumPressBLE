#include "BleWeatherService.h"

#include <ArduinoJson.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

#include "config.h"

namespace {
BLECharacteristic* weatherCharacteristic = nullptr;

float roundedTemperature(float temperature) {
  return roundf(temperature * 10.0f) / 10.0f;
}

int roundedHumidity(float humidity) {
  return static_cast<int>(roundf(humidity));
}

float roundedBatteryVoltage(float voltage) {
  return roundf(voltage * 100.0f) / 100.0f;
}
}  // namespace

class WeatherReadCallback : public BLECharacteristicCallbacks {
public:
  explicit WeatherReadCallback(BleWeatherService* service) : service_(service) {}

  void onRead(BLECharacteristic*) override {
    service_->handle();
  }

private:
  BleWeatherService* service_;
};

BleWeatherService::BleWeatherService(MeasurementReader reader)
    : reader_(reader), lastUpdateMs_(0) {}

void BleWeatherService::begin() {
  BLEDevice::init(BLE_DEVICE_NAME);
  BLEDevice::setPower(ESP_PWR_LVL_N12);

  BLEServer* server = BLEDevice::createServer();
  BLEService* service = server->createService(BLE_WEATHER_SERVICE_UUID);

  weatherCharacteristic = service->createCharacteristic(
      BLE_WEATHER_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  weatherCharacteristic->addDescriptor(new BLE2902());
  weatherCharacteristic->setCallbacks(new WeatherReadCallback(this));

  updateCharacteristic();
  service->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(BLE_WEATHER_SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE weather service started");
}

void BleWeatherService::handle() {
  if (millis() - lastUpdateMs_ >= BLE_UPDATE_INTERVAL_MS) {
    updateCharacteristic();
  }
}

String BleWeatherService::buildWeatherJson(const Measurement& measurement) const {
  JsonDocument doc;
  doc["temperature"] = roundedTemperature(measurement.temperature);
  doc["humidity"] = roundedHumidity(measurement.humidity);
  doc["pressure"] = static_cast<int>(roundf(measurement.pressure));
  doc["batteryVoltage"] = roundedBatteryVoltage(measurement.batteryVoltage);
  doc["batteryPercent"] = measurement.batteryPercent;
  doc["uptimeSeconds"] = millis() / 1000;

  String output;
  serializeJson(doc, output);
  return output;
}

void BleWeatherService::updateCharacteristic() {
  if (weatherCharacteristic == nullptr) {
    return;
  }

  const Measurement measurement = reader_();
  const String payload = buildWeatherJson(measurement);
  weatherCharacteristic->setValue(payload.c_str());
  weatherCharacteristic->notify();
  lastUpdateMs_ = millis();

  Serial.print("BLE payload: ");
  Serial.println(payload);
}
