/*

Node Helper for MMM-NOAAForecast.
This helper is responsible for the DarkSky-compatible data pull from NOAA.
Sample API:e.g. https://api.weather.gov/points/40.8932469,-74.0116536

*/
  const NodeHelper = require("node_helper");const needle = require("needle");const moment = require("moment");const Log = require("logger");module.exports = NodeHelper.create({ start: function () { Log.log( Starting node_helper for module [${this.name}] ); },async socketNotificationReceived(notification, payload) {if (notification === "NOAA_CALL_FORECAST_GET") {// Modern Node.js best practice: Use async/await for cleaner, more readable code.// It avoids "callback hell" and simplifies error handling with try/catch blocks.// This is a major improvement from the older callback-based approach.try {if (!payload.latitude ||!payload.longitude) {Log.error([MMM-NOAAForecast] ${moment().format( "D-MMM-YY HH:mm" )} ** ERROR ** Latitude and/or longitude not provided.);return;}    const pointsUrl = `https://api.weather.gov/points/${payload.latitude},${payload.longitude}`;

    // A User-Agent header is required by the NOAA API. This is a critical addition.
    const needleOptions = {
      follow_max: 3,
      headers: {
        "User-Agent": "(MagicMirror, https://github.com/yourusername/MMM-NOAAForecast)",
      },
    };

    Log.log(`[MMM-NOAAForecast] Getting data from points URL: ${pointsUrl}`);

    const pointsResponse = await needle("get", pointsUrl, needleOptions);

    if (pointsResponse.statusCode !== 200) {
      throw new Error(
        `Failed to get points data: ${pointsResponse.statusCode} ${pointsResponse.statusMessage}`
      );
    }

    const pointsBody = pointsResponse.body;
    const forecastUrls = [
      { key: "forecast", url: pointsBody.properties.forecast },
      { key: "forecastHourly", url: pointsBody.properties.forecastHourly },
      { key: "forecastGridData", url: pointsBody.properties.forecastGridData },
    ];

    // Using Promise.all is a more efficient and reliable way to handle multiple
    // concurrent asynchronous requests compared to a counter. It waits for all
    // requests to complete successfully or for the first one to fail.
    const forecastPromises = forecastUrls.map(async (item) => {
      Log.log(`[MMM-NOAAForecast] Getting data from forecast URL: ${item.url}`);
      const response = await needle("get", item.url, needleOptions);
      if (response.statusCode !== 200) {
        throw new Error(
          `Failed to get ${item.key} data: ${response.statusCode} ${response.statusMessage}`
        );
      }
      return { key: item.key, data: response.body };
    });

    const results = await Promise.all(forecastPromises);
    const forecastData = {};
    results.forEach(result => {
      forecastData[result.key] = result.data;
    });

    // Use Log.log and Log.error for better integration with MagicMirror's logging system.
    Log.log(`[MMM-NOAAForecast] Successfully fetched all forecast data.`);

    this.sendSocketNotification("NOAA_CALL_FORECAST_DATA", {
      instanceId: payload.instanceId,
      payload: forecastData,
    });

  } catch (error) {
    // Centralized error handling for all API calls.
    Log.error(
      `[MMM-NOAAForecast] ${moment().format(
        "D-MMM-YY HH:mm"
      )} ** ERROR ** ${error.message}`
    );
  }
}
},});
