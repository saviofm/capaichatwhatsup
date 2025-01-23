


const cds = require('@sap/cds');
const { DELETE } = cds.ql;
const { storeRetrieveMessages, storeModelResponse } = require('./memory-helper');
const { uuid } = cds.utils
const fetch = require('node-fetch');
const { Readable } = require('stream');
const FormData = require('form-data');
const { Blob, File } = require('node:buffer');


const metaAPIversion = cds.env.requires["metaAPI"]["version"]
const metaAPIAppToken = cds.env.requires["metaAPI"]["appToken"]
const metaAPIPhone_ID = cds.env.requires["metaAPI"]["PHONE_NUMBER_ID"]

const azureWhisperBaseUrl = cds.env.requires["azureOPENAI"]["baseURLWhisper"]
const azureWhisperApiVersion = cds.env.requires["azureOPENAI"]["apiVersionWhisper"]
const azureWhisperDeploymentName = cds.env.requires["azureOPENAI"]["deploymentNameWhisper"]
const azureWhisperToken = cds.env.requires["azureOPENAI"]["tokenWhisper"]  

const azureTtsBaseUrl = cds.env.requires["azureOPENAI"]["baseURLTts"]
const azureTtsApiVersion = cds.env.requires["azureOPENAI"]["apiVersionTts"]
const azureTtsDeploymentName = cds.env.requires["azureOPENAI"]["deploymentNameTts"]
const azureTtsToken = cds.env.requires["azureOPENAI"]["tokenTts"]  

const { AzureOpenAI } = require('openai')

//const openaiWhisper = new OpenAI({apiKey: azureWhisperToken});
const openaiWhisper = new AzureOpenAI({
    baseURL: azureWhisperBaseUrl,
    apiKey: azureWhisperToken, 
    apiVersion: azureWhisperApiVersion, 
    deployment: azureWhisperDeploymentName 
});

const openaiTts = new AzureOpenAI({
    baseURL: azureTtsBaseUrl, 
    apiKey: azureTtsToken, 
    apiVersion: azureTtsApiVersion, 
    deployment: azureTtsDeploymentName 
});



const tableName = 'CAPAICHATWHATSUP_DOCUMENTCHUNK'; 
const embeddingColumn  = 'EMBEDDING'; 
const contentColumn = 'TEXT_CHUNK';


const systemPrompt = 
`Você é um chatbot. Seu nome é Benedito.\n
Responda à pergunta do usuário de forma concisa, breve, resumida, 
com menos de 100 palavras e com base apenas no contexto, 
delimitado por acentos graves triplos e na lingua de entrada do usuário\n `;
;

async function getChatRagResponseMeta(req) {
    try {
        const capllmplugin = await cds.connect.to("cap-llm-plugin");
        const { Conversation, Message } = cds.entities;
        
        // Headers para buscar media e enviar mensagens
        let url = "";
        const headers = new fetch.Headers();
        let basicAuthorization = `Bearer ${metaAPIAppToken}`;
        headers.set("Authorization", basicAuthorization);
        headers.set('Content-Type','application/json');



        //preencher tudo para obter mensagens anteriores
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

        //Caso seja texto pegar já a user query
        let user_query = req.user_query

        if (req.audio_messages.length > 0) {
  
            for ( audio_msg of req.audio_messages) {
                if (audio_msg.audio) {
                    //Get URL
                    url = `https://graph.facebook.com/${metaAPIversion}/${audio_msg.audio.id}`
                    const responseAudioUrl = await fetch(url, { method: 'GET', headers: headers })
                    const responseJsonUrl = await responseAudioUrl.json();
                    console.log(responseJsonUrl.url)
                    //GET Audio
                    const headersAudio = new fetch.Headers();
                    headersAudio.set("Authorization", basicAuthorization);
                    headersAudio.set('Content-Type', audio_msg.audio.mime_type);
                    url = responseJsonUrl.url
                    const responseAudio = await fetch(url, { method: 'GET', headers: headersAudio })
                    console.log(JSON.stringify(responseAudio.status))

                    const arrayBuffer = await responseAudio.arrayBuffer();
                    const blob = new Blob([arrayBuffer], { type: audio_msg.audio.mime_type });
                    // Call whisper model to generate a transcription
                    const transcription = await openaiWhisper.audio.transcriptions.create({
                        file: new File([blob], 'audio.ogg', { type: audio_msg.audio.mime_type }),
                        model: "whisper-1"//,
                        //language: "pt", // this is optional but helps the model
                    });
                    user_query += transcription.text;
                }
            }
            // em caso de não conseguir retornar audio:
            if (user_query == '') {
                user_query == "Enviar uma mensagem divertida que não foi possível responder pois a API da meta não enviou os audio corretamente"
            }
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
        console.log(msgReturn);
        url = `https://graph.facebook.com/${metaAPIversion}/${metaAPIPhone_ID}/messages`
         //Fazer chamada api meta pra retornar conversa
        let body = {  
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": req.user_id,
            "type": "text",
            "text": {
                "body": msgReturn
            }
        }
        //Caso seja audio, converter para audio para enviar:
        if (req.audio_messages.length > 0) {
            const responseTtsAudio = await openaiTts.audio.speech.create({
                model: azureTtsDeploymentName,
                voice: "onyx",
                input: msgReturn,
                response_format: "opus",
                speed: 0.9
            });
            
            const arrayBuffer = await responseTtsAudio.arrayBuffer();
            
            const formAudio = new FormData();
            formAudio.append('file', Buffer.from(arrayBuffer), {filename: "audio.opus"});
            formAudio.append( 'messaging_product', 'whatsapp')
            formAudio.append( 'type', 'audio/opus')
            const urlMedia = `https://graph.facebook.com/${metaAPIversion}/${metaAPIPhone_ID}/media`
            const headersMedia = {
                'Authorization': basicAuthorization,
                ...formAudio.getHeaders()
            }
            
            const responseMedia = await fetch(urlMedia, { method: 'POST', headers: headersMedia, body: formAudio });
            const mediaID = await responseMedia.json();        

            if (mediaID.id) {
                //Fazer chamada api meta pra retornar conversa audio      
                body = {  
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": req.user_id,
                    "type": "audio",
                    "audio": {
                        "id": mediaID.id
                    }
                } 
            } 
        }
        
        const response = await fetch(url, { method: 'POST', headers: headers, body:  JSON.stringify(body) })
        const data = await response.json();
        if (data.error){
            console.log(JSON.stringify(data.error))
        }

        return data 
        
    }
    catch (error) {
        // Handle any errors that occur during the execution
        console.log('Erro ao gerar resposta para consulta do usuário:', error);
        throw error;
    }
  
}


module.exports = { getChatRagResponseMeta }


