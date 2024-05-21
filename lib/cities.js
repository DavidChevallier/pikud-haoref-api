const axios = require('axios');
const config = require('../config');
const archive = require('../cities.json');
const geolocation = require('../util/geolocation');
const timeIdentifiers = require('../metadata/timeIdentifiers');
const lifeshieldShelters = require('../metadata/lifeshieldShelters');

/**
 * Main function to fetch and process city data.
 * 
 * @param {function} callback - Callback function to handle the result.
 * @param {object} options - Options object containing configuration settings.
 */
module.exports = async function(callback, options) {
    options = options || {};

    // Set Chrome user agent to avoid being blocked
    options.headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
    };

    if (!options.googleMapsApiKey) {
        return callback(new Error(`Please provide a Google Maps API Key and try again.`));
    }

    try {
        // Fetch city list in Hebrew from official website
        const cities = await extractCitiesFromUrl(config.hfc.website.citiesJson, options);

        // Dictionary for city translations
        const cityTranslations = {};

        // Fetch translations for additional languages
        for (const lang in config.hfc.website.translatedCitiesJson) {
            const translatedCities = await extractCitiesFromUrl(config.hfc.website.translatedCitiesJson[lang], options);
            cityTranslations[lang] = translatedCities;
        }

        // Initialize metadata array with "Select All" entry
        const metadata = [{
            "id": 0,
            "name": "בחר הכל",
            "name_en": "Select All",
            "name_ru": "Выбрать все",
            "name_ar": "اختر الكل",
            "zone": "",
            "zone_en": "",
            "zone_ru": "",
            "zone_ar": "",
            "time": "all",
            "time_en": "",
            "time_ru": "",
            "time_ar": "",
            "countdown": 0,
            "lat": 0,
            "lng": 0,
            "value": "all"
        }];

        // Unique values object
        const values = {};

        // Loop over hebrew cities
        for (const cityId in cities) {
            const city = cities[cityId];

            // Check for cached city ID / geolocation for this city (speed things up)
            for (const cityArchive of archive) {
                if (cityArchive.name === city.name) {
                    if (cityArchive.id) {
                        city.id = cityArchive.id;
                    }
                    if (cityArchive.lat && cityArchive.lng) {
                        city.lat = cityArchive.lat;
                        city.lng = cityArchive.lng;
                    }
                    break;
                }
            }

            if (!city.lat || !city.lng) {
                const location = await geocodeCity(city, options);
                if (location.lat !== 0) {
                    city.lat = location.lat;
                    city.lng = location.lng;
                }
            }

            const countdown = await getCountdownForCity(city, options);

            const result = {
                id: city.id,
                name: city.name,
            };

            for (const lang in cityTranslations) {
                result['name_' + lang] = cityTranslations[lang][cityId].name;
            }

            result.zone = city.zone;

            for (const lang in cityTranslations) {
                result['zone_' + lang] = cityTranslations[lang][cityId].zone;
            }

            result.time = countdown.time;

            for (const lang in cityTranslations) {
                result['time_' + lang] = countdown['time_' + lang];
            }

            result.countdown = countdown.countdown;
            result.lat = city.lat;
            result.lng = city.lng;
            result.value = city.name;

            if (lifeshieldShelters[city.name]) {
                result.shelters = lifeshieldShelters[city.name];
            }

            if (result.name_en.includes('All Areas')) {
                console.log('Ignoring "All areas" city: ' + result.value);
                continue;
            }

            if (values[result.value]) {
                console.log('Duplicate city: ' + result.value);
            } else {
                metadata.push(result);
                values[result.value] = 1;
            }
        }

        metadata.sort((a, b) => {
            if (a.value === 'all') {
                return -1;
            }
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });

        callback(null, metadata);
    } catch (err) {
        callback(err);
    }
};

/**
 * Function to extract cities from a given URL.
 * 
 * @param {string} url - URL to fetch cities data from.
 * @param {object} options - Options for the request.
 * @returns {object} Cities data.
 */
