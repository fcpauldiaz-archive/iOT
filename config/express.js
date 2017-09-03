import express from 'express';
import UUID from 'uuid';
import socket from 'socket.io';
import mqtt from 'mqtt';
import r from 'rethinkdb';
import logger from './winston';
import config from './config';


const io = socket.listen(config.socketPort);
const debug = true;

let connection = null;
r.connect({ host: '45.55.162.243', port: 28015, user: 'admin', password: '8V6-Zco-5ux-EMu' }, (err, conn) => {
  if (err) throw err;
  connection = conn;
  connection.use('iot');
  console.log('connected to rethinkdb');
});


const broker = mqtt.connect('ws://45.55.162.243:8083');

io.sockets.on('connection', (client) => {
  client.uuid = UUID(); //eslint-disable-line
  if (debug) {
    console.log('web client connected', client.uuid); //eslint-disable-line
  }
  client.on('disconnect', () => {
  });
});


broker.on('connect', () => {
  console.log('connection');
  broker.subscribe('connected/device', { qos: 2 });
});
broker.on('message', (topic, message) => {
  console.log(topic);
  console.log(message.toString());
  if (topic === 'connected/device') {
    const arrayInsert = JSON.parse(message.toString());
    const insertData = {
      ...arrayInsert,
      date: new Date()
    };
    r.table('devices').insert(insertData).run(connection, (err) => {
      if (err) throw logger.log('error', 'error inserting data %s', err);
    });
    io.sockets.emit('send/device', insertData);
  }
});

const app = express();
export default app;
