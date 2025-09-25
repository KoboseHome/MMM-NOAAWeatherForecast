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
    lat: null, // latitude of the location
    lon: null, // longitude of the location
    updateInterval: 10 * 60 * 1000, // 10 minutes
    debug: false,
    initialLoadDelay: 0,
    api_key: null,
    api_endpoint: "https://api.weather.gov/points/",
    weatherIconSet: "1",
    fadeSpeed: 1000,
    fade: true,
    dayCount: 5,
    relativeColors: false,
    colored: true,
    highColor: "#fff",
    lowColor: "#fff",
    showCurrentConditions: true,
    showExtraCurrentConditions: true,
    showSummary: true,
    showPrecipitation: true,
    showWindSpeed: true,
    showWindDirection: true,
    showSunriseSunset: true,
    showFeelsLike: true,
    showUVIndex: false,
    showDailyForecast: true,
    showDailyHeader: true,
    showDailyIcons: true,
    showDailyHighLow: true,
    showDailySummary: true,
    maxDailiesToShow: 7,
    ignoreToday: false,
    showHourlyForecast: false,
    showHourlyHeader: true,
    showHourlyIcons: true,
    showHourlyTemp: true,
    showHourlyPrecip: true,
    showHourlyWind: false,
    showHourlySummary: false,
    maxHourliesToShow: 3,
    hourlyForecastInterval: 3 * 60 * 60 * 1000, // 3 hours
    units: config.units,
    tempUnits: config.units,
    windUnits: config.units,
    timeFormat: config.timeFormat,
    roundTemp: true,
    showPrecipitationSeparator: true,
    showPrecipitationAmount: true,
    showPrecipitationProb: true,
  },

  getScripts: function () {
    return ["skycons.js"];
  },

  getStyles: function () {
    return [this.name + ".css", "weather-icons.css"];
  },

  getDom: function () {
    var wrapper = document.createElement("div");
    wrapper.id = "noaa-forecast";

    if (!this.loaded || !this.weatherData) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    // Main header section - only show if configured
    if (this.config.showCurrentConditions) {
        var header = document.createElement("div");
        header.className = "header";

        var iconWrapper = document.createElement("div");
        iconWrapper.className = "current-icon";
        var iconCanvas = document.createElement("canvas");
        iconCanvas.id = "current-skycon-" + this.identifier;
        iconCanvas.className = "skycon-" + this.identifier;
        iconCanvas.setAttribute("width", "100");
        iconCanvas.setAttribute("height", "100");
        iconCanvas.setAttribute("data-animated-icon-name", this.getSkycon(this.weatherData.dailyForecast[0].shortForecast, this.weatherData.dailyForecast[0].isDaytime));
        iconWrapper.appendChild(iconCanvas);

        var currentTempWrapper = document.createElement("div");
        currentTempWrapper.className = "current-temp";
        currentTempWrapper.innerHTML = this.weatherData.dailyForecast[0].temperature + "&deg;";
        header.appendChild(iconWrapper);
        header.appendChild(currentTempWrapper);

        var currentDescriptionWrapper = document.createElement("div");
        currentDescriptionWrapper.className = "current-desc bright";
        currentDescriptionWrapper.innerHTML = this.weatherData.dailyForecast[0].shortForecast;
        header.appendChild(currentDescriptionWrapper);

        wrapper.appendChild(header);
    }


    // Forecast table section - only show if configured
    if (this.config.showDailyForecast) {
        var tableWrapper = document.createElement("div");
        tableWrapper.className = "forecast-table-wrapper";
        var table = document.createElement("table");
        table.className = "forecast-table";

        if (this.config.fade) {
        table.style.opacity = this.opacity;
        }

        // Slice the forecast data to the configured day count
        var forecastData = this.weatherData.dailyForecast.slice(0, this.config.maxDailiesToShow * 2);

        for (var i = 0; i < forecastData.length; i++) {
        var forecast = forecastData[i];
        var row = document.createElement("tr");
        row.className = "forecast-row";

        // Day of the week
        var dayNameCell = document.createElement("td");
        dayNameCell.className = "day-name";
        var date = moment(forecast.startTime);
        dayNameCell.innerHTML = date.format("ddd");
        if (i === 0) {
            dayNameCell.innerHTML = "Today";
        } else if (i === 1) {
            dayNameCell.innerHTML = "Tomorrow";
        }
        row.appendChild(dayNameCell);

        // Icon
        var iconCell = document.createElement("td");
        iconCell.className = "icon";
        var iconCanvas = document.createElement("canvas");
        iconCanvas.id = "skycon-" + this.identifier + "-" + i;
        iconCanvas.className = "skycon-" + this.identifier;
        iconCanvas.setAttribute("width", "40");
        iconCanvas.setAttribute("height", "40");
        iconCanvas.setAttribute("data-animated-icon-name", this.getSkycon(forecast.shortForecast, forecast.isDaytime));
        iconCell.appendChild(iconCanvas);
        row.appendChild(iconCell);

        // High/Low Temperature
        var tempCell = document.createElement("td");
        tempCell.className = "temp";
        tempCell.innerHTML = forecast.temperature + "&deg;";
        row.appendChild(tempCell);

        // Summary
        var summaryCell = document.createElement("td");
        summaryCell.className = "summary";
        summaryCell.innerHTML = forecast.shortForecast;
        row.appendChild(summaryCell);

        table.appendChild(row);
        }

        tableWrapper.appendChild(table);
        wrapper.appendChild(tableWrapper);
    }

    // Play the skycons
    this.playIcons(this);

    return wrapper;
  },

  getSkycon: function (forecast, isDaytime) {
    if (forecast.includes("thunderstorms") || forecast.includes("t-storms")) return "thunder";
    if (forecast.includes("tornado")) return "wind"; // A suitable alternative
    if (forecast.includes("hurricane") || forecast.includes("tropical storm")) return "wind";
    if (forecast.includes("hail")) return "hail";
    if (forecast.includes("dust")) return "wind"; // A suitable alternative
    if (forecast.includes("smoke") || forecast.includes("haze")) return "fog";
    if (forecast.includes("snow") || forecast.includes("flurries")) return "snow";
    if (forecast.includes("sleet") || forecast.includes("ice pellets")) return "sleet";
    if (forecast.includes("windy")) return "wind";
    if (forecast.includes("foggy")) return "fog";
    if (forecast.includes("cloudy")) return "cloudy";
    if (forecast.includes("partly cloudy") || forecast.includes("mostly cloudy")) return "partly-cloudy";
    if (forecast.includes("clear") || forecast.includes("sunny")) {
      return isDaytime ? "clear-day" : "clear-night";
    }
    if (forecast.includes("rain") || forecast.includes("showers") || forecast.includes("drizzle")) return "rain";
    return "cloudy"; // Default icon
  },

  playIcons: function (inst) {
    var animatedIconCanvases = document.querySelectorAll(".skycon-" + inst.identifier);
    animatedIconCanvases.forEach(function (icon) {
      inst.skycons.add(icon.id, icon.getAttribute("data-animated-icon-name"));
    });
    inst.skycons.play();
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
    Log.log(`[MMM-NOAAWeatherForecast] Module resumed. Restarting updates.`);
    this.suspended = false;
    this.scheduleUpdate();
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "NOAA_WEATHER_DATA") {
      this.weatherData = payload;
      this.loaded = true;
      this.updateDom(this.config.fadeSpeed);
    }
  },

  scheduleUpdate: function (delay) {
    var self = this;
    var nextLoad = self.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    clearInterval(self.updateTimer);
    self.updateTimer = setTimeout(function () {
      self.sendSocketNotification("GET_NOAA_WEATHER_DATA", self.config);
    }, nextLoad);
  },
  // Define start sequence.
  start: function () {
    const self = this;
    Log.info("Starting module: " + self.name);

    if (self.config.lat === null || self.config.lon === null) {
      Log.error("[MMM-NOAAWeatherForecast] ** Latitude and longitude are required to fetch data from NOAA. Please add them to your config file.");
      return;
    }

    self.weatherData = null;
    self.skycons = new Skycons({ color: "white" });
    self.loaded = false;
    self.suspended = false;

    // Sanitize config numbers
    self.sanitizeNumbers(["lat", "lon", "updateInterval", "fadeSpeed", "initialLoadDelay", "dayCount"]);

    self.scheduleUpdate(self.config.initialLoadDelay);
  },
});
