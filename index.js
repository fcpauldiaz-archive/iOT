// config should be imported before importing any other file
import polyfill from 'babel-polyfill'; // eslint-disable-line
import mongoose from 'mongoose';
import pmx from 'pmx';                 // eslint-disable-line
pmx.init({ http: true }); // eslint-disable-line enable http keymetris
import config from './config/config';  // eslint-disable-line
import app from './config/express';    // eslint-disable-line

mongoose.connect(config.mongoUri, { server: { socketOptions: { keepAlive: 1 } } });
mongoose.Promise = global.Promise; // Tell mongoose to use es6 promises
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${config.mongoUri}`);
});

export default app;
