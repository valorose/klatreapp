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
            marker.bindPopup(`<b>${crag.name}</b>`).on('click', function() {
                getWeather(crag.latitude, crag.longitude, crag.name);
            });
        });
    })
    .catch(error => console.error('Error loading crags.json:', error));

// Function to fetch weather data from Yr API and display it
function getWeather(lat, lon, cragName) {
    const apiUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    fetch(apiUrl, {
        headers: {
            "User-Agent": "BergenClimbingApp/1.0 (your_email@example.com)"
        }
    })
    .then(response => response.json())
    .then(data => {
        // Extract weather details
        const details = data.properties.timeseries[0].data.instant.details;
        const temperature = details.air_temperature;
        const windSpeed = details.wind_speed;
        const humidity = details.relative_humidity;

        // Determine weather condition (e.g., rain, sunshine, cloudy)
        let weatherCondition = "☁️ Cloudy";
        if (details.precipitation_amount > 0) {
            weatherCondition = "☔ Rainy";
        } else if (details.cloud_area_fraction < 20) {
            weatherCondition = "☀️ Sunny";
        }

        // Create the popup content with emojis
        const weatherInfo = `
            <b>${cragName}</b><br>
            ${weatherCondition}<br>
            🌡️ Temperature: ${temperature}°C <br>
            💨 Wind Speed: ${windSpeed} m/s <br>
            💧 Humidity: ${humidity}%`;

        // Show the weather info in a Leaflet popup
        L.popup()
            .setLatLng([lat, lon])
            .setContent(weatherInfo)
            .openOn(map);
    })
    .catch(error => console.error('Error fetching weather data:', error));
}
