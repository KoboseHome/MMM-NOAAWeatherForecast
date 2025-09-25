/*********************************

  Node Helper for MMM-NOAAWeatherForecast.

  This helper is responsible for the DarkSky-compatible data pull from NOAA.

  Sample API:

    e.g. https://api.weather.gov/points/40.8932469,-74.0116536

*********************************/

var NodeHelper = require("node_helper");
var needle = require("needle");
var moment = require("moment");

module.exports = NodeHelper.create({
  start: function () {
    console.log(
      `Starting node_helper for module [${this.name}]`
    );
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "NOAA_CALL_FORECAST_GET") {
      var self = this;
      // use a browser-like User-Agent for requests
      var needleOptions = {
        follow_max: 3
      };

      if (
        payload.latitude === null ||
        payload.latitude === "" ||
        payload.longitude === null ||
        payload.longitude === ""
      ) {
        console.log(
          `[MMM-NOAAWeatherForecast] ${moment().format(
            "D-MMM-YY HH:mm"
          )} ** ERROR ** Latitude and/or longitude not provided.`
        );
      } else {
        var url = `https://api.weather.gov/points/${payload.latitude},${payload.longitude}`;

        console.log(`[MMM-NOAAWeatherForecast] Getting data: ${url}`);
        needle.get(url, needleOptions, function (error, response, body) {
          if (
            !error &&
            response.statusCode === 200 &&
            body &&
            body.properties &&
            body.properties.forecastHourly
          ) {
              var forecastUrls = [{
                key: "hourly",
                url: body.properties.forecastHourly
              }, {
                key: "daily",
                url: body.properties.forecast
              }, {
                key: "grid",
                url: body.properties.forecastGridData
              }];

              var forecastData = {};
              var completedRequests = 0;
              forecastUrls.forEach(function (item) {
                needle.get(item.url, needleOptions, function (err, res, data) {
                  if (!err && res.statusCode === 200) {
                    forecastData[item.key] = data;
                    console.log(`[MMM-NOAAWeatherForecast] Getting data: ${item.url}`);
                  } else {
                    console.log(
                      `[MMM-NOAAWeatherForecast] ${moment().format(
                        "D-MMM-YY HH:mm"
                      )} ** ERROR ** Failed to get ${item.key}: ${err}`
                    );
                  }

                  completedRequests++;
                  if (completedRequests === forecastUrls.length) {
                    self.sendSocketNotification("NOAA_CALL_FORECAST_DATA", {
                      instanceId: payload.instanceId,
                      payload: forecastData
                    });
                  }
                });
              });
            } else {
              let errorMessage = error ? error : "Unknown API error";
              try {
                // If there's no error object, try to parse the body for a message.
                if (!error) {
                  var parsedBody = JSON.parse(body);
                  errorMessage = JSON.stringify(parsedBody);
                }
              } catch (e) {
                // If parsing fails, stick with the default error message.
              }
              console.log(
                `[MMM-NOAAWeatherForecast] ${moment().format(
                  "D-MMM-YY HH:mm"
                )} ** ERROR ** Failed to get forecast URLs: ${errorMessage}`
              );
            }
        });
      }
    }
  }
});
