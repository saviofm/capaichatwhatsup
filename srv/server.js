const cds = require("@sap/cds");
const cors = require("cors");
var bodyParser = require("body-parser");
//process.env.TWILIO_AUTH_TOKEN = cds.env.requires["TWILIO"]["TWILIO_AUTH_TOKEN"];
const metaAPIToken = cds.env.requires["metaAPI"]["token"]
const twilio = require("twilio")
const { getChatRagResponseTwilio } = require('./chat-service-twilio');
const { getChatRagResponseMeta } = require('./chat-service-meta');



cds.on("bootstrap", (app) => {

 
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.use(cors());

    /*
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
    */
    app.get('/metaAPIWebhook',
        async (req, res) => { 
            try {
                if (req.query['hub.mode'] && req.query['hub.verify_token']) {
                    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === metaAPIToken) {
                        res.status(200).send(req.query['hub.challenge']);
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
        "/metaAPIWebhook", async (req, res) => {
            try {
            
                const body = req.body.entry[0]?.changes[0]//.value?.messages  
                if (body.field !== 'messages'){
                    // not from the messages webhook so dont process
                    return res.sendStatus(400)
                }

                if (body.value.statuses) {
                    return res.sendStatus(200)
                }

                res.sendStatus(200)
                const WhatsMessage = {}
                WhatsMessage.from = body.value.contacts[0].wa_id
                WhatsMessage.user_id = body.value.metadata.display_phone_number
                WhatsMessage.user_query = body.value.messages.map((message)=>message.text.body).join('\n\n')
                
                if (body.value.messages[0].id){
                    WhatsMessage.messageId = body.value.messages[0].id
                }

                //Message time
                if (body.value.messages[0].timestamp){
                    const date = new Date(body.value.messages[0].timestamp * 1000)
                    WhatsMessage.message_time  = date.toISOString(date);
                }

                const AImessage = await getChatRagResponseMeta(WhatsMessage);
                
            } catch (error) {
                return res.sendStatus(400)
            }
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