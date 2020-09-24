let http = require("http");
let url = require("url");
// spam
// bad words

// Configurations

const HOST = "localhost";
const PORT = 3000;

// Start a server

const server = http.createServer((req, res) => {
    let path = url.parse(req.url, true);
    let params = req;
    let body = "";

    // Status route that returns 200 for monitoring
    if (path.pathname === "/status" && req.method === "GET") {
        res.setHeader("Content-Type", "application/JSON");
        res.end(
            `${JSON.stringify({
                msg: "Server is up",
                status: 200,
            })}`
        );
    }

    if (path.pathname === "/sendmail" && req.method === "POST") {
        req.on("data", (chunk) => {
            // console.log(chunk.toString());
            body += chunk.toString();
        });

        req.on("end", () => {
            res.setHeader("Content-Type", "application/JSON");

            // Did we get JSON from a JS Ajax request?
            let json = {};
            try {
                json = JSON.parse(body);
                console.log(json);
                res.end(
                    `${JSON.stringify({
                        msg: "JSON data recieved successfully.",
                        status: 200,
                    })}`
                );
                return;
            } catch (e) {
                console.log("ill formed JSON recieved");
            }
            console.log("---- Trying regular form data ----");
            console.log("body", body);
            let sent = false;
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
            }
        });
    } else {
        res.end(`${JSON.stringify(path)}`);
    }
});

server.on("clientError", (err, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

server.listen(PORT, HOST, () => {
    console.log(`Server started on http://${HOST}:${PORT}`);
});

// Path for receiving mail information

// Mail validations (all required fields)

// Logging
