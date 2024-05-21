const axios = require('axios');
const config = require('../config');

// Set time zone for date parsing
process.env.TZ = 'Asia/Jerusalem';

async function getHFCAlertsJSON(options, callback) {
    options = options || {};

    let url = config.hfc.alerts.api;
    url += '?' + Math.round(new Date().getTime() / 1000);
    // Set proxy if provided
    const headers = {
        'Referer': 'https://www.oref.org.il/11226-he/pakar.aspx',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, wie Gecko) Chrome/75.0.3770.100 Safari/537.36'
    };

    try {
        const response = await axios.get(url, { headers, responseType: 'arraybuffer' });
        let buffer = Buffer.from(response.data);

        let encoding = 'utf8';
        if (buffer.length > 1) {
            if (buffer[0] === 255 && buffer[1] === 254) {
                encoding = 'utf16le';
                buffer = buffer.slice(2);
            } else if (buffer.length > 2 && buffer[0] === 239 && buffer[1] === 187 && buffer[2] === 191) {
                encoding = 'utf8';
                buffer = buffer.slice(3);
            }
        }

        let body = buffer.toString(encoding);
        if (body.trim() === '') {
            return callback(null, {});
        }

        body = body.replace(/\u0A7B/g, '');

        let json;
        try {
            json = JSON.parse(body);
        } catch (err) {
            return callback(new Error('Failed to parse HFC JSON: ' + err + ', body: ' + body));
        }

        callback(null, json);
    } catch (err) {
        if (err.response) {
            callback(new Error('Failed to retrieve alerts from HFC API: ' + err.response.status + ' ' + err.response.statusText));
        } else {
            callback(new Error('Failed to retrieve alerts from HFC API: ' + err.message));
        }
    }
}
exports.getHFCAlertsJSON = getHFCAlertsJSON;

// Extract alert from JSON
function extractAlertFromJSON(json, callback) {
    const alert = { type: 'none', cities: [] };

    if (!json.data) {
        return callback(null, alert);
    }

    for (let city of json.data) {
        if (!city) {
            continue;
        }

        city = city.trim();

        if (city.indexOf('בדיקה') !== -1) {
            continue;
        }

        if (alert.cities.indexOf(city) === -1) {
            alert.cities.push(city);
        }
    }

    alert.type = getAlertTypeByCategory(json.cat);

    if (json.desc) {
        alert.instructions = json.desc;
    }

    return callback(null, alert);
}
exports.extractAlertFromJSON = extractAlertFromJSON;

// Get alert type by category
function getAlertTypeByCategory(category) {
    if (!category) {
        return 'missiles';
    }

    category = parseInt(category);

    switch (category) {
        case 1:
            return 'missiles';
        case 2:
            return 'general';
        case 3:
            return 'earthQuake';
        case 4:
            return 'radiologicalEvent';
        case 5:
            return 'tsunami';
        case 6:
            return 'hostileAircraftIntrusion';
        case 7:
            return 'hazardousMaterials';
        case 13:
            return 'terroristInfiltration';
        case 101:
            return 'missilesDrill';
        case 102:
            return 'generalDrill';
        case 103:
            return 'earthQuakeDrill';
        case 104:
            return 'radiologicalEventDrill';
        case 105:
            return 'tsunamiDrill';
        case 106:
            return 'hostileAircraftIntrusionDrill';
        case 107:
            return 'hazardousMaterialsDrill';
        case 113:
            return 'terroristInfiltrationDrill';
        default:
            return 'unknown';
    }
}
// Get currently active alert
async function getActiveAlert(options) {
    return new Promise((resolve, reject) => {
        // Get HFC alerts JSON
        getHFCAlertsJSON(options, (err, json) => {
            if (err) {
                return reject(err);
            }
            // Extract alert from JSON
            extractAlertFromJSON(json, (err, alert) => {
                if (err) {
                    return reject(err);
                }
                // Return alert
                resolve(alert);
            });
        });
    });
}
exports.getActiveAlert = getActiveAlert;
