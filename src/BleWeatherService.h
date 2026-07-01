#pragma once

#include <Arduino.h>

#include "Measurement.h"

using MeasurementReader = Measurement (*)();

class BleWeatherService {
public:
  explicit BleWeatherService(MeasurementReader reader);
  void begin();
  void handle();

private:
  String buildWeatherJson(const Measurement& measurement) const;
  void updateCharacteristic();

  MeasurementReader reader_;
  uint32_t lastUpdateMs_;
};
