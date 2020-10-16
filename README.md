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

Simple Sendmail Server (SSS) will provide a response congruent to the request it receives. If a JSON request is sent to it, it will respond with JSON. If data from a form is received, it will respond with HTML. The return HTML page is configurable in the config files by changing the `thankYouPage` setting. The value should be just the name of the HTML file to send the browser to (this is subject to change). NOTE: using JavaScript to send the form is the recommended method, with the browser sending the form as application data as a fail back if for some reason they have JS turned off. 



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