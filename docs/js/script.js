var BLE_SERVICE_UUID = '7e57b300-8f7b-4a8f-9f2a-21f9a98c3f10';
var BLE_CHARACTERISTIC_UUID = '7e57b301-8f7b-4a8f-9f2a-21f9a98c3f10';
var AUTO_REFRESH_MS = 60000;

var weatherCharacteristic = null;
var refreshTimer = null;

function byId(id) {
    return document.getElementById(id);
}

function setStatus(text) {
    byId('connectionStatus').textContent = text;
}

function formatHour(date) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function normalizePressure(pressure) {
    if (pressure < 850 || pressure > 1100) {
        return null;
    }

    return pressure;
}

function setText(id, text) {
    byId(id).textContent = text;
}

function renderMeasurement(measurement) {
    var pressure = normalizePressure(Number(measurement.pressure));
    var voltage = Number(measurement.batteryVoltage);

    setText('temperatureValue', Number(measurement.temperature).toFixed(1));
    setText('humidityValue', Number(measurement.humidity).toFixed(0));
    setText('pressureValue', pressure === null ? '--' : pressure.toFixed(0));
    setText('batteryValue', Number(measurement.batteryPercent).toFixed(0));
    setText('batteryVoltage', isNaN(voltage) ? '--V' : voltage.toFixed(2) + 'V');
    setText('lastRead', 'Ostatni odczyt: ' + formatHour(new Date()));
}

function parseMeasurement(value) {
    return JSON.parse(new TextDecoder().decode(value));
}

function handleWeatherValue(event) {
    renderMeasurement(parseMeasurement(event.target.value));
    setStatus('Połączony');
}

function readWeatherValue() {
    if (!weatherCharacteristic) {
        return Promise.resolve();
    }

    return weatherCharacteristic.readValue().then(function (value) {
        renderMeasurement(parseMeasurement(value));
        setStatus('Połączony');
    });
}

function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(readWeatherValue, AUTO_REFRESH_MS);
}

function stopAutoRefresh() {
    if (refreshTimer !== null) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

function connectSensor() {
    if (!navigator.bluetooth) {
        setStatus('Bluefy lub przeglądarka z Web Bluetooth są wymagane');
        return;
    }

    setStatus('Wybierz SarpioWeather...');

    navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [BLE_SERVICE_UUID]
    })
        .then(function (device) {
            setStatus('Łączenie...');
            device.addEventListener('gattserverdisconnected', function () {
                stopAutoRefresh();
                weatherCharacteristic = null;
                setStatus('Rozłączony');
            });
            return device.gatt.connect();
        })
        .then(function (server) {
            return server.getPrimaryService(BLE_SERVICE_UUID);
        })
        .then(function (service) {
            return service.getCharacteristic(BLE_CHARACTERISTIC_UUID);
        })
        .then(function (characteristic) {
            weatherCharacteristic = characteristic;
            weatherCharacteristic.addEventListener('characteristicvaluechanged', handleWeatherValue);
            return weatherCharacteristic.startNotifications();
        })
        .then(function () {
            startAutoRefresh();
            return readWeatherValue();
        })
        .catch(function (error) {
            setStatus('Błąd połączenia: ' + error.message);
        });
}

byId('connectButton').addEventListener('click', connectSensor);
