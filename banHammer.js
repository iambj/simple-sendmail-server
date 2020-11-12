const fs = require("fs");
const config = require("config");
const { infoLogger } = require("winston");
const lowdb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adaptor = new FileSync("./config/bannedIPs.json");
const db = lowdb(adaptor);

const axios = require("axios").default;
const geoIPLookUpURL = "https://geoipify.whoisxmlapi.com/api/v1";

let geoIP = null;
const GeoIPKey = config.get("geoIPKey");
const allowedCountries = config.get("allowedCountries");
// If there is a key for the GeoIP service, enable checking IPs
if (GeoIPKey && allowedCountries.length >= 1) {
    geoIP = true;
}

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
                this.recycleIPs();
            }, (1000 * config.get("throttleBanReset")) / 2);
        }
    }

    banIP(ip) {
        let banned = { ...ip };
        banned.date = Date.now();
        console.log(ip);
        this.bannedIPs.push(banned);
        db.get("banned.").push(banned).write();
    }

    loadBannedIPs() {
        /**
         *   Loads ban information from config/bannedIPs.json into memory.
         *   of strings.
         *   @return {undefined}
         *
         */
        this.bannedIPs = db.get("banned").value();
    }

    recycleIPs() {
        this.recentIPs.forEach((ip, i) => {
            if (Date.now() >= ip.date + 1000 * config.get("throttleBanReset")) {
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
        /**
         * Checks if a given IP is currently being throttled.
         * @param {String} ip IP that is being checked for throttling
         * @returns {Boolean} True if IP attempting to connect has connected too soon again.
         */
        let list = [];
        let banCache = {};
        this.recentIPs.map((entry) => {
            // Loop through the recent IPs in memory and create an array of just IPs
            list.push(entry.ip);
            // Either add an IP to the temp list or increment its count by 1.
            banCache[entry.ip] = banCache[entry.ip] + 1 || 1;
            // Check if the attempted IP is attempting to connect too much based on the config setting,
            // and if so, ban the IP.
            if (banCache[entry.ip] >= config.get("throttleBanThreshold")) {
                this.banIP({ ip: entry.ip, reason: "throttle ban" });
            }
        });
        return list.includes(ip);
    }

    async checkGeoIP(reqInfo) {
        /**
         *  @returns {boolean} Returns true if the IP location is allowed. If the GET request fails, will return a "soft"
         *  passing value by returning a non-null value with an error.
         */
        if (geoIP && reqInfo.clientIP !== "127.0.0.1") {
            console.log("checking ip location", reqInfo.clientIP);
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
                    accessLogger.info("Blocked IP by geolocation.", {
                        code: 403,
                        route: reqInfo.params,
                        from: reqInfo.clientIP,
                    });
                    return false;
                } else {
                    return true;
                }
            } catch (err) {
                if (err) {
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
