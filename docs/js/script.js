var BLE_SERVICE_UUID = '7e57b300-8f7b-4a8f-9f2a-21f9a98c3f10';
var BLE_CHARACTERISTIC_UUID = '7e57b301-8f7b-4a8f-9f2a-21f9a98c3f10';
var HISTORY_STORAGE_KEY = 'tempHumPressBleHistory';
var MAX_HISTORY_RECORDS = 48;

var weatherData = {
    current: null,
    measurements: loadHistory()
};
var weatherCharacteristic = null;

function formatTooltipPoint(point) {
    var options = point.series.options;
    var decimals = options.valueDecimals || 0;
    var unit = options.valueUnit || '';

    return '<div><b>' + point.series.name + ':</b> ' + point.y.toFixed(decimals) + ' ' + unit + '</div>';
}

function formatTooltipHour(point) {
    return '<div style="font-weight:bold;margin-bottom:6px;">Godz.: ' + point.hour + '</div>';
}

function formatAxisHour(hour) {
    var text = String(hour);
    var match = text.match(/(\d{2}:\d{2})$/);
    var time = match ? match[1] : text;

    return time.slice(3, 5) === '00' ? time.slice(0, 2) : '';
}

function normalizePressure(pressure) {
    if (pressure < 850 || pressure > 1100) {
        return null;
    }

    return pressure;
}

function loadHistory() {
    try {
        var saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
        return Array.isArray(saved) ? saved.slice(-MAX_HISTORY_RECORDS) : [];
    } catch (error) {
        return [];
    }
}

function saveHistory() {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(weatherData.measurements.slice(-MAX_HISTORY_RECORDS)));
}

function formatHour(date) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function addMeasurement(measurement) {
    var now = new Date();
    var record = {
        slot: Math.floor(now.getTime() / 1800000),
        hour: formatHour(now),
        temperature: Number(measurement.temperature),
        humidity: Number(measurement.humidity),
        pressure: Number(measurement.pressure)
    };

    weatherData.current = measurement;

    var last = weatherData.measurements[weatherData.measurements.length - 1];
    if (!last || last.slot !== record.slot) {
        weatherData.measurements.push(record);
        weatherData.measurements = weatherData.measurements.slice(-MAX_HISTORY_RECORDS);
        saveHistory();
    } else {
        weatherData.measurements[weatherData.measurements.length - 1] = record;
        saveHistory();
    }
}

function setStatus(text) {
    var status = document.getElementById('connectionStatus');
    if (status) {
        status.textContent = text;
    }
}

function renderLatestValues() {
    var container = document.getElementById('latestValues');
    var latest = weatherData.current || weatherData.measurements[weatherData.measurements.length - 1];

    if (!container || !latest) {
        container.innerHTML = '<span class="latest-item">-- °C</span><span class="latest-item">-- %</span><span class="latest-item">-- hPa</span>';
        return;
    }

    var temperatureClass = latest.temperature >= 0 ? 'value-temperature-positive' : 'value-temperature-negative';

    var pressure = normalizePressure(latest.pressure);
    var pressureText = pressure === null ? '--' : pressure.toFixed(0);

    container.innerHTML =
        '<span class="latest-item ' + temperatureClass + '">' + latest.temperature.toFixed(1) + ' °C</span>' +
        '<span class="latest-item value-humidity">' + latest.humidity.toFixed(0) + ' %</span>' +
        '<span class="latest-item value-pressure">' + pressureText + ' hPa</span>';

    fitLatestValues(container);
}

function fitLatestValues(container) {
    var maxSize = 43;
    var minSize = 25;
    var size = maxSize;

    container.style.fontSize = size + 'px';

    while (container.scrollWidth > container.clientWidth && size > minSize) {
        size -= 1;
        container.style.fontSize = size + 'px';
    }
}

