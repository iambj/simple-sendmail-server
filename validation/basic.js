const Joi = require("joi");

// This will do basic validation based off the name of the field submitted.
// Use Joi to build a schema to validate, require at validation time, and
// uas the validation option in config to point to it.
// TODO: load schema from config

const basicSchema = Joi.object({
    name: Joi.string().min(2).pattern(new RegExp("^[a-zA-Z]*$")).required(),
    phone: Joi.string()
        .min(10)
        .pattern(new RegExp("^[(]?[0-9]{3}[)]?-?[0-9]{3}-?[0-9]{4}")),

    email: Joi.string()
        .email({
            minDomainSegments: 2,
        })
        .min(5)
        .required(),
    message: Joi.string().required().min(5),
}).options({ allowUnknown: true });

module.exports = basicSchema;
