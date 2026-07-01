# TempHumPressInC

## Jak to teraz działa
ESP32 udostępnia odczyt temperatury, wilgotności, ciśnienia i baterii przez BLE jako urządzenie `SarpioWeather`.
Strona w katalogu `docs/` jest statyczna i może być opublikowana na GitHub Pages. W telefonie otwórz ją przez Bluefy, naciśnij `Połącz z czujnikiem` i wybierz `SarpioWeather`.

Historia wykresów jest zapisywana lokalnie w przeglądarce (`localStorage`), więc ESP32 nie musi utrzymywać WiFi ani serwera HTTP.

## BLE
Service UUID: `7e57b300-8f7b-4a8f-9f2a-21f9a98c3f10`

Characteristic UUID: `7e57b301-8f7b-4a8f-9f2a-21f9a98c3f10`

Charakterystyka zwraca JSON:

```json
{
  "temperature": 21.5,
  "humidity": 48,
  "pressure": 1013,
  "batteryVoltage": 4.05,
  "batteryPercent": 83,
  "uptimeSeconds": 120
}
```

## Load new code
pio run -t upload

## Strona na GitHub Pages
Opublikuj zawartość katalogu `data/` jako statyczną stronę. Web Bluetooth wymaga HTTPS, dlatego GitHub Pages pasuje lepiej niż lokalny plik.
