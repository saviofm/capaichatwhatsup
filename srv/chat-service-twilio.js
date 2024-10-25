const cds = require('@sap/cds');
const { DELETE } = cds.ql;
const { storeRetrieveMessages, storeModelResponse } = require('./memory-helper');
const { uuid } = cds.utils
const accountSid = cds.env.requires["TWILIO"]["TWILIO_ACCOUNT_SID"];
const authToken = cds.env.requires["TWILIO"]["TWILIO_AUTH_TOKEN"];
const client = require('twilio')(accountSid, authToken);
//userId = cds.env.requires["SUCCESS_FACTORS_CREDENTIALS"]["USER_ID"]
// Download the helper library from https://www.twilio.com/docs/node/install
// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure



const tableName = 'CAPAICHATWHATSUP_DOCUMENTCHUNK'; 
const embeddingColumn  = 'EMBEDDING'; 
const contentColumn = 'TEXT_CHUNK';


const systemPrompt = 
'Você é um chatbot. Responda à pergunta do usuário com base apenas no contexto, delimitado por acentos graves triplos\n ';
;
async function getChatRagResponseTwilio(MessageTwilio) {
    try {
        const capllmplugin = await cds.connect.to("cap-llm-plugin");
        const { Conversation, Message } = cds.entities;

        //preencher tudo para obter mensagens anteriores
        const user_query = MessageTwilio.Body

        let  user_id
        if (MessageTwilio.Author){
            user_id = MessageTwilio.Author
        }else { 
            user_id = MessageTwilio.From
        }
        

        let  conversationId
        if (MessageTwilio.ConversationSid){
            conversationId = MessageTwilio.ConversationSid
        }else { 
            //obter conversa do mesmo id de até 5 minutos
            let oDateNow = new Date();
            oDateNow.setMinutes(oDateNow.getMinutes() - 5);
            oDateNow = oDateNow.toISOString()
            let oConversation = await SELECT.one.from(Conversation).where({ "userID": user_id,
                                                    "last_update_time": { ">=": oDateNow }
            });
            if (oConversation){
                conversationId = oConversation.cID
            } else { 
                conversationId = uuid()
            }
        }

        
        let messageId
        if (MessageTwilio.MessageSid){
            messageId = MessageTwilio.MessageSid
        } else {
            messageId = uuid()
        }

        let message_time 
        if (MessageTwilio.DateCreated){
            message_time = MessageTwilio.DateCreated
        } else {
            message_time = new Date().toISOString()
        }


        //Optional. handle memory before the RAG LLM call
        const memoryContext = await storeRetrieveMessages(conversationId, messageId, message_time, user_id, user_query, Conversation, Message);

        //Obtain the model configs configured in package.json
        const chatModelConfig = cds.env.requires["gen-ai-hub"]["chat"];
        const embeddingModelConfig = cds.env.requires["gen-ai-hub"]["embedding"];

        /*Single method to perform the following :
        - Embed the input query
        - Perform similarity search based on the user query 
        - Construct the prompt based on the system instruction and similarity search
        - Call chat completion model to retrieve relevant answer to the user query
        */

        const chatRagResponse = await capllmplugin.getRagResponseWithConfig(
            user_query,
            tableName,
            embeddingColumn,
            contentColumn,
            systemPrompt,
            embeddingModelConfig,
            chatModelConfig, //chat model config
            memoryContext .length > 0 ? memoryContext : undefined,
            10
        );
        //parse the response object according to the respective model for your use case. For instance, lets consider the following three models.
        let chatCompletionResponse = {
            "role": chatRagResponse.completion.choices[0].message.role,
            "content": chatRagResponse.completion.choices[0].message.content
        }
        //Optional. handle memory after the RAG LLM call
            const responseTimestamp = new Date().toISOString();
        await storeModelResponse(conversationId, responseTimestamp, chatCompletionResponse, Message, Conversation);

        //build the response payload for the frontend.
        // return chatRagResponse.completion.choices[0].message.content;
        const msgReturn = chatRagResponse.completion.choices[0].message.content;
        client.conversations.v1.conversations(conversationId)
                                .messages
                                .create({author: 'system', body: msgReturn })
                                .then(message => console.log(message.sid));
        return msgReturn                       
    }
    catch (error) {
        // Handle any errors that occur during the execution
        console.log('Erro ao gerar resposta para consulta do usuário:', error);
        throw error;
    }

}


module.exports = { getChatRagResponseTwilio }

