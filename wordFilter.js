const fs = require("fs");
const config = require("config");

let flagged = [];
let profanity = [];

// Load the vulgarities into memory
fs.readFile("./wordLists/flaggedWords.txt", (err, data) => {
    if (err) {
        console.log(err);
        return;
    }
    flagged = data.toString().trim().split("\n");
});

fs.readFile("./wordLists/swearWords.txt", (err, data) => {
    if (err) {
        console.log(err);
        return;
    }
    // console.log(profanity); // TODO trim() actually isn't trimming
    profanity = data.toString().trim().split("\n");
});

function checkList(data) {
    let spam;
    let swears;
    if (config.get("useLanguageFilter")) {
        swears = profanity.filter((word) => {
            let regEx = new RegExp("\\b" + word + "\\b");
            return data.match(regEx);
        });
    }
    if (config.get("useSpamWordFilter")) {
        spam = flagged.filter((word) => {
            let regEx = new RegExp("\\b" + word + "\\b", "g");
            return data.match(regEx);
        });
    }
    console.log("flagged", spam, "swear", swears);

    // return true if spam/profanity detected.
    const languageFilterLevel = config.get("languageFilterLevel");
    if (spam.length + swears.length > languageFilterLevel) {
        return true;
    }
    return false;
}

module.exports.checkList = checkList;
