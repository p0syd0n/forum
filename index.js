// Import required modules
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';
import request from 'request';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { marked } from 'marked';
import fs from 'fs';
import dotenv from 'dotenv';
import expressSocketIO from 'express-socket.io-session';
import argon2 from 'argon2';
import mysql from 'mysql2';
import colors from 'colors';

dotenv.config();

//defining constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iv = Buffer.from(process.env.IV, 'hex');
const secretKey = Buffer.from(process.env.ENCRYPT_KEY, 'hex');
const PORT = process.env.PORT;
const validCharacters = 'qwertyuiopaqsdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM!@#$%^&():,./?~|1234567890 ';
// const messageCooldown = 1.5/*<-- seconds*/ * 1000;

// Create instances
const app = express();
const server = http.createServer(app);
const io = new Server(server);

let onlineClients = {};

//database stuff
// const DB_USERNAME = process.env.DB_USERNAME;
// const DB_PASSWORD = process.env.DB_PASSWORD;
// const DB_HOST = process.env.DB_HOST;
// const DB_PORT = process.env.DB_PORT;

// const pool = mysql.createPool({
//   connectionLimit: 100,
//   database: "_",
//   user: DB_USERNAME,
//   password: DB_PASSWORD,
//   host: DB_HOST
// });

//defining security functions
async function argonHash(password) {
  try {
    const hash = await argon2.hash(password);
    return hash;
  } catch (err) {
    error("ERROR HASHING: " + err);
  }
}

function hash(inputString) {
  const sha256Hash = crypto.createHash('sha256');
  sha256Hash.update(inputString);
  return sha256Hash.digest('hex');
}

function encrypt(data) {
  const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
  let encryptedData = cipher.update(data, 'utf-8', 'base64');
  encryptedData += cipher.final('base64');
  return encryptedData;
}

function decrypt(encryptedData) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);
  let decryptedData = decipher.update(encryptedData, 'base64', 'utf-8');
  decryptedData += decipher.final('utf-8');
  return decryptedData;
}

//defining database/sql functions

const executeSQL = (sqlQuery) => {
  return new Promise((resolve, reject) => {
    pool.query(sqlQuery, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};


// Set up session middleware and other resources
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  proxy: true, // Required for Heroku & Digital Ocean (regarding X-Forwarded-For)
  name: process.env.DEPLOY_COOKIE_NAME || 'deploy', // This needs to be unique per-host.
  cookie: {
    secure: true, // required for cookies to work on HTTPS
    httpOnly: false,
    sameSite: 'strict'
  }
});

app.use(sessionMiddleware);
io.use(expressSocketIO(sessionMiddleware));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('views', path.join(__dirname, 'public', 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.set("trust proxy", 1);
//app.use('/vcServer', VCPeerServer);

//test

app.listen(PORT, () => {
  console.log("Listening on port " + PORT)
})
