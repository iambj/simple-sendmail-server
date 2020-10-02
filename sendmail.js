const nodemailer = require("nodemailer");
let chalk = require("chalk");

// If chalk is a dev dependency, we can overwrite the tagged template literal format.
// chalk = function(text){return text[0]};

module.exports = class SendMail {
    constructor() {
        console.log(chalk`{bold.white.bgBlue ----Sendmail loaded----}`);
        this.transporter = nodemailer.createTransport({
            sendmail: true,
            newline: "unix",
            path: "/usr/sbin/sendmail",
        });
    }

    send(data) {
        console.log(chalk`{green.bold ---- Mail sent. ----}`);
        // console.log(data)
        return true;
    }

    sendReal(data) {
        console.log("sending mail...", data);
        this.transporter.sendMail(
            {
                from: "website@pettinontheritz.com",
                to: "iambj@icloud.com",
                subject: "Test Email From Node",
                text: "This is so going into the junk mail",
            },
            (err, info) => {
                console.log(info.envelope);
                console.log(info.messageId);
                if (err) {
                    console.log(err);
                }
            }
        );
    }
};
