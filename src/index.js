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

//  Send Error To Client  \\
function sendPopup(message, response, afterAlert = "history.back();") {
  response.send(`<script>alert("${message}"); ${afterAlert}</script>`);
  response.end();
}
//   Home Page   \\
//  example.com  \\
website.get("/", (request, response) => {
  if (request.session.loggedin)
    response.sendFile(path.join(__dirname + "/home.html"));
  else response.sendFile(path.join(__dirname + "/login.html"));
});

//  The Chat History Window on the homepage  \\
//          example.com/chathistory          \\
website.get("/chathistory", (request, response) => {
  database.query("SELECT * FROM chat_rooms.messages", (err, messages, x) => {
    if (err) {
      sendPopup(err, response);
      return;
    }
    database.query("SELECT * FROM auth.accounts", (err, accounts, x) => {
      if (err) {
        sendPopup(err, response);
        return;
      }
      let payload =
        '<style>body {font-family: Arial, sans-serif;background-color: white;} html, body {max-width: 100%;overflow-x: hidden;}</style><div style="overflow: auto; display: flex; flex-direction: column-reverse;">';
      for (message in messages) {
        let author = "debug";
        for (account in accounts) {
          if (accounts[account].ID == messages[message].userID) {
            author = accounts[account].username;
            break;
          } else continue;
        }
        payload += `<div style="width: 100%;"><h2>${author}</h2><h3>${messages[message].dateCreated}</h3><h1>${messages[message].content}</h1><hr></div>`;
      }
      response.write(payload);
      setInterval(() => {
        if (!request.session.loggedin) {
          sendPopup(
            "Session Expired, Please Sign in Again",
            response,
            "window.location.pathname = '/';"
          );
          return;
        }
        database.query(
          "SELECT * FROM chat_rooms.messages",
          (err, messages2, x) => {
            if (err) {
              sendPopup(err, response);
              return;
            }
            database.query(
              "SELECT * FROM auth.accounts",
              (err, accounts, x) => {
                if (err) {
                  sendPopup(err, response);
                  return;
                }
                let payload = "";
                for (message in messages2) {
                  if (!message) continue;
                  if (messages.includes(messages[message])) continue;
                  let author = "debug";
                  for (account in accounts) {
                    if (accounts[account].ID == messages2[message].userID) {
                      author = accounts[account].username;
                      break;
                    } else continue;
                  }
                  payload += `<div style="width: 100%;"><h2>${author}</h2><h3>${messages2[message].dateCreated}</h3><h1>${messages2[message].content}</h1><hr></div>`;
                  messages.push(messages2[message]);
                }
                response.write(payload);
              }
            );
          }
        );
      }, 1000);
    });
  });
});

//  Called When a Message is Sent  \\
//     example.com/sendmessage     \\
website.post("/sendmessage", (request, response) => {
  let message = request.body.message;
  if (!request.session.loggedin) {
    sendPopup(
      "Session Expired, Please Sign in Again",
      response,
      "window.location.pathname = '/';"
    );
    return;
  }
  database.query(
    `INSERT INTO chat_rooms.messages (\`userID\`, \`room\`, \`content\`) VALUES ('${request.session.userid}', '0', '${message}');`,
    (err, results) => {
      if (err) {
        sendPopup(err, response);
        return;
      }
      response.redirect("/");
      response.end();
    }
  );
});

//  The Account Settings Page  \\
//     example.com/account     \\
website.get("/account", (request, response) => {
  if (!request.session.loggedin) {
    sendPopup(
      "Session Expired, Please Sign in Again",
      response,
      "window.location.pathname = '/';"
    );
    return;
  }
  response.sendFile(path.join(__dirname + "/account.html"));
});

//  Called When Updating Account Info  \\
//   example.com/update-account-info   \\
website.post("/account/update-account-info", (request, response) => {
  if (!request.session.loggedin) {
    sendPopup(
      "Session Expired, Please Sign in Again",
      response,
      "window.location.pathname = '/';"
    );
    return;
  }
  let queries = "UPDATE auth.accounts SET ";
  let first = true;
  if (request.body.username != "") {
    if (!first) queries += ", ";
    queries += `\`username\` = '${request.body.username}'`;
    first = false
  }
  if (request.body.password != "") {
    if (!first) queries += ", ";
    queries += `\`password\` = '${request.body.password}'`;
    first = false
  }
  queries += ` WHERE (\`ID\` = '${request.session.userid}');`;
  database.query(queries, (err, result, fields) => {
    if (err) {
      sendPopup(err, response);
      return;
    }
    request.session.loggedin = false;
    sendPopup(
      `Success, Please Sign Back In`,
      response,
      "window.location.pathname = '/';"
    );
  });
});

//  Called During a Login Attempt  \\
//        example.com/login        \\
website.post("/login", (request, response) => {
  const username = request.body.username;
  const password = request.body.password;
  let previous_query = url.parse(request.rawHeaders[33], true).search;
  if (previous_query == null) {
    previous_query = "";
  }
  if (username && password) {
    database.query(
      "SELECT * FROM auth.accounts WHERE username = ? AND password = ?",
      [username, password],
      function (err, results, fields) {
        if (err) {
          sendPopup(err, response);
          return;
        }
        if (results.length > 0) {
          request.session.loggedin = true;
          request.session.username = username;
          request.session.userid = results[0].ID;
        }
        response.redirect(`/${previous_query}`);
        response.end();
      }
    );
  }
});

//  Called when the Logout Button is Clicked  \\
//             example.com/logout             \\
website.get("/logout", (request, response) => {
  if (request.session.loggedin) {
    request.session.loggedin = false;
  }
  response.redirect("/");
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
