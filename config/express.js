import express from 'express';
import swaggerUi from 'gobhash-swagger';
import logger from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compress from 'compression';
import jsyaml from 'js-yaml';
import methodOverride from 'method-override';
import cors from 'cors';
import fs from 'fs';
import httpStatus from 'http-status';
import expressWinston from 'express-winston';
import expressValidation from 'express-validation';
import mosca from 'mosca';
import helmet from 'helmet';
import server from 'http';
import socket from 'socket.io';
import winstonInstance from './winston';
import routes from '../server/v1/routes/index.route';
import config from './config';
import APIError from '../server/v1/helpers/APIError';


// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
const spec = fs.readFileSync('server/v1/docs/api_docs.yml', 'utf8');
const swaggerDoc = jsyaml.safeLoad(spec);

const ioServer = server.createServer()
const io = socket(ioServer);

io.on('connection', (client) => {
  client.on('event', (data) => {});
  client.on('disconnect', () => {});
});

ioServer.listen(config.socketPort);



const ascoltatore = {
  //using ascoltatore
  type: 'mongo',
  url: config.mqtt,
  pubsubCollection: 'ascoltatori',
  mongo: {}
};

const settings = {
  port: 1883,
  backend: ascoltatore
};

const moscaServer = new mosca.Server(settings);

moscaServer.on('clientConnected', (client) => {
  console.log('client connected', client.id);
});

// fired when a message is received
moscaServer.on('published', (packet, client) => {
  console.log('Published', packet.payload);
});

moscaServer.on('ready', () => { console.log('Mosca is running') });

const app = express();

if (config.env === 'development') {
  app.use(logger('dev'));
}

// parse body params and attache them to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(compress());
app.use(methodOverride());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// enable detailed API logging in dev env
if (config.env === 'development') {
  expressWinston.requestWhitelist.push('body');
  expressWinston.responseWhitelist.push('body');
  app.use(expressWinston.logger({
    winstonInstance,
    meta: true, // optional: log meta data about request (defaults to true)
    msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
    colorStatus: true // Color the status code (default green, 3XX cyan, 4XX yellow, 5XX red).
  }));
}
// mount all routes on /api path
app.use('/v1', routes);

// swagger ui config
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDoc, false, {}, '.swagger-ui .topbar { background-color: rgb(112, 111, 111); }'));

// if error is not an instanceOf APIError, convert it.
app.use((err, req, res, next) => {
  if (err instanceof expressValidation.ValidationError) {
    // validation error contains errors which is an array of error each containing message[]
    const unifiedErrorMessage = err.errors.map(error => error.messages.join('. ')).join(' and ');
    const error = new APIError(unifiedErrorMessage, err.status, true);
    return next(error);
  } else if (!(err instanceof APIError)) {
    const apiError = new APIError(err.message, err.status, err.isPublic);
    return next(apiError);
  }
  return next(err);
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new APIError('API not found', httpStatus.NOT_FOUND);
  return next(err);
});


// log error in winston transports except when executing test suite
if (config.env !== 'test') {
  app.use(expressWinston.errorLogger({
    winstonInstance
  }));
}

// error handler, send stacktrace only during development
app.use((err, req, res, next) => // eslint-disable-line no-unused-vars
  res.status(err.status).json({
    message: err.isPublic ? err.message : httpStatus[err.status],
    stack: config.env === 'development' ? err.stack : {}
  })
);

export default app;