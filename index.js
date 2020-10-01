const http = require("http");
const URL = require("url").URL;
const chalk = require("chalk");
const queryString = require("querystring");

let SendMail = require("./sendmail");
// spam
// bad words

// Configurations

const HOST = "localhost";
const PORT = 3000;
const METHOD = "http";

// Chalk:
const error = chalk.bold.red;

const mail = new SendMail();

// Start a server

const server = http.createServer((req, res) => {
    console.dir(req);
    let baseURL = `${METHOD}://${req.headers.host}/${
        req.params ? req.params : ""
    }`;
    // let path = url.parse(req.url, false);
    let body = "";

    let curURL = new URL(req.url, baseURL);

    console.log(curURL);

    // Status route that returns 200 for monitoring
    if (curURL.pathname === "/status" && req.method === "GET") {
        console.log("Status check OK");
        res.setHeader("Content-Type", "application/JSON");
        res.end(
            `${JSON.stringify({
                msg: "Server is up",
                status: 200,
            })}`
        );
        return;
    }

    // NOTE: time is sent as 24 hour format. ("00:00") as string
    //       date is sent in reverse orders ("1990-07-15") as string

    if (curURL.pathname === "/sendmail" && req.method === "POST") {
        req.on("data", (chunk) => {
            // console.log(chunk.toString());
            body += chunk.toString();
        });

        req.on("end", () => {
            res.setHeader("Content-Type", "application/JSON");

            // Did we get JSON from a JS Ajax request?
            let json = {};
            try {
                console.log(chalk`{blue ---- Trying JSON form data... ----}`);
                json = JSON.parse(body);
                console.log(json);
                res.end(
                    `${JSON.stringify({
                        msg: "---- JSON data received successfully. ----",
                        status: 200,
                    })}`
                );
                return;
            } catch (e) {
                console.log(chalk.red("---- Ill formed JSON received. ----"));
            }
            console.log(chalk`{blue ---- Trying regular form data... ----}`);
            console.log("body", queryString.parse(body));
            let sent = false;

            // Attempt to send mail

            // Also validate all fields were sent
            // name, pet name, email address, phone, message
            if (!body) {
                console.log("no data received");
                if (!sent) {
                    res.end(
                        `${JSON.stringify({
                            msg:
                                "There was an issue with your request to send mail.",
                            status: 400,
                        })}`
                    );
                    return;
                }
            }

            if (!sent) {
                res.end(
                    `${JSON.stringify({
                        msg: "There was an issue sending mail.",
                        status: 500,
                    })}`
                );
                return;
            }
            // Finally send mail

            if (body) {
                mail.send(body);
            }
        });
    } else {
        res.end(
            `${JSON.stringify({
                msg: "There was an issue with your request.",
                status: 400,
            })}`
        );
    }
});

server.on("clientError", (err, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

server.listen(PORT, HOST, () => {
    console.log(
        chalk`{bold.white.bgBlue Server started on http://${HOST}:${PORT}}`
    );
});

// Path for receiving mail information

// Mail validations (all required fields)

// Logging
