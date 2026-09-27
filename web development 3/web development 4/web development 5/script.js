/**
 * ==============================================================================
 * SkyPulse Weather - Application Logic & Meteorological Engine
 * ==============================================================================
 * Powered by Open-Meteo free API (No API keys required)
 * Features:
 * - GPS Geolocation auto-detection
 * - Instant debounced city search with live autocompletion dropdown
 * - Dynamic atmospheric theme shifts (Clear, Clouds, Rain, Snow, Storm)
 * - Seamless live °C / °F conversion across all cards & forecasts
 * - 24-Hour hourly carousel & 7-Day extended outlook
 * - Deep metrics: UV index, pressure, humidity, wind direction compass
 * ==============================================================================
 */

(function () {
  'use strict';

  // --- WMO Weather Code Interpreter ---
  const WMO_CODES = {
    0: { day: { text: 'Clear Sky', icon: '☀️', theme: 'clear-day' }, night: { text: 'Clear Night', icon: '🌙', theme: 'clear-night' } },
    1: { day: { text: 'Mainly Clear', icon: '🌤️', theme: 'clear-day' }, night: { text: 'Mainly Clear', icon: '🌤️', theme: 'clear-night' } },
    2: { day: { text: 'Partly Cloudy', icon: '⛅', theme: 'cloudy' }, night: { text: 'Partly Cloudy', icon: '☁️', theme: 'cloudy' } },
    3: { day: { text: 'Overcast', icon: '☁️', theme: 'cloudy' }, night: { text: 'Overcast', icon: '☁️', theme: 'cloudy' } },
    45: { day: { text: 'Foggy', icon: '🌫️', theme: 'cloudy' }, night: { text: 'Foggy', icon: '🌫️', theme: 'cloudy' } },
    48: { day: { text: 'Depositing Rime Fog', icon: '🌫️', theme: 'cloudy' }, night: { text: 'Depositing Rime Fog', icon: '🌫️', theme: 'cloudy' } },
    51: { day: { text: 'Light Drizzle', icon: '🌦️', theme: 'rain' }, night: { text: 'Light Drizzle', icon: '🌧️', theme: 'rain' } },
    53: { day: { text: 'Moderate Drizzle', icon: '🌧️', theme: 'rain' }, night: { text: 'Moderate Drizzle', icon: '🌧️', theme: 'rain' } },
    55: { day: { text: 'Dense Drizzle', icon: '🌧️', theme: 'rain' }, night: { text: 'Dense Drizzle', icon: '🌧️', theme: 'rain' } },
    61: { day: { text: 'Slight Rain', icon: '🌦️', theme: 'rain' }, night: { text: 'Slight Rain', icon: '🌧️', theme: 'rain' } },
    63: { day: { text: 'Moderate Rain', icon: '🌧️', theme: 'rain' }, night: { text: 'Moderate Rain', icon: '🌧️', theme: 'rain' } },
    65: { day: { text: 'Heavy Rain', icon: '🌧️', theme: 'rain' }, night: { text: 'Heavy Rain', icon: '🌧️', theme: 'rain' } },
    71: { day: { text: 'Slight Snow', icon: '🌨️', theme: 'snow' }, night: { text: 'Slight Snow', icon: '🌨️', theme: 'snow' } },
    73: { day: { text: 'Moderate Snow', icon: '❄️', theme: 'snow' }, night: { text: 'Moderate Snow', icon: '❄️', theme: 'snow' } },
    75: { day: { text: 'Heavy Snow', icon: '❄️', theme: 'snow' }, night: { text: 'Heavy Snow', icon: '❄️', theme: 'snow' } },
    77: { day: { text: 'Snow Grains', icon: '❄️', theme: 'snow' }, night: { text: 'Snow Grains', icon: '❄️', theme: 'snow' } },
    80: { day: { text: 'Light Rain Showers', icon: '🌦️', theme: 'rain' }, night: { text: 'Light Rain Showers', icon: '🌧️', theme: 'rain' } },
    81: { day: { text: 'Moderate Rain Showers', icon: '🌧️', theme: 'rain' }, night: { text: 'Moderate Rain Showers', icon: '🌧️', theme: 'rain' } },
    82: { day: { text: 'Violent Rain Showers', icon: '⛈️', theme: 'rain' }, night: { text: 'Violent Rain Showers', icon: '⛈️', theme: 'rain' } },
    85: { day: { text: 'Slight Snow Showers', icon: '🌨️', theme: 'snow' }, night: { text: 'Slight Snow Showers', icon: '🌨️', theme: 'snow' } },
    86: { day: { text: 'Heavy Snow Showers', icon: '❄️', theme: 'snow' }, night: { text: 'Heavy Snow Showers', icon: '❄️', theme: 'snow' } },
    95: { day: { text: 'Thunderstorm', icon: '⛈️', theme: 'storm' }, night: { text: 'Thunderstorm', icon: '⛈️', theme: 'storm' } },
    96: { day: { text: 'Thunderstorm with Hail', icon: '⛈️', theme: 'storm' }, night: { text: 'Thunderstorm with Hail', icon: '⛈️', theme: 'storm' } },
    99: { day: { text: 'Severe Thunderstorm', icon: '⛈️', theme: 'storm' }, night: { text: 'Severe Thunderstorm', icon: '⛈️', theme: 'storm' } }
  };

  function getWeatherMeta(code, isDay = 1) {
    const period = isDay ? 'day' : 'night';
    if (WMO_CODES[code] && WMO_CODES[code][period]) {
      return WMO_CODES[code][period];
    }
    return { text: 'Cloudy', icon: '☁️', theme: 'cloudy' };
  }

  // --- DOM Elements ---
  const locationInput = document.getElementById('locationInput');
  const searchForm = document.getElementById('searchForm');
  const suggestionsList = document.getElementById('suggestionsList');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const geoBtn = document.getElementById('geoBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const unitCelsiusBtn = document.getElementById('unitCelsiusBtn');
  const unitFahrenheitBtn = document.getElementById('unitFahrenheitBtn');
  const quickTags = document.getElementById('quickTags');

  const loadingState = document.getElementById('loadingState');
  const errorBanner = document.getElementById('errorBanner');
  const errorTitle = document.getElementById('errorTitle');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');
  const weatherStage = document.getElementById('weatherStage');
  const toast = document.getElementById('toast');

  // Weather Readout Elements
  const cityNameEl = document.getElementById('cityName');
  const countryNameEl = document.getElementById('countryName');
  const currentDateEl = document.getElementById('currentDate');
  const currentTimeEl = document.getElementById('currentTime');
  const weatherIconEl = document.getElementById('weatherIcon');
  const currentTempEl = document.getElementById('currentTemp');
  const conditionTextEl = document.getElementById('conditionText');
  const feelsLikeTempEl = document.getElementById('feelsLikeTemp');
  const highTempEl = document.getElementById('highTemp');
  const lowTempEl = document.getElementById('lowTemp');

  const windSpeedEl = document.getElementById('windSpeed');
  const windSpeedUnitEl = document.getElementById('windSpeedUnit');
  const windCompassEl = document.getElementById('windCompass');
  const windDirectionEl = document.getElementById('windDirection');
  const humidityEl = document.getElementById('humidity');
  const dewPointEl = document.getElementById('dewPoint');
  const uvIndexEl = document.getElementById('uvIndex');
  const uvBadgeEl = document.getElementById('uvBadge');
  const uvAdviceEl = document.getElementById('uvAdvice');
  const airPressureEl = document.getElementById('airPressure');
  const pressureStatusEl = document.getElementById('pressureStatus');
  const precipProbEl = document.getElementById('precipProb');
  const precipAmountEl = document.getElementById('precipAmount');
  const sunriseTimeEl = document.getElementById('sunriseTime');
  const sunsetTimeEl = document.getElementById('sunsetTime');

  const hourlyCarousel = document.getElementById('hourlyCarousel');
  const dailyList = document.getElementById('dailyList');

  // --- State ---
  let currentUnit = 'celsius'; // 'celsius' or 'fahrenheit'
  let cachedWeatherData = null;
  let activeLocation = {
    name: 'New York',
    country: 'United States',
    latitude: 40.7128,
    longitude: -74.0060
  };

  /* ==========================================================================
     1. TEMPERATURE CONVERSION UTILITIES
     ========================================================================== */
  function toFahrenheit(c) {
    return Math.round((c * 9) / 5 + 32);
  }

  function formatTemp(celsiusVal) {
    if (celsiusVal === null || celsiusVal === undefined || isNaN(celsiusVal)) return '--';
    if (currentUnit === 'fahrenheit') {
      return toFahrenheit(celsiusVal);
    }
    return Math.round(celsiusVal);
  }

  function setUnit(unit) {
    if (currentUnit === unit) return;
    currentUnit = unit;
    document.body.setAttribute('data-unit', unit);

    unitCelsiusBtn.classList.toggle('active', unit === 'celsius');
    unitCelsiusBtn.setAttribute('aria-pressed', unit === 'celsius');
    unitFahrenheitBtn.classList.toggle('active', unit === 'fahrenheit');
    unitFahrenheitBtn.setAttribute('aria-pressed', unit === 'fahrenheit');

    try {
      localStorage.setItem('skypulse-unit', unit);
    } catch (e) {}

    // Re-render UI with converted temperatures without refetching
    if (cachedWeatherData) {
      renderWeatherData(cachedWeatherData, activeLocation);
      showToast(`Units switched to °${unit === 'celsius' ? 'C' : 'F'}`);
    }
  }

  /* ==========================================================================
     2. METEOROLOGICAL API INTEGRATION (OPEN-METEO)
     ========================================================================== */
  async function fetchWeather(lat, lon, locationInfo) {
    showLoading(true);
    hideError();

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Weather service returned HTTP ${response.status}`);
      }

      const data = await response.json();
      cachedWeatherData = data;
      activeLocation = locationInfo;

      renderWeatherData(data, locationInfo);
      showLoading(false);

      // Save last location
      try {
        localStorage.setItem('skypulse-last-loc', JSON.stringify(locationInfo));
      } catch (e) {}

    } catch (err) {
      console.error('Weather fetch error:', err);
      showLoading(false);
      showError('Network Error', 'Unable to retrieve meteorological data. Please check your internet connection and try again.');
    }
  }

  /* ==========================================================================
     3. RENDER WEATHER DATA
     ========================================================================== */
  function renderWeatherData(data, loc) {
    const cur = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    const weatherMeta = getWeatherMeta(cur.weather_code, cur.is_day);

    // Dynamic atmospheric theme update
    document.body.setAttribute('data-weather', weatherMeta.theme);

    // Location Header
    cityNameEl.textContent = loc.name;
    countryNameEl.textContent = loc.country || loc.admin1 || '';

    // Date & Time
    const now = new Date();
    currentDateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    currentTimeEl.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Weather Visuals
    weatherIconEl.textContent = weatherMeta.icon;
    conditionTextEl.textContent = weatherMeta.text;
    currentTempEl.textContent = formatTemp(cur.temperature_2m);
    feelsLikeTempEl.textContent = `${formatTemp(cur.apparent_temperature)}°`;

    // High & Low of Day
    if (daily && daily.temperature_2m_max && daily.temperature_2m_max.length > 0) {
      highTempEl.textContent = `${formatTemp(daily.temperature_2m_max[0])}°`;
      lowTempEl.textContent = `${formatTemp(daily.temperature_2m_min[0])}°`;
    }

    // Detailed Metrics: Wind
    const windSpeed = currentUnit === 'fahrenheit' 
      ? Math.round(cur.wind_speed_10m * 0.621371) 
      : Math.round(cur.wind_speed_10m);
    windSpeedEl.textContent = windSpeed;
    windSpeedUnitEl.textContent = currentUnit === 'fahrenheit' ? 'mph' : 'km/h';

    const windDir = cur.wind_direction_10m;
    windCompassEl.style.transform = `rotate(${windDir}deg)`;
    windDirectionEl.textContent = `${getCompassDirection(windDir)} (${windDir}°)`;

    // Humidity & Dew Point (Approximation: T - ((100 - RH)/5))
    humidityEl.textContent = cur.relative_humidity_2m;
    const approxDewPoint = cur.temperature_2m - ((100 - cur.relative_humidity_2m) / 5);
    dewPointEl.textContent = `Dew point: ${formatTemp(approxDewPoint)}°`;

    // UV Index
    const uvVal = daily.uv_index_max ? daily.uv_index_max[0] : 0;
    uvIndexEl.textContent = uvVal.toFixed(1);
    updateUvBadge(uvVal);

    // Air Pressure
    airPressureEl.textContent = Math.round(cur.pressure_msl);
    if (cur.pressure_msl > 1020) pressureStatusEl.textContent = 'High pressure (Stable)';
    else if (cur.pressure_msl < 1005) pressureStatusEl.textContent = 'Low pressure (Precipitation)';
    else pressureStatusEl.textContent = 'Normal atmospheric pressure';

    // Precipitation
    const precipProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0;
    precipProbEl.textContent = precipProb;
    precipAmountEl.textContent = `${cur.precipitation || 0} mm expected today`;

    // Sunrise & Sunset
    if (daily.sunrise && daily.sunset) {
      sunriseTimeEl.textContent = formatSunTime(daily.sunrise[0]);
      sunsetTimeEl.textContent = formatSunTime(daily.sunset[0]);
    }

    // Render Hourly Forecast Carousel (Next 24 hours)
    renderHourlyForecast(hourly);

    // Render 7-Day Extended Forecast
    renderDailyForecast(daily);

    weatherStage.style.display = 'flex';
  }

  function formatSunTime(isoString) {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function getCompassDirection(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  }

  function updateUvBadge(uv) {
    uvBadgeEl.className = 'badge-uv';
    if (uv <= 2.9) {
      uvBadgeEl.classList.add('uv-low');
      uvBadgeEl.textContent = 'Low';
      uvAdviceEl.textContent = 'No protection needed';
    } else if (uv <= 5.9) {
      uvBadgeEl.classList.add('uv-moderate');
      uvBadgeEl.textContent = 'Moderate';
      uvAdviceEl.textContent = 'Sun protection recommended';
    } else if (uv <= 7.9) {
      uvBadgeEl.classList.add('uv-high');
      uvBadgeEl.textContent = 'High';
      uvAdviceEl.textContent = 'Cover up & wear sunscreen';
    } else {
      uvBadgeEl.classList.add('uv-very-high');
      uvBadgeEl.textContent = 'Very High';
      uvAdviceEl.textContent = 'Avoid midday outdoor exposure';
    }
  }

  /* ==========================================================================
     4. 24-HOUR HOURLY FORECAST CAROUSEL
     ========================================================================== */
  function renderHourlyForecast(hourly) {
    if (!hourly || !hourly.time) return;

    hourlyCarousel.innerHTML = '';
    const currentIsoHour = new Date().toISOString().slice(0, 13);

    // Find the starting hour index matching current time
    let startIndex = hourly.time.findIndex((t) => t.startsWith(currentIsoHour));
    if (startIndex === -1) startIndex = 0;

    // Display next 24 consecutive hours
    for (let i = startIndex; i < startIndex + 24 && i < hourly.time.length; i++) {
      const timeStr = hourly.time[i];
      const tempVal = hourly.temperature_2m[i];
      const code = hourly.weather_code[i];
      const rainProb = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;

      const dateObj = new Date(timeStr);
      const isNow = i === startIndex;
      const hourLabel = isNow ? 'Now' : dateObj.toLocaleTimeString('en-US', { hour: 'numeric' });
      const isDayHour = dateObj.getHours() >= 6 && dateObj.getHours() < 19 ? 1 : 0;
      const meta = getWeatherMeta(code, isDayHour);

      const pill = document.createElement('div');
      pill.className = `hour-pill ${isNow ? 'is-now' : ''}`;
      pill.innerHTML = `
        <span class="hour-time">${hourLabel}</span>
        <span class="hour-icon" title="${meta.text}">${meta.icon}</span>
        <span class="hour-temp">${formatTemp(tempVal)}°</span>
        <span class="hour-rain">${rainProb > 0 ? rainProb + '%' : ''}</span>
      `;
      hourlyCarousel.appendChild(pill);
    }
  }

  /* ==========================================================================
     5. 7-DAY EXTENDED FORECAST
     ========================================================================== */
  function renderDailyForecast(daily) {
    if (!daily || !daily.time) return;

    dailyList.innerHTML = '';

    // Calculate global min and max for proportional range bar
    const allMins = daily.temperature_2m_min;
    const allMaxs = daily.temperature_2m_max;
    const globalMin = Math.min(...allMins);
    const globalMax = Math.max(...allMaxs);
    const tempSpan = globalMax - globalMin || 1;

    for (let i = 0; i < daily.time.length && i < 7; i++) {
      const dateStr = daily.time[i];
      const code = daily.weather_code[i];
      const minTemp = daily.temperature_2m_min[i];
      const maxTemp = daily.temperature_2m_max[i];
      const rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;

      const dateObj = new Date(dateStr + 'T00:00:00');
      const isToday = i === 0;
      const dayName = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dateSub = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const meta = getWeatherMeta(code, 1);

      // Percentage bar calculations
      const leftPercent = ((minTemp - globalMin) / tempSpan) * 100;
      const widthPercent = Math.max(15, ((maxTemp - minTemp) / tempSpan) * 100);

      const row = document.createElement('div');
      row.className = 'day-row';
      row.innerHTML = `
        <div class="day-name-group">
          <span class="day-name">${dayName}</span>
          <span class="day-date">${dateSub}</span>
        </div>

        <div class="day-condition-group">
          <span class="day-icon">${meta.icon}</span>
          <span class="day-condition-text">${meta.text}</span>
        </div>

        <div class="day-precip-badge">
          ${rainProb >= 20 ? '💧 ' + rainProb + '%' : ''}
        </div>

        <div class="day-temp-bar-group">
          <span class="temp-min">${formatTemp(minTemp)}°</span>
          <div class="temp-range-track">
            <div class="temp-range-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
          </div>
          <span class="temp-max">${formatTemp(maxTemp)}°</span>
        </div>
      `;

      dailyList.appendChild(row);
    }
  }

  /* ==========================================================================
     6. GEOLOCATION AUTO-DETECTION
     ========================================================================== */
  function detectUserLocation() {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }

    showToast('Locating your position via GPS... 🛰️');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          // Reverse geocode to get human-friendly city name
          const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
          const revRes = await fetch(revUrl, { headers: { 'Accept': 'application/json' } });
          const revData = await revRes.json();

          const city = revData.address.city || revData.address.town || revData.address.village || revData.address.suburb || 'Current Location';
          const country = revData.address.country || '';

          fetchWeather(lat, lon, { name: city, country: country, latitude: lat, longitude: lon });
          showToast(`Weather updated for ${city}! 📍`);
        } catch (e) {
          // If reverse geocode fails, still display weather coordinates
          fetchWeather(lat, lon, { name: 'My Location', country: '', latitude: lat, longitude: lon });
        }
      },
      (error) => {
        let msg = 'Could not access your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please search manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try searching.';
        }
        showToast(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  /* ==========================================================================
     7. GEOCODING CITY SEARCH & AUTOCOMPLETE
     ========================================================================== */
  let searchDebounceTimer = null;

  async function searchLocations(query) {
    if (!query || query.trim().length < 2) {
      suggestionsList.style.display = 'none';
      return;
    }

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        renderSuggestions(data.results);
      } else {
        suggestionsList.innerHTML = `<li class="suggestion-item" style="color: var(--text-muted);">No locations found for "${query}"</li>`;
        suggestionsList.style.display = 'block';
      }
    } catch (e) {
      suggestionsList.style.display = 'none';
    }
  }

  function renderSuggestions(results) {
    suggestionsList.innerHTML = '';
    results.forEach((loc) => {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.setAttribute('role', 'option');

      const admin = loc.admin1 ? `${loc.admin1}, ` : '';
      const country = loc.country || '';

      li.innerHTML = `
        <span style="font-size: 1.1rem;">📍</span>
        <div>
          <span class="sugg-city">${loc.name}</span>
          <span class="sugg-region">${admin}${country}</span>
        </div>
      `;

      li.addEventListener('click', () => {
        selectLocation(loc);
      });

      suggestionsList.appendChild(li);
    });

    suggestionsList.style.display = 'block';
  }

  function selectLocation(loc) {
    locationInput.value = `${loc.name}, ${loc.country || ''}`.trim();
    suggestionsList.style.display = 'none';
    clearSearchBtn.style.display = 'block';

    fetchWeather(loc.latitude, loc.longitude, {
      name: loc.name,
      country: loc.country || '',
      latitude: loc.latitude,
      longitude: loc.longitude
    });
  }

  /* ==========================================================================
     8. EVENT LISTENERS
     ========================================================================== */
  // Search input events
  locationInput.addEventListener('input', (e) => {
    const val = e.target.value;
    clearSearchBtn.style.display = val.length > 0 ? 'block' : 'none';

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchLocations(val);
    }, 300);
  });

  clearSearchBtn.addEventListener('click', () => {
    locationInput.value = '';
    clearSearchBtn.style.display = 'none';
    suggestionsList.style.display = 'none';
    locationInput.focus();
  });

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = locationInput.value.trim();
    if (!query) return;

    suggestionsList.style.display = 'none';

    // Direct search for best match
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        selectLocation(data.results[0]);
      } else {
        showError('City Not Found', `We could not find any weather station for "${query}". Please check spelling.`);
      }
    } catch (err) {
      showError('Search Failed', 'Failed to connect to location lookup service.');
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!suggestionsList.contains(e.target) && e.target !== locationInput) {
      suggestionsList.style.display = 'none';
    }
  });

  // Geolocation button
  geoBtn.addEventListener('click', detectUserLocation);

  // Refresh button
  refreshBtn.addEventListener('click', () => {
    if (activeLocation) {
      fetchWeather(activeLocation.latitude, activeLocation.longitude, activeLocation);
      showToast('Weather data refreshed! 🔄');
    }
  });

  // Quick preset city tags
  if (quickTags) {
    quickTags.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-pill');
      if (btn) {
        const cityName = btn.getAttribute('data-city');
        locationInput.value = cityName;
        searchForm.dispatchEvent(new Event('submit'));
      }
    });
  }

  // Unit Toggle
  unitCelsiusBtn.addEventListener('click', () => setUnit('celsius'));
  unitFahrenheitBtn.addEventListener('click', () => setUnit('fahrenheit'));

  // Retry Button
  retryBtn.addEventListener('click', () => {
    if (activeLocation) {
      fetchWeather(activeLocation.latitude, activeLocation.longitude, activeLocation);
    }
  });

  /* ==========================================================================
     9. UI HELPERS: TOAST, LOADING, ERROR
     ========================================================================== */
  let toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function showLoading(isLoading) {
    loadingState.style.display = isLoading ? 'flex' : 'none';
    if (isLoading) {
      weatherStage.style.display = 'none';
    }
  }

  function showError(title, message) {
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorBanner.style.display = 'flex';
    weatherStage.style.display = 'none';
  }

  function hideError() {
    errorBanner.style.display = 'none';
  }

  /* ==========================================================================
     10. INITIALIZATION
     ========================================================================== */
  try {
    const savedUnit = localStorage.getItem('skypulse-unit');
    if (savedUnit) setUnit(savedUnit);

    const savedLoc = localStorage.getItem('skypulse-last-loc');
    if (savedLoc) {
      activeLocation = JSON.parse(savedLoc);
    }
  } catch (e) {}

  // Fetch initial default location
  fetchWeather(activeLocation.latitude, activeLocation.longitude, activeLocation);

  console.log('⛅ SkyPulse Weather initialized successfully.');
})();
