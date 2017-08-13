import express from 'express';
import server from 'http';
import socket from 'socket.io';
import UUID from 'uuid';
import mosca from 'mosca';
import logger from './winston';
import config from './config';

const ioServer = server.createServer();
const io = socket(ioServer);

io.on('connection', (client) => {
  client.userid = UUID();
  logger.log('info', '\t socket.io:: player ' + client.userid + ' connected');

  client.on('event', (data) => {
    logger.log('info', 'event');
    client.emit('send_event', data);
  });
  client.on('disconnect', () => {

  });
});

ioServer.listen(config.socketPort);


const ascoltatore = {
  // using ascoltatore
  type: 'mongo',
  url: config.mqtt,
  pubsubCollection: 'ascoltatori',
  mongo: {}
};

const settings = {
  port: 1884,
  backend: ascoltatore
};

const moscaServer = new mosca.Server(settings);

moscaServer.on('clientConnected', (client) => {
  logger.log('info', 'client connected', client.id);
});

// fired when a message is received
moscaServer.on('published', (packet, client) => {
  const topic = packet.topic;
  switch (topic) {
    case 'device/connected':
      return handleDeviceConnected(packet, client);
    case 'device/state':
      return handleDeviceState(packet);
    default:
      return undefined;
  }
});

moscaServer.on('ready', () => { logger.log('info', 'Mosca is running') });

function handleDeviceConnected(message, client) {
  logger.log('info', 'device connected status %s', message.payload);
  moscaServer.publish({ topic: 'connected/device', payload: 'data payload' }, client);
}

function handleDeviceState(message) {
  logger.log('info', 'device state update to %s', message.payload);
}

const app = express();
export default app;
