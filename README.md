# Simple Sendmail Server

Run a small, basic server to sendmail from an HTML form without using a server side language to serve the page.

## Security

This will be an open endpoint to send mail. Will need to make sure it's a real form, we don't need recipient (the shop) getting spammed.

-   Use spam/profanity filters
    -   Need a good list...
    -   "Click here if this is spam" in emails
-   Use IP Geolocating - shouldn't need anyone from out of the country contacting
-   reCapcha
-   IP banning
-   IP throttling
-   Tokens on a hidden form
    -   Not sure how, somehow would be best to generate server side after going to a page.
        -   JS (which would be obfuscated) could make a call requesting a token, using data from the page.
        -   URL
        -   reCapcha
        -   User browser and OS
        -   User IP
-   Return an HTML page that will redirect to a "thank you page" for HTML for requests, otherwise, when using Ajax this isn't needed.
-   Templating system for the email
    -   Could replace text inside an html doc with a table on it.

## Using the server

This server is meant to be used inside of a closed network behind a firewall or behind a reverse proxy such as nginx. It does not implement the use of SSL or any transport layer security. The simplest use would be to allow your edge server to terminate any SSL connections and proxy the request to this mail server.

## Building your form

For email to be sent and validated correctly certain hidden fields need to be set. Validation should of course be done on at the very least server side and preferably also on the front end for a better experience for the user. Simple Sendmail Server (SSS) will do basic validation if you provide these hidden fields. If invalid input is detected, sending will fail and send back an error. SSS was created for a simple website with no backend (such as Node or PHP) so simple validation was built in.

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