function renderBatteryLevel() {
    var container = document.getElementById('batteryLevel');
    var latest = weatherData.current || {};
    var percent = latest.batteryPercent;
    var voltage = latest.batteryVoltage;

    if (!container || percent === undefined || percent === null || voltage === undefined || voltage === null) {
        container.textContent = 'Bateria: --';
        return;
    }

    container.title = 'Bateria: ' + percent.toFixed(0) + '% / ' + voltage.toFixed(2) + ' V';
    container.textContent = 'Bateria: ' + percent.toFixed(0) + '% / ' + voltage.toFixed(2) + ' V';
}

function chartCategories() {
    return weatherData.measurements.map(function (point) {
        return formatAxisHour(point.hour);
    });
}

renderLatestValues();
renderBatteryLevel();

var temperatureHumidityChart = Highcharts.chart('container', {

    chart: {
        backgroundColor: '#1e1e1e',
        plotBackgroundColor: '#1e1e1e',
        plotBorderWidth: 0,
        plotBorderColor: '#1e1e1e'
    },

    title: {
        text: 'Temperatura i Wilgotność',
        style: {
            fontSize: '18px',
            color: '#f5f5f5'
        }
    },

    xAxis: {
        categories: chartCategories(),
        tickInterval: 4,
        tickColor: '#666',
        lineColor: '#444',
        gridLineColor: '#333',
        labels: {
            style: {
                fontSize: '12px',
                color: '#f5f5f5'
            }
        }
    },

    yAxis: [
        {
            title: {
                text: null,
                style: {
                    fontSize: '12px'
                }
            },
            labels: {
                reserveSpace: false,
                align: 'right',
                x: -8,
                y: 4,
                style: {
                    fontSize: '12px',
                    color: '#ff3b30'
                }
            },
            opposite: true
        },
        {
            title: {
                text: null,
                style: {
                    fontSize: '12px'
                }
            },
            labels: {
                reserveSpace: false,
                align: 'right',
                x: -34,
                y: 4,
                style: {
                    fontSize: '12px',
                    color: '#34c759'
                }
            },
            opposite: true
        }
    ],

    tooltip: {
        shared: true,
        useHTML: true,
        formatter: function () {
            if (this.points) {
                var html = '<div style="width:140px;padding:10px 15px 15px 0px;font-size:14px;">';
                html += formatTooltipHour(this.points[0].point);
                this.points.forEach(function (p) {
                    html += formatTooltipPoint(p);
                });
                html += '</div>';
                return html;
            } else {
                return '<div style="width:140px;padding:10px 15px 15px 0px;font-size:14px;">' + formatTooltipHour(this.point) + formatTooltipPoint(this.point) + '</div>';
            }
        }
    },

    legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: {
            fontSize: '12px'
        }
    },

    series: [
        {
            name: 'Temp.',
            type: 'spline',
            yAxis: 0,
            color: '#0b3d91',
            negativeColor: '#0b3d91',
            zones: [
                {
                    value: 0,
                    color: '#0b3d91'
                },
                {
                    color: '#ff3b30'
                }
            ],
            valueDecimals: 1,
            valueUnit: '°C',
            marker: {
                enabled: false
            },
            data: weatherData.measurements.map(function (point) {
                return {
                    y: point.temperature,
                    hour: point.hour
                };
            })
        },
        {
            name: ' Humi.',
            type: 'spline',
            yAxis: 1,
            color: '#34c759',
            valueDecimals: 0,
            valueUnit: '%',
            marker: {
                enabled: false
            },
            data: weatherData.measurements.map(function (point) {
                return {
                    y: point.humidity,
                    hour: point.hour
                };
            })
        }
    ]
});

