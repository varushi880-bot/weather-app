/* ==========================================================================
   Nimbus Premium AI Weather App - JavaScript Logic
   ========================================================================== */

// --- Constants & Configuration ---
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const AQI_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// WMO Weather Interpretation Codes (https://open-meteo.com/en/docs)
const WEATHER_CODES = {
    0: { desc: 'Clear Sky', icon: 'sun', class: 'weather-clear-day', particles: 'sun' },
    1: { desc: 'Mainly Clear', icon: 'cloud-sun', class: 'weather-clear-day', particles: 'sun' },
    2: { desc: 'Partly Cloudy', icon: 'cloud', class: 'weather-cloudy', particles: 'clouds' },
    3: { desc: 'Overcast', icon: 'cloudy', class: 'weather-cloudy', particles: 'clouds' },
    45: { desc: 'Fog', icon: 'cloud-fog', class: 'weather-cloudy', particles: 'none' },
    48: { desc: 'Depositing Rime Fog', icon: 'cloud-fog', class: 'weather-cloudy', particles: 'none' },
    51: { desc: 'Light Drizzle', icon: 'cloud-drizzle', class: 'weather-rainy', particles: 'rain' },
    53: { desc: 'Moderate Drizzle', icon: 'cloud-drizzle', class: 'weather-rainy', particles: 'rain' },
    55: { desc: 'Dense Drizzle', icon: 'cloud-drizzle', class: 'weather-rainy', particles: 'rain' },
    56: { desc: 'Light Freezing Drizzle', icon: 'cloud-drizzle', class: 'weather-rainy', particles: 'rain' },
    57: { desc: 'Dense Freezing Drizzle', icon: 'cloud-drizzle', class: 'weather-rainy', particles: 'rain' },
    61: { desc: 'Slight Rain', icon: 'cloud-rain', class: 'weather-rainy', particles: 'rain' },
    63: { desc: 'Moderate Rain', icon: 'cloud-rain', class: 'weather-rainy', particles: 'rain' },
    65: { desc: 'Heavy Rain', icon: 'cloud-rain', class: 'weather-rainy', particles: 'rain' },
    66: { desc: 'Light Freezing Rain', icon: 'cloud-rain', class: 'weather-rainy', particles: 'rain' },
    67: { desc: 'Heavy Freezing Rain', icon: 'cloud-rain', class: 'weather-rainy', particles: 'rain' },
    71: { desc: 'Slight Snow Fall', icon: 'snowflake', class: 'weather-snowy', particles: 'snow' },
    73: { desc: 'Moderate Snow Fall', icon: 'snowflake', class: 'weather-snowy', particles: 'snow' },
    75: { desc: 'Heavy Snow Fall', icon: 'snowflake', class: 'weather-snowy', particles: 'snow' },
    77: { desc: 'Snow Grains', icon: 'snowflake', class: 'weather-snowy', particles: 'snow' },
    80: { desc: 'Slight Rain Showers', icon: 'cloud-drizzle', class: 'weather-rainy', particles: 'rain' },
    81: { desc: 'Moderate Rain Showers', icon: 'cloud-drizzle', class: 'weather-rainy', particles: 'rain' },
    82: { desc: 'Violent Rain Showers', icon: 'cloud-rain', class: 'weather-rainy', particles: 'rain' },
    85: { desc: 'Slight Snow Showers', icon: 'cloud-snow', class: 'weather-snowy', particles: 'snow' },
    86: { desc: 'Heavy Snow Showers', icon: 'cloud-snow', class: 'weather-snowy', particles: 'snow' },
    95: { desc: 'Thunderstorm', icon: 'cloud-lightning', class: 'weather-stormy', particles: 'rain' },
    96: { desc: 'Thunderstorm with Slight Hail', icon: 'cloud-lightning', class: 'weather-stormy', particles: 'rain' },
    97: { desc: 'Thunderstorm with Heavy Hail', icon: 'cloud-lightning', class: 'weather-stormy', particles: 'rain' }
};

