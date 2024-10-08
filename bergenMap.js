// bergenMap.js

// Initialize the map and set its view to the coordinates of Bergen with a zoom level of 10
var map = L.map('map').setView([60.3913, 5.3221], 10);

// Add a tile layer to the map (you can use the open-source tile layer provided by OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Load the JSON data
fetch('crags.json')
    .then(response => response.json())
    .then(crags => {
        crags.forEach(crag => {
            // Add each crag to the map as a marker
            var marker = L.marker([crag.latitude, crag.longitude]).addTo(map);

            // Add a click event to open a popup with the crag name and fetch weather data
            marker.on('click', function() {
                getWeather(crag.latitude, crag.longitude, crag.name, marker);
            });
        });
    })
    .catch(error => console.error('Error loading crags.json:', error));

// Function to fetch weather data from Yr API and display it
function getWeather(lat, lon, cragName, marker) {
    const apiUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    fetch(apiUrl, {
        headers: {
            "User-Agent": "BergenClimbingApp/1.0 (your_email@example.com)"
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Extract weather details
        const timeseries = data.properties.timeseries;
        if (timeseries && timeseries.length > 0) {
            const details = timeseries[0].data.instant.details;
            const temperature = details.air_temperature;
            const windSpeed = details.wind_speed;
            const humidity = details.relative_humidity;

            // Extract weather symbol from next_1_hours
            const nextHourData = timeseries[0].data.next_1_hours;
            const symbolCode = nextHourData?.summary?.symbol_code || "cloudy";
            let weatherCondition = "☁️ Cloudy";

            // Set weather condition based on symbol code
            switch (symbolCode) {
                case "clearsky":
                    weatherCondition = "☀️ Sunny";
                    break;
                case "cloudy":
                case "partlycloudy":
                    weatherCondition = "☁️ Cloudy";
                    break;
                case "lightrain":
                case "rain":
                    weatherCondition = "☔ Rainy";
                    break;
                case "heavyrain":
                    weatherCondition = "🌧️ Heavy Rain";
                    break;
                case "fog":
                    weatherCondition = "🌫️ Foggy";
                    break;
                case "snow":
                    weatherCondition = "❄️ Snow";
                    break;
                default:
                    weatherCondition = "☁️ Cloudy";
            }

            // Calculate the climbing condition score
            let score = 0;

            // Weather Condition Score
            if (symbolCode === "clearsky") {
                score += 3;
            } else if (symbolCode === "cloudy" || symbolCode === "partlycloudy") {
                score += 2;
            } else {
                score += 0;
            }

            // Temperature Score
            if (temperature >= 15 && temperature <= 20) {
                score += 3;
            } else if ((temperature >= 10 && temperature < 15) || (temperature > 20 && temperature <= 25)) {
                score += 2;
            } else {
                score += 1;
            }

            // Humidity Score
            if (humidity >= 30 && humidity <= 50) {
                score += 2;
            } else if (humidity > 50 && humidity <= 70) {
                score += 1;
            } else {
                score += 0;
            }

            // Wind Speed Score
            if (windSpeed > 1 && windSpeed <= 10) {
                score += 2;
            } else if (windSpeed === 0) {
                score += 1;
            } else {
                score += 0;
            }

            // Set marker color based on the score
            let markerColorClass;
            if (score >= 8) {
                markerColorClass = 'marker-bright-green';
            } else if (score >= 5) {
                markerColorClass = 'marker-orange';
            } else {
                markerColorClass = 'marker-dark-red';
            }

            // Add a class to the marker element to change its appearance based on score
            const iconHtml = `<div class="marker-icon ${markerColorClass}"></div>`;
            const customIcon = L.divIcon({
                className: '',
                html: iconHtml,
                iconSize: [25, 41], // Adjust the size as needed
                iconAnchor: [12, 41]
            });

            marker.setIcon(customIcon);

            // Create the popup content with emojis and score
            const weatherInfo = `
                <b>${cragName}</b><br>
                ${weatherCondition}<br>
                🌡️ Temperature: ${temperature}°C <br>
                💨 Wind Speed: ${windSpeed} m/s <br>
                💧 Humidity: ${humidity}%<br>
                🏅 Score: ${score}/10`;

            // Delay showing the popup to ensure it works on mobile
            setTimeout(() => {
                marker.bindPopup(weatherInfo).openPopup();
            }, 200);
        } else {
            console.error('No weather data available');
        }
    })
    .catch(error => {
        console.error('Error fetching weather data:', error);
        marker.bindPopup(`<b>${cragName}</b><br>Weather data not available`).openPopup();
    });
}
