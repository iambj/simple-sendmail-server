/**
    TODO: 
        - more verbose error messages returned on the API (i.e sending failed because of invalidation) 
        - Support for loading multiple validation schemas

*/

const http = require("http");
const URL = require("url").URL;
const path = require("path");
const chalk = require("chalk");
const queryString = require("querystring");
const config = require("config");

let SendMail = require("./sendmail");
const { debug } = require("console");
// spam
// may be able to use the Set functions from ExecuteProgram
// the intersect ones

// bad words

// Configurations

const HOST = config.get("host");
const PORT = config.get("port");
const PROTOCOL = config.get("protocol");

// Load from config
/* 
?   A path like this will work while using __dirname
?   but maybe an absolute path would work best.
?   This is rigid as the path in the config completely
?   is dependent on 1. where you place the schema,
?   .2 the type of path you use.
?   As of now, the folder with validation schemas must
?   reside in the root directory of the app and where it
*/
const validationPaths = {
    basic: "validation/basic.js",
    phone: "validation/phone.js",
    broken: "validation/b.js",
};

// Chalk:
const error = chalk.bold.red;
const info = chalk.blue;

const mail = new SendMail();

// Start a server

const server = http.createServer(async (req, res) => {
    // Build an object of useful info to pass along to modules.
    const reqInfo = {
        clientIP:
            req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        origin: req.headers.origin,
        referer: req.headers.referer,
    };
    console.log(reqInfo.origin);
    // console.dir(req);
    let baseURL = `${PROTOCOL}://${req.headers.host}/${
        req.params ? req.params : ""
    }`;
    // let path = url.parse(req.url, false);

    let curURL = new URL(req.url, baseURL);

    // console.log(curURL.search);

    // NOTE: time is sent as 24 hour format. ("00:00") as string
    //       date is sent in reverse orders ("1990-07-15") as string

    if (curURL.pathname === "/build" && req.method === "POST") {
        let body = "";
        let sent = false;
        let validData = true; // Start true because the form can omit the required field. If so, no validation is needed here.
        req.on("data", (chunk) => {
            // console.log(chunk.toString());
            body += chunk.toString();
        });
        req.on("end", async () => {
            res.setHeader("Content-Type", "application/JSON");
            console.log(chalk`{blue ---- Trying regular form data... ----}`);
            body = { ...queryString.parse(body) }; // Doesn't return a normal object so we spread it. Odd, but OK...
            // Attempt to send mail
            // Also validate all fields were sent
            if (!body || Object.keys(body).length < 1) {
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
            // TODO: Default to some kind of validation, like basic.

            // if (body) {
            //     validData = validateBody(body);
            // }
            // console.log(validData);
            // if (body && validData) {
            sent = await mail.buildEmail(body, reqInfo);
            console.log({ sent });
            // }
            if (!sent) {
                console.log(error`---- Can't send mail. Fatal error. ----`);
                res.end(
                    `${JSON.stringify({
                        msg: "There was an issue sending mail.",
                        // err: sent.err,
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
                return;
            }
        });
    } else if (curURL.pathname === "/sendmail" && req.method === "POST") {
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
                // TODO: JSON next - collect body data then move on to sending
                res.end(
                    `${JSON.stringify({
                        status: 200,
                    })}`
                );
                return; //! <-- <--
            } catch (e) {
                console.log(chalk.red("---- Ill formed JSON received. ----"));
            }
            // JSON couldn't be parsed, try to convert form data to an object, then JSON to send.
            console.log(chalk`{blue ---- Trying regular form data... ----}`);
            body = { ...queryString.parse(body) }; // Doesn't return a normal object so we spread it. Odd, but OK...
            // Attempt to send mail
            // Also validate all fields were sent
            if (!body || Object.keys(body).length < 1) {
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
            // TODO: Default to some kind of validation, like basic.

            if (body) {
                validData = validateBody(body);
            }
            // console.log(validData);
            if (body && validData) {
                sent = mail.send(body);
            }
            if (!sent) {
                console.log(error`---- Can't send mail. Fatal error. ----`);
                res.end(
                    `${JSON.stringify({
                        msg: "There was an issue sending mail.",
                        status: 500,
                    })}`
                );
                return;

                // Finally send mail
            } else {
                const pageTarget = config.get("thankYouPage");
                const hostName = config.get("hostName");
                const protocol = config.get("protocol");
                let redirectHTML = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8"/>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                    <meta http-equiv="refresh" content="0; URL=${protocol}://${hostName}/${pageTarget}" />
                </head>
                <body>
                    
                </body>
                </html>
                
                `;
                res.setHeader("Content-Type", "text/html");
                res.end(
                    redirectHTML

                    // `${JSON.stringify({
                    //     msg: "Email sent!",
                    //     status: 200,
                    // })}`
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
        console.log("404");

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
// const dataScheme

function validateBody(rawData) {
    // TODO: strip whitespace
    console.log(chalk`{yellow ---- Begin Validating data ----}`);
    // If a validation schema was sent with the form
    let data = {};
    for (const [key, val] of Object.entries(rawData)) {
        data[key] = val.trim();
    }

    console.log(data);
    if (data.validation) {
        // Get name passed from the form
        // This should match with one in the config.
        let validationName = data.validation;

        if (validationPaths[validationName]) {
            let validation;
            try {
                joi = require(path.resolve(
                    __dirname,
                    validationPaths[validationName]
                ));
            } catch (e) {
                console.log(
                    error`---- Can't load schema for ${validationPaths[validationName]}`
                );
                return false;
            }
            // console.log(validation);
            console.log(
                info`---- Validate using "${validationName}" schema. ----`
            );
            let validate = joi.validate(data);
            if (validate.error) {
                console.log(error`---- Joi validation failed. ----`);
                console.log(validate);
                return false;
            }
        } else {
            console.log(error`---- Unknown schema requested ----`);
            return false;
        }
    }
    // console.log("data", data);

    // If there is a required property, otherwise skip checking for required fields from submitted data
    if (data.required) {
        let requiredFields = data.required.split(",");
        console.log("requiredFields", requiredFields);
        return requiredFields.every(
            (field) => data.hasOwnProperty(field) && data[field] !== ""
        );
    }
    return true;
}

// Logging
