const fs = require("fs");
const config = require("config");
const { infoLogger } = require("winston");
const lowdb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adaptor = new FileSync("./config/bannedIPs.json");
const db = lowdb(adaptor);

// If there is a key for the GeoIP service, enable checking IPs

const axios = require("axios").default;
const geoIPLookUpURL = "https://geoipify.whoisxmlapi.com/api/v1";

let geoIP = null;
const GeoIPKey = config.get("geoIPKey");
const allowedCountries = config.get("allowedCountries");
console.log(allowedCountries);
if (GeoIPKey && allowedCountries.length >= 1) {
    geoIP = true;
}
// TODO: Use loDB for managing ban list JSON file.

const winston = require("winston");
const {
    combine,
    timestamp,
    label,
    prettyPrint,
    json,
    simple,
    printf,
} = winston.format;

//! Provide this logger on winston for the time being

const accessLogger = winston.createLogger({
    level: "info",
    format: combine(
        timestamp(),
        // json()
        simple()
        // prettyPrint()
    ),
    // defaultMeta: { service: "main-server" },
    transports: [
        new winston.transports.File({
            filename: "logs/access.log",
        }),
    ],
});

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${level} | ${timestamp} | ${message}`;
});

// Add a console logger for dev mode.
if (process.env.NODE_ENV !== "production") {
    infoLogger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                myFormat
            ),
        })
    );
}

module.exports = class BanHammer {
    constructor() {
        db.defaults({
            banned: [],
        }).write();

        // Recent IPs, used for throttling purposes.
        this.recentIPs = [];
        // IP list in memory.
        this.bannedIPs = [];

        this.loadBannedIPs();

        // Start the IP recycler
        if (config.get("throttleBanReset") >= 1) {
            // Need to rebind this since we're using a timer.
            const recentIPRecycler = setInterval(() => {
                // console.log("running recycle", this.recentIPs);
                this.recycleIPs();
                // this.recycleIPs.bind(this)
            }, (1000 * config.get("throttleBanReset")) / 2);
        }
    }
    banIP(ip) {
        // TODO don't apply duplicates
        let banned = { ...ip };
        banned.date = Date.now();
        console.log(ip);
        this.bannedIPs.push(banned);
        // console.log(this.bannedIPs);
        db.get("banned.").push(banned).write();
    }
    // saveBannedIPs() {}
    loadBannedIPs() {
        /**
         *   Loads ban information from config/bannedIPs.json into memory.
         *   of strings. //TODO May want to implement this as a Set() later.
         *   @return {undefined}
         *
         */
        this.bannedIPs = db.get("banned").value();
        // console.log(this.bannedIPs);
        // fs.readFile("config/bannedIPs.json", "utf8", (err, data) => {
        //     try {
        //         const ipList = JSON.parse(data).banned;
        //         ipList.map((entry) => this.bannedIPs.push(entry.ip));
        //     } catch (e) {
        //         infoLogger.info(
        //             "Banned IPs list missing or ill-formed. Creating new."
        //         );
        //         let baseFile = { banned: [] };
        //         fs.writeFile(
        //             "config/bannedIPs.json",
        //             JSON.stringify(baseFile),
        //             (err) => {
        //                 if (err) {
        //                     infoLogger.error(
        //                         `Error creating banned IPs file. Fatal error.`
        //                     );
        //                     throw new Error(
        //                         `Error creating banned IPs file. Fatal error.`
        //                     );
        //                 }
        //             }
        //         );
        //     }
        // });
    }
    recycleIPs() {
        // console.log("Checking IPS", this.recentIPs);
        this.recentIPs.forEach((ip, i) => {
            if (Date.now() >= ip.date + 1000 * config.get("throttleBanReset")) {
                // console.log("remove", ip, i);
                infoLogger.info("Removing IP from throttling.", { ip: ip.ip });
                this.recentIPs.splice(i, 1);
            }
        });
    }
    // Add the IP to the recentIPs list after a request
    addToRecentIPs(ip) {
        this.recentIPs.push({ ip, date: Date.now() });
    }

    // Permanent ban check
    bannedIPCheck(ip) {
        // console.log(this.bannedIPs);
        // console.log(this.bannedIPs, ip);
        return this.bannedIPs.filter((banned) => banned.ip === ip).length;
    }

    // Throttled IP check
    throttledIPCheck(ip) {
        let list = [];
        let banCache = {};
        // TODO: this may be a bit too round about but it works.
        this.recentIPs.map((entry) => {
            list.push(entry.ip);
            banCache[entry.ip] = banCache[entry.ip] + 1 || 1;
            if (banCache[entry.ip] >= config.get("throttleBanThreshold")) {
                this.banIP({ ip: entry.ip, reason: "throttle ban" });
                // this.bannedIPs.push({ ip: entry.ip, date: Date.now() });
                // fs.readFile("config/bannedIPs.json", "utf8", (err, data) => {
                //     const bannedList = JSON.parse(data).banned;
                //     bannedList.push({
                //         ip: entry.ip,
                //         date: Date.now(),
                //         reason: "throttle ban",
                //     });
                //     const banFile = { banned: [...bannedList] };
                //     fs.writeFile(
                //         "config/bannedIPs.json",
                //         JSON.stringify(banFile),
                //         (err) => {
                //             if (!err) {
                //                 this.loadBannedIPs();
                //                 infoLogger.info(
                //                     `${entry.ip} has been permanently banned.`
                //                 );
                //             }
                //         }
                //     );
                // });
            }
        });
        return list.includes(ip);
    }

    async checkGeoIP(reqInfo) {
        /**
         *  @returns {boolean} Returns true if the IP location is allowed. If the GET request fails, will return a "soft"
         *  passing value by returning a non-null value with an error.
         */
        if (geoIP && reqInfo.clientIP !== "127.0.0.2") {
            console.log("checking ip location", reqInfo.clientIP);
            // ip = "64.121.131.36";
            try {
                let url =
                    geoIPLookUpURL +
                    "?apiKey=" +
                    config.get("geoIPKey") +
                    "&ipAddress=" +
                    reqInfo.clientIP;
                const response = await axios.get(url);
                if (
                    !allowedCountries.includes(response.data.location.country)
                ) {
                    this.banIP({
                        ip: reqInfo.clientIP,
                        reason: "IP geolocation blocked",
                    });
                    // TODO send response to user, log with winston
                    accessLogger.info("Blocked IP by geolocation.", {
                        code: 403,
                        route: reqInfo.params,
                        from: reqInfo.clientIP,
                    });
                    console.log("banned ip");
                    return false;
                } else {
                    return true;
                }
            } catch (err) {
                if (err) {
                    console.log(err); //API call failed
                    infoLogger.info("Unhandled exception", {
                        err,
                        msg: err.message,
                        stack: err.stack,
                    });
                    return {
                        APICheck: "A problem with checking the IP API.",
                    };
                }
            }
        }
        return {
            APICheck: "No call to the API.",
        };
    }
};