// AQI Ranges (US EPA Standards)
const AQI_THRESHOLDS = [
    { max: 50, label: 'Good', class: 'status-good', desc: 'Air quality is satisfactory, and air pollution poses little or no risk.' },
    { max: 100, label: 'Moderate', class: 'status-moderate', desc: 'Air quality is acceptable. Unusually sensitive individuals should limit outdoor activity.' },
    { max: 150, label: 'Poor', class: 'status-unhealthy-sensitive', desc: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.' },
    { max: 200, label: 'Unhealthy', class: 'status-unhealthy', desc: 'Active children and adults, and people with respiratory disease, should avoid prolonged outdoor exertion.' },
    { max: 300, label: 'Very Unhealthy', class: 'status-very-unhealthy', desc: 'Health alert: Everyone may experience more serious health effects. Avoid outdoor activities.' },
    { max: Infinity, label: 'Hazardous', class: 'status-hazardous', desc: 'Health warning of emergency conditions: Everyone is likely to be affected.' }
];

// --- Application State ---
let state = {
    unit: 'C', // 'C' or 'F'
    currentLocation: {
        name: 'New Delhi',
        country: 'India',
        lat: 28.6139,
        lon: 77.2090
    },
    favorites: [],
    searchDebounceTimer: null,
    weatherData: null,
    aqiData: null
};

// --- DOM Cache ---
const searchInput = document.getElementById('search-input');
const searchDropdown = document.getElementById('search-dropdown');
const geolocateBtn = document.getElementById('geolocate-btn');
const favCurrentBtn = document.getElementById('fav-current-btn');
const unitToggle = document.getElementById('unit-toggle');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const favoritesList = document.getElementById('favorites-list');
const dashboardGrid = document.getElementById('dashboard-grid');
const loader = document.getElementById('loader');

// Header Details
const currentCityEl = document.getElementById('current-city');
const currentCountryEl = document.getElementById('current-country');
const currentTimeEl = document.getElementById('current-time');
const currentTempEl = document.getElementById('current-temp');
const weatherDescEl = document.getElementById('weather-description');
const tempRangeEl = document.getElementById('temp-range');
const weatherLargeIcon = document.getElementById('weather-large-icon');

// Metric Values DOM
const valFeelsLike = document.getElementById('val-feels-like');
const valWind = document.getElementById('val-wind');
const valHumidity = document.getElementById('val-humidity');
const valUv = document.getElementById('val-uv');
const valPressure = document.getElementById('val-pressure');
const valPrecip = document.getElementById('val-precip');

// Metric Footers DOM
const descFeelsLike = document.getElementById('desc-feels-like');
const descWind = document.getElementById('desc-wind');
const descHumidity = document.getElementById('desc-humidity');
const descUv = document.getElementById('desc-uv');
const descPressure = document.getElementById('desc-pressure');
const descPrecip = document.getElementById('desc-precip');

// AI Synopsis Card
const aiSummaryText = document.getElementById('ai-summary-text');
const advisoryBadge = document.getElementById('advisory-badge');

// AQI Metrics
const valAqi = document.getElementById('val-aqi');
const aqiBadge = document.getElementById('aqi-badge');
const valPm25 = document.getElementById('val-pm25');
const valPm10 = document.getElementById('val-pm10');
const aqiHealthDesc = document.getElementById('aqi-health-desc');

// Sun Position Widget
const sunArcProgress = document.getElementById('sun-arc-progress');
const sunElement = document.getElementById('sun-element');
const valSunrise = document.getElementById('val-sunrise');
const valSunset = document.getElementById('val-sunset');

// Lists Elements
const weeklyForecastList = document.getElementById('weekly-forecast-list');
const hourlyForecastSlider = document.getElementById('hourly-forecast-slider');
const weatherParticlesContainer = document.getElementById('weather-particles');

// Floating AI Chat Elements
const aiChatToggle = document.getElementById('ai-chat-toggle');
const aiChatWindow = document.getElementById('ai-chat-window');
const closeAiChat = document.getElementById('close-ai-chat');
const aiChatBody = document.getElementById('ai-chat-body');
const aiChatInput = document.getElementById('ai-chat-input');
const sendAiMessage = document.getElementById('send-ai-message');
const aiChatSuggestions = document.getElementById('ai-chat-suggestions');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initializeEventListeners();
    fetchWeatherAndAqi(state.currentLocation.lat, state.currentLocation.lon);
    
    if (navigator.geolocation && !localStorage.getItem('nimbus_geolocation_prompted')) {
        localStorage.setItem('nimbus_geolocation_prompted', 'true');
        setTimeout(() => requestGeolocation(), 1000);
    }
});

// --- Event Listeners ---
function initializeEventListeners() {
    // Search Autocomplete
    searchInput.addEventListener('input', (e) => {
        clearTimeout(state.searchDebounceTimer);
        const query = e.target.value.trim();
        if (query.length < 2) {
            searchDropdown.hidden = true;
            return;
        }
        state.searchDebounceTimer = setTimeout(() => handleSearch(query), 300);
    });

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.hidden = true;
        }
    });

    // Controls Action Listeners
    geolocateBtn.addEventListener('click', () => requestGeolocation());
    favCurrentBtn.addEventListener('click', () => toggleFavoriteCurrentCity());
    
    unitToggle.addEventListener('change', (e) => {
        state.unit = e.target.checked ? 'F' : 'C';
        localStorage.setItem('nimbus_unit', state.unit);
        updateDashboardUI();
        renderFavorites(); // Redraws favorite cards with correct C/F
    });

    // Favorites Drawer Toggle
    toggleSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

    // Floating AI Chat Panel Toggles
    aiChatToggle.addEventListener('click', () => toggleAIChatWindow());
    closeAiChat.addEventListener('click', () => closeAIChatWindow());

    // AI Chat Messaging Interactions
    sendAiMessage.addEventListener('click', () => sendUserChatMessage());
    aiChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendUserChatMessage();
    });

    // Suggestion Buttons Binding
    aiChatSuggestions.addEventListener('click', (e) => {
        const btn = e.target.closest('.chat-suggest-btn');
        if (btn) {
            aiChatInput.value = btn.textContent;
            sendUserChatMessage();
        }
    });
}

