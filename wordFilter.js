const fs = require("fs");
const config = require("config");

let flagged = [];
let profanity = [];

fs.readFile("./wordLists/flaggedWords.txt", (err, data) => {
    if (err) {
        console.log(err);
        return;
    }
    // console.log("words", data.toString());
    flagged = data.toString().trim().split("\n");
    // console.log(flagged);
    let msg = "This is a spam message fuck cunt free gift nigerian";

    // console.log(checkList(msg));
});

fs.readFile("./wordLists/swearWords.txt", (err, data) => {
    if (err) {
        console.log(err);
        return;
    }
    // console.log("words", data.toString());
    profanity = data.toString().trim().split("\n");
    let msg = "This is a spam message fuck cunt";

    // console.log();
    // console.log(profanity);
});

function checkList(data) {
    let spam;
    let swears;
    if (config.get("useLanguageFilter")) {
        swears = profanity.filter((word) => {
            // console.log(word);
            let regEx = new RegExp("\\b" + word + "\\b");
            // let regEx = new RegExp(word);
            return data.match(regEx);
        });
    }
    // let word = "nigerian";
    // let regEx = new RegExp(`\b${word}\b`, "gmi");
    // console.log(
    //     "<b>This is anemail from the Pettinontheritz.com contact form:</b><br/><ul><li><b>Name:</b> brandon</li><li><b>Email:</b> iambj@icloud.com</li><li><b>Phone:</b> 111-111-1111</li><li><b>Message:</b> Message in JSON nigerian</li></ul>'".match(
    //         /\bnigerian\b/
    //     )
    // );
    if (config.get("useSpamWordFilter")) {
        spam = flagged.filter((word) => {
            // console.log(word);
            let regEx = new RegExp("\\b" + word + "\\b", "g");
            // console.log(regEx);
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
