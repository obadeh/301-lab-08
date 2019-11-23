'use strict';

// Dependecies (express, cors, dotenv)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());

// Database Connection Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => { throw err; });

////////////

// Add geo, based on QueryString Params
app.get('/add', addToDataBase)

function addToDataBase(request, response) {
  let city = request.query.search_query;
  let formatted = request.query.formatted_query;
  let lati = request.query.latitude;
  let lngi = request.query.longitude;
  let SQL = 'INSERT INTO geo (search_query ,formatted_query,latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *';
  let safeValues = [city, formatted, lati, lngi];
  client.query(SQL, safeValues)
    .then(results => {
      response.status(200).json(results);
    })
    .catch(error => errorHandler(error));
};
// function addTo(newCity){



// }



// function locationHandlerSql(req,res) {
//   // Query String = ?a=b&c=d
//   getLocationSql(req.query.data)
//     .then( (locationData) => res.status(200).json(locationData) );
// }

// function getLocationSql(city) {
//   // No longer get from file
//   // let data = require('./data/geo.json');

//   // Get it from Google Directly`
//   const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${process.env.API}`

//   return superagent.get(url)
//     .then( data => {
//       return new Location(city, data.body);
//     })

// }



// Get everything in the database

app.get('/cities', showTable);


function showTable(request,response){
  let SQL = 'SELECT * FROM geo';
  
  client.query(SQL)
    .then(results => {
      response.status(200).json(results.rows);
      // let obj=results.rows;
      // console.log('obj : ', obj);
    })
    .catch(error => errorHandler(error));
}




/////////////////
// make the the callBack function a seprate fuctions :locationHandler,weatherHandler

app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/events', eventHandler);

function locationHandler(req, res) {
  // Query String = ?a=b&c=d
  getLocation(req.query.data)
    .then((locationData) => res.status(200).json(locationData));
}

function getLocation(city) {
  // No longer get from file
  // let data = require('./data/geo.json');

  // Get it from Google Directly`
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${process.env.API}`

  return superagent.get(url)
    .then(data => {
      let newCity = new Location(city, data.body)
      // add to database

      let SQL = 'INSERT INTO geo (search_query ,formatted_query,latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *';
      let safeValues = [newCity.search_query, newCity.formatted_query, newCity.latitude, newCity.longitude];
      client.query(SQL, safeValues)
        .then(results => {
          response.status(200).json(results);
        })
        .catch(error => errorHandler(error));

        //////
      return newCity;
    })

}
function Location(city, data) {
  this.search_query = city;
  this.formatted_query = data.results[0].formatted_address;
  this.latitude = data.results[0].geometry.location.lat;
  this.longitude = data.results[0].geometry.location.lng;

}


// WEATHER
// ------------------------------- _________________ //

function weatherHandler(req, res) {
  // Query String = ?a=b&c=d
  getWeather(req.query.data)
    .then(weatherData => res.status(200).json(weatherData));

}

function getWeather(query) {
  // let data = require('./data/darksky.json');
  const url = `https://api.darksky.net/forecast/${process.env.DARK_SKY}/${query.latitude},${query.longitude}`;
  return superagent.get(url)
    .then(data => {
      let weather = data.body;
      return weather.daily.data.map((day) => {
        return new Weather(day);
      });
    });
}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();
}

// add event >>>>>>>>>>>>>>>


function eventHandler(req, res) {
  // Query String = ?a=b&c=d
  getEvent(req.query.data.search_query)
    .then(eventData => res.status(200).json(eventData));

}

function getEvent(city) {
  // let data = require('./data/darksky.json');
  const url = `http://api.eventful.com/json/events/search?app_key=${process.env.EVENT_KEY}&location=${city}`;
  return superagent.get(url)
    .then(data => {
      let eventA = JSON.parse(data.text);

      return eventA.events.event.map((day) => {
        return new Event(day);
      });
    });
}

function Event(day) {
  this.link = day.url;
  this.name = day.title;
  this.event_date = day.start_time;
  this.summary = day.description;
}



// Error Handler Routes
app.use('*', notFoundHandler);
app.use(errorHandler);

function notFoundHandler(request, response) {
  response.status(404).send('NOT FOUND!');
}

function errorHandler(error, request, response) {
  response.status(500).send(error);
}



// Connect to DB and THEN Start the Web Server
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log('Server up on', PORT);
    });
  })
  .catch(err => {
    throw `PG Startup Error: ${err.message}`;
  });


