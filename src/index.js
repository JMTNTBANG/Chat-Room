//  Internal Modules  \\
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const url = require("url");

//  NPM Modules  \\
const express = require("express");
const mysql = require("mysql");
const session = require("express-session");

//  Local Assets  \\
const config = require("./config.json");

//  Database Object  \\
const database = mysql.createConnection({
  host: config.server.ip,
  port: config.server.port,
  user: config.auth.username,
  password: config.auth.password,
});

//  Connect to the Database  \\
database.connect((err) => {
  if (err) throw err;
  console.log(
    `Connected to MySQL Server at ${config.server.ip}:${config.server.port} as ${config.auth.username}`
  );
});

//  Initialize Website  \\
const website = express();
website
  .use(session({ secret: "secret", resave: true, saveUninitialized: true }))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use(express.static(path.join(__dirname, "static")));

//  example.com/  \\
website.get("/", (request, response) => {
  response.send("Success");
  response.end();
});

//  Open Up Website Ports 8080 and 443 (if secured)  \\
try {
  https
    .createServer(
      {
        key: fs.readFileSync(`${config.ssl}/privkey.pem`, "utf8"),
        cert: fs.readFileSync(`${config.ssl}/cert.pem`, "utf8"),
        ca: fs.readFileSync(`${config.ssl}/chain.pem`, "utf8"),
      },
      website
    )
    .listen(443, () => {
      console.log("HTTPS Server running on port 443");
    });
} catch {
  console.log("Caution: Connections will not be secured");
}
http.createServer(website).listen(8080, () => {
  console.log("HTTP Server running on port 8080");
});
