/* ==========================================================================
   Nimbus Modern Weather App - JavaScript Logic (India & AQI Edition)
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

// Header details
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

// India-Specific Cards
const advisoryCard = document.getElementById('advisory-card');
const advisoryIcon = document.getElementById('advisory-icon');
const advisoryTitle = document.getElementById('advisory-title');
const advisoryDesc = document.getElementById('advisory-desc');

const valAqi = document.getElementById('val-aqi');
const aqiBadge = document.getElementById('aqi-badge');
const valPm25 = document.getElementById('val-pm25');
const valPm10 = document.getElementById('val-pm10');
const aqiHealthDesc = document.getElementById('aqi-health-desc');

// Sun Path Elements
const sunArcProgress = document.getElementById('sun-arc-progress');
const sunElement = document.getElementById('sun-element');
const valSunrise = document.getElementById('val-sunrise');
const valSunset = document.getElementById('val-sunset');

// Lists Elements
const weeklyForecastList = document.getElementById('weekly-forecast-list');
const hourlyForecastSlider = document.getElementById('hourly-forecast-slider');
const weatherParticlesContainer = document.getElementById('weather-particles');

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

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.hidden = true;
        }
    });

    // Control triggers
    geolocateBtn.addEventListener('click', () => requestGeolocation());
    favCurrentBtn.addEventListener('click', () => toggleFavoriteCurrentCity());
    unitToggle.addEventListener('change', (e) => {
        state.unit = e.target.checked ? 'F' : 'C';
        localStorage.setItem('nimbus_unit', state.unit);
        updateDashboardUI();
    });

    // Sidebar drawer toggles
    toggleSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
}

// --- Load and Save Settings ---
function loadSettings() {
    // Unit Load
    const savedUnit = localStorage.getItem('nimbus_unit');
    if (savedUnit) {
        state.unit = savedUnit;
        unitToggle.checked = (state.unit === 'F');
    }
    
    // Last Viewed City
    const savedLocation = localStorage.getItem('nimbus_last_location');
    if (savedLocation) {
        state.currentLocation = JSON.parse(savedLocation);
    }

    // Load Indian Pre-seeded Metros
    const savedFavs = localStorage.getItem('nimbus_favorites_india');
    if (savedFavs) {
        state.favorites = JSON.parse(savedFavs);
    } else {
        // Indian Metros Seeding
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

// --- Geolocation (GPS) ---
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
                console.error("GPS Location blocked or errored: ", error);
                geolocateBtn.classList.remove('loading');
                alert("Failed to auto-detect location. Defaulting to New Delhi.");
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
            const countryName = address.country || "India";
            state.currentLocation = { name: cityName, country: countryName, lat, lon };
            localStorage.setItem('nimbus_last_location', JSON.stringify(state.currentLocation));
            fetchWeatherAndAqi(lat, lon);
        }
    } catch (e) {
        state.currentLocation = { name: "Current Location", country: "India", lat, lon };
        fetchWeatherAndAqi(lat, lon);
    }
}

// --- Geocoding City Finder ---
async function handleSearch(query) {
    try {
        const response = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        if (!response.ok) throw new Error("Search API failure");
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

// --- Combined Weather and AQI Fetch ---
async function fetchWeatherAndAqi(lat, lon) {
    showLoader();
    try {
        const weatherUrl = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
        const aqiUrl = `${AQI_API}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10&timezone=auto`;
        
        const [weatherRes, aqiRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(aqiUrl)
        ]);

        if (!weatherRes.ok || !aqiRes.ok) throw new Error("API retrieval issue.");

        state.weatherData = await weatherRes.json();
        state.aqiData = await aqiRes.json();
        
        updateDashboardUI();
    } catch (err) {
        console.error(err);
        alert("Unable to reach meteorological servers. Retrying with Delhi coordinates.");
    } finally {
        hideLoader();
    }
}

// --- Loading Panel Helpers ---
function showLoader() {
    loader.style.display = 'flex';
    dashboardGrid.hidden = true;
}

function hideLoader() {
    loader.style.display = 'none';
    dashboardGrid.hidden = false;
}

// --- Conversions Helper ---
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

// --- UI Core Renderer ---
function updateDashboardUI() {
    if (!state.weatherData || !state.aqiData) return;
    
    const cur = state.weatherData.current;
    const daily = state.weatherData.daily;
    const hourly = state.weatherData.hourly;
    const aqi = state.aqiData.current;
    
    const weatherInfo = WEATHER_CODES[cur.weather_code] || { desc: 'Unknown', icon: 'help-circle', class: 'weather-clear-day', particles: 'none' };
    
    // Class Theme Change
    document.body.className = '';
    if (cur.is_day === 0 && weatherInfo.class === 'weather-clear-day') {
        document.body.classList.add('weather-clear-night');
    } else {
        document.body.classList.add(weatherInfo.class);
    }

    // Background animation renderer
    generateWeatherParticles(weatherInfo.particles, cur.is_day);

    // Favorite City Button check
    const isFav = state.favorites.some(f => 
        f.name.toLowerCase() === state.currentLocation.name.toLowerCase() && 
        Math.abs(f.lat - state.currentLocation.lat) < 0.1
    );
    if (isFav) {
        favCurrentBtn.classList.add('active');
    } else {
        favCurrentBtn.classList.remove('active');
    }

    // City Header Card
    currentCityEl.textContent = state.currentLocation.name;
    currentCountryEl.textContent = state.currentLocation.country;
    currentTempEl.textContent = convertTemp(cur.temperature_2m);
    weatherDescEl.textContent = weatherInfo.desc;
    
    // Time formatting
    const localTimeStr = new Date(cur.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const localDayStr = new Date(cur.time).toLocaleDateString([], { weekday: 'long' });
    currentTimeEl.textContent = `${localDayStr}, ${localTimeStr}`;

    // Min Max ranges
    const minTemp = convertTemp(daily.temperature_2m_min[0]);
    const maxTemp = convertTemp(daily.temperature_2m_max[0]);
    tempRangeEl.textContent = `H: ${maxTemp}°  L: ${minTemp}°`;

    // Large main icon
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
    descHumidity.textContent = `The moisture levels are highly ${cur.relative_humidity_2m < 50 ? 'dry' : cur.relative_humidity_2m < 75 ? 'mild' : 'humid'} right now.`;
    
    valUv.textContent = cur.uv_index.toFixed(1);
    descUv.textContent = getUvDescription(cur.uv_index);
    
    valPressure.textContent = Math.round(cur.pressure_msl);
    descPressure.textContent = cur.pressure_msl > 1011 ? 'High pressure anticyclone.' : cur.pressure_msl < 1005 ? 'Low pressure cyclonic activity.' : 'Stable atmospheric weight.';
    
    const precipProbVal = cur.precipitation > 0 ? 100 : Math.round(cur.cloud_cover * 0.85);
    valPrecip.textContent = precipProbVal;
    descPrecip.textContent = precipProbVal > 60 ? 'Strong chance of monsoon showers.' : precipProbVal > 25 ? 'Scattered rain patches likely.' : 'Clear dry weather forecast.';

    // --- Render New AQI Widget ---
    renderAqiWidget(aqi);

    // --- Render Weather Advisories (India Focus) ---
    renderWeatherAdvisory(cur.temperature_2m, cur.weather_code, cur.uv_index, aqi.us_aqi);

    // --- Render Sun Path Ring ---
    renderSunPath(daily.sunrise[0], daily.sunset[0], cur.time);

    // Render 7-Day & 24H Hourly
    renderWeeklyForecast(daily);
    renderHourlyForecast(hourly);
    
    // Refresh Icons
    lucide.createIcons();
}

function getUvDescription(uv) {
    if (uv <= 2) return 'Low skin exposure risk.';
    if (uv <= 5) return 'Moderate risk. Sunglasses advised.';
    if (uv <= 7) return 'High risk. Apply SPF 30+ sunscreen.';
    if (uv <= 10) return 'Very high risk. Limit noon sun exposure.';
    return 'Extreme hazard! Stay indoors during daytime.';
}

// --- Render AQI Widget ---
function renderAqiWidget(aqi) {
    const usAqi = Math.round(aqi.us_aqi);
    valAqi.textContent = usAqi;
    valPm25.textContent = `${aqi.pm2_5.toFixed(1)} µg/m³`;
    valPm10.textContent = `${aqi.pm10.toFixed(1)} µg/m³`;

    // Find classification range
    const rating = AQI_THRESHOLDS.find(t => usAqi <= t.max);
    
    aqiBadge.textContent = rating.label;
    aqiBadge.className = `aqi-badge ${rating.class}`;
    aqiHealthDesc.textContent = rating.desc;
}

// --- Dynamic India-Specific Weather Advisories ---
function renderWeatherAdvisory(temp, code, uv, usAqi) {
    let severity = 'blue'; // blue (info), yellow (warning), red (critical)
    let title = 'Weather Advisory';
    let message = 'Conditions are typical for this region. Dress comfortably and check forecast updates.';
    let icon = 'info';

    // 1. Extreme Heatwave (Red Alert)
    if (temp >= 40) {
        severity = 'red';
        title = 'Severe Heatwave Warning';
        message = `Dangerous local temperature of ${temp.toFixed(1)}°C. Keep hydrated, seek shade, and stay indoors between 11:30 AM and 4:00 PM.`;
        icon = 'alert-octagon';
    }
    // 2. Monsoon Heavy Rainfall / Storms (Red Alert)
    else if (code >= 65 || code >= 95) {
        severity = 'red';
        title = 'Heavy Rain & Storm Alert';
        message = 'Monsoon deluge detected. High risk of localized road waterlogging. Avoid driving and stay clear of power poles/lines.';
        icon = 'cloud-lightning';
    }
    // 3. Dangerous Air Pollution / Smog (Red/Yellow Alert)
    else if (usAqi >= 150) {
        severity = usAqi >= 250 ? 'red' : 'yellow';
        title = usAqi >= 250 ? 'Severe Air Pollution Alert' : 'Poor Air Quality Warning';
        message = `High particulate levels (AQI: ${usAqi}). Sensitive groups and general public should wear N95 pollution masks outdoors. Limit exercise.`;
        icon = 'alert-triangle';
    }
    // 4. Extreme UV Exposure (Yellow Alert)
    else if (uv >= 8) {
        severity = 'yellow';
        title = 'High UV Index Advisory';
        message = `Extreme UV levels (${uv.toFixed(0)}) present. Apply high SPF protection, wear broad hats, and shield eyes.`;
        icon = 'sun';
    }
    // 5. Light Monsoon Rain (Yellow Alert)
    else if (code >= 51 && code <= 63) {
        severity = 'blue';
        title = 'Rain / Monsoon Drizzle';
        message = 'Light showers forecast. Keep umbrellas handy. Road conditions might be slippery.';
        icon = 'cloud-drizzle';
    }
    // 6. Good Air Quality Activity Tips (Info)
    else if (usAqi <= 50) {
        severity = 'blue';
        title = 'Healthy Air Conditions';
        message = 'Excellent air quality today. Safe and highly recommended for outdoor sports and recreational routines.';
        icon = 'check-circle';
    }

    // Render Advisory Card
    advisoryCard.className = `card advisory-card adv-${severity}`;
    advisoryIcon.setAttribute('data-lucide', icon);
    advisoryTitle.textContent = title;
    advisoryDesc.textContent = message;
}

// --- Sun Path Calculations & Rendering ---
function renderSunPath(sunriseStr, sunsetStr, currentTimeStr) {
    const sunrise = new Date(sunriseStr);
    const sunset = new Date(sunsetStr);
    const current = new Date(currentTimeStr);

    valSunrise.textContent = sunrise.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    valSunset.textContent = sunset.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const totalDayTime = sunset - sunrise;
    const elapsedDayTime = current - sunrise;
    
    // Check if currently night time
    if (elapsedDayTime < 0 || elapsedDayTime > totalDayTime) {
        // Night position (hide sun or push it below the horizon)
        sunElement.style.left = '50%';
        sunElement.style.top = '100%';
        sunArcProgress.style.strokeDashoffset = '125';
        return;
    }

    // Progress percentage (0 to 1)
    const progress = elapsedDayTime / totalDayTime;

    // SVG arc stroke offset (Total path length is ~125 pixels)
    const strokeOffset = 125 - (125 * progress);
    sunArcProgress.style.strokeDashoffset = strokeOffset;

    // Position sun element along parabolic path inside container
    // Horizontal (X): 10% to 90%
    const posX = 10 + (80 * progress);
    // Vertical (Y): Sine curve peak at Y = 20%, base at Y = 90%
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

// --- Dynamic Particle Effects Generator ---
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