async function extractCitiesFromUrl(url, options) {
    const response = await axios.get(url, options);
    const cities = response.data;

    if (cities.length === 0) {
        throw new Error('Unable to parse JSON.');
    }

    const citiesResult = {};

    for (const city of cities) {
        if (!city.label) {
            continue;
        }

        city.label = city.label.replace(/ {2}/g, ' ').trim();
        city.label = uppercaseWords(city.label);
        city.label = city.label.replace(' Of ', ' of ');
        city.label = city.label.replace(/''/g, "'");

        const zoneMatch = city.mixname.match(/<span>(.+?)<\/span>/i);

        if (!zoneMatch) {
            throw new Error("Failed to extract for city: " + city.label);
        }

        citiesResult[city.id] = {
            value: city.value,
            areaId: city.areaid,
            name: city.label,
            zone: zoneMatch[1],
            label: city.label,
            cityId: city.id
        };
    }

    return citiesResult;
}

/**
 * Function to get countdown for a specific city.
 * 
 * @param {object} city - City object to get countdown for.
 * @param {object} options - Options for the request.
 * @returns {object} Countdown data.
 */
async function getCountdownForCity(city, options) {
    if (city.name === 'גבעת ברנר') {
        return timeIdentifiers['דקה וחצי'];
    }

    if (city.name === 'אשדוד - איזור תעשייה צפוני') {
        return timeIdentifiers['45 שניות'];
    }

    const response = await axios.get(config.hfc.website.cityNotesJson + city.value, options);
    console.log('Fetching countdown for city: ' + city.name);

    const cities = response.data;

    if (cities.length === 0) {
        throw new Error('Unable to parse JSON.');
    }

    const result = cities[0];
    const countdown = timeIdentifiers[result.time_notes];

    if (!countdown) {
        console.log('Unexpected time identifier: ' + result.time_notes);
    }

    return countdown;
}

/**
 * Function to capitalize each word in a string.
 * 
 * @param {string} str - String to capitalize.
 * @returns {string} Capitalized string.
 */
function uppercaseWords(str) {
    return str.replace(/(^| )(\w)/g, function(x) {
        return x.toUpperCase();
    });
}

/**
 * Function to geocode a city using Google Maps API.
 * 
 * @param {object} city - City object to geocode.
 * @param {object} options - Options for the request.
 * @returns {object} Geolocation data.
 */
async function geocodeCity(city, options) {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city.name + ', Israel')}&region=il&key=${options.googleMapsApiKey}`);
    const json = response.data;

    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
        throw new Error(`Geocoding error: ${json.status}`);
    }

    for (const result of json.results) {
        if (isWithinIsraeliBorders(result.geometry.location)) {
            return result.geometry.location;
        } else {
            console.error(`Geocoding failed for ${city.name}, result is outside Israel`);
        }
    }

    console.error(`Geocoding failed for ${city.name}`);
    return { lat: 0, lng: 0 };
}

/**
 * Function to check if a location is within Israeli borders.
 * 
 * @param {object} location - Location object to check.
 * @returns {boolean} True if within borders, false otherwise.
 */
function isWithinIsraeliBorders(location) {
    const distance = geolocation.getDistance(config.israel.center, location);
    return distance <= config.israel.radius;
}

/**
 * Function to get the active alert from the HFC API.
 * 
 * @param {object} options - Options for the request.
 * @returns {object} Active alert data.
 */
module.exports.getActiveAlert = async function(options) {
    const url = `${config.hfc.alerts.api}?${Math.round(new Date().getTime() / 1000)}`;
    
    const headers = {
        'Referer': 'https://www.oref.org.il/11226-he/pakar.aspx',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
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
            return {};
        }

        body = body.replace(/\u0A7B/g, '');

        let json;
        try {
            json = JSON.parse(body);
        } catch (err) {
            throw new Error('Failed to parse HFC JSON: ' + err + ', body: ' + body);
        }

        return json;
    } catch (err) {
        if (err.response) {
            throw new Error('Failed to retrieve alerts from HFC API: ' + err.response.status + ' ' + err.response.statusText);
        } else {
            throw new Error('Failed to retrieve alerts from HFC API: ' + err.message);
        }
    }
}
