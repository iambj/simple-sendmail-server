# Simple Sendmail Server

Run a small, basic server to send mail from an HTML form without using a server side language to serve the page.

## Todo

-   [x] Use spamassassin & spam/profanity filters
    -   "Click here if this is spam" in emails (on hold)
-   [ ] Use IP Geolocating
-   [ ] Form reCaptcha (on hold)
-   [x] IP banning
-   [x] IP throttling
-   [ ] App token
-   [x] Return an HTML page that will redirect to a "thank you page" for HTML for requests, otherwise, when using Ajax this isn't needed.
-   [ ] Templating system for the email (on hold)
-   [ ] Refactor some features out to modules

## Using the server

This server is meant to be used inside of a closed network behind a firewall or behind a reverse proxy such as nginx. It does not implement the use of SSL or any transport layer security. The simplest use would be to allow your edge server to terminate any SSL connections and proxy the request to this mail server.

Simple Sendmail Server (SSS) will provide a response congruent to the request it receives. If a JSON request is sent to it, it will respond with JSON. If data from a form is received, it will respond with HTML. The return HTML page is configurable in the config files by changing the `thankYouPage` setting. The value should be just the name of the HTML file to send the browser to (this is subject to change). NOTE: using JavaScript to send the form is the recommended method, with the browser sending the form as application data as a fall back if for some reason the user has JS turned off.

## Security

There are some features built in such as requiring an app token to be sent to the server from the form, IP throttling/banning, and GeoIP fencing. Spamassassin is also available but it will be up to the server administrator to train it for spam emails (SA adds a minor delay to responding to requests). A small list of profane and spammy words are included in the wordLists directory.

IPs can be manually banned by a system administrator by adding at least the IP as a JSON object to `config/bannedIPs.json`. A date and message can be useful for documentation purposes.

IP throttling, if enabled, is automatic and will throttle IPs based on your settings. A 403 will be returned if they currently need to wait before sending another request. If an IP attempts to send an email too many times while throttled it will be added to `bannedIPs.json`. This is meant to mimic [fail2ban](https://www.fail2ban.org).

IP geolocation data is provided by [WhoisXMLAPI](https://whoisxmlapi.com). You will need to sign up for an account and use your API key if you would like to use this feature. A free account can be created which allows for 1,000 API calls a month. If no key or list of countries is provided, this security check will be skipped.

## Building your form

For email to be sent and validated correctly certain hidden fields need to be set. Validation should of course be done, at the very least, server side before calling on SSS and preferably also on the front end for a better experience for the user.  SSS will do basic validation if you provide these hidden fields. If invalid input is detected, sending will fail and send back an error. SSS was created for a simple website with no backend (such as Node or PHP) so simple validation was built in.

To denote fields that are required:

```html
<input type="hidden" name="required" value="(fields names)">
```

`value`  should be a comma separated list with no spaces of names that match the names of the form elements that need to be validated.  For example,

```html
<input id="name" name="name" type="text">
<input id="email" name="email">
```

would need

```html
<input type="hidden" name="required" value="name,email">
```

and SSS will make sure these fields were sent from the form.

Validation can be done using another hidden field:

```html
<input type="hidden" name="validation" value="basic">
```

The "basic" value is setup with SSS and validates (using JOI ) a name, email, phone number, and message field, i.e. a basic contact form. To create a custom validation, create a JavaScript file in the validation folder (or another location based on your config settings), and use JOI to create a validation schema. 

You can supply another hidden field `formDesc` which will be placed at the top of the emails generated:

```html
<input type="hidden" name="formDesc" value="This is an email from the Pettinontheritz.com contact form:">
```

For a complete example, a form like this:

```html
<form action="http://hostname.com/sendmails" method="post">
    <fieldset>
        <ul>
            <li>
                <label for="name">Name:</label>
                <input id="name" name="name" type="text">
            </li>
            <li>
                <label for="email">Email Address:</label>
                <input id="email" name="email" type="email">   
            </li>
            <li>
                <label for="phone">Phone Number:</label>
                <input id="phone" name="phone" type="tel">
            </li>
            <li>
                <label for="message">Message:</label>
                <textarea name="message" id="message"></textarea>
            </li>
            <li>
                <input type="submit" value="Submit">
            </li>
        </ul>
        <input type="hidden" name="required" value="name,email,phone,message">
        <input type="hidden" name="validation" value="basic">
        <input type="hidden" name="formDesc" value="This is an email from the contact form:">
    </fieldset>
</form>
```

will generate an HTML (and a similar text) email like below:

```
This is an email from the contact form:

    Name: Name
    Email: email@domain.com
    Phone: 111-111-1111
    Message: This is my message
```

*Note: None of these hidden fields are required.*

## Settings

SSS has default configuration settings already set. To modify them for production, modify `production.json` in the config folder.

```json5
{
    "port": "3000", // Default port for the server
    "host": "localhost", // Default hostname for the server. Most likely in production this should be 0.0.0.0, like it is already set in production.json
    "protocol": "http", // HTTPS isn't supported yet
    "hostFQDN": "website.com", // This is used to point back to your website to redirect after an email is sent (thankyou page)
    "fromAddress": "from@website.com", // Address to be placed in from field in the email
    "toAddress": "to@email.com", // Address to send the email from
    "subject": "Email from the website.", // Subject for the email
    "validation": { // Paths to the validation configs. Relative paths from the server root directory.
        "basic": "validation/basic.js" // These property names should align with what you are sending from the form
    },
    "useSpamCheck": true, // Use spamassassin or not
    "saveSpamMessages": true, // If a spam message is detected by spamassassin, choose to save or delete it. This can be used to train SA better as well as routinely monitored for false positives.
    "spamLogLocation": "./logs/spam", // Where to save the log files for spammy emails
    "useLanguageFilter": true, // Whether to use a profanity filter (wordLists/swearWords.txt)
    "useSpamWordFilter": true, // Whether to use a spam filter (wordLists/flaggedWords.txt)
    "languageFilterLevel": 4, // Threshold for which an email is considered spam. Messages with more flagged words than this setting is required to be blocked. (ie. > 4)
    "useThrottleBan": true, // Whether to enable throttle requests based on IP
    "throttleBanReset": 10, // Seconds after which an IP is removed and allowed to make a request again.
    "throttleBanThreshold": 10, // Amount of attempts after a success that will result in a permanent ban while being throttled.
    "thankYouPage": "thankyou.html", // Page to redirect the user back to if data was submitted via form. This is concatenated to the hostFDQN so you will need to adjust for where this path resides for you. 
    "geoIPKey": "", // Your API key from whoisxmlapi.com 
    "allowedCountries": "" // Comma separated list of country codes allowed
}
```

*Note: You should set up email security and DKIM for your domain and be sure to send from that domain. Otherwise emails may go to spam.*

## TODO

- Make setup easier for standalone and/or integration as an npm module into another project
  - Most settings and setup are documented however things could be more streamlined
