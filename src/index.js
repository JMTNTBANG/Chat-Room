// Internal Modules //
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const url = require("url");

// NPM Modules //
const express = require("express");
const mysql = require("mysql");
const session = require("express-session");

// Local Assets //
const config = require("./config.json");

// Database Object //
const database = mysql.createConnection({
  host: config.server.ip,
  port: config.server.port,
  user: config.auth.username,
  password: config.auth.password,
});

// Connect to the Database //
database.connect((err) => {
  if (err) throw err;
  console.log(`Connected to MySQL Server at ${config.server.ip}:${config.server.port} as ${config.auth.username}`)
});


