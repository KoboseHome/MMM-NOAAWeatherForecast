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
      `Starting node_helper for module ${this.name}`
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
          let parsedBody;
          try {
            parsedBody = JSON.parse(body);
          } catch (e) {
            console.log(
              `[MMM-NOAAWeatherForecast] ${moment().format(
                "D-MMM-YY HH:mm"
              )} ** ERROR ** Failed to parse response body as JSON: ${e.message}`
            );
            return;
          }

          if (
            !error &&
            response.statusCode === 200 &&
            parsedBody &&
            parsedBody.properties &&
            parsedBody.properties.forecastHourly
          ) {
              var forecastUrls = [{
                key: "hourly",
                url: parsedBody.properties.forecastHourly
              }, {
                key: "daily",
                url: parsedBody.properties.forecast
              }, {
                key: "grid",
                url: parsedBody.properties.forecastGridData
              }];

              var forecastData = {};
              var completedRequests = 0;
              forecastUrls.forEach(function (item) {
                console.log(`[MMM-NOAAWeatherForecast] Making request for ${item.key}: ${item.url}`);
                needle.get(item.url, needleOptions, function (err, res, data) {
                  console.log(`[MMM-NOAAWeatherForecast] Received data for ${item.key}. Data type: ${typeof data}`);
                  if (!err && res.statusCode === 200) {
                    try {
                      forecastData[item.key] = JSON.parse(data);
                    } catch (parseError) {
                      console.log(
                        `[MMM-NOAAWeatherForecast] ${moment().format(
                          "D-MMM-YY HH:mm"
                        )} ** ERROR ** Failed to parse JSON for ${item.key}: ${parseError.message}`
                      );
                    }
                  } else {
                    console.log(
                      `[MMM-NOAAWeatherForecast] ${moment().format(
                        "D-MMM-YY HH:mm"
                      )} ** ERROR ** Failed to get ${item.key}: ${err}`
                    );
                  }

                  completedRequests++;
                  if (completedRequests === forecastUrls.length) {
                    console.log("[MMM-NOAAWeatherForecast] All forecast data fetched. Sending to main module.");
//                    console.log("[MMM-NOAAWeatherForecast] Final payload:", JSON.stringify(forecastData));
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
                // If there's no error object, try to stringify the parsed body for a message.
                if (!error) {
                  errorMessage = JSON.stringify(parsedBody);
                }
              } catch (e) {
                // If stringifying fails, stick with the default error message.
              }
              console.error(
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
