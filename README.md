# Nimbus Weather & Air Quality Dashboard

**Nimbus** is a premium, feature-rich single-page weather application custom-tailored for Indian metropolitan areas. It displays real-time weather forecasts, localized severe weather advisories, solar progress tracking, and live Air Quality Index (AQI) values.

## Key Features

- **Live Air Quality Index (AQI)**: Captures PM2.5, PM10, and overall US AQI indices with health advisories from the Open-Meteo Air Quality API.
- **Dynamic Weather Particles**: Custom visual CSS animation layers (rain drops, drifting clouds, glowing sun rays, or snow) based on active weather codes.
- **Localized Weather Advisories**: Real-time contextual warnings for heatwaves, monsoons, and extreme pollution levels.
- **Sun Tracker Widget**: An interactive SVG arc tracking the sun's altitude and path throughout daylight hours.
- **India Seeded Cities**: Favorites list pre-seeded with New Delhi, Mumbai, Bengaluru, Chennai, and Kolkata.
- **Unit Toggling**: Easily switch between Celsius (°C) and Fahrenheit (°F) scales.

## Technical Details

- **Core**: HTML5, Vanilla CSS3 (Custom Variables, Keyframe animations, Grid/Flexbox), Vanilla ES6+ Javascript.
- **Iconography**: [Lucide Icons](https://lucide.dev/).
- **Typography**: Google Fonts (Outfit).
- **APIs**:
  - Weather Forecast: Open-Meteo API (Free, zero config).
  - Air Quality: Open-Meteo Air Quality API.
  - Geocoding Search: Open-Meteo Geocoding API.
  - Reverse Geocoding: OpenStreetMap Nominatim.

## Getting Started

1. Double-click `index.html` or host locally using a web server:
   ```bash
   python -m http.server 8080
   ```
2. Navigate to `http://localhost:8080` in your web browser.