var pressureChart = Highcharts.chart('containerPressure', {

    chart: {
        backgroundColor: '#1e1e1e',
        plotBackgroundColor: '#1e1e1e',
        plotBorderWidth: 0,
        plotBorderColor: '#1e1e1e'
    },

    title: {
        text: 'Ciśnienie',
        style: {
            fontSize: '18px',
            color: '#f5f5f5'
        }
    },

    xAxis: {
        categories: chartCategories(),
        tickInterval: 4,
        tickColor: '#666',
        lineColor: '#444',
        gridLineColor: '#333',
        labels: {
            style: {
                fontSize: '12px',
                color: '#f5f5f5'
            }
        }
    },

    yAxis: {
        allowDecimals: false,
        title: {
            text: null,
            style: {
                fontSize: '12px'
            }
        },
        labels: {
            enabled: true,
            reserveSpace: false,
            align: 'right',
            x: -8,
            y: 4,
            style: {
                fontSize: '12px',
                color: '#ff9500'
            }
        },
        opposite: true
    },

    tooltip: {
        shared: true,
        useHTML: true,
        formatter: function () {
            if (this.points) {
                var rows = this.points.map(function (p) {
                    return formatTooltipPoint(p);
                }).join('');
                return '<div style="width:140px;padding:10px 15px 15px 0px;font-size:14px;">' + formatTooltipHour(this.points[0].point) + rows + '</div>';
            }
            return '<div style="width:140px;padding:10px 15px 15px 0px;font-size:14px;">' + formatTooltipHour(this.point) + formatTooltipPoint(this.point) + '</div>';
        }
    },

    legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: {
            fontSize: '12px'
        }
    },

    series: [
        {
            name: 'Ciśnienie',
            type: 'spline',
            color: '#ff9500',
            valueDecimals: 0,
            valueUnit: 'hPa',
            marker: {
                enabled: false
            },
            data: weatherData.measurements.map(function (point) {
                return {
                    y: normalizePressure(point.pressure),
                    hour: point.hour
                };
            })
        }
    ]
});

function updateCharts() {
    var categories = chartCategories();

    temperatureHumidityChart.xAxis[0].setCategories(categories, false);
    temperatureHumidityChart.series[0].setData(weatherData.measurements.map(function (point) {
        return {
            y: point.temperature,
            hour: point.hour
        };
    }), false);
    temperatureHumidityChart.series[1].setData(weatherData.measurements.map(function (point) {
        return {
            y: point.humidity,
            hour: point.hour
        };
    }), false);
    temperatureHumidityChart.redraw();

    pressureChart.xAxis[0].setCategories(categories, false);
    pressureChart.series[0].setData(weatherData.measurements.map(function (point) {
        return {
            y: normalizePressure(point.pressure),
            hour: point.hour
        };
    }), false);
    pressureChart.redraw();
}

function renderAll() {
    renderLatestValues();
    renderBatteryLevel();
    updateCharts();
}

function parseMeasurement(value) {
    return JSON.parse(new TextDecoder().decode(value));
}

function handleWeatherValue(event) {
    addMeasurement(parseMeasurement(event.target.value));
    renderAll();
    setStatus('Połączony, ostatni odczyt: ' + formatHour(new Date()));
}

function readWeatherValue() {
    if (!weatherCharacteristic) {
        return Promise.resolve();
    }

    return weatherCharacteristic.readValue().then(function (value) {
        addMeasurement(parseMeasurement(value));
        renderAll();
        setStatus('Połączony, ostatni odczyt: ' + formatHour(new Date()));
    });
}

function connectSensor() {
    if (!navigator.bluetooth) {
        setStatus('Bluefy lub przeglądarka z Web Bluetooth są wymagane');
        return;
    }

    setStatus('Wybierz SarpioWeather...');

    navigator.bluetooth.requestDevice({
        filters: [
            { name: 'SarpioWeather' },
            { services: [BLE_SERVICE_UUID] }
        ],
        optionalServices: [BLE_SERVICE_UUID]
    })
        .then(function (device) {
            setStatus('Łączenie...');
            device.addEventListener('gattserverdisconnected', function () {
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
        .then(readWeatherValue)
        .catch(function (error) {
            setStatus('Błąd połączenia: ' + error.message);
        });
}

document.getElementById('connectButton').addEventListener('click', connectSensor);
renderAll();
