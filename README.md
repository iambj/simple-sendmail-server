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

### Using the server

This server is meant to be used inside of a closed network behind a firewall or behind a reverse proxy such as nginx. It does not implement the use of SSL or any transport layer security. The simplest use would be to allow your edge server to terminate any SSL connections and proxy the request to this mail server.
