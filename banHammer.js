const fs = require("fs");
const config = require("config");
const { infoLogger } = require("winston");
const lowdb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adaptor = new FileSync("./config/bannedIPs.json");
const db = lowdb(adaptor);

// TODO: Use loDB for managing ban list JSON file.

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
                console.log("running recycle", this.recentIPs);
                this.recycleIPs();
                // this.recycleIPs.bind(this)
            }, (1000 * config.get("throttleBanReset")) / 2);
        }
    }
    banIP(ip) {
        let banned = { ...ip };
        banned.date = Date.now();
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
};
