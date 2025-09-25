/* eslint-disable camelcase */
/* globals config, moment, Skycons */

/**
 ********************************
 *
 *MagicMirror² Module:
 *MMM-NOAAWeatherForecast
 *https://github.com/KoboseHome/MMM-NOAAWeatherForecast
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
    debug: false,
    apiBase: "https://api.weather.gov",
    noaaPoint: null,
    updateInterval: 10 * 60 * 1000, // Every 10 minutes
    retryDelay: 10 * 1000,
    request: {
      location: null,
      units: "us" // use US units for now
    },
    use: "forecast", // "forecast" or "hourly"
    useHeader: true,
    forecastHeaderText: null,
    showSummary: true,
    showCurrentConditions: true,
    showTemperature: true,
    showPrecipitation: true,
    colored: true,
    iconset: "3", // "1" to "5", or "meteocons"
    animated: false,
    forecastLayout: "tiled",
    horizontalIcons: false, // only works with "tiled" layout
    hourly: {
      use:"hourly",
      numHours: 6
    },
    daily: {
      use:"daily",
      numDays: 5,
      startDay: 0
    },
    currentConditions: {
      showIcon: true,
      showDescription: true,
      showTemperature: true,
      showFeelsLike: false,
      showWind: false,
      showUV: false,
      showHumidity: false,
      showPrecipitation: true,
    },
    dailyExtras: {
      show: true,
      showSunrise: false,
      showSunset: false,
      showWind: false,
      showHumidity: false,
      showPressure: false,
      showDewPoint: false,
      showUVIndex: false,
    },
    alert: {
      title: "Weather Alerts",
      titleClasses: "bold",
      showSource: true,
      fade: false
    }
  },

  /**
   * Data to be rendered on the DOM.
   *
   * @type {object}
   */
  forecast: null,
  
  /**
   * Stores the last update time.
   *
   * @type {object}
   */
  lastUpdate: null,
  
  /**
   * Weather module CSS classes
   *
   * @type {object}
   */
  
  weatherClasses: {
    'day': 'fa-sun-o',
    'night': 'fa-moon-o',
    'clear-day': 'fa-sun-o',
    'clear-night': 'fa-moon-o',
    'rain': 'fa-tint',
    'snow': 'fa-snowflake-o',
    'sleet': 'fa-snowflake-o',
    'wind': 'fa-wind',
    'fog': 'fa-cloud',
    'cloudy': 'fa-cloud',
    'partly-cloudy-day': 'fa-cloud-sun',
    'partly-cloudy-night': 'fa-cloud-moon',
    'thunderstorm': 'fa-bolt',
    'tornado': 'fa-exclamation-triangle',
    'hail': 'fa-snowflake-o',
  },

  /**
   * Initial start routine.
   */
  start: function () {
    Log.info(`Starting module: ${this.name}`);
    this.forecast = null;
    this.loading = true;
    this.scheduleUpdate(this.config.initialLoadDelay);
  },

  /**
   * This method is called by the MagicMirror framework.
   * It loads the CSS files required for the module.
   */
  getStyles: function () {
    return [
      "MMM-NOAAWeatherForecast.css",
      "font-awesome.css"
    ];
  },

  /**
   * This method is called by the MagicMirror framework.
   * It returns the path to the Nunjucks template file.
   */
  getScripts: function () {
    return [
      "https://cdnjs.cloudflare.com/ajax/libs/nunjucks/3.2.1/nunjucks-slim.min.js",
      "skycons.js"
    ];
  },

  /**
   * This method is called by the MagicMirror framework.
   * It returns the path to the Nunjucks template file.
   */
  getDom: function () {
    let wrapper = document.createElement("div");

    if (this.loading) {
      wrapper.innerHTML = this.render("MMM-NOAAWeatherForecast.njk", {
        loading: this.loading,
        phrases: this.phrases,
        config: this.config
      });
      wrapper.className = "dimmed light small";
      return wrapper;
    }
    
    // The previous code had a render method that needed to be re-added
    // and this is where it's being used.
    wrapper.innerHTML = this.render("MMM-NOAAWeatherForecast.njk", this.forecast);
    
    return wrapper;
  },

  /**
   * This method is called by the MagicMirror framework.
   * It handles the notifications from other modules.
   */
  notificationReceived: function(notification, payload, sender) {
    if (notification === "DOM_OBJECTS_CREATED") {
      // Once the DOM is ready, we can play the animated icons.
      this.playIcons(this);
    }
  },

  /**
   * Helper method to render a Nunjucks template.
   * This is a non-standard method for MagicMirror modules but is used
   * in the original MMM-OpenWeatherForecast module to separate HTML from JS.
   * This method is added to resolve the "this.render is not a function" error.
   */
  render: function (template, data) {
    if (typeof nunjucks === "undefined") {
      Log.error("[MMM-NOAAWeatherForecast] Nunjucks not loaded.");
      return document.createTextNode("");
    }
    const html = nunjucks.render(template, data);
    return html;
  },

  /**
   * Schedules the next update.
   *
   * @param {number} delay - The delay in milliseconds before the next update.
   */
  scheduleUpdate: function (delay) {
    let nextLoad = this.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }
    clearTimeout(this.updateTimer);
    Log.log(`[MMM-NOAAWeatherForecast] Next update scheduled in ${Math.round(nextLoad / 1000)}s.`);
    this.updateTimer = setTimeout(() => {
      this.getNOAAData();
    }, nextLoad);
  },

  /**
   * Retrieves weather data from the NOAA API.
   */
  getNOAAData: function () {
    this.sendSocketNotification("NOAA_WEATHER_REQUEST", this.config);
  },

  /**
   * Handles notifications from the node_helper.
   *
   * @param {string} notification - The notification name.
   * @param {*} payload - The notification payload.
   */
  socketNotificationReceived: function (notification, payload) {
    if (notification === "NOAA_WEATHER_DATA") {
      if (this.config.debug) {
        Log.info("[MMM-NOAAWeatherForecast] Raw data received:", payload);
      }
      this.processData(payload);
      this.loading = false;
      this.lastUpdate = new Date();
      this.updateDom();
      this.scheduleUpdate();
    } else if (notification === "NOAA_WEATHER_ERROR") {
      Log.error("[MMM-NOAAWeatherForecast] Error retrieving weather data: ", payload);
      this.loading = false;
      this.updateDom();
      this.scheduleUpdate(this.config.retryDelay);
    }
  },

  /**
   * Processes the received NOAA data.
   *
   * @param {object} data - The raw NOAA data.
   */
  processData: function (data) {
    if (!data) {
      Log.error("[MMM-NOAAWeatherForecast] No data received from NOAA.");
      return;
    }
    
    // Pass data directly to the template
    this.forecast = {
      currently: this.processCurrentConditions(data.currentObservation),
      daily: this.processDailyForecast(data.dailyForecast),
      hourly: this.processHourlyForecast(data.hourlyForecast)
    };
    
    // Add other data needed for the template
    this.forecast.config = this.config;
    this.forecast.animatedIconSizes = {
      main: 150,
      hourly: 50,
      daily: 60
    };
    this.forecast.inlineIcons = {
      wind: `fa-wind`,
      humidity: `wi-humidity`,
      pressure: `wi-barometer`,
      dewPoint: `wi-thermometer-exterior`,
      uvIndex: `wi-day-sunny`
    };

    // Add logic to get the correct icon, summary, and other details.
  },

  /**
   * Helper function to process current conditions.
   *
   * @param {object} current - The current observation data.
   * @returns {object} - The processed current conditions.
   */
  processCurrentConditions: function (current) {
    // Implement your logic to process the current weather data.
    return {
      temperature: current.temperature,
      icon: this.getIconClass(current.icon)
    };
  },

  /**
   * Helper function to process daily forecast.
   *
   * @param {object} daily - The daily forecast data.
   * @returns {Array<object>} - The processed daily forecast.
   */
  processDailyForecast: function (daily) {
    // Implement your logic to process the daily forecast data.
    return daily.map(day => ({
      temperature: day.temperature,
      icon: this.getIconClass(day.icon)
    }));
  },

  /**
   * Helper function to process hourly forecast.
   *
   * @param {object} hourly - The hourly forecast data.
   * @returns {Array<object>} - The processed hourly forecast.
   */
  processHourlyForecast: function (hourly) {
    // Implement your logic to process the hourly forecast data.
    return hourly.map(hour => ({
      temperature: hour.temperature,
      icon: this.getIconClass(hour.icon)
    }));
  },

  /**
   * Helper to get the correct icon class based on NOAA's icon string.
   *
   * @param {string} iconUrl - The NOAA icon URL string.
   * @returns {string} - The corresponding icon class.
   */
  getIconClass: function(iconUrl) {
    // Example: "https://api.weather.gov/icons/land/day/skc?size=medium"
    const iconName = iconUrl.split('/').pop().split('?')[0];
    switch (iconName) {
      case 'skc':
      case 'skc_hi':
      case 'few':
      case 'sct':
        return 'clear-day';
      case 'bkn':
      case 'ovc':
        return 'cloudy';
      case 'fzra':
      case 'ra':
      case 'shra':
        return 'rain';
      case 'sn':
      case 'blizzard':
        return 'snow';
      case 'tsra':
      case 'tsra_hi':
        return 'thunderstorm';
      default:
        return 'cloudy'; // Default icon
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
  
  /*
   *For use with the Skycons animated icon set. Once the
   *DOM is updated, the icons are built and set to animate.
   *Name is a bit misleading. We needed to wait until
   *the canvas elements got added to the Dom, which doesn't
   *happen until after updateDom() finishes executing
   *before actually drawing the icons.
   */
  playIcons (inst) {
    if (this.config.animated) {
      if (typeof inst.skycons === "undefined") {
        inst.skycons = new Skycons({
          "color": inst.config.colored ? "currentColor" : "#fff"
        });
      }

      inst.skycons.removeAll();
      inst.iconCache.forEach((icon) => {
        Log.debug(`Adding animated icon ${icon.id}: '${icon.icon}'`);
        inst.skycons.add(icon.id, icon.icon);
      });
      inst.skycons.play();
    }
  }
});
