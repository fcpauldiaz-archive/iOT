import express from 'express';
import mosca from 'mosca';
import server from 'http';
import socket from 'socket.io';
import UUID from 'uuid';
import r from 'rethinkdb';
import logger from './winston';
import config from './config';

const ioServer = server.createServer();
const io = socket(ioServer);

io.on('connection', (client) => {
  client.userid = UUID(); //eslint-disable-line
  logger.log('info', 'socket.io:: player %s connected', client.userid);

  client.on('event', (data) => {
    client.emit('send_event', data);
  });
  client.on('disconnect', () => {

  });
});

ioServer.listen(config.socketPort);


let connection = null;
r.connect({ host: '45.55.162.243', port: 28015 }, (err, conn) => {
  if (err) throw err;
  connection = conn;
  connection.use('iot');
});

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
      return handleDeviceState(packet, client);
    default:
      return undefined;
  }
});

moscaServer.on('ready', () => { logger.log('info', 'Mosca is running'); });

function handleDeviceConnected(message, client) {
  const arrayInsert = JSON.parse(message.payload.toString());
  const insertData = {
    ...arrayInsert,
    date: new Date()
  };
  r.table('devices').insert(insertData).run(connection, (err) => {
    if (err) throw err;
  });
  moscaServer.publish({ topic: 'connected/device', payload: JSON.stringify(message) }, client);
}

function handleDeviceState(message, client) {
  logger.log('info', 'device state update to %s', message.payload);
  moscaServer.publish({ topic: 'state/device', payload: 'data payload' }, client);
}

const app = express();
export default app;
