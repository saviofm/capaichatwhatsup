const cds = require('@sap/cds');
const { DELETE } = cds.ql;
const { storeRetrieveMessages, storeModelResponse } = require('./memory-helper');
const { uuid } = cds.utils
const fetch = require('node-fetch');

const metaAPIversion = cds.env.requires["metaAPI"]["version"]
const metaAPIAppToken = cds.env.requires["metaAPI"]["appToken"]
const metaAPIPhone_ID = cds.env.requires["metaAPI"]["PHONE_NUMBER_ID"]

const tableName = 'CAPAICHATWHATSUP_DOCUMENTCHUNK'; 
const embeddingColumn  = 'EMBEDDING'; 
const contentColumn = 'TEXT_CHUNK';


const systemPrompt = 
`Você é um chatbot. 
Responda à pergunta do usuário de forma concisa, breve, resumida, 
com menos de 100 palavras e com base apenas no contexto, 
delimitado por acentos graves triplos\n `;
;

async function getChatRagResponseMeta(req) {
    try {
        const capllmplugin = await cds.connect.to("cap-llm-plugin");
        const { Conversation, Message } = cds.entities;
       
        //preencher tudo para obter mensagens anteriores
        const user_query = req.user_query
        const user_id = req.user_id

        //obter conversa do mesmo id de até 5 minutos
        let oDateNow = new Date();
        oDateNow.setMinutes(oDateNow.getMinutes() - 5);
        oDateNow = oDateNow.toISOString()

        let oConversation = await SELECT.one.from(Conversation).where(
            { 
                "userID": user_id,
                "last_update_time": { ">=": oDateNow }
            }
        );
        if (oConversation){
            conversationId = oConversation.cID
        } else { 
            conversationId = uuid()
        }

        //message id
        let messageId
        if (req.messageId){
            messageId = req.messageId
        } else {
            messageId = uuid()
        }

        //message time 
        let message_time 
        if (req.message_time){
            message_time = req.message_time
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

        //Fazer chamada api meta pra retornar conversa
        const headers = new fetch.Headers();
        let basicAuthorization = `Bearer ${metaAPIAppToken}`;
        headers.set("Authorization", basicAuthorization);
        headers.set('Content-Type','application/json');
        const url = `https://graph.facebook.com/${metaAPIversion}/${metaAPIPhone_ID}/messages`


        const body = {  
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": req.from,
            "type": "text",
            "text": {
                "body": msgReturn
            }
        }

        const response = await fetch(url, { method: 'POST', headers: headers, body:  JSON.stringify(body) })
        const data = await response.json();

        return data 
    
    }
    catch (error) {
        // Handle any errors that occur during the execution
        console.log('Erro ao gerar resposta para consulta do usuário:', error);
        throw error;
    }
  
}


module.exports = { getChatRagResponseMeta }

