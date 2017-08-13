import winston from 'winston';

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'app.log' })
  ]
});

export default logger;
