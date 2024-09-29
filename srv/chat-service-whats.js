const cds = require('@sap/cds');
const { DELETE } = cds.ql;
const { storeRetrieveMessagesWhats, storeModelResponse } = require('./memory-helper');

//userId = cds.env.requires["SUCCESS_FACTORS_CREDENTIALS"]["USER_ID"]

const tableName = 'CAPAICHATWHATSUP_DOCUMENTCHUNK'; 
const embeddingColumn  = 'EMBEDDING'; 
const contentColumn = 'TEXT_CHUNK';



const systemPrompt = 
'Você é um chatbot. Responda à pergunta do usuário com base apenas no contexto, delimitado por acentos graves triplos\n ';
;
async function getChatRagResponseChat(MessageTwilio) {
    try {
        const capllmplugin = await cds.connect.to("cap-llm-plugin");
        const { Conversation, Message } = this.entities;

        //preencher tudo para obter mensagens anteriores
        const user_query = MessageTwilio.Body
        const conversationId = MessageTwilio.ConversationSid
        const messageId = MessageTwilio.MessageSid
        const message_time = MessageTwilio.DateCreated
        const user_id = MessageTwilio.Author
     


        //Optional. handle memory before the RAG LLM call
        const memoryContext = await storeRetrieveMessagesWhats(messageId, message_time, user_id, user_query, Conversation, Message);

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
        return chatRagResponse.completion.choices[0].message.content;
    }
    catch (error) {
        // Handle any errors that occur during the execution
        console.log('Erro ao gerar resposta para consulta do usuário:', error);
        throw error;
    }

}


module.exports = { getChatRagResponseChat }

