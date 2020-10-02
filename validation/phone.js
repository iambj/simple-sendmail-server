const Joi = require("joi");

// This will do basic validation based off the name of the field submitted.
// Use Joi to build a schema to validate, require at validation time, and
// uas the validation option in config to point to it.
// TODO: load schema from config

const basicSchema = Joi.object({
    phone: Joi.string()
        .min(12)
        .pattern(new RegExp("^[0-9]{3}-[0-9]{3}-[0-9]{4}"))
        .required(),
}).options({ allowUnknown: true });

module.exports = basicSchema;
