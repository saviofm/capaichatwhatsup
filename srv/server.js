const cds = require("@sap/cds");
const cors = require("cors");
var bodyParser = require("body-parser");
const twilio = require("twilio");
const { getChatRagResponseChat } = require('./chat-service-whats');

cds.on("bootstrap", (app) => {
    const accountSid = cds.env.requires["TWILIO"]["TWILIO_ACCOUNT_SID"];;
    const authToken = cds.env.requires["TWILIO"]["TWILIO_AUTH_TOKEN"];;
    const twilioClient = twilio(accountSid, authToken);
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use(cors());

    app.post(
        "/twilioWebhook",
        twilio.webhook({ validate: process.env.NODE_ENV === "production" }), // Don't validate in test mode
        async (req, res) => {
            req.res.writeHead(200, { "Content-Type": "text/xml" });
            console.log(`Received message ${JSON.stringify(req.body)}.`)
            const twiml = new MessagingResponse();
            const AImessage = await getChatRagResponseChat(req.body.From, req.body.Body)
            twiml.message(AImessage);
            res.end(twiml.toString());
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