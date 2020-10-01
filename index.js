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
const PROTOCOL = "http";

// Chalk:
const error = chalk.bold.red;

const mail = new SendMail();

// Start a server

const server = http.createServer((req, res) => {
    // console.dir(req);
    let baseURL = `${PROTOCOL}://${req.headers.host}/${
        req.params ? req.params : ""
    }`;
    // let path = url.parse(req.url, false);

    let curURL = new URL(req.url, baseURL);

    // console.log(curURL);

    // NOTE: time is sent as 24 hour format. ("00:00") as string
    //       date is sent in reverse orders ("1990-07-15") as string

    if (curURL.pathname === "/sendmail" && req.method === "POST") {
        let body = "";
        let sent = false;
        let validData = true; // Start true because the form can omit the required field. If so, no validation is needed here.
        req.on("data", (chunk) => {
            // console.log(chunk.toString());
            body += chunk.toString();
        });

        req.on("end", () => {
            res.setHeader("Content-Type", "application/JSON");

            // Did we get JSON from a JS Ajax request?
            let json = {};
            console.log(chalk`{blue ---- Trying JSON form data... ----}`);
            try {
                json = JSON.parse(body);
                console.log(json);
                console.log(
                    chalk`{blue ---- JSON data received successfully. ----}`
                );
                res.end(
                    `${JSON.stringify({
                        status: 200,
                    })}`
                );
                return;
            } catch (e) {
                console.log(chalk.red("---- Ill formed JSON received. ----"));
            }
            // JSON couldn't be parsed, try to convert form data to an object, then JSON to send.
            console.log(chalk`{blue ---- Trying regular form data... ----}`);
            body = { ...queryString.parse(body) }; // Doesn't return a normal object so we spread it. Odd, but OK...

            // Attempt to send mail

            // Also validate all fields were sent
            // name, pet name, email address, phone, message
            if (!body) {
                console.log(error`---- No data received. ----`);
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
            if (body.required) {
                validData = validateBody(body);
            }
            console.log(validData);
            if (body && validData) {
                sent = mail.send(body);
            }
            if (!sent) {
                res.end(
                    `${JSON.stringify({
                        msg: "There was an issue sending mail.",
                        status: 500,
                    })}`
                );
                return;

                // Finally send mail
            } else {
                res.end(
                    `${JSON.stringify({
                        msg: "Email sent.",
                        status: 200,
                    })}`
                );
            }
        });
    }
    // Status route that returns 200 for monitoring
    else if (curURL.pathname === "/status" && req.method === "GET") {
        console.log("Status check OK");
        res.setHeader("Content-Type", "application/JSON");
        res.end(
            `${JSON.stringify({
                msg: "Server is up.",
                status: 200,
            })}`
        );
        return;
    } else {
        // 404
        res.setHeader("Content-Type", "application/JSON");
        res.end(
            `${JSON.stringify({
                msg: "Resource not found.",
                status: 404,
            })}`
        );
        return;
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

// Mail validations (all required fields)

function validateBody(data) {
    console.log("Validating data ----");
    console.log(data);
    let requiredFields = data.required.split(",");
    console.log(requiredFields);
    return requiredFields.every(
        (field) => data.hasOwnProperty(field) && data[field] !== ""
    );
}

// Logging