// --- Load and Save Settings ---
function loadSettings() {
    const savedUnit = localStorage.getItem('nimbus_unit');
    if (savedUnit) {
        state.unit = savedUnit;
        unitToggle.checked = (state.unit === 'F');
    }
    
    const savedLocation = localStorage.getItem('nimbus_last_location');
    if (savedLocation) {
        state.currentLocation = JSON.parse(savedLocation);
    }

    const savedFavs = localStorage.getItem('nimbus_favorites_india');
    if (savedFavs) {
        state.favorites = JSON.parse(savedFavs);
    } else {
        // Default seed favorites
        state.favorites = [
            { name: 'New Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
            { name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 },
            { name: 'Bengaluru', country: 'India', lat: 12.9716, lon: 77.5946 },
            { name: 'Chennai', country: 'India', lat: 13.0827, lon: 80.2707 },
            { name: 'Kolkata', country: 'India', lat: 22.5726, lon: 88.3639 }
        ];
        saveFavorites();
    }
    renderFavorites();
}

function saveFavorites() {
    localStorage.setItem('nimbus_favorites_india', JSON.stringify(state.favorites));
}

// --- Geolocation ---
function requestGeolocation() {
    if (navigator.geolocation) {
        geolocateBtn.classList.add('loading');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                reverseGeocode(lat, lon);
                geolocateBtn.classList.remove('loading');
            },
            (error) => {
                console.error("GPS failed or denied: ", error);
                geolocateBtn.classList.remove('loading');
                alert("Auto-detection failed. Defaulting to current view.");
            }
        );
    }
}

