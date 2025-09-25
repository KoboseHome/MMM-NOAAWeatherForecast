/* eslint-disable camelcase */
/* globals config, moment, Skycons */

/**
 ********************************
 *
 *MagicMirror² Module:
 *MMM-NOAAForecast
 *https://github.com/yourusername/MMM-NOAAForecast
 *
 *Icons in use by this module:
 *
 *Skycons - Animated icon set by Dark Sky
 *http://darkskyapp.github.io/skycons/
 *(using the fork created by Maxime Warner
 *that allows individual details of the icons
 *to be colored
 *https://github.com/maxdow/skycons)
 *
 *Climacons by Adam Whitcroft
 *http://adamwhitcroft.com/climacons/
 *
 *Free Weather Icons by Svilen Petrov
 *https://www.behance.net/gallery/12410195/Free-Weather-Icons
 *
 *Weather Icons by Thom
 *(Designed for DuckDuckGo)
 *https://dribbble.com/shots/1832162-Weather-Icons
 *
 *Sets 4 and 5 were found on Graphberry, but I couldn't find
 *the original artists.
 *https://www.graphberry.com/item/weather-icons
 *https://www.graphberry.com/item/weathera-weather-forecast-icons
 *
 *Some of the icons were modified to better work with the module's
 *structure and aesthetic.
 *
 *Weather data provided by the National Weather Service (NOAA)
 *
 *By Jeff Clarke
 *MIT Licensed
 *
 ********************************
 */

