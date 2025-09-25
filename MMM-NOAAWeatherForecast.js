/* eslint-disable camelcase */
/* globals config, moment, Skycons */

/**
 ********************************
 *
 *MagicMirror² Module:
 *MMM-NOAAWeatherForecast
 *https://github.com/yourusername/MMM-NOAAWeatherForecast
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

Module.register("MMM-NOAAWeatherForecast", {

  requiresVersion: "2.2.0",

  defaults: {
    // You should use the weather.gov API which is rate-limited to 50 requests per minute
    // So updateInterval needs to be at least 1.2 minutes (72 seconds)
    // to keep you within the limits of the API.
    // However, it's recommended to use a longer interval since weather forecasts don't change that frequently.
    updateInterval: 10 * 60 * 1000, // 10 minutes

    lat: null, // Required. Find with http://www.latlong.net/
    lon: null, // Required. Find with http://www.latlong.net/

    location: "Location", // The name of the location to display
    units: "imperial", // "imperial" or "metric"
    language: "en-us", // "en-us", "es-es", etc.
    showForecastDays: 5, // The number of days to show a forecast for
    showHourlyForecast: 24, // The number of hourly forecasts to show
    showSummary: true, // Show the summary text
    showIcon: true, // Show the weather icon
    showTemps: true, // Show high/low temperatures
    showPrecipitation: true, // Show precipitation probability
    showWind: true, // Show wind speed and direction
    showHumidity: true, // Show humidity
    showSunriseSunset: true, // Show sunrise and sunset times
    showFeelsLike: false, // Show "feels like" temperature
    showUVIndex: false, // Show UV index

    // Icon packs. Use one or more of these
    iconSets: ["skycons", "climacons"],

    // The Skycons animated icon set can be colored
    skyconColors: {
      sun: "#fff",
      moon: "#fff",
      cloud: "#999",
      rain: "#00f",
      sleet: "#66f",
      snow: "#fff",
      wind: "#666",
      fog: "#999"
    },

    animationSpeed: 1000,
    debug: false,
    useHeader: true
  },

  getScripts: function () {
    return [
      "moment.js",
      this.file("node_modules/skycons/skycons.js"),
      "moment-timezone"
    ];
  },

  getStyles: function () {
    return [
      "weather-icons.css",
      "font-awesome.css",
      this.file("style/style.css"),
    ];
  },

  getTemplate: function () {
    return "forecast.njk";
  },

  getTemplateData: function () {
    return this.forecast;
  },

  start: function () {
    Log.info(`Starting module: ${this.name}`);
    this.forecast = null;
    this.loading = true;
    this.iconCache = [];
    this.skycons = new Skycons({
      "monochrome": false
    });
    this.skycons.color(this.config.skyconColors);
    this.sanitizeNumbers(["lat", "lon"]);
    this.loadForecast();
  },

  loadForecast: function () {
    if (this.config.debug) {
      Log.log("[MMM-NOAAWeatherForecast] Loading forecast...");
    }

    const apiUrl = `https://api.weather.gov/points/${this.config.lat},${this.config.lon}`;
    this.sendSocketNotification("FETCH_FORECAST", {
      apiUrl: apiUrl,
      lat: this.config.lat,
      lon: this.config.lon,
    });
  },

  socketNotificationReceived: function (notification, payload) {
    if (this.config.debug) {
      Log.log(`[MMM-NOAAWeatherForecast] Received notification: ${notification}`);
    }

    if (notification === "FORECAST_DATA") {
      if (this.config.debug) {
        Log.log("[MMM-NOAAWeatherForecast] Got forecast data:", payload);
      }
      this.forecast = payload;
      this.loading = false;
      this.updateDom(this.config.animationSpeed);
    } else if (notification === "FORECAST_ERROR") {
      this.loading = false;
      this.updateDom(this.config.animationSpeed);
      Log.error("[MMM-NOAAWeatherForecast] Forecast error:", payload);
    }
  },

  getDom: function () {
    if (this.loading) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = "LOADING FORECAST...";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (!this.forecast) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = "FORECAST DATA NOT AVAILABLE";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    this.forecast.forecasts.forEach(forecast => {
      // Add icon to cache for Skycons
      if (this.config.iconSets.includes("skycons")) {
        const iconId = `skycon_${forecast.timestamp}`;
        this.iconCache.push({ id: iconId, icon: this.getSkycon(forecast.icon) });
      }
    });

    this.forecast.hourlyForecasts.forEach(hourly => {
      // Add icon to cache for Skycons
      if (this.config.iconSets.includes("skycons")) {
        const iconId = `skycon_hourly_${hourly.timestamp}`;
        this.iconCache.push({ id: iconId, icon: this.getSkycon(hourly.icon) });
      }
    });

    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.render(this.getTemplate(), this.getTemplateData());

    // Play icons after DOM is updated
    this.playIcons(this);

    return wrapper;
  },

  // Helper function to return the correct Skycon icon name
  getSkycon: function (icon) {
    const iconName = icon.split("/").pop().split(",")[0];
    switch (iconName) {
      case "skc":
        return "clear-day";
      case "few":
        return "partly-cloudy-day";
      case "sct":
      case "bkn":
        return "cloudy";
      case "ovc":
        return "cloudy";
      case "wind_skc":
      case "wind_few":
      case "wind_sct":
      case "wind_bkn":
      case "wind_ovc":
        return "wind";
      case "rain_showers":
      case "rain_showers_hi":
        return "rain";
      case "isolated_showers":
        return "rain";
      case "sct_showers":
        return "rain";
      case "rain":
        return "rain";
      case "tornado":
        return "tornado";
      case "snow":
      case "snow_fzra":
      case "wintry_mix":
        return "snow";
      case "sleet":
        return "sleet";
      case "fog":
        return "fog";
      case "tsra":
      case "tsra_sct":
      case "tsra_hi":
        return "thunderstorms";
      default:
        return "cloudy"; // Default icon
    }
  },

  sanitizeNumbers: function (keys) {
    const self = this;
    keys.forEach((key) => {
      if (!self.config.hasOwnProperty(key)) {
        return;
      }
      self.config[key] = parseFloat(self.config[key]);
      if (isNaN(self.config[key])) {
        self.config[key] = self.defaults[key];
        Log.error(`[MMM-NOAAWeatherForecast] ** Invalid number detected for config parameter '${key}'. Using default value: ${self.config[key]}`);
      }
    });
  },

  suspend: function () {
    Log.log(`[MMM-NOAAWeatherForecast] Module suspended. Stopping updates.`);
    this.suspended = true;
    clearInterval(this.updateTimer);
  },

  resume: function () {
    Log.log(`[MMM-NOAAWeatherForecast] Module resumed. Scheduling updates.`);
    this.suspended = false;
    this.scheduleUpdate(0);
  },
  
  /**
   * Helper method to render a Nunjucks template.
   * This is a non-standard method for MagicMirror modules but is used
   * in the original MMM-OpenWeatherForecast module to separate HTML from JS.
   */
  render: function (template, data) {
    if (typeof nunjucks === "undefined") {
      Log.error("[MMM-NOAAWeatherForecast] Nunjucks not loaded.");
      return document.createTextNode("");
    }
    const html = nunjucks.render(template, data);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper;
  },

  /*
   *For use with the Skycons animated icon set. Once the
   *DOM is updated, the icons are built and set to animate.
   */
  playIcons: function (inst) {
    inst.iconCache.forEach((icon) => {
      Log.debug(`[MMM-NOAAWeatherForecast] Adding animated icon ${icon.id}: '${icon.icon}'`);
      inst.skycons.add(icon.id, icon.icon);
    });
    inst.skycons.play();
  }
});