async function reverseGeocode(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`);
        if (response.ok) {
            const data = await response.json();
            const address = data.address;
            const cityName = address.city || address.state_district || address.town || address.village || address.suburb || "My Location";
            const countryName = address.country || "";
            state.currentLocation = { name: cityName, country: countryName, lat, lon };
            localStorage.setItem('nimbus_last_location', JSON.stringify(state.currentLocation));
            fetchWeatherAndAqi(lat, lon);
        }
    } catch (e) {
        state.currentLocation = { name: "Current Location", country: "", lat, lon };
        fetchWeatherAndAqi(lat, lon);
    }
}

// --- City Search Autocomplete ---
async function handleSearch(query) {
    try {
        const response = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        if (!response.ok) throw new Error("Search failure");
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            searchDropdown.innerHTML = '<div class="search-dropdown-item"><span class="city-name">No results found</span></div>';
            searchDropdown.hidden = false;
            return;
        }

        renderSearchDropdown(data.results);
    } catch (err) {
        console.error(err);
    }
}

function renderSearchDropdown(results) {
    searchDropdown.innerHTML = '';
    results.forEach(city => {
        const item = document.createElement('div');
        item.className = 'search-dropdown-item';
        
        const nameText = document.createElement('div');
        nameText.innerHTML = `<span class="city-name">${city.name}</span>, <span class="country-name">${city.admin1 || ''} ${city.country}</span>`;
        
        const coordsText = document.createElement('div');
        coordsText.className = 'coords';
        coordsText.textContent = `${city.latitude.toFixed(2)}°, ${city.longitude.toFixed(2)}°`;
        
        item.appendChild(nameText);
        item.appendChild(coordsText);
        
        item.addEventListener('click', () => {
            state.currentLocation = {
                name: city.name,
                country: city.country,
                lat: city.latitude,
                lon: city.longitude
            };
            localStorage.setItem('nimbus_last_location', JSON.stringify(state.currentLocation));
            searchInput.value = '';
            searchDropdown.hidden = true;
            fetchWeatherAndAqi(city.latitude, city.longitude);
        });
        
        searchDropdown.appendChild(item);
    });
    searchDropdown.hidden = false;
}

// --- Fetch Weather and AQI Concurrently ---
async function fetchWeatherAndAqi(lat, lon) {
    showLoader();
    try {
        const weatherUrl = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
        const aqiUrl = `${AQI_API}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10&timezone=auto`;
        
        const [weatherRes, aqiRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(aqiUrl)
        ]);

        if (!weatherRes.ok || !aqiRes.ok) throw new Error("API call error");

        state.weatherData = await weatherRes.json();
        state.aqiData = await aqiRes.json();
        
        updateDashboardUI();
        
        // Reset/Alert the AI Assistant about the city shift
        resetAIChatForNewCity();
    } catch (err) {
        console.error(err);
        alert("Failed to sync meteorological metrics. Please verify coordinates.");
    } finally {
        hideLoader();
    }
}

// --- Loader Spinner ---
function showLoader() {
    loader.style.display = 'flex';
    dashboardGrid.hidden = true;
}

function hideLoader() {
    loader.style.display = 'none';
    dashboardGrid.hidden = false;
}

// --- Calculations Helpers ---
function convertTemp(celsius) {
    if (state.unit === 'F') {
        return Math.round((celsius * 9/5) + 32);
    }
    return Math.round(celsius);
}

function convertSpeed(kmh) {
    if (state.unit === 'F') {
        return Math.round(kmh * 0.621371) + ' mph';
    }
    return Math.round(kmh) + ' km/h';
}

function getWindDirection(deg) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const val = Math.floor((deg / 22.5) + 0.5);
    return directions[val % 16];
}

// --- Update UI ---
function updateDashboardUI() {
    if (!state.weatherData || !state.aqiData) return;
    
    const cur = state.weatherData.current;
    const daily = state.weatherData.daily;
    const hourly = state.weatherData.hourly;
    const aqi = state.aqiData.current;
    
    const weatherInfo = WEATHER_CODES[cur.weather_code] || { desc: 'Unknown', icon: 'help-circle', class: 'weather-clear-day', particles: 'none' };
    
    // Class Theme update
    document.body.className = '';
    if (cur.is_day === 0 && weatherInfo.class === 'weather-clear-day') {
        document.body.classList.add('weather-clear-night');
    } else {
        document.body.classList.add(weatherInfo.class);
    }

    // Load background animations
    generateWeatherParticles(weatherInfo.particles, cur.is_day);

    // Favorite button status
    const isFav = state.favorites.some(f => 
        f.name.toLowerCase() === state.currentLocation.name.toLowerCase() && 
        Math.abs(f.lat - state.currentLocation.lat) < 0.1
    );
    if (isFav) {
        favCurrentBtn.classList.add('active');
    } else {
        favCurrentBtn.classList.remove('active');
    }

    // Location/Temp Info
    currentCityEl.textContent = state.currentLocation.name;
    currentCountryEl.textContent = state.currentLocation.country;
    currentTempEl.textContent = convertTemp(cur.temperature_2m);
    weatherDescEl.textContent = weatherInfo.desc;
    
    // Time/Date
    const localTimeStr = new Date(cur.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const localDayStr = new Date(cur.time).toLocaleDateString([], { weekday: 'long' });
    currentTimeEl.textContent = `${localDayStr}, ${localTimeStr}`;

    // Temperature bounds
    const minTemp = convertTemp(daily.temperature_2m_min[0]);
    const maxTemp = convertTemp(daily.temperature_2m_max[0]);
    tempRangeEl.textContent = `H: ${maxTemp}°  L: ${minTemp}°`;

    // Large icon
    weatherLargeIcon.setAttribute('data-lucide', weatherInfo.icon);
    weatherLargeIcon.className = 'weather-large-icon';
    if (weatherInfo.icon === 'sun') {
        weatherLargeIcon.classList.add('anim-spin');
    } else if (weatherInfo.icon.includes('rain') || weatherInfo.icon.includes('drizzle')) {
        weatherLargeIcon.classList.add('anim-bounce');
    } else if (weatherInfo.icon.includes('cloud')) {
        weatherLargeIcon.classList.add('anim-pulse');
    }

    // Detail metrics items
    valFeelsLike.textContent = convertTemp(cur.apparent_temperature);
    valWind.innerHTML = `${convertSpeed(cur.wind_speed_10m)}`;
    descWind.textContent = `Direction: ${getWindDirection(cur.wind_direction_10m)} (${cur.wind_direction_10m}°)`;
    
    valHumidity.textContent = cur.relative_humidity_2m;
    descHumidity.textContent = `Atmospheric moisture levels are at ${cur.relative_humidity_2m}%.`;
    
    valUv.textContent = cur.uv_index.toFixed(1);
    descUv.textContent = getUvDescription(cur.uv_index);
    
    valPressure.textContent = Math.round(cur.pressure_msl);
    descPressure.textContent = cur.pressure_msl > 1011 ? 'High pressure anticyclonic cover.' : cur.pressure_msl < 1005 ? 'Cyclonic monsoon depression.' : 'Normal atmospheric envelope.';
    
    const precipProbVal = cur.precipitation > 0 ? 100 : Math.round(cur.cloud_cover * 0.85);
    valPrecip.textContent = precipProbVal;
    descPrecip.textContent = precipProbVal > 60 ? 'Strong chance of local showers.' : precipProbVal > 25 ? 'Partially moist cloud patches.' : 'Dry sky forecast.';

    // --- Render AQI Card ---
    renderAqiWidget(aqi);

    // --- Generate & Render AI Weather Synopsis Banner ---
    generateAISynopsis(cur.temperature_2m, cur.weather_code, cur.uv_index, aqi.us_aqi);

    // --- Render Sun Position Path ---
    renderSunPath(daily.sunrise[0], daily.sunset[0], cur.time);

    // Lists
    renderWeeklyForecast(daily);
    renderHourlyForecast(hourly);
    
    // Refresh Lucide Icons
    lucide.createIcons();
}

function getUvDescription(uv) {
    if (uv <= 2) return 'Low UV radiation exposure risk.';
    if (uv <= 5) return 'Moderate risk. Sunglasses recommended.';
    if (uv <= 7) return 'High exposure risk. Sunscreen required.';
    if (uv <= 10) return 'Very high risk. Limit afternoon sun exposure.';
    return 'Extreme UV risk! Seek immediate shade.';
}

// --- Render AQI Widget ---
function renderAqiWidget(aqi) {
    const usAqi = Math.round(aqi.us_aqi);
    valAqi.textContent = usAqi;
    valPm25.textContent = `${aqi.pm2_5.toFixed(1)} µg/m³`;
    valPm10.textContent = `${aqi.pm10.toFixed(1)} µg/m³`;

    const rating = AQI_THRESHOLDS.find(t => usAqi <= t.max);
    
    aqiBadge.textContent = rating.label;
    aqiBadge.className = `aqi-badge ${rating.class}`;
    aqiHealthDesc.textContent = rating.desc;
}

// --- Generate dynamic AI Synopsis Text & Badges ---
function generateAISynopsis(temp, code, uv, usAqi) {
    let summaryText = '';
    let badgeLabel = 'Normal';
    let badgeClass = 'adv-blue';

    const city = state.currentLocation.name;
    const weatherText = WEATHER_CODES[code]?.desc || 'unsettled';

    // 1. Alert State Calculations
    if (temp >= 40 || code >= 65 || code >= 95 || usAqi >= 150) {
        badgeLabel = 'Warning';
        badgeClass = 'adv-red';
    } else if (usAqi >= 100 || temp >= 35 || uv >= 7) {
        badgeLabel = 'Advisory';
        badgeClass = 'adv-yellow';
    }

    // 2. Draft AI Summary Statement
    summaryText = `**AI Climate Analysis for ${city}:** Currently ${temp.toFixed(1)}°C with ${weatherText.toLowerCase()}. `;

    if (usAqi >= 150) {
        summaryText += `*Critical AQI Alert:* Air quality is unhealthy (${usAqi}). PM2.5 levels are elevated; please wear N95 filtration masks and restrict heavy outdoor exercise. `;
    } else if (usAqi >= 100) {
        summaryText += `*AQI Advisory:* Air quality index is moderate/poor (${usAqi}). Sensitive individuals should monitor respiratory symptoms and limit strenuous activities. `;
    } else {
        summaryText += `*Healthy Air:* Air quality is satisfactory (AQI: ${usAqi}), posing no hazard. `;
    }

    if (temp >= 40) {
        summaryText += `*Heatwave warning:* Temperatures are dangerously high. Stay indoors and drink plenty of water. `;
    } else if (temp >= 30 && uv >= 8) {
        summaryText += `*UV Radiation Alert:* Extreme sun intensity detected. Wear sun-protective clothing, a hat, and high SPF sunblock. `;
    }

    if (code >= 65 || code >= 95) {
        summaryText += `*Severe Monsoon Alert:* Torrential rain and storm activity present. Waterlogging likely. Carry protective gear and avoid driving. `;
    } else if (code >= 51 && code <= 63) {
        summaryText += `*Rain Alert:* Localized drizzle/showers present. Carry an umbrella. `;
    }

    if (usAqi < 100 && temp < 35 && uv < 7 && code < 51) {
        summaryText += `Conditions are excellent! Outstanding day for walks, sports, or outdoor excursions.`;
    }

    // Render Synopsis
    advisoryBadge.textContent = badgeLabel;
    advisoryBadge.className = `advisory-badge ${badgeClass}`;
    
    // Parse bold markdown syntax simply for HTML representation
    aiSummaryText.innerHTML = summaryText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// --- Render Sun Arc Parabola ---
function renderSunPath(sunriseStr, sunsetStr, currentTimeStr) {
    const sunrise = new Date(sunriseStr);
    const sunset = new Date(sunsetStr);
    const current = new Date(currentTimeStr);

    valSunrise.textContent = sunrise.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    valSunset.textContent = sunset.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const totalDayTime = sunset - sunrise;
    const elapsedDayTime = current - sunrise;
    
    if (elapsedDayTime < 0 || elapsedDayTime > totalDayTime) {
        // Night position
        sunElement.style.left = '50%';
        sunElement.style.top = '100%';
        sunArcProgress.style.strokeDashoffset = '125';
        return;
    }

    const progress = elapsedDayTime / totalDayTime;
    const strokeOffset = 125 - (125 * progress);
    sunArcProgress.style.strokeDashoffset = strokeOffset;

    const posX = 10 + (80 * progress);
    const posY = 90 - (70 * Math.sin(progress * Math.PI));

    sunElement.style.left = `${posX}%`;
    sunElement.style.top = `${posY}%`;
}

// --- Render Weekly (7-Day) Forecast ---
function renderWeeklyForecast(daily) {
    weeklyForecastList.innerHTML = '';
    
    const weekMaxes = daily.temperature_2m_max;
    const weekMins = daily.temperature_2m_min;
    const absMin = Math.min(...weekMins);
    const absMax = Math.max(...weekMaxes);
    const tempSpan = absMax - absMin || 1;

    for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
        const dayLabel = i === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
        
        const weatherInfo = WEATHER_CODES[daily.weather_code[i]] || { icon: 'cloud' };
        
        const minTemp = convertTemp(daily.temperature_2m_min[i]);
        const maxTemp = convertTemp(daily.temperature_2m_max[i]);

        const minOffset = ((daily.temperature_2m_min[i] - absMin) / tempSpan) * 100;
        const maxOffset = ((daily.temperature_2m_max[i] - absMin) / tempSpan) * 100;
        const width = maxOffset - minOffset;

        const row = document.createElement('div');
        row.className = 'weekly-item';
        
        row.innerHTML = `
            <div class="weekly-day">${dayLabel}</div>
            <div class="weekly-icon"><i data-lucide="${weatherInfo.icon}"></i></div>
            <div class="weekly-temp-bar-wrapper">
                <div class="weekly-temp-bar-track">
                    <div class="weekly-temp-bar-fill" style="left: ${minOffset}%; width: ${width}%;"></div>
                </div>
            </div>
            <div class="weekly-temp-limits">
                <span class="weekly-min-temp">${minTemp}°</span>
                <span class="weekly-max-temp">${maxTemp}°</span>
            </div>
        `;
        weeklyForecastList.appendChild(row);
    }
}

// --- Render 24-Hour Hourly Forecast Slider ---
function renderHourlyForecast(hourly) {
    hourlyForecastSlider.innerHTML = '';
    
    const now = new Date();
    const currentHourString = now.toISOString().slice(0, 13) + ':00';
    
    let startIndex = hourly.time.findIndex(t => t.includes(currentHourString));
    if (startIndex === -1) startIndex = 0;

    for (let i = startIndex; i < startIndex + 24 && i < hourly.time.length; i++) {
        const timeVal = new Date(hourly.time[i]);
        let hourLabel = timeVal.toLocaleTimeString([], { hour: 'numeric' });
        if (i === startIndex) hourLabel = 'Now';
        
        const temp = convertTemp(hourly.temperature_2m[i]);
        const weatherInfo = WEATHER_CODES[hourly.weather_code[i]] || { icon: 'cloud' };

        const card = document.createElement('div');
        card.className = 'hourly-item';
        
        card.innerHTML = `
            <span class="hourly-time">${hourLabel}</span>
            <div class="hourly-icon-wrapper">
                <i data-lucide="${weatherInfo.icon}"></i>
            </div>
            <span class="hourly-temp">${temp}°</span>
        `;
        
        hourlyForecastSlider.appendChild(card);
    }
}

// --- Dynamic Weather Particle Effects Generator ---
function generateWeatherParticles(type, isDay) {
    weatherParticlesContainer.innerHTML = '';

    if (type === 'none') return;

    if (type === 'rain') {
        const maxDrops = 60;
        for (let i = 0; i < maxDrops; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = `${Math.random() * 100}vw`;
            drop.style.top = `${Math.random() * -100}px`;
            drop.style.animationDuration = `${0.6 + Math.random() * 0.5}s`;
            drop.style.animationDelay = `${Math.random() * 1.5}s`;
            weatherParticlesContainer.appendChild(drop);
        }
    } else if (type === 'snow') {
        const maxFlakes = 50;
        for (let i = 0; i < maxFlakes; i++) {
            const flake = document.createElement('div');
            flake.className = 'snow-flake';
            const size = 2 + Math.random() * 5;
            flake.style.width = `${size}px`;
            flake.style.height = `${size}px`;
            flake.style.left = `${Math.random() * 100}vw`;
            flake.style.top = `${Math.random() * -10}px`;
            flake.style.animationDuration = `${3 + Math.random() * 5}s`;
            flake.style.animationDelay = `${Math.random() * 3}s`;
            weatherParticlesContainer.appendChild(flake);
        }
    } else if (type === 'sun' && isDay === 1) {
        const ray = document.createElement('div');
        ray.className = 'sun-ray';
        weatherParticlesContainer.appendChild(ray);
    } else if (type === 'clouds') {
        const maxClouds = 4;
        for (let i = 0; i < maxClouds; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud-drift';
            const size = 150 + Math.random() * 200;
            cloud.style.width = `${size}px`;
            cloud.style.height = `${size * 0.6}px`;
            cloud.style.top = `${5 + Math.random() * 25}vh`;
            cloud.style.animationDuration = `${40 + Math.random() * 50}s`;
            cloud.style.animationDelay = `-${Math.random() * 40}s`;
            weatherParticlesContainer.appendChild(cloud);
        }
    }
}

// --- Favorites Drawer List ---
function renderFavorites() {
    favoritesList.innerHTML = '';
    
    if (state.favorites.length === 0) {
        favoritesList.innerHTML = '<div class="no-favorites-msg">No favorite cities saved yet. Click the star icon to save!</div>';
        return;
    }

    state.favorites.forEach((city, index) => {
        const card = document.createElement('div');
        card.className = 'fav-card';
        
        card.innerHTML = `
            <div class="fav-card-left">
                <h3>${city.name}</h3>
                <p>${city.country}</p>
            </div>
            <div class="fav-card-right">
                <span class="fav-card-temp" id="fav-temp-${index}">--°</span>
                <button class="btn-remove-fav" title="Delete favorite" data-index="${index}">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-fav')) return;
            state.currentLocation = city;
            localStorage.setItem('nimbus_last_location', JSON.stringify(city));
            sidebar.classList.remove('open');
            fetchWeatherAndAqi(city.lat, city.lon);
        });

        const delBtn = card.querySelector('.btn-remove-fav');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(index);
        });

        favoritesList.appendChild(card);
        fetchFavoriteTemp(city.lat, city.lon, index);
    });
}

