import { getConfig } from "../config";
import { Environment, QuestionType, ServiceType, Session, Transaction } from "../schema";
import { LIMA_VERSION } from "../versions";
import { newTransactionWithDataAndSession } from "../db/transactionDb";

const axios = require('axios');

export class LuisClient {
  async processLuisTransaction(
    body: any,
    appName: string,
    appId: string,
    appVersion: string,
    session: Session,
  ): Promise<Transaction> {
    const startTime: number = new Date().getTime();
    const luisResponse = await this.requestLuis(appId, body.input);

    const elapsedTime: number = new Date().getTime() - startTime;

    if (luisResponse.entities["$instance"]) {
      luisResponse.entities.INSTANCE = luisResponse.entities["$instance"];
      delete luisResponse.entities["$instance"];
    }

    const meaningful = isMeaningfulResponse(luisResponse);

    const data = {
      type: body.type || QuestionType.User,
      clientId: body.clientId,
      serviceType: ServiceType.Luis,
      appName: appName,
      appVersion: `${LIMA_VERSION}#${appVersion}`,
      userId: body.userId,
      sessionId: session.id,
      environment: body.environment || Environment.Production,
      input: body.input,
      inputData: body.inputData,
      intentId: meaningful ? luisResponse.intent : undefined,
      entities: meaningful ? luisResponse.entities : undefined,
      intentDetail: "",
      confidence: luisResponse.confidence,
      category: "",
      response: luisResponse,
      responseTime: elapsedTime,
    };

    const transaction: Transaction = await newTransactionWithDataAndSession(data, session);
    return transaction;
  }

  async requestLuis(
    appId: string,
    query: string,
  ): Promise<{ intent: string; confidence: number; entities: Record<string, string> }> {
    const url =
      `${getConfig().LUIS_endpoint}luis/prediction/v3.0/apps/${appId}/slots/production/predict` +
      "?verbose=true&show-all-intents=true&query=" +
      encodeURIComponent(query);
    console.log(`requestLuis:`, url)
    const response = await axios.get(url,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": getConfig().LUIS_subscriptionKey,
        }
      })
    const responseData = response.data
    console.log(`responseData:`, responseData)

    const intent = responseData.prediction.intents[responseData.prediction.topIntent];

    const entities = getEntitiesFromResponse(responseData);

    return {
      intent: responseData.prediction.topIntent,
      confidence: intent.score,
      entities,
    };
  }
}

function getEntitiesFromResponse(responseData: any) {
  const { $instance, ...entities } = responseData.prediction.entities;

  const result: any = Object.keys(entities).reduce((r: any, name: string) => {
    const luisEntity = entities[name];

    const type: string = $instance[name]?.[0]?.type;

    r[type || name] =
      Array.isArray(luisEntity) && luisEntity.length && Array.isArray(luisEntity[0]) ? luisEntity[0] : luisEntity;

    return r;
  }, {});

  return result;
}

function isMeaningfulResponse(responseData: any) {
  if (responseData.intent == "None") return false;

  const confidenceThreshold = getConfig().LUIS_threshold ? +getConfig().LUIS_threshold : 0.1;
  return responseData.confidence > confidenceThreshold;
}
