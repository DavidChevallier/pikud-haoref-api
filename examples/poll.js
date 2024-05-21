// Replace with require('logger') if the package resides in node_modules
const logger = require('../logger'); 

// Replace with require('pikud-haoref-api') if the package resides in node_modules
var pikudHaoref = require('../index');

// Set polling interval in millis
var interval = process.env.POLL_INTERVAL || 5000;

// Keep track of recently alerted cities to avoid notifying multiple times for the same alert
var recentlyAlertedCities = {};

// Define polling function
var poll = function () {
    // Optional Israeli proxy if running outside Israeli borders

    // Set proxy URL, user and password from environment variables
    var proxyUrl = process.env.PROXY_URL;
    var proxyUser = process.env.PROXY_USER;
    var proxyPassword = process.env.PROXY_PASSWORD;

    // Construct proxy string
    var proxy = proxyUrl && proxyUser && proxyPassword ?
        `http://${encodeURIComponent(proxyUser)}:${encodeURIComponent(proxyPassword)}@${proxyUrl}` :
        undefined;

    // Construct options object
    var options = {
        proxy: proxy
    };

    // Get currently active alert
    // Example response:
    // { 
    //    type: 'missiles', 
    //    cities: ['תל אביב - מזרח', 'חיפה - כרמל ועיר תחתית', 'עין גדי'],
    //    instructions: 'היכנסו למבנה, נעלו את הדלתות וסגרו את החלונות'
    // }
    pikudHaoref.getActiveAlert(function (err, alert) {
        // Schedule polling in X millis
        setTimeout(poll, interval);

        // Log errors
        if (err) {
            logger.error('Retrieving active alert failed:', err);
            return;
        }

        // Extract new cities
        alert.cities = extractNewCities(alert.cities);

        // Print alert
        if (alert.cities.length > 0) {
            // Alert header
            logger.info('Currently active alert:');

            // Log the alert (if any)
            logger.info(JSON.stringify(alert));
        }
        else {
            /// No current alert
            logger.info('There is no currently active alert.');
        }

        // Line break for readability
        logger.info('');
    }, options);
}

function extractNewCities(alertCities) {
    // Result array
    var newCities = [];

    // Get current unix timstamp
    var now = Math.floor(Date.now() / 1000);

    // Traverse cities
    for (var city of alertCities) {
        // Haven't notified recently?
        if (!recentlyAlertedCities[city] || recentlyAlertedCities[city] < now - (60 * 3)) {
            // New city
            newCities.push(city);

            // Update last alert timestamp for this city
            recentlyAlertedCities[city] = now;
        }
    }

    // Return result
    return newCities;
}

// Start polling for active alert
poll();