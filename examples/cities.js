var fs = require('fs');

// @doc-start:javascript
// Ersetze durch require('pikud-haoref-api'), wenn das Paket in node_modules liegt.
var pikudHaoref = require('../index');

// Google Maps API-Schlüssel für Pikud Haoref
var options = {
    googleMapsApiKey: 'AIzaSyCSeMZ5AxUgSWHy6EedcgeXjRC2irszdUQ'
};

// Abrufen der Städtemetadaten von der Webseite von Pikud Haoref
pikudHaoref.getCityMetadata(function (err, cities) {
    // Ist der Vorgang fehlgeschlagen?
    if (err) {
        return console.error(err);
    }

    // Schreibe die cities.json Datei auf die Festplatte
    fs.writeFileSync('cities.json', JSON.stringify(cities, null, 2), 'utf8');

    // Ausgabe des Erfolgs
    console.log('Wrote cities.json successfully');
}, options);
// @doc-end
