// const test = require("ava");

// test("status", (t) => {
//     t.title = "testing ava";
//     t.pass();
// });
const request = require("supertest");
const config = require("config");
const lowdb = require("lowdb");
const FileSync = require("../../node_modules/lowdb/adapters/FileSync");
const path = require("path");

const adaptor = new FileSync(
    path.resolve(__dirname, "../../config/bannedIPs.json")
);
const db = lowdb(adaptor);

let server;
describe("main routes", () => {
    beforeEach(() => {
        server = require("../../index");
    });

    afterEach(() => {
        server.close();
        db.set("banned", []).write();
    });

    describe("GET /status", () => {
        it("should return a 200 Status code and server is up message", async () => {
            const res = await request(server).get("/status");
            expect(res.body.msg).toBe("Server is up.");
            expect(res.status).toBe(200);
        });
        it("should fail because the IP is being throttled.", async () => {
            const res = await request(server).get("/status");
            expect(res.body.msg).toContain(
                "IP is currently throttled. Try again after"
            );
            expect(res.status).toBe(403);
        });
        it("should fail because the IP is banned.", async () => {
            let res;
            res = await request(server).get("/status");
            res = await request(server).get("/status");
            // let run = async function () {
            //     for (let i = 0; i <= config.get("throttleBanThreshold"); i++) {
            //         console.log("requesting");
            //     }
            //     console.log(res.body.msg);
            // };
            // await run();
            expect(res.body.msg).toContain("IP Banned");
            expect(res.status).toBe(403);
        });
        // Test for banning/
        // On tear down and up should use a fake banned IP list
    });
});
