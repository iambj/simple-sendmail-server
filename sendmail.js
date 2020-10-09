const nodemailer = require("nodemailer");
const MailComposer = require("nodemailer/lib/mail-composer");

const fs = require("fs");
const { resolve } = require("path");

const { promisify } = require("util");
const execPromise = promisify(require("child_process").exec);

const winston = require("winston");
const config = require("config");

let chalk = require("chalk");

// If chalk is a dev dependency, we can overwrite the tagged template literal format.
// chalk = function(text){return text[0]};

// Remember: bogofilter

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
        console.log(data);
        console.log(chalk`{green.bold -------------------}`);
        return true;
    }

    sendReal(message) {
        console.log("sending mail...", message);
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

    buildTextVersion(data) {
        /** Build a string from data used for the "text" field of the message which is shown to clients who are in raw text mode for viewing emails.
         * @param {object} data
         * @return {string} Text version of a JS object of email data
         */

        // console.log(data);

        return JSON.stringify(data);
    }

    buildHTMLVersion() {
        return "html";
    }

    async buildEmail(data, reqInfo) {
        /** Compile an email to just send, save as a file for spam reasons.
         * @param {object} data  The information being submitted, usual from a form, that will be sent in the body of the email.
         * @param {object} reqInfo Information from the server about the request. It is used for logging the IP for spam purposes here.
         */

        const options = {
            from: config.get("fromAddress"),
            to: config.get("toAddress"),
            subject: config.get("subject"),
            text: "This is a message " + this.buildTextVersion(data),
            html: this.buildHTMLVersion(data),
        };

        if (config.get("useSpamCheck")) {
            let mail = new MailComposer(options);
            let stream = mail.compile().createReadStream();
            let fileName = "./testMail/" + Date.now() + "_mail.txt";
            let message = fs.createWriteStream(fileName);
            stream.pipe(message);
            // exec(`sa-learn --spam < ${fileName}`, (err, stdout, stderr) => {

            // Check message for spam
            let result = await this.checkForSpam(fileName, reqInfo);

            // Flip boolean for now because "true" means spam was found, whereas this returns to something that needs false to continue on.
            return !result;
        }
        // Not checking for spam, send on build message to transport
        else {
            console.log({ options });
            return options;
        }
    }
    async checkForSpam(fileName, reqInfo) {
        /** Compile an email to just send, save as a file for spam reasons.
         * @param {string} fileName  The information being submitted, usual from a form, that will be sent in the body of the email.
         * @param {object} reqInfo Information from the server about the request. It is used for logging the IP for spam purposes here.
         * @return {boolean} True if spam is detected by spamassassin
         */
        fileName = "./testMail/spam.txt";
        console.log("checkForSpam, filename", fileName);
        //? -e exits spamassassin if spam is found. this is used to kill the process of sending an email and trigger the catch() on the promise
        const { stdout = "empty", stderr } = await execPromise(
            `spamassassin -e < ${resolve(fileName)}`
        ).catch((e) => {
            // We have spam!
            console.log("Error?", e.stdout);
            if (config.get("logSpamMessages")) {
                console.log("saving spam email for later.");
            }
            console.log("Logging spam result from SA");
            return true;
        });
        // console.log("stdout::", stdout); //^ SA shows the email if no spam.
        // console.log("stderr", stderr); //^ Empty is no spam is found.

        return false;
    }
};

// try async await
// execSync and throw error
// try execsync and parse data

/*
somewhate there-
problems: 
    was not reading the file right?
    not assessing the emails right?
    awaiting seems to be better. 
    not getting the right return 

*/
