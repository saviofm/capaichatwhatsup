
# Assistente de Chat Personalizado

Esta aplicação de exemplo CAP usa o Plugin CAP LLM para simplificar o processo de acesso a recursos de Vetores/Embeddings do HANA, conectividade com o AI Core e automatizar todo o fluxo de recuperação RAG. Ela demonstra um cenário RAG onde os usuários podem fazer perguntas sobre pedidos de licença, outras políticas de RH, e a aplicação utiliza a arquitetura RAG para combinar documentos de políticas de RH com os dados de licença armazenados nos sistemas SAP para fornecer uma resposta adequada.

### Pré-requisitos:

1. [Crie uma instância do SAP AI Core](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-service-instance) e certifique-se de escolher o plano de serviço estendido para ativar o Generative AI Hub e continue criando uma Chave de Serviço.

2. [Crie deployments](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-deployment-for-generative-ai-model-in-sap-ai-core) para um modelo que suporte ChatCompletion (por exemplo, gpt-35-turbo ou gpt-4) e um modelo de embeddings (text-embedding-ada-002) e anote os IDs de Deployment de cada um. Todos os modelos disponíveis estão listados aqui.

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

5. Configure os detalhes de conexão do Generative AI Hub e SuccessFactors.

Consulte [detalhes do cabeçalho de autorização do SuccessFactors](https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/d599f15995d348a1b45ba5603e2aba9b/5c8bca0af1654b05a83193b2922dcee2.html).

Por exemplo, no arquivo `.cdsrc.json`. Consulte a [documentação](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-deployment-for-generative-ai-model-in-sap-ai-core) para mais detalhes.

{
    "cdsc": {
        "beta": {
            "vectorType": true
        }
    },
    "requires":{
        "GENERATIVE_AI_HUB": {
            "CHAT_MODEL_DESTINATION_NAME": "AICoreAzureOpenAIDestination",
            "CHAT_MODEL_DEPLOYMENT_URL": "<CHAT_MODEL_DEPLOYMENT_URL> . Por exemplo: /v2/inference/deployments/<deployment-id>",
            "CHAT_MODEL_RESOURCE_GROUP": "<CHAT_MODEL_RESOURCE_GROUP>",
            "CHAT_MODEL_API_VERSION": "<CHAT_MODEL_API_VERSION>",
            "EMBEDDING_MODEL_DESTINATION_NAME": "AICoreAzureOpenAIDestination",
            "EMBEDDING_MODEL_DEPLOYMENT_URL": "<CHAT_MODEL_DEPLOYMENT_URL>. Por exemplo: /v2/inference/deployments/<deployment-id>",
            "EMBEDDING_MODEL_RESOURCE_GROUP": "default",
            "EMBEDDING_MODEL_API_VERSION": "<EMBEDDING_MODEL_API_VERSION>"
        },
        "AICoreAzureOpenAIDestination": {
            "kind": "rest",
            "credentials": {
              "destination": "<destination-name-created-in-step-3>",
              "requestTimeout": "300000"
            }
        },
        "SUCCESS_FACTORS_CREDENTIALS": {
            "AUTHORIZATION_HEADER": "<AUTHORIZATION_HEADER>",
            "USER_ID": "<USER_ID>"
        }
    }
}

## Começando

- Clone este repositório.
- Conecte-se à subconta com a instância do HANA Cloud e autentique-se no cf:
` cf api <subaccount-endpoint>`
` cf login`

- Instale os módulos node usando `npm i`

## Testes Híbridos

- Vincule os seguintes serviços à aplicação:
    - hana cloud
    - destination service

- Construa os artefatos e implante no HANA:

`cds build --production`
`cds deploy --to hana:<hana-service-instance>`

- Construa o servidor e execute a aplicação:

`cds build`
`cds watch --profile dev`

## Implantação no SAP BTP:

- Execute o seguinte comando para implantar o servidor:

`cds build --production`

- Construa e implante o mtar

mbt build
cf deploy mta_archives/<mtar_filename>

## Como usar a aplicação:

- Faça upload do documento de política e gere embeddings pela UI.
- Use a interface de chat para recuperar respostas às perguntas.
