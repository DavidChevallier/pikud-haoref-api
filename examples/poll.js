const logger = require('../logger');
const pikudHaoref = require('../index');

// Set polling interval in millis
const interval = process.env.POLL_INTERVAL || 5000;

// Keep track of recently alerted cities to avoid notifying multiple times for the same alert
const recentlyAlertedCities = {};

// Define polling function
const poll = async function () {
    // Optional Israeli proxy if running outside Israeli borders

    // Set proxy URL, user and password from environment variables
    const proxyUrl = process.env.PROXY_URL;
    const proxyUser = process.env.PROXY_USER;
    const proxyPassword = process.env.PROXY_PASSWORD;

    // Construct proxy string
    const proxy = proxyUrl && proxyUser && proxyPassword ?
        `http://${encodeURIComponent(proxyUser)}:${encodeURIComponent(proxyPassword)}@${proxyUrl}` :
        undefined;

    // Construct options object
    const options = {
        proxy: proxy ? { host: proxyUrl, auth: { username: proxyUser, password: proxyPassword } } : undefined
    };

    try {
        // Get currently active alert
        const alert = await pikudHaoref.getActiveAlert(options);

        // Schedule polling in X millis
        setTimeout(poll, interval);

        // Extract new cities
        alert.cities = extractNewCities(alert.cities);

        // Print alert
        if (alert.cities.length > 0) {
            // Alert header
            logger.info('Currently active alert:');

            // Log the alert (if any)
            logger.info(JSON.stringify(alert));
        } else {
            // No current alert
            logger.info('There is no currently active alert.');
        }

        // Line break for readability
        logger.info('');
    } catch (err) {
        // Schedule polling in X millis
        setTimeout(poll, interval);

        // Log errors
        logger.error('Retrieving active alert failed:', err);
    }
}

function extractNewCities(alertCities) {
    // Result array
    const newCities = [];

    // Get current unix timestamp
    const now = Math.floor(Date.now() / 1000);

    // Traverse cities
    for (const city of alertCities) {
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
