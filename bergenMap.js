// bergenMap.js

// Constants
const MAP_CENTER = [60.3913, 5.3221];
const ZOOM_LEVEL = 10;
const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_LAYER_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const WEATHER_API_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const USER_AGENT = 'BergenClimbingApp/1.0 (your_email@example.com)';

// Initialize map
const map = L.map('map').setView(MAP_CENTER, ZOOM_LEVEL);

// Add tile layer
L.tileLayer(TILE_LAYER_URL, { attribution: TILE_LAYER_ATTRIBUTION }).addTo(map);

// State
let cragScores = [];
let markers = {};

// Load crags data
async function loadCrags() {
    try {
        const response = await fetch('crags.json');
        const crags = await response.json();
        crags.forEach(crag => addCragToMap(crag));
    } catch (error) {
        console.error('Error loading crags.json:', error);
    }
}

// Add crag to map
function addCragToMap(crag) {
    const marker = L.marker([crag.latitude, crag.longitude]).addTo(map);
    marker.crag = crag;
    markers[crag.name] = marker;
    getWeather(crag.latitude, crag.longitude, crag.name, marker);
}

// Fetch weather data
async function getWeather(lat, lon, cragName, marker) {
    const url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}`;
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": USER_AGENT }
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        processWeatherData(data, cragName, marker);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        marker.bindPopup(`<b>${cragName}</b><br>Weather data not available`).openPopup();
    }
}

// Process weather data
function processWeatherData(data, cragName, marker) {
    const timeseries = data.properties.timeseries;
    if (!timeseries || timeseries.length === 0) {
        console.error('No weather data available');
        return;
    }

    const details = timeseries[0].data.instant.details;
    const nextHourData = timeseries[0].data.next_1_hours;
    const symbolCode = nextHourData?.summary?.symbol_code || "cloudy";

    const weatherInfo = createWeatherInfo(cragName, details, symbolCode);
    const score = calculateClimbingScore(details, symbolCode);
    updateMarker(marker, score, weatherInfo);
    updateCragScores(cragName, score, marker);
}

// Create weather info HTML
function createWeatherInfo(cragName, details, symbolCode) {
    const weatherCondition = getWeatherCondition(symbolCode);
    return `
        <b>${cragName}</b><br>
        🏅 Score: ${calculateClimbingScore(details, symbolCode)}/10<br>
        ${weatherCondition}<br>
        🌡️ Temperature: ${details.air_temperature}°C <br>
        💨 Wind Speed: ${details.wind_speed} m/s <br>
        💧 Humidity: ${details.relative_humidity}%`;
}

// Get weather condition based on symbol code
function getWeatherCondition(symbolCode) {
    const conditions = {
        clearsky: "☀️ Sunny",
        cloudy: "☁️ Cloudy",
        partlycloudy: "🌤️ Partly Cloudy",
        lightrain: "☔ Rainy",
        rain: "☔ Rainy",
        heavyrain: "🌧️ Heavy Rain",
        fog: "🌫️ Foggy",
        snow: "❄️ Snow"
    };
    return conditions[symbolCode] || "☁️ Cloudy";
}

// Calculate climbing condition score
function calculateClimbingScore(details, symbolCode) {
    let score = 0;
    
    // Weather Condition Score
    score += symbolCode === "clearsky" ? 3 : (["cloudy", "partlycloudy"].includes(symbolCode) ? 2 : 0);

    // Temperature Score
    const temp = details.air_temperature;
    score += (temp >= 15 && temp <= 20) ? 3 : ((temp >= 10 && temp < 15) || (temp > 20 && temp <= 25)) ? 2 : 1;

    // Humidity Score
    const humidity = details.relative_humidity;
    score += (humidity >= 30 && humidity <= 50) ? 2 : (humidity > 50 && humidity <= 70) ? 1 : 0;

    // Wind Speed Score
    const wind = details.wind_speed;
    score += (wind > 1 && wind <= 10) ? 2 : (wind === 0) ? 1 : 0;

    return score;
}

// Update marker based on score
function updateMarker(marker, score, weatherInfo) {
    const markerColorClass = score >= 8 ? 'marker-high-score' : (score >= 5 ? 'marker-medium-score' : 'marker-low-score');
    const iconHtml = `<div class="marker-icon ${markerColorClass}"></div>`;
    const customIcon = L.divIcon({
        className: '',
        html: iconHtml,
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });

    marker.setIcon(customIcon);
    marker.bindPopup(weatherInfo);

    marker.on('click', function () {
        marker.setIcon(customIcon);
        marker.openPopup();
    });
}

// Update crag scores
function updateCragScores(cragName, score, marker) {
    cragScores.push({ name: cragName, score: score, marker: marker });
    updateTopScores();
}

// Update top scores list
function updateTopScores() {
    const topScores = cragScores.sort((a, b) => b.score - a.score).slice(0, 5);
    const topScoresList = document.getElementById('top-scores-list');
    topScoresList.innerHTML = '';
    topScores.forEach(crag => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `${crag.name}: 🏅 Score ${crag.score}/10 
        <button onclick="showOnMap('${crag.name}')">Show on Map</button>`;
        topScoresList.appendChild(listItem);
    });
}

// Show crag on map
function showOnMap(cragName) {
    const marker = markers[cragName];
    if (marker) {
        map.setView(marker.getLatLng(), 13);
        marker.openPopup();
    }
}

// Initialize the application
loadCrags();
