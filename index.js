// config should be imported before importing any other file
import polyfill from 'babel-polyfill'; // eslint-disable-line
import pmx from 'pmx';                 // eslint-disable-line
pmx.init({ http: true }); // eslint-disable-line enable http keymetris
import config from './config/config';  // eslint-disable-line
import app from './config/express';    // eslint-disable-line


export default app;
