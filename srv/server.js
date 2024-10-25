const cds = require("@sap/cds");
const cors = require("cors");
var bodyParser = require("body-parser");
process.env.TWILIO_AUTH_TOKEN = cds.env.requires["TWILIO"]["TWILIO_AUTH_TOKEN"];
const twilio = require("twilio")
const { getChatRagResponseTwilio } = require('./chat-service-twilio');

cds.on("bootstrap", (app) => {

    app.use(bodyParser.urlencoded({ extended: true }));

    app.use(cors());

    app.post(
        "/twilioWebhook",
        //twilio.webhook({ validate: process.env.NODE_ENV === "production" }), // Don't validate in test mode
        twilio.webhook({ validate: false }), // Don't validate 
        async (req, res) => {
            console.log(`Received message ${JSON.stringify(req.body)}.`)
            const AImessage = await getChatRagResponseTwilio(req.body);
            console.log (AImessage);
        }
    );

});
module.exports = cds.server;

const cds_swagger = require("cds-swagger-ui-express")
/*
*  Use User Provided Variable to distinguish DEV, UAT, STAGE, PROD env deployment
*/

// if (process.env.dev == 'true' || process.env.NODE_ENV !== 'production') {
//     const cds_swagger = require('cds-swagger-ui-express');
//     cds.on('bootstrap', app => app.use(cds_swagger()));
// }
cds.on('bootstrap', app => app.use(cds_swagger()))