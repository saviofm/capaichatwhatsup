const cds = require("@sap/cds");
const cors = require("cors");
var bodyParser = require("body-parser");
//process.env.TWILIO_AUTH_TOKEN = cds.env.requires["TWILIO"]["TWILIO_AUTH_TOKEN"];
const metaAPIToken = cds.env.requires["metaAPIToken"]
const twilio = require("twilio")
const { getChatRagResponseTwilio } = require('./chat-service-twilio');
const { getChatRagResponseMeta } = require('./chat-service-meta');



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
    app.get('/metaAPIWebhook',
        async (req, res) => { 
            try {
                const mode = req.query['hub.mode'];
                const token = req.query['hub.verify_token'];
                const challenge = req.query['hub.challenge'];

                if (mode && token) {
                    if (mode === 'subscribe' && token === ACCESS_TOKEN) {
                        res.status(200).send(challenge);
                    } else {
                        res.status(403).send('Verification failed');
                    }
                } else {
                    res.status(400).send('Bad Request');
                }

            } catch (error) {
                res.status(400).send(error.message);
            }
        } 
    );
    app.post(
        "/metaAPIWebhook",  
        async (req, res) => {
            if (mode) {
                //const AImessage = await getChatRagResponseTwilio(req.body);
                console.log (req.query);
            }
            res.status(200).send("WORKED")
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