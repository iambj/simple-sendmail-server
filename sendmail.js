const nodemailer = require("nodemailer");
const MailComposer = require("nodemailer/lib/mail-composer");

const wordFilter = require("./wordFilter");

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

/**
 * Module for all things sending mail. Builds emails, then sends them. Also checks for spam with spamassassin.
 * Also provides functions for building text and html versions of the body of an email.
 *
 *@version 0.0.1
 */

module.exports = class SendMail {
    constructor() {
        console.log(chalk`{bold.white.bgBlue ----Sendmail loaded----}`);
        this.transporter = nodemailer.createTransport({
            sendmail: true,
            // newline: "unix",
            path: "/usr/sbin/sendmail",
        });
    }

    send(data) {
        console.log(chalk`{green.bold ---- Mail sent. ----}`);
        console.log(data);
        console.log(chalk`{green.bold -------------------}`);

        const htmlText = JSON.stringify(data);

        const fileName = Date.now();
        fs.writeFile(`./builtEmails/${fileName}.txt`, htmlText, (err) => {
            if (!err) {
                return true;
            } else {
                console.log("Error writing fake email.", err);
            }
        });
    }

    sendReal(message) {
        console.log("sending mail...", message);
        this.transporter.sendMail(
            message,
            // {
            //     from: "website@pettinontheritz.com",
            //     to: "iambj@icloud.com",
            //     subject: "Test Email From Node",
            //     text: "This is so going into the junk mail",
            // },
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
        const newData = { ...data };
        let parsedData = "";
        if (newData["formDesc"]) {
            parsedData += newData["formDesc"] + "\n";
            delete newData.formDesc;
        }
        Object.keys(newData).forEach((i) => {
            parsedData += `${i.charAt(0).toUpperCase() + i.slice(1)}: ${
                newData[i]
            }\n`;
        });

        let textMessage = parsedData;
        // console.log(textMessage);
        return textMessage;
    }

    buildHTMLVersion(data) {
        const newData = { ...data };
        let htmlMessage = "";
        if (newData["formDesc"]) {
            htmlMessage += `<b>${newData["formDesc"]}</b><br/>`;
            delete newData.formDesc;
        }
        htmlMessage += "<ul>";
        Object.keys(newData).forEach((i) => {
            htmlMessage += `<li><b>${
                i.charAt(0).toUpperCase() + i.slice(1)
            }:</b> ${newData[i]}</li>`;
        });
        htmlMessage += "</ul>";
        return htmlMessage;
    }

    async buildEmail(data, reqInfo) {
        /** Compile an email to just send, save as a file for spam reasons.
         * @param {object} data  The information being submitted, usual from a form, that will be sent in the body of the email.
         * @param {object} reqInfo Information from the server about the request. It is used for logging the IP for spam purposes here.
         */

        // Language/word filters
        let langCheck = wordFilter.checkList(JSON.stringify(data));
        if (langCheck) {
            console.log("langcheck", langCheck);
            return false;
        }

        // console.log(JSON.stringify(data));

        const options = {
            from: config.get("fromAddress"),
            to: config.get("toAddress"),
            subject: config.get("subject"),
            text: this.buildTextVersion(data),
            html: this.buildHTMLVersion(data),
        };
        let mail = new MailComposer(options);
        let isSpam = false;

        if (config.get("useSpamCheck")) {
            // TODO: maybe move this out to check for spam as it is the only place it is used. When spam check is off, mail is composed from the options.
            let stream = mail.compile().createReadStream();
            let fileName = "./testMail/" + Date.now() + "_mail.txt";
            let message = fs.createWriteStream(fileName);
            stream.pipe(message);
            // exec(`sa-learn --spam < ${fileName}`, (err, stdout, stderr) => {

            // Check message for spam
            isSpam = await this.checkForSpam(fileName, reqInfo);
        }

        // Not checking for spam, send on build message to transport
        // console.log({ options });
        if (!isSpam) {
            this.send(options);
            return true;
        } else {
            return false;
        }
    }
    async checkForSpam(fileName, reqInfo) {
        /** Compile an email to just send, save as a file for spam reasons.
         * @param {string} fileName  The information being submitted, usual from a form, that will be sent in the body of the email. It os then resolved to an absolute path.
         * @param {object} reqInfo Information from the server about the request. It is used for logging the IP for spam purposes here.
         * @return {boolean} True if spam is detected by spamassassin
         */
        // fileName = "./testMail/spam.txt";
        // fileName = resolve(fileName);
        console.log("checkForSpam, filename", fileName);
        let spam = false;

        // TODO: check if file exists
        //? -e exits spamassassin if spam is found. this is used to kill the process of sending an email and trigger the catch() on the promise
        const { stdout = "empty", stderr } = await execPromise(
            `spamassassin -e < ${fileName}`
        ).catch((e) => {
            // We have spam!
            spam = true;
            // console.log("Error?", e.stdout);
            // LOGTHIS "e" to winston
            console.log("Logging spam result from SA", reqInfo.clientIP);
            return e;
        });

        // Should we hold onto spam for analysis?
        console.log(spam, fileName);
        if (!spam || !config.get("saveSpamMessages")) {
            fs.unlink(fileName, (err) => {
                console.log("deleting non spam email");
            });
        }
        if (spam) return true;
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
