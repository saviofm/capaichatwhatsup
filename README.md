
# Assistente de Chat Personalizado

Esta aplicação de exemplo CAP usa o Plugin CAP LLM para simplificar o processo de acesso a recursos de Vetores/Embeddings do HANA, conectividade com o AI Core e automatizar todo o fluxo de recuperação RAG. Ela demonstra um cenário RAG onde os usuários podem fazer perguntas sobre pedidos de licença, outras políticas de RH, e a aplicação utiliza a arquitetura RAG para combinar documentos de políticas de RH com os dados de licença armazenados nos sistemas SAP para fornecer uma resposta adequada.

### Pré-requisitos:

1. [Crie uma instância do SAP AI Core](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-service-instance) e certifique-se de escolher o plano de serviço estendido para ativar o Generative AI Hub e continue criando uma Chave de Serviço.

2. [Crie deployments](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-deployment-for-generative-ai-model-in-sap-ai-core) para um modelo que suporte ChatCompletion (por exemplo, gpt-35-turbo ou gpt-4) e um modelo de embeddings (text-embedding-3-large) e anote os IDs de Deployment de cada um. Todos os modelos disponíveis estão listados aqui.

3. [Crie um Destination](https://help.sap.com/docs/btp/sap-business-technology-platform/create-destination) para o Generative AI Hub no SAP BTP Cockpit da sua subconta, baseado na Chave de Serviço do SAP AI Core que você criou no passo anterior:

Nome: GENERATIVE_AI_HUB
Descrição: Serviço implantado no SAP AI Core (hub de IA generativa)
URL: <AI-API-OF-AI-CORE-SERVICE-KEY>/v2 # certifique-se de adicionar /v2!
Tipo: HTTP
ProxyType: Internet
Authentication: OAuth2ClientCredentials
tokenServiceURL: <TOKEN-SERVICE-URL-OF-AI-CORE-SERVICE-KEY>/oauth/token
clientId: <YOUR-CLIENT-ID-OF-AI-CORE-SERVICE-KEY>
clientSecret: <YOUR-CLIENT-SECRET-OF-AI-CORE-SERVICE-KEY>
# Propriedades adicionais:
URL.headers.AI-Resource-Group: default # ajuste se necessário
URL.headers.Content-Type: application/json
HTML5.DynamicDestination: true

4. [Crie o SAP HANA Cloud](https://help.sap.com/docs/HANA_CLOUD_ALIBABA_CLOUD/683a53aec4fc408783bbb2dd8e47afeb/7d4071a49c204dfc9e542c5e47b53156.html) com Vector Engine (QRC 1/2024 ou posterior).

5. Configure os detalhes de conexão do Generative AI Hub:

{
    "cdsc": {
        "beta": {
            "vectorType": true
        }
    },
    "requires":{
        "gen-ai-hub": {
            "chat": {
                "destinationName": "GenAIHubDestination",
                "deploymentUrl": "<CHAT_MODEL_DEPLOYMENT_URL> . Por exemplo: /v2/inference/deployments/<deployment-id>",
                "resourceGroup": "<CHAT_MODEL_RESOURCE_GROUP>",
                "apiVersion": "<CHAT_MODEL_API_VERSION>",
                "modelName": "<CHAT_MODEL_NAME>" . POR EXEMPLO gpt-4o
            },
            "embedding": {
                "destinationName": "GenAIHubDestination",
                "deploymentUrl": "<EMBEDDING_MODEL_DEPLOYMENT_URL> . Por exemplo: /v2/inference/deployments/<deployment-id>",
                "resourceGroup": "<EMBEDDING_MODEL_RESOURCE_GROUP>",
                "apiVersion": "<EMBEDDING_MODEL_API_VERSION>"
                "modelName": "<EMBEDDING_MODEL_NAME>" . POR EXEMPLO text-embedding-3-large"
            }
        },
        "TWILIO": {
            "TWILIO_ACCOUNT_SID": "<>",
            "TWILIO_AUTH_TOKEN": "<>",
            "TWILIO_SENDER": "<>", 
            "TWILIO_RECEIVER": "<>"
        },
        "GenAIHubDestination": {
            "kind": "rest",
            "credentials": {
              "destination": "GENERATIVE_AI_HUB",
              "requestTimeout": "300000"
            }
        },
        "metaAPI":{
            "token": "<TOKEN INTERNO SEU>",
            "version": "v21.0",
            "appToken": "<TOKEN META API (EU COLOQUEI DO MEU USER ADMIN)>",
            "PHONE_NUMBER_ID": "<PHONE NUMER ID>"
        }
    }
}



## Começando

- Clone este repositório.
- Conecte-se à subconta com a instância do HANA Cloud e autentique-se no cf:
` cf api <subaccount-endpoint>`
` cf login`

- Instale os módulos node usando `npm i`


## Implantação no SAP BTP:

- Execute o seguinte comando para implantar o servidor:

`cds build --production`

- Construa e implante o mtar

mbt build
cf deploy mta_archives/<mtar_filename>


## Testes Híbridos

- Vincule os seguintes serviços à aplicação:
    - hana cloud
`cds bind -2 capaichatbuildapps-db`       
    - destination service
`cds bind -2 capaichatbuildapps-destination-service`   


## Inicia a aplicação de forma hibrida
`cds watch --profile hybrid`



## Como usar a aplicação:

- Faça upload do documento de política e gere embeddings pela UI.
- Use a interface de chat para recuperar respostas às perguntas.
