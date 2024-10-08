// Global variable to store crags and their scores
let cragData = [];

// Load the JSON data
fetch('crags.json')
    .then(response => response.json())
    .then(crags => {
        crags.forEach(crag => {
            // Initially set a default icon
            const customIcon = L.divIcon({
                className: `marker-icon marker-default`,
                iconSize: [25, 25],
                iconAnchor: [12, 25]
            });

            var marker = L.marker([crag.latitude, crag.longitude], { icon: customIcon }).addTo(map);

            // Add a click event to open a popup with the crag name and fetch weather data
            marker.on('click', function () {
                getWeather(crag.latitude, crag.longitude, crag.name, marker);
            });

            // Store initial data in the cragData array
            cragData.push({
                name: crag.name,
                latitude: crag.latitude,
                longitude: crag.longitude,
                marker: marker,
                score: 0 // Initialize with 0
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
                const temperature = details?.air_temperature ?? "N/A";
                const windSpeed = details?.wind_speed ?? "N/A";
                const humidity = details?.relative_humidity ?? "N/A";

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
                }

                // Wind Speed Score
                if (windSpeed > 1 && windSpeed <= 10) {
                    score += 2;
                } else if (windSpeed === 0) {
                    score += 1;
                }

                // Set marker color class based on the score
                let markerColorClass;
                if (score >= 8) {
                    markerColorClass = 'marker-high-score';
                } else if (score >= 5) {
                    markerColorClass = 'marker-medium-score';
                } else {
                    markerColorClass = 'marker-low-score';
                }

                // Update the marker icon to reflect the score
                const iconHtml = `<div class="marker-icon ${markerColorClass}"></div>`;
                const customIcon = L.divIcon({
                    className: '',
                    html: iconHtml,
                    iconSize: [25, 25],
                    iconAnchor: [12, 25]
                });

                marker.setIcon(customIcon);

                // Update the cragData array with the new score
                const cragIndex = cragData.findIndex(c => c.latitude === lat && c.longitude === lon);
                if (cragIndex !== -1) {
                    cragData[cragIndex].score = score;
                }

                // Update the top 5 scores list
                updateTopScores();

                // Create the popup content with emojis and score
                const weatherInfo = `
                    <b>${cragName}</b><br>
                    🏅 Score: ${score}/10<br>
                    ${weatherCondition}<br>
                    🌡️ Temperature: ${temperature !== "N/A" ? temperature.toFixed(1) : "N/A"}°C<br>
                    💨 Wind Speed: ${windSpeed !== "N/A" ? windSpeed.toFixed(1) : "N/A"} m/s<br>
                    💧 Humidity: ${humidity !== "N/A" ? humidity.toFixed(1) : "N/A"}%`;

                // Show the popup only when the data is ready
                marker.bindPopup(weatherInfo).openPopup();
            } else {
                console.error('No weather data available');
            }
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            marker.bindPopup(`<b>${cragName}</b><br>Weather data not available`).openPopup();
        });
}

// Function to update the top 5 climbing spots list
function updateTopScores() {
    // Sort crags by score in descending order and select the top 5
    const topCrags = cragData.sort((a, b) => b.score - a.score).slice(0, 5);

    // Update the HTML for the top 5 scores list
    const topScoresList = document.getElementById('top-scores-list');
    topScoresList.innerHTML = ''; // Clear existing list
    topCrags.forEach(crag => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<strong>${crag.name}</strong> - Score: ${crag.score}/10`;
        topScoresList.appendChild(listItem);
    });
}
