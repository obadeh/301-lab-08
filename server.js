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

app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/events', eventHandler);

function locationHandler(request, response) {
  // Query String = ?a=b&c=d
let city=request.query.data;
  console.log(' request.query.data: ',request.query.data )
  
  let SQL = 'SELECT * FROM geo WHERE search_query = $1 ;';
 let values=[city];
 client.query(SQL,values)
 .then(results=>{
   console.log('is it in database?: ', results.rowCount);
   if (results.rowCount) { 
    
    return response.status(200).json(results.rows[0]);
    }
   else {getLocation(city,response)
  // .then(data=> response.status(200).json(data))
  return newCity;
  }
 })
   
}

function getLocation(city,response) {
  


  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${process.env.API}`
  superagent.get(url)
    .then(data => {
      console.log('data from url : ', data.body);
      let newCity = new Location(city, data.body)
      // add to database
      console.log('newCity : ', newCity);
      let SQL = 'INSERT INTO geo (search_query ,formatted_query,latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *';
      let safeValues = [newCity.search_query, newCity.formatted_query, newCity.latitude, newCity.longitude];
      client.query(SQL, safeValues)
        .then(results => {
          console.log('from database after add it directly: ', results.rows);
          return response.status(200).json(results.rows[0]);
           


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

function weatherHandler(request, response) {
  // Query String = ?a=b&c=d
  getWeather(request.query.data)
    .then(weatherData => response.status(200).json(weatherData));

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


function eventHandler(request, response) {
  // Query String = ?a=b&c=d

  getEvent(request.query.data.search_query)
    .then(eventData => response.status(200).json(eventData));

}

function getEvent(city) {
  // let data = require('./data/darksky.json');
  console.log('city : ', city);
  const url = `http://api.eventful.com/json/events/search?app_key=${process.env.EVENT_KEY}&location=${city}`;
  return superagent.get(url)
    .then(data => {
      let eventA = JSON.parse(data.text);
      console.log('eventA : ',eventA );
      if(eventA.events){
      return eventA.events.event.map((day) => {
        return new Event(day);
      });
    }});
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


