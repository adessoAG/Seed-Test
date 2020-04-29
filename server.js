// Install express server

if(!process.env.NODE_ENV){
  const dotenv = require('dotenv').config();
}

const express = require('express');
const path = require('path');

const app = express();
const environment = '../frontend/src/environments/environment';

// Serve only the static files form the dist directory
app.use(express.static(`${__dirname}/dist/cucumber-frontend`));

app.get('/backendInfo', (req, res) => {
  res.json({ url: process.env.API_SERVER });
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(`${__dirname}/dist/cucumber-frontend/index.html`));
});

// Start the app by listening on the default Heroku port
app.listen(process.env.PORT || environment.PORT || 4200, function () {
  const port = this.address().port;
  console.log('App now running on port', port);
});