/*********************************

  Node Helper for MMM-OpenWeatherForecast.

  This helper is responsible for the data pull from OpenWeather's
  One Call API. At a minimum the API key, Latitude and Longitude
  parameters must be provided.  If any of these are missing, the
  request to OpenWeather will not be executed, and instead an error
  will be output the the MagicMirror log.

  Additional, this module supplies two optional parameters:

    units - one of "standard", "metric" or "imperial"
    lang - Any of the languages OpenWeather supports, as listed here: https://openweathermap.org/api/one-call-api#multi

  The OpenWeather OneCall API request looks like this:

    https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&exclude=minutely&appid={API key}&units={units}&lang={lang}

*********************************/

const Log = require("logger");
const NodeHelper = require("node_helper");
const moment = require("moment");

module.exports = NodeHelper.create({

  start() {
    Log.log("Starting node_helper for: " + this.name);
  },

  async socketNotificationReceived(notification, payload){
    var self = this;
    if (notification === "OPENWEATHER_FORECAST_GET") {
      if (payload.apikey == null || payload.apikey == "") {
        Log.log( "[MMM-OpenWeatherForecast] " + moment().format("D-MMM-YY HH:mm") + " ** ERROR ** No API key configured. Get an API key at https://openweathermap.org/" );
      } else if (payload.latitude == null || payload.latitude == "" || payload.longitude == null || payload.longitude == "") {
        Log.log( "[MMM-OpenWeatherForecast] " + moment().format("D-MMM-YY HH:mm") + " ** ERROR ** Latitude and/or longitude not provided." );
      } else {

        //make request to OpenWeather One Call API
        var url = payload.apiBaseURL +
          "lat=" + payload.latitude +
          "&lon=" + payload.longitude +
          "&exclude=" + "minutely" +
          "&appid=" + payload.apikey +
          "&units=" + payload.units +
          "&lang=" + payload.language;

        if (typeof self.config !== "undefined"){
          if (self.config.debug === true){
            Log.log(self.name+"Fetching url: "+url)
          }
        }

        fetch(url)
          .then(response => {
            if (response.status !== 200){
              console.log(response)
            } else {
              return response.json()
            }
          }).then(data => {
            if (typeof data !== "undefined") {
              data.instanceId = payload.instanceId;
              self.sendSocketNotification("OPENWEATHER_FORECAST_DATA", data);
            }
          })
          .catch(error => {
            Log.error("[MMM-OpenWeatherForecast] " + moment().format("D-MMM-YY HH:mm") + " ** ERROR ** " + error+"\n"+error.stack)
          });
      }
    } else if (notification === "CONFIG") {
      self.config = payload
    }
  },
});
