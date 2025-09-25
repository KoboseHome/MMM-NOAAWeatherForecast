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
    debug: false,
    apiBase: "https://api.weather.gov/gridpoints/",
    // Other default values specific to NOAA.
    // Ensure all required config parameters for your template are here.
    location: {
      latitude: 0,
      longitude: 0,
      gridId: "",
      gridX: 0,
      gridY: 0,
    },
    language: "en",
    showCurrentConditions: true,
    showSummary: true,
    showExtraCurrentConditions: true,
    showHourlyForecast: true,
    showDailyForecast: true,
    colored: true,
    forecastLayout: "vertical",
    iconset: "3", // default icon set
    updateInterval: 10 * 60 * 1000, // 10 minutes
    retryDelay: 5000,
    // extra conditions to show, mapping to your template
    extraCurrentConditions: {
      highLowTemp: true,
      sunrise: true,
      sunset: true,
      precipitation: true,
      wind: true,
      barometricPressure: true,
      humidity: true,
      dewPoint: true,
      uvIndex: true,
      visibility: true,
    },
    dailyExtras: {
      precipitation: true,
      sunrise: true,
      sunset: true,
      wind: true,
      barometricPressure: true,
      humidity: true,
      dewPoint: true,
      uvIndex: true,
    },
    hourlyExtras: {
      precipitation: true,
      wind: true,
      barometricPressure: true,
      humidity: true,
      dewPoint: true,
      uvIndex: true,
      visibility: true,
    },
  },

  phrases: {
    loading: "Loading NOAA Weather...",
    // You can add other phrases here
  },

  forecast: null,
  loading: true,
  skycons: null,
  iconCache: [],
  suspended: false,

  start: function () {
    const self = this;
    Log.info(`[MMM-NOAAWeatherForecast] Starting module: ${this.name}`);
    this.updateTimer = null;
    this.scheduleUpdate(0);
  },

  getStyles: function () {
    return [
      "MMM-NOAAWeatherForecast.css",
      `font-awesome.css`,
      `weather-icons.css`,
    ];
  },

  getScripts: function () {
    const scripts = ["moment.js"];

    if (this.config.iconset === "1") {
      scripts.push(this.file("skycons.js"));
    }
    return scripts;
  },

  getTemplate: function () {
    // This is the correct method to get the template path.
    // MagicMirror will automatically look in the module's directory.
    return "MMM-NOAAWeatherForecast.njk";
  },

  getTemplateData: function () {
    // This method provides the data to the Nunjucks template.
    return {
      forecast: this.forecast,
      config: this.config,
      loading: this.loading,
      phrases: this.phrases,
      animatedIconSizes: {
        main: this.config.sizeForMainIcon,
        forecast: this.config.sizeForForecastIcon,
      },
      inlineIcons: {
        // You'll need to define the paths to your inline icons here,
        // similar to what's in the original OpenWeatherForecast module.
        sunrise: this.file("icons/inline/sunrise.svg"),
        sunset: this.file("icons/inline/sunset.svg"),
        rain: this.file("icons/inline/rain.svg"),
        wind: this.file("icons/inline/wind.svg"),
        pressure: this.file("icons/inline/pressure.svg"),
        humidity: this.file("icons/inline/humidity.svg"),
        dewPoint: this.file("icons/inline/dewpoint.svg"),
        uvIndex: this.file("icons/inline/uvindex.svg"),
        visibility: this.file("icons/inline/visibility.svg"),
      },
    };
  },

  getDom: function () {
    // This is the standard way to render the template.
    // It calls getTemplate and getTemplateData for you.
    return this.render(this.getTemplate(), this.getTemplateData());
  },

  scheduleUpdate: function (delay) {
    const self = this;
    let nextLoad = this.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }
    Log.info(`[MMM-NOAAWeatherForecast] Weather update scheduled for ${moment().add(nextLoad, 'milliseconds').fromNow()}`);
    this.updateTimer = setTimeout(() => {
      self.sendSocketNotification("FETCH_WEATHER", self.config);
    }, nextLoad);
  },

  socketNotificationReceived: function (notification, payload) {
    Log.info(`[MMM-NOAAWeatherForecast] Socket notification received: ${notification}`);
    if (notification === "WEATHER_DATA") {
      if (payload.loading !== undefined) {
        this.loading = payload.loading;
      }
      if (payload.forecast) {
        this.forecast = payload.forecast;
        this.loading = false;
        if (this.config.iconset === "1") {
          // You'll need to handle the Skycons logic here
          // to add the icons to your iconCache.
          // This should be done in the node_helper.js and passed back.
        }
      }
      this.updateDom(1000);
      this.scheduleUpdate();
    }
  },

  notificationReceived: function (notification, payload) {
    // This is a placeholder, you can add logic here if you need to
    // listen for other module's notifications.
  },

  // Helper method to convert weather conditions to a skycon icon ID
  // You can adapt this to your NOAA data structure.
  getSkycon: function (condition) {
    // Implement your logic to map NOAA conditions to Skycons IDs
    // This is just a placeholder example
    switch (condition) {
      case "rain":
        return "rain";
      case "cloudy":
        return "cloudy";
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

});
