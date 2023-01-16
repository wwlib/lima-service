import { Environment, AccountType, ServiceType, QueryBody, Session, Transaction, AuthRequest } from "@types";
import { LIMA_VERSION } from "../versions";
import { newTransactionWithDataAndSession } from "../db/transactionDb";

const { Configuration, OpenAIApi } = require("openai")

export class GPT3TextClient {

  // OpenAI

  async processGPT3TextTransaction(
    body: QueryBody,
    appName: string,
    appId: string,
    appVersion: string,
    session: Session,
    serviceConfig: any,
    req: AuthRequest,
  ): Promise<Transaction> {
    const startTime: number = new Date().getTime();

    const configuration = new Configuration({
      apiKey: serviceConfig.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)
    let openAiResponse
    try {
      const prompt = body.input
      const completionOptions = {
        model: appId,
        prompt,
        ...serviceConfig.completionOptions
      }
      console.log('GPT3 completion options:', completionOptions)
      openAiResponse = await openai.createCompletion(completionOptions)
      
    } catch (error: any) {
      if (error.response) {
        openAiResponse = error.response
      } else {
        openAiResponse = error.message
      }
    }

    console.log('openAiResponse:', openAiResponse.data.choices)

    const elapsedTime: number = new Date().getTime() - startTime;

    const data = {
      type: body.type || AccountType.User,
      clientId: body.clientId,
      limaVersion: LIMA_VERSION,
      serviceType: ServiceType.GPT3Text,
      appName: appName,
      appVersion: appVersion,
      accountId: body.accountId,
      sessionId: session.id,
      environment: body.environment || Environment.Production,
      input: body.input,
      inputData: body.inputData,
      response: openAiResponse.data,
      responseSummary: openAiResponse.data?.choices && openAiResponse.data?.choices[0] ? openAiResponse.data.choices[0].text : '',
      responseTime: elapsedTime,
    };

    console.log(data)

    const transaction: Transaction = await newTransactionWithDataAndSession(data, session);
    return transaction;
  }
}
