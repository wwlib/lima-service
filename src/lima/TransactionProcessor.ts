import { AuthRequest, Environment, Metadata, AccountType, ServiceType, QueryBody, Transaction } from "@types";
import { LIMA_VERSION } from "./versions";
import MetadataRequestProcessor from "./MetadataRequestProcessor";
import { LuisClient } from "./microsoft/LuisClient";
import { GPT3TextClient } from "./openai/Gpt3TextClient";
import { RedisClient } from "./redis/RedisClient";
// import { getGrammarParserResult } from "../grammarParser/GrammarParserClient";

const axios = require('axios')

export class TransactionProcessor {
  private static _instance: TransactionProcessor;

  public luisClient = new LuisClient();
  public gpt3TextClient = new GPT3TextClient();

  private _redisClient: RedisClient | undefined

  static Instance() {
    return this._instance || (this._instance = new this());
  }

  setRedisClient(redisClient: RedisClient) {
    this._redisClient = redisClient
  }

  async getQNAAnswer(options: any): Promise<any> {
    const question: string = options.question;
    const questionData: any = options.questionData;
    const qnaMakerAppId = options.appId;
    const endpoint = options.serviceConfig?.QNAMAKER_ENDPOINT;
    let strictFilters: any;
    if (questionData && questionData.topic) {
      strictFilters = [
        {
          name: "topic",
          value: questionData.topic,
        },
      ];
    }
    // this refers to the test vs. live environment
    const isTest = !!questionData?.isTest;
    const fetchData: any = {
      question: question,
      top: questionData ? questionData.top : 1,
      isTest: isTest,
      scoreThreshold: questionData ? questionData.scoreThreshold : undefined,
      strictFilters: strictFilters,
      accountId: questionData ? questionData.accountId : undefined,
    };
    const url = `${endpoint}qnamaker/knowledgebases/${qnaMakerAppId}/generateAnswer`
    const response = await axios.post(url, fetchData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `EndpointKey ${options.serviceConfig?.QNAMAKER_ENDPOINT_KEY}`,
        }

      })
    const data = response.data
    if (response.statusCode < 300) {
      return data
    } else {
      throw new Error(data)
    }
  }

  async processQnaMakerTransaction(
    body: any,
    appName: string,
    appId: string,
    appVersion: string,
    serviceConfig: any,
    req: AuthRequest,
  ): Promise<any> {
    try {
      const startTime: number = new Date().getTime();
      let qnaResponse = await this.getQNAAnswer({
        appName: appName,
        question: body.input,
        questionData: body.inputData,
        appId: appId,
        serviceConfig
      });
      const elapsedTime: number = new Date().getTime() - startTime;
      let intentId = '';
      let intentDetail = '';
      let category = '';
      let confidence = 0;

      if (qnaResponse && qnaResponse.answers && qnaResponse.answers[0]) {
        intentId = `${qnaResponse.answers[0].id}`;
        // check metadata for overriding intentId
        // use `metaIntentId` going forward to allow explicit designation of intent ids
        const metadata = qnaResponse.answers[0].metadata;
        if (metadata) {
          metadata.forEach((meta: any) => {
            if (meta.name === "intentid") {
              const metaIntentId: string = meta.value;
              if (metaIntentId) {
                intentId = metaIntentId;
              }
            }
          });
        }
      }

      if (qnaResponse?.answers?.[0]?.questions?.[0]) {
        intentDetail = qnaResponse.answers[0].questions[0];
      }
      if (qnaResponse && qnaResponse.answers && qnaResponse.answers[0] && qnaResponse.answers[0].metadata) {
        qnaResponse.answers[0].metadata.forEach((item: any) => {
          if (item.name === "topic") {
            category = item.value;
          }
        });
      }
      let versionInfo: string = `${LIMA_VERSION}#${appVersion}`;

      if (qnaResponse && qnaResponse.answers && qnaResponse.answers[0]) {
        confidence = qnaResponse.answers[0].score;
      }

      // TODO:
      // filter data not acessible for regular users
      // auth: {
      //   permissions: [
      //       {
      //           scopes: [
      //               "read",
      //               "admin"
      //           ],
      //           resource: "example"
      //       }
      //   ]
      // }

      // TODO: check permissions->scopes to see if response data should be masked
      // if (false) { // TODO: check permissions->scopes to see if response data should be masked
      //   const replacer = (key: string, value: any) => {
      //     if (key === "TBD") {
      //       return undefined;
      //     } else {
      //       return value;
      //     }
      //   };

      //   if (qnaResponse) {
      //     let qnaResponseString = JSON.stringify(qnaResponse, replacer);
      //     qnaResponse = JSON.parse(qnaResponseString);
      //   }
      // }

      const data = {
        type: body.type || AccountType.User,
        serviceType: ServiceType.QnaMaker,
        clientId: body.clientId,
        limaVersion: LIMA_VERSION,
        appName: appName,
        appVersion: versionInfo,
        accountId: req?.auth?.accountId || body.accountId,
        environment: body.environment || Environment.Production,
        input: body.input,
        inputData: body.inputData,
        intentId: intentId,
        intentDetail: intentDetail,
        confidence: confidence,
        category,
        response: qnaResponse,
        responseTime: elapsedTime,
      };
      return data
    } catch (error) {
      throw error;
    }
  }

  async getMintAnswer(options: any): Promise<any> {
    const question: string = options.question;
    const questionData: any = options.questionData;
    const mintMakerAppId = options.appId;
    const endpoint = options.serviceConfig?.MINT_ENDPOINT;
    const token = options.serviceConfig?.MINT_BASIC_AUTH_TOKEN;
    const url = `${endpoint}`
    const response = await axios.post(url, question,
      {
        headers: {
          "Content-Type": "text/plain",
          Accept: "*/*",
          Authorization: `Basic ${token}`,
        }

      })
    const data = response.data
    return data
  }

  async processMintTransaction(
    body: any,
    appName: string,
    appId: string,
    appVersion: string,
    serviceConfig: any,
    req: AuthRequest,
  ): Promise<any> {
    const startTime: number = new Date().getTime();
    const mintResponse = await this.getMintAnswer({
      appName: appName,
      question: body.input,
      questionData: body.inputData,
      appId: appId,
      serviceConfig
    });
    const elapsedTime: number = new Date().getTime() - startTime;
    let intentId = '';
    let intentDetail = '';
    let category = '';
    let confidence = 0;

    if (mintResponse && mintResponse[0] && mintResponse[0].nodes && mintResponse[0].nodes[0]) {
      const answerData = mintResponse[0].nodes[0];
      intentId = answerData.outputs ? answerData.outputs[0].value : '';
      confidence = answerData.outputs ? answerData.outputs[0].confidence : 0;
    }

    let versionInfo: string = `${LIMA_VERSION}#${appVersion}`;

    if (mintResponse && mintResponse.answers && mintResponse.answers[0]) {
      confidence = mintResponse.answers[0].score;
    }

    const data = {
      type: body.type || AccountType.User,
      serviceType: ServiceType.Mint,
      clientId: body.clientId,
      limaVersion: LIMA_VERSION,
      appName: appName,
      appVersion: versionInfo,
      accountId: body.accountId,
      environment: body.environment || Environment.Production,
      input: body.input,
      inputData: body.inputData,
      intentId: intentId,
      intentDetail: intentDetail,
      confidence: confidence,
      category,
      response: mintResponse,
      responseTime: elapsedTime,
    };
    return data
  }

  // async processGrammarTransaction(
  //   body: QueryBody,
  //   appName: string,
  //   appId: string,
  //   appVersion: string,
  //   sessionId: string,
  // ): Promise<Transaction> {
  //   const startTime: number = new Date().getTime();
  //   const response: any = await getGrammarParserResult({
  //     text: stripPunctuation(body.input),
  //     rules: body.inputData.rules,
  //   });

  //   response.answers = [{ id: 1, answer: response.nlu ? "OK" : "NONE" }];

  //   const elapsedTime: number = new Date().getTime() - startTime;

  //   const data = {
  //     type: body.type,
  //     serviceType: ServiceType.GrammarParser,
  //     clientId: body.clientId,
  //     appName: appName,
  //     appVersion: LIMA_VERSION,
  //     accountId: body.accountId,
  //     sessionId: session.id,
  //     environment: body.environment || Environment.Production,
  //     input: body.input,
  //     inputData: body.inputData,
  //     intentId: response.nlu?.intent,
  //     entities: response.nlu?.entities as Record<string, string>,
  //     intentDetail: null,
  //     confidence: response.priority == "HIGH" ? 1.0 : response.priority == "LOW" ? 0.5 : 0.0,
  //     category: null,
  //     response,
  //     responseTime: elapsedTime,
  //   };

  //   return await newTransactionWithDataAndSession(data, session);
  // }

  async process(body: QueryBody, req: AuthRequest): Promise<Transaction> {
    let sessionId: string | undefined = undefined;
    let nluResult: Transaction = {
      id: 'na',
      type: body.type || AccountType.NA,
      clientId: body.clientId,
      limaVersion: LIMA_VERSION,
      serviceType: ServiceType.NA,
      appName: body.appName,
      appVersion: 'na',
      accountId: body.accountId,
      sessionId: 'na',
      environment: body.environment || Environment.NA,
      input: body.input,
      inputData: body.inputData,
      intentId: 'na',
      intentDetail: 'na',
      confidence: 1.0,
      category: 'na',
      response: { status: `unprocessed` },
      responseTime: 0,
      entities: {},
    }
    let result: Transaction | undefined = undefined;

    const appData: Metadata | undefined = await MetadataRequestProcessor.Instance().getCachedMetadataWithAppName(body.appName!);
    console.log(`appData:`, appData)
    if (!appData) {
      console.log(`Cannot find metadata for appname: ${body.appName}`);

      return {
        id: '',
        type: body.type || AccountType.NA,
        clientId: body.clientId,
        limaVersion: LIMA_VERSION,
        serviceType: ServiceType.NA,
        appName: body.appName,
        appVersion: '',
        accountId: body.accountId,
        sessionId: '',
        environment: body.environment || Environment.NA,
        input: body.input,
        inputData: body.inputData,
        intentId: '',
        intentDetail: '',
        confidence: 1.0,
        category: '',
        response: { status: `unprocessed`, error: `Cannot find metadata for appname: ${body.appName}` },
        responseTime: 0,
        entities: {},
      };
    }

    const serviceType: ServiceType = body.serviceType || appData.serviceType;

    if (!(serviceType && appData.appId)) throw new Error(`invalid appId (${appData.appId}) or serviceType (${serviceType})`);

    switch (serviceType) {
      case ServiceType.QnaMaker:
        nluResult = await this.processQnaMakerTransaction(
          body,
          body.appName!,
          appData.appId,
          appData.appVersion,
          appData.serviceConfig,
          req,
        );
        break;
      case ServiceType.Luis:
        nluResult = await this.luisClient.processLuisTransaction(
          body,
          body.appName!,
          appData.appId,
          appData.appVersion,
          appData.serviceConfig,
          req,
        );
        break;
      // case ServiceType.GrammarParser:
      //   nluResult = await this.processGrammarTransaction(body, body.appName, appData.appId, appData.appVersion, session);
      //   break;
      case ServiceType.Mint:
        nluResult = await this.processMintTransaction(body, body.appName!, appData.appId, appData.appVersion, appData.serviceConfig, req);
        break;
      case ServiceType.GPT3Text:
        nluResult = await this.gpt3TextClient.processGPT3TextTransaction(
          body,
          body.appName!,
          appData.appId,
          appData.appVersion,
          appData.serviceConfig,
          req,
        );
        break;
    }

    result = nluResult
    if (this._redisClient) {
      try {
        if (body.sessionId) {
          sessionId = body.sessionId;
        }
        if (!sessionId) {
          sessionId = await this._redisClient.getNewSessionId();
        }
        result = await this._redisClient.newTransactionWithDataAndSession(nluResult as any, sessionId!);
      } catch (error) {
        console.log(`TransactionProcessor: ignoring redisClient error:`, error)
      }
    }
    if (!result) {
      throw new Error(`TransactionProcessor: api call failed. unable to process transaction.`);
    }
    return result;
  }

  // send an externally-processed transaction log to redis - i.e. nlu has already been processed
  async processTransactionLog(body: Transaction): Promise<Transaction> {
    let nluResult: Transaction = {
      id: body.id || 'na',
      type: body.type || AccountType.NA,
      clientId: body.clientId || 'na',
      limaVersion: LIMA_VERSION,
      serviceType: body.serviceType || ServiceType.NA,
      appName: body.appName || 'na',
      appVersion: body.appVersion || 'na',
      accountId: body.accountId || 'na',
      sessionId: body.sessionId || 'na',
      environment: body.environment || Environment.NA,
      input: body.input || '',
      inputData: body.inputData || {},
      intentId: body.intentId || 'na',
      intentDetail: body.intentDetail || 'na',
      confidence: body.confidence || undefined,
      category: body.category || 'na',
      response: body.response || { status: `na` },
      responseTime: body.responseTime || undefined,
      entities: body.entities || {},
    }
    let sessionId: string = body.sessionId;
    let result: Transaction = nluResult;

    if (this._redisClient) {
      try {
        if (!sessionId) {
          sessionId = await this._redisClient.getNewSessionId();
        }
        result = await this._redisClient.newTransactionWithDataAndSession(nluResult as any, sessionId!);
      } catch (error) {
        console.log(`TransactionProcessor: ignoring redisClient error:`, error)
      }
    }
    return result
  }
}