async function fetchFavoriteTemp(lat, lon, index) {
    try {
        const response = await fetch(`${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=auto`);
        if (response.ok) {
            const data = await response.json();
            const tempEl = document.getElementById(`fav-temp-${index}`);
            if (tempEl) {
                tempEl.textContent = `${convertTemp(data.current.temperature_2m)}°`;
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function toggleFavoriteCurrentCity() {
    const isFavIndex = state.favorites.findIndex(f => 
        f.name.toLowerCase() === state.currentLocation.name.toLowerCase() && 
        Math.abs(f.lat - state.currentLocation.lat) < 0.1
    );

    if (isFavIndex !== -1) {
        state.favorites.splice(isFavIndex, 1);
        favCurrentBtn.classList.remove('active');
    } else {
        state.favorites.push({
            name: state.currentLocation.name,
            country: state.currentLocation.country,
            lat: state.currentLocation.lat,
            lon: state.currentLocation.lon
        });
        favCurrentBtn.classList.add('active');
    }
    
    saveFavorites();
    renderFavorites();
    lucide.createIcons();
}

function removeFavorite(index) {
    state.favorites.splice(index, 1);
    saveFavorites();
    renderFavorites();
    updateDashboardUI();
    lucide.createIcons();
}

// ==========================================================================
// --- Floating AI Weather Assistant Chatbot Logic ---
// ==========================================================================

function toggleAIChatWindow() {
    const isOpen = !aiChatWindow.classList.contains('hidden');
    if (isOpen) {
        closeAIChatWindow();
    } else {
        aiChatWindow.classList.remove('hidden');
        aiChatToggle.querySelector('.toggle-icon-default').setAttribute('hidden', 'true');
        aiChatToggle.querySelector('.toggle-icon-close').removeAttribute('hidden');
        
        // Auto-focus the input box
        setTimeout(() => aiChatInput.focus(), 150);
    }
}

function closeAIChatWindow() {
    aiChatWindow.classList.add('hidden');
    aiChatToggle.querySelector('.toggle-icon-default').removeAttribute('hidden');
    aiChatToggle.querySelector('.toggle-icon-close').setAttribute('hidden', 'true');
}

function resetAIChatForNewCity() {
    if (!state.weatherData) return;
    
    const city = state.currentLocation.name;
    
    // Clear chat history and set greeting specifically referencing the new city
    aiChatBody.innerHTML = `
        <div class="chat-bubble ai">
            Hi! I am **Nimbus AI**. I've successfully connected to meteorological sensors in **${city}**. Ask me any specific weather question about this location!
        </div>
    `;
    
    // Format suggestion questions for the new city
    const suggestions = aiChatSuggestions.querySelectorAll('.chat-suggest-btn');
    if (suggestions.length >= 3) {
        suggestions[0].textContent = `What should I wear in ${city}?`;
        suggestions[1].textContent = `Is it safe to run in ${city}?`;
        suggestions[2].textContent = `AQI report for ${city}`;
    }
    
    // Make sure notification badge pulses once
    const badge = aiChatToggle.querySelector('.ai-notification-badge');
    badge.style.animation = 'none';
    setTimeout(() => badge.style.animation = '', 100);
}

function sendUserChatMessage() {
    const text = aiChatInput.value.trim();
    if (!text) return;

    // Append User Message
    appendChatBubble(text, 'user');
    aiChatInput.value = '';

    // Trigger AI response loading simulation
    appendTypingIndicator();
    
    setTimeout(() => {
        removeTypingIndicator();
        const response = generateAIModelResponse(text);
        appendChatBubble(response, 'ai');
        lucide.createIcons();
    }, 900);
}

function appendChatBubble(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    
    // Simple markdown interpreter
    const parsedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
    bubble.innerHTML = parsedText;
    aiChatBody.appendChild(bubble);
    
    // Scroll Chat to Bottom
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
}

function appendTypingIndicator() {
    const loader = document.createElement('div');
    loader.className = 'chat-bubble ai typing-indicator-bubble';
    loader.id = 'ai-typing-indicator';
    loader.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    aiChatBody.appendChild(loader);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
}

function removeTypingIndicator() {
    const loader = document.getElementById('ai-typing-indicator');
    if (loader) loader.remove();
}

// --- Client-Side Smart NLP Analysis Engine ---
function generateAIModelResponse(query) {
    if (!state.weatherData || !state.aqiData) {
        return "I'm still syncing with weather satellites. Please hold on a moment.";
    }

    const city = state.currentLocation.name;
    const cur = state.weatherData.current;
    const temp = Math.round(cur.temperature_2m);
    const code = cur.weather_code;
    const uvi = Math.round(cur.uv_index);
    const humidity = cur.relative_humidity_2m;
    const aqi = Math.round(state.aqiData.current.us_aqi);
    const wind = Math.round(cur.wind_speed_10m);
    const unitSymbol = `°${state.unit}`;

    const q = query.toLowerCase();

    // 1. Clothing Advice Query
    if (q.includes('wear') || q.includes('clothing') || q.includes('outfit') || q.includes('clothes') || q.includes('dress')) {
        let advice = `For **${city}** today, the current temperature is **${convertTemp(temp)}${unitSymbol}** with **${WEATHER_CODES[code].desc}** conditions. `;
        
        if (temp >= 38) {
            advice += `Since it is extremely hot, wear ultra-lightweight, loose-fitting cotton or linen clothes. A wide-brimmed sun hat, sunglasses, and high-SPF sunscreen are absolutely essential.`;
        } else if (temp >= 28) {
            advice += `It's warm out there. Light short-sleeve shirts, cotton t-shirts, or shorts/loose trousers are best. Don't forget sunglasses.`;
        } else if (temp >= 18) {
            advice += `Weather is pleasant. You'll be comfortable in regular shirts, t-shirts, and jeans. Maybe keep a light jacket or windbreaker handy for late evenings.`;
        } else if (temp >= 10) {
            advice += `It's cool today. Wear layers: a long-sleeve shirt under a warm sweater or light jacket, and full-length trousers.`;
        } else {
            advice += `It's quite cold. Dress in warm thermal layers, a heavy jacket or coat, gloves, and a muffler/beanie.`;
        }

        if (code >= 51 && code <= 82) {
            advice += ` **Warning:** It is currently raining or wet. Make sure to wear waterproof footwear or carry a rain jacket/umbrella!`;
        }
        return advice;
    }

    // 2. Outdoor Workouts / Running Query
    if (q.includes('run') || q.includes('exercise') || q.includes('jog') || q.includes('workout') || q.includes('outside') || q.includes('sport')) {
        let advice = `Analyzing workout conditions for **${city}**... `;

        if (aqi >= 150) {
            return advice + `**Unhealthy Air Quality (AQI: ${aqi})** detected. It is highly advised to **cancel outdoor runs/workouts** and exercise indoors instead. Prolonged inhalation of PM2.5 at these levels is toxic for your lungs.`;
        }
        
        if (temp >= 38) {
            return advice + `**Extreme Heat Warning:** It is **${convertTemp(temp)}${unitSymbol}**. Avoid vigorous outdoor exercises during the day to prevent heat exhaustion. Try indoor cardio or wait until late evening after sunset.`;
        }
        
        if (code >= 65 || code >= 95) {
            return advice + `**Heavy Storm/Rain Alert:** Heavy precipitation detected. It is unsafe to run outside due to low visibility, lightning hazards, and waterlogged paths. Stick to indoor exercises.`;
        }

        if (aqi >= 100) {
            return advice + `Air quality is moderate/poor (**AQI: ${aqi}**). Sensitive groups should reduce intense outdoor workouts. Healthy adults can do light jogging but should avoid high-intensity sprints.`;
        }

        return advice + `Excellent conditions! With a comfortable temperature of **${convertTemp(temp)}${unitSymbol}**, clear/mild skies, and healthy air (**AQI: ${aqi}**), it is a **perfect day for outdoor running, cycling, or football!** Go for it!`;
    }

    // 3. Air Pollution / AQI Query
    if (q.includes('aqi') || q.includes('pollution') || q.includes('air quality') || q.includes('pm2.5') || q.includes('smoke') || q.includes('smog')) {
        const rating = AQI_THRESHOLDS.find(t => aqi <= t.max);
        let status = `The current **US Air Quality Index (AQI) in ${city} is ${aqi}**, which is categorized as **${rating.label}**. `;
        
        if (aqi >= 200) {
            status += `PM2.5 concentrations are dangerous. Healthy individuals may experience throat irritation or breathing difficulty. Wear a high-grade **N95 mask** if you go out, and keep your indoor air purifiers running.`;
        } else if (aqi >= 150) {
            status += `This is unhealthy. Sensitive groups (asthmatics, children, elderly) should remain indoors. Everyone should limit heavy outdoor activities. Consider using a mask.`;
        } else if (aqi >= 100) {
            status += `Air is moderately polluted. Sensitive individuals might experience minor throat tickling. General public is safe, but check forecast patterns.`;
        } else {
            status += `The air is clean and healthy to breathe! PM2.5 levels are very low, posing no health concerns.`;
        }
        return status;
    }

    // 4. Rain / Umbrella Check Query
    if (q.includes('rain') || q.includes('umbrella') || q.includes('monsoon') || q.includes('wet') || q.includes('showers')) {
        if (code >= 51 && code <= 82) {
            return `Yes, **definitely carry an umbrella**! It is currently raining in **${city}** (${WEATHER_CODES[code].desc}) with a 100% chance of getting wet.`;
        }
        
        const precipProb = cur.precipitation > 0 ? 100 : Math.round(cur.cloud_cover * 0.85);
        if (precipProb >= 50) {
            return `Yes, **recommend carrying an umbrella**. Although it isn't raining right now, cloud cover indicates a high chance (**${precipProb}%**) of local showers later today.`;
        }
        
        return `No umbrella needed today. The sky is clear or only partly cloudy with a negligible chance of rain (**${precipProb}%**) in **${city}**.`;
    }

    // 5. Sun / UV Query
    if (q.includes('sun') || q.includes('uv') || q.includes('uv index') || q.includes('hot') || q.includes('heat')) {
        let text = `In **${city}**, the UV Index is currently **${uvi}** and it is **${convertTemp(temp)}${unitSymbol}**. `;
        if (uvi >= 8) {
            text += `This is an **extreme UV hazard**. You will burn quickly. Seek shade, wear broad-brimmed hats, UV-blocking sunglasses, and apply SPF 50+ sunscreen.`;
        } else if (uvi >= 5) {
            text += `Moderate to high UV levels. Apply SPF 30+ sunscreen if you plan to be in the sun for more than 20 minutes.`;
        } else {
            text += `Low UV levels. Safe sun exposure, no special precautions needed.`;
        }
        return text;
    }

    // 6. Generic Summary Request
    if (q.includes('summary') || q.includes('weather') || q.includes('tell me') || q.includes('how is') || q.includes('nimbus')) {
        return `Here is the AI Weather Synopsis for **${city}**:\n` +
               `- **Temperature**: ${convertTemp(temp)}${unitSymbol} (Feels like ${convertTemp(cur.apparent_temperature)}${unitSymbol})\n` +
               `- **Sky**: ${WEATHER_CODES[code].desc}\n` +
               `- **Air Quality**: US AQI of **${aqi}** (${AQI_THRESHOLDS.find(t => aqi <= t.max).label})\n` +
               `- **Wind**: ${convertSpeed(cur.wind_speed_10m)} (${getWindDirection(cur.wind_direction_10m)})\n` +
               `- **UV Index**: ${uvi} (Max daily: ${Math.round(state.weatherData.daily.uv_index_max[0])})\n\n` +
               `Let me know if you need clothing advice or workout checks for these conditions!`;
    }

    // Default Fallback Help Message
    return `I am currently analyzing weather variables for **${city}**.\n\n` +
           `Try asking me specific questions like:\n` +
           `- *"What should I wear today?"*\n` +
           `- *"Should I run outside?"*\n` +
           `- *"Tell me about the air quality"* \n` +
           `- *"Do I need an umbrella?"*`;
}
