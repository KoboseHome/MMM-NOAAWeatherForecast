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
    apiBase: "https://api.weather.gov/points/",
    units: "imperial",
    language: config.language,
    latitude: null,
    longitude: null,
    forecastType: "daily",
    updateInterval: 10 * 60 * 1000, // 10 minutes
    animationSpeed: 2 * 1000,
    timeFormat: 12,
    showForecastRow: true,
    showHourlyForecast: true,
    showExtendedForecast: true,
    showSummary: true,
    showDailyForecast: true,
    useSkycons: true,
    showIcons: true,
    iconSet: "1",
    fade: true,
    fadePoint: 0.25,
    maxDays: 5,
    maxHourly: 24,
    showMinimumGrid: false,
    showPrecipitationGrid: true,
    showDewpointGrid: false,
    showWindSpeedGrid: true,
    showWindDirectionGrid: true,
    showCloudCoverGrid: true,
    showRelativeHumidityGrid: true,
    showVisibilityGrid: false,
    showHeatIndexGrid: false,
    showApparentTemperatureGrid: true,
    showProbabilityOfPrecipitation: true,
    showTemperatures: true,
    showWindSpeed: true,
    showWindDirection: true,
    showSunrise: true,
    showSunset: true,
    showCurrentConditions: true,
    showFeelsLikeTemp: false,
    label_hourlyTimeFormat: "h a",
    label_dailyTimeFormat: "ddd",
  },

  getScripts: function () {
    return [
      "moment.js",
      this.file("node_modules/moment-timezone/builds/moment-timezone-with-data-2012-2022.min.js"),
      "https://cdnjs.cloudflare.com/ajax/libs/skycons/1396650462/skycons.js",
    ];
  },

  getStyles: function () {
    return [
      "MMM-NOAAWeatherForecast.css",
      "font-awesome.css",
    ];
  },

  getTemplate: function () {
    return "MMM-NOAAWeatherForecast.njk";
  },

  getTemplateData: function () {
    return {
      loaded: this.loaded,
      config: this.config,
      forecast: this.formattedWeatherData,
      skyconsEnabled: this.config.useSkycons && this.config.showIcons,
      playIcons: this.playIcons.bind(this),
      // The new template expects a summary, we'll use the current summary
      summary: this.formattedWeatherData && this.formattedWeatherData.currently.summary,
      // The new template expects a separate hourly and daily forecast
      hourlyForecast: this.formattedWeatherData && this.formattedWeatherData.hourly,
      dailyForecast: this.formattedWeatherData && this.formattedWeatherData.daily,
    };
  },

  start: function () {
    Log.info(`Starting module: ${this.name}`);
    this.forecast = {};
    this.forecast.currently = {};
    this.forecast.daily = {};
    this.forecast.hourly = {};
    this.iconCache = [];
    this.loaded = false;
    this.instanceId = moment().unix();
    this.getForecast();
    this.scheduleUpdate();
  },

  getDom: function () {
    const wrapper = document.createElement("div");

    if (!this.loaded) {
      wrapper.innerHTML = "LOADING...";
      wrapper.className = "dimmed light small";
      return wrapper;
    }
    
    // The main DOM creation logic is now in the Nunjucks template.
    // This method is now only responsible for returning the result of the template.
    return this.render(this.getTemplate(), this.getTemplateData());
  },

  getForecast: function () {
    Log.info(`[MMM-NOAAWeatherForecast] Getting forecast for instance: ${this.instanceId}`);
    this.sendSocketNotification("NOAA_CALL_FORECAST_GET", {
      instanceId: this.instanceId,
      latitude: this.config.latitude,
      longitude: this.config.longitude,
      units: this.config.units,
      language: this.config.language,
    });
  },

  processForecast: function (data) {
    if (!data || !data.hourly || !data.daily || !data.grid) {
      Log.error("[MMM-NOAAWeatherForecast] Invalid data received from node_helper. Missing 'hourly', 'daily', or 'grid' properties.");
      this.updateDom(this.config.animationSpeed);
      return;
    }

    this.forecast.hourly = data.hourly;
    this.forecast.daily = data.daily;
    this.forecast.grid = data.grid;

    // Set 'currently' from the first hourly period
    if (this.forecast.hourly.properties.periods.length > 0) {
      const currentPeriod = this.forecast.hourly.properties.periods[0];
      this.forecast.currently.summary = currentPeriod.shortForecast;
      this.forecast.currently.temperature = currentPeriod.temperature;
    }
    
    // Process data for Nunjucks template
    this.formattedWeatherData = this.processWeatherData();

    this.loaded = true;
    this.updateDom(this.config.animationSpeed);
  },

  processWeatherData: function() {
    const periodsHourly = this.forecast.hourly.properties.periods;
    const periodsDaily = this.forecast.daily.properties.periods;
    
    const hourlyForecast = periodsHourly.slice(0, this.config.maxHourly).map(p => ({
        time: moment(p.startTime).format(this.config.label_hourlyTimeFormat),
        temperature: p.temperature,
        summary: p.shortForecast,
        icon: this.getSkycon(p.shortForecast),
    }));

    const dailyForecast = periodsDaily.slice(0, this.config.maxDays).map(p => ({
        day: moment(p.startTime).format(this.config.label_dailyTimeFormat),
        high: p.temperature,
        low: p.temperature, // NOAA API doesn't provide a separate low temp in the daily forecast
        summary: p.shortForecast,
        icon: this.getSkycon(p.shortForecast),
    }));
    
    // NOAA daily forecast provides only one temperature (high). We can
    // attempt to get the low from the next night's forecast.
    if (periodsDaily.length > 1) {
      for (let i = 0; i < dailyForecast.length; i++) {
        if (i + 1 < periodsDaily.length) {
          dailyForecast[i].low = periodsDaily[i+1].temperature;
        }
      }
    }


    return {
      currently: {
        temperature: this.config.showFeelsLikeTemp ? this.getFeelsLikeTemp() : this.forecast.currently.temperature,
        summary: this.forecast.currently.summary,
        icon: this.getSkycon(this.forecast.currently.summary)
      },
      hourly: hourlyForecast,
      daily: dailyForecast
    };
  },
  
  // A helper function to get the "feels like" temperature.
  // The NOAA API provides Heat Index and Apparent Temperature,
  // which can be used to approximate this.
  getFeelsLikeTemp: function() {
    const gridData = this.forecast.grid.properties;
    if (gridData.heatIndex && gridData.heatIndex.values.length > 0) {
        return gridData.heatIndex.values[0].value;
    }
    if (gridData.apparentTemperature && gridData.apparentTemperature.values.length > 0) {
        return gridData.apparentTemperature.values[0].value;
    }
    return this.forecast.currently.temperature;
  },

  socketNotificationReceived: function (notification, payload) {
    Log.debug("[MMM-NOAAWeatherForecast] received socket notification", notification, payload);
    if (notification === "NOAA_CALL_FORECAST_DATA" && payload.instanceId === this.instanceId) {
      Log.info("[MMM-NOAAWeatherForecast] Received new forecast data from node_helper.");
      
      let dataToProcess;
      // Check if the payload is a string and needs parsing
      if (typeof payload.payload === 'string') {
          try {
              dataToProcess = JSON.parse(payload.payload);
              Log.info("[MMM-NOAAWeatherForecast] Successfully parsed string payload.");
          } catch (e) {
              Log.error("[MMM-NOAAWeatherForecast] Failed to parse payload string:", e);
              return;
          }
      } else {
          dataToProcess = payload.payload;
          Log.info("[MMM-NOAAWeatherForecast] Received object payload.");
      }
      
      this.processForecast(dataToProcess);
    }
  },

  scheduleUpdate: function (delay) {
    var nextUpdate = this.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextUpdate = delay;
    }

    var self = this;
    setTimeout(function () {
      self.getForecast();
    }, nextUpdate);
  },

  // The addIcon and playIcons functions and all other utility functions
  // remain unchanged, as they are not tied to the data source.
  addIcon: function (icon, isMainIcon) {
    Log.debug(`Adding icon: ${icon}, ${isMainIcon}`);
    let iconId = "skycon_main";
    if (!isMainIcon) {
      iconId = `skycon_${this.iconCache.length}`;
    }
    this.iconCache.push({
      id: iconId,
      icon
    });
    return iconId;
  },

  playIcons: function (inst) {
    inst.iconCache.forEach((icon) => {
      Log.debug(`Adding animated icon ${icon.id}: '${icon.icon}'`);
      inst.skycons.add(icon.id, icon.icon);
    });
    inst.skycons.play();
  },

  getSkycon: function(forecast) {
    forecast = forecast.toLowerCase();
    if (forecast.includes("snow") || forecast.includes("flurries")) return "snow";
    if (forecast.includes("sleet") || forecast.includes("ice pellets")) return "sleet";
    if (forecast.includes("windy")) return "wind";
    if (forecast.includes("foggy")) return "fog";
    if (forecast.includes("cloudy")) return "cloudy";
    if (forecast.includes("partly cloudy") || forecast.includes("mostly cloudy")) return "partly-cloudy";
    if (forecast.includes("clear")) return "clear-day"; // or "clear-night" depending on isDaytime property
    if (forecast.includes("sunny")) return "clear-day";
    if (forecast.includes("rain") || forecast.includes("showers") || forecast.includes("drizzle")) return "rain";
    return "cloudy"; // Default icon
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
   * This method is added to resolve the "this.render is not a function" error.
   */
  render: function (template, data) {
    if (typeof nunjucks === "undefined") {
      Log.error("[MMM-NOAAWeatherForecast] Nunjucks not loaded.");
      return document.createTextNode("");
    }
    const html = nunjucks.render(template, data);
    const element = document.createElement("div");
    element.innerHTML = html;
    return element.firstChild;
  },
});