Module.register("MMM-NOAAForecast", {

  defaults: {
    debug: false,
    latitude: null, // REQUIRED
    longitude: null, // REQUIRED
    units: config.units,
    language: config.language,
    iconset: "1",
    animationSpeed: 1000,
    updateInterval: 10 * 60 * 1000, // 10 minutes
    retryDelay: 2500,
    showSummary: true,
    forecastHeaderText: "",
    showForecastTableColumnHeaderIcons: true,
    showHourlyForecast: true,
    hourlyForecastInterval: 3,
    maxHourliesToShow: 3,
    hourlyExtras: "precipitation,wind",
    showDailyForecast: true,
    maxDailiesToShow: 3,
    dailyExtras: "precipitation,wind",
    showExtraCurrentConditions: true,
    extraCurrentConditions: "high/low,wind,uvIndex,precipitation,feelsLike,sunrise/sunset",
    showFeelsLikeTemp: false,
    showPrecipitation: true,
    showWind: true,
    showCurrentConditions: true,
    label_maximum: "max",
    label_high: "High",
    label_low: "Low",
    label_wind: "Wind",
    label_gusts: "gusts",
    label_feels_like: "Feels like",
    label_daily_forecast: "Daily",
    label_hourly_forecast: "Hourly",
    label_sunrise: "Sunrise",
    label_sunset: "Sunset",
    label_precipitation: "Precip",
    label_uv_index: "UV",
    label_uv_index_value: "UV Index",
    label_current_conditions: "Current",
    tableClass: "small",
    iconSize: 1, // 0.5 - 1.5,
    useWeatherIcons: false, // If true, use the OpenWeatherMap built-in icon classes (not recommended)
    decimalSymbol: ".",
    fade: true,
    fadePoint: 0.25, // Start on 1/4th of the list.
    apiBaseURL: null, // No longer used, but kept for backward compatibility with older config files
    appid: null, // No longer used, but kept for backward compatibility with older config files
    concise: true,
    animateMainIconOnly: true
  },

  getScripts: function () {
    return ["moment.js", "skycons.js"];
  },

  getStyles: function () {
    return ["font-awesome.css", "MMM-NOAAForecast.css"];
  },

  getTemplate: function () {
    return "MMM-NOAAForecast.njk";
  },

  getTemplateData: function () {
    return this.forecast;
  },

  /*
   * For the Skycons animated icon set.
   * This mapping is a custom conversion from NOAA's icon codes
   * to the Skycons names.
   */
  skyconIconTable: {
    "skc": "clear-day",
    "few": "partly-cloudy-day",
    "sct": "partly-cloudy-day",
    "bkn": "cloudy",
    "ovc": "cloudy",
    "wind_skc": "wind",
    "wind_few": "wind",
    "wind_sct": "wind",
    "wind_bkn": "wind",
    "wind_ovc": "wind",
    "snow": "snow",
    "blizzard": "snow",
    "rain_snow": "rain-snow",
    "rain_sleet": "sleet",
    "snow_sleet": "snow-sleet",
    "fzra": "sleet",
    "rain": "rain",
    "heavy_rain": "rain",
    "rain_showers": "rain",
    "tstorm": "thunder",
    "tstorm_rain": "thunder",
    "tstorm_hail": "hail",
    "hail": "hail",
    "sleet": "sleet",
    "fog": "fog",
    "haze": "fog",
    "dust": "fog",
    "smoke": "fog",
    "tornado": "wind",
    "squall": "wind",
    "tropical_storm": "wind",
    "hurricane": "wind"
  },

  /*
   * For the weather-icons font
   */
  weatherIconTable: {
    "skc": "day-sunny",
    "few": "day-cloudy",
    "sct": "day-cloudy",
    "bkn": "cloudy",
    "ovc": "cloudy",
    "wind_skc": "day-sunny-windy",
    "wind_few": "day-cloudy-windy",
    "wind_sct": "day-cloudy-windy",
    "wind_bkn": "cloudy-windy",
    "wind_ovc": "cloudy-windy",
    "snow": "snow",
    "blizzard": "snow-wind",
    "rain_snow": "rain-mix",
    "rain_sleet": "rain-mix",
    "snow_sleet": "rain-mix",
    "fzra": "sleet",
    "rain": "rain",
    "heavy_rain": "rain",
    "rain_showers": "showers",
    "tstorm": "thunderstorm",
    "tstorm_rain": "thunderstorm",
    "tstorm_hail": "hail",
    "hail": "hail",
    "sleet": "sleet",
    "fog": "fog",
    "haze": "day-haze",
    "dust": "dust",
    "smoke": "smoke",
    "tornado": "tornado",
    "squall": "cloudy-gusts",
    "tropical_storm": "storm-showers",
    "hurricane": "hurricane"
  },

  start: function () {
    this.forecast = {};
    this.forecast.loaded = false;
    this.iconCache = [];
    this.sendSocketNotification("NOAA_CALL_FORECAST_GET", {
      latitude: this.config.latitude,
      longitude: this.config.longitude,
      instanceId: this.identifier,
    });
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "NOAA_CALL_FORECAST_DATA" && payload.instanceId === this.identifier) {
      Log.log(`[MMM-NOAAForecast] Received weather data.`);
      this.processWeather(payload.payload);
      this.updateDom(this.config.animationSpeed);
    }
  },

  /*
   * This is the core data processing function. It takes the raw NOAA data
   * and transforms it into the format the module's template expects.
   */
  processWeather: function (data) {
    Log.log("Processing NOAA data:", data);

    const hourly = data.forecastHourly.properties.periods;
    const daily = data.forecast.properties.periods;
    const grid = data.forecastGridData.properties;

    // Daily Forecast
    const dailyForecast = [];
    for (let i = 0; i < this.config.maxDailiesToShow * 2 && i < daily.length; i++) {
      const period = daily[i];
      const day = {
        date: moment(period.startTime).format("ddd"),
        high: period.temperature,
        low: i % 2 === 0 ? daily[i + 1]?.temperature : period.temperature, // The "daily" forecast is a series of day/night periods.
        icon: this.getIcon(period.icon, period.isDaytime),
        summary: period.detailedForecast,
        precipitation: period.probabilityOfPrecipitation.value,
        wind: period.windSpeed + " " + period.windDirection
      };
      if (period.isDaytime) {
        dailyForecast.push(day);
      }
    }

    // Hourly Forecast
    const hourlyForecast = [];
    for (let i = 0; i < this.config.maxHourliesToShow; i++) {
      const period = hourly[i * this.config.hourlyForecastInterval];
      if (period) {
        hourlyForecast.push({
          time: moment(period.startTime).format("h A"),
          temp: period.temperature,
          icon: this.getIcon(period.icon, period.isDaytime),
          precipitation: period.probabilityOfPrecipitation.value,
          wind: period.windSpeed + " " + period.windDirection
        });
      }
    }

    // Current Conditions
    const current = hourly[0];
    const currentConditions = {
      temp: current.temperature,
      temp_high: daily[0].temperature,
      temp_low: daily[1].temperature,
      summary: daily[0].detailedForecast,
      feelsLike: current.temperature, // NOAA doesn't provide a separate "feels like"
      icon: this.getIcon(current.icon, current.isDaytime),
      wind: current.windSpeed + " " + current.windDirection,
      humidity: current.relativeHumidity.value,
      uvIndex: grid.uvIndex.values[0].value,
      precipitation: current.probabilityOfPrecipitation.value,
      sunrise: moment(grid.sunrise.values[0].value).unix(),
      sunset: moment(grid.sunset.values[0].value).unix()
    };

    // Construct the final data object for the template
    this.forecast = {
      loaded: true,
      current: currentConditions,
      hourly: hourlyForecast,
      daily: dailyForecast,
      config: this.config
    };
  },

  /*
   *Converts NOAA icon URL to the correct icon name for the selected icon set.
   *This is a critical function as it bridges the two different APIs.
   * 
   */
  getIcon: function (iconUrl, isDaytime) {
    const iconName = iconUrl.split("/").pop().split("?")[0].replace(/\d+/g, "").toLowerCase();
    Log.log(`Raw icon name: ${iconName}`);

    let iconToUse;
    if (this.config.iconset === "1") {
      iconToUse = this.skyconIconTable[iconName] || "clear-day";
      if (!isDaytime) {
        iconToUse = iconToUse.replace("day", "night");
      }
    } else {
      iconToUse = this.weatherIconTable[iconName] || "day-sunny";
      if (!isDaytime) {
        iconToUse = iconToUse.replace("day-", "night-");
      }
    }
    Log.log(`Mapped icon to: ${iconToUse}`);
    return iconToUse;
  },

  // The rest of the original code for adding icons and playing the animation
  // remains unchanged, as it's not tied to the data source.
  addIcon: function (icon, isMainIcon) {
    // ... (unchanged code)
    Log.debug(`Adding icon: ${icon}, ${isMainIcon}`);
    let iconId = "skycon_main";
    if (!isMainIcon) {
      iconId = `skycon_${this.iconCache.length}`;
    }
    this.iconCache.push({ id: iconId, icon });
    return iconId;
  },

  playIcons: function (inst) {
    // ... (unchanged code)
    inst.iconCache.forEach((icon) => {
      Log.debug(`Adding animated icon ${icon.id}: '${icon.icon}'`);
      inst.skycons.add(icon.id, icon.icon);
    });
    inst.skycons.play();
  },

  sanitizeNumbers: function (keys) {
    // ... (unchanged code)
    const self = this;
    keys.forEach((key) => {
      if (!self.config.hasOwnProperty(key)) {
        return;
      }
      self.config[key] = parseFloat(self.config[key]);
      if (isNaN(self.config[key])) {
        self.config[key] = self.defaults[key];
        Log.error(`[MMM-NOAAForecast] ** Invalid number detected for config parameter '${key}'. Using default value: ${self.config[key]}`);
      }
    });
  },

  suspend: function () {
    Log.log(`[MMM-NOAAForecast] Module suspended.`);
    // Stop the icon animation
    if (this.skycons) {
      this.skycons.pause();
    }
  },

  resume: function () {
    Log.log(`[MMM-NOAAForecast] Module resumed.`);
    // Restart the icon animation
    if (this.skycons) {
      this.skycons.play();
    }
  }
});
