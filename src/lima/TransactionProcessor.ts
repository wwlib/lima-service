import { getConfig } from "./config";
import { Environment, Metadata, QuestionType, Role, ServiceType, Session, Transaction } from "./schema";
import { newTransactionWithDataAndSession } from "./db/transactionDb";
import { LIMA_VERSION } from "./versions";
import TransactionLogger from "./TransactionLogger";
import { Question } from "./limaService";
import { getNewSession, getSessionWithId } from "./db/sessionDb";
import { log } from "./logger";
import { AuthContext } from "./auth";
import MetadataRequestProcessor from "./MetadataRequestProcessor";
import { LuisClient } from "./luis/LuisClient";
// import { getGrammarParserResult } from "../grammarParser/GrammarParserClient";

const axios = require('axios')

export default class TransactionProcessor {
  private static _instance: TransactionProcessor;
  private readonly _config = getConfig();

  luisClient = new LuisClient();

  static Instance() {
    return this._instance || (this._instance = new this());
  }

  async getQNAAnswer(options: any): Promise<any> {
    const question: string = options.question;
    const questionData: any = options.questionData;
    const qnaMakerAppId = options.appId;
    const endpoint = this._config.QnAMakerEndpoint;
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
      userId: questionData ? questionData.userId : undefined,
    };
    const url = `${endpoint}qnamaker/knowledgebases/${qnaMakerAppId}/generateAnswer`
    const response = await axios.post(url, fetchData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `EndpointKey ${this._config.QnAMakerEndpointKey}`,
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
    session: Session,
    ctx: AuthContext,
  ): Promise<Transaction> {
    try {
      const startTime: number = new Date().getTime();
      let qnaResponse = await this.getQNAAnswer({
        appName: appName,
        question: body.input,
        questionData: body.inputData,
        appId: appId,
      });
      const elapsedTime: number = new Date().getTime() - startTime;
      let intentId = "";
      let intentDetail = "";
      let category = "";
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

      // filter data not acessible for regular users
      if (!ctx?.auth?.roles?.some((r) => r == Role.Admin || r == Role.Reviewer)) {
        const replacer = (key: string, value: any) => {
          if (key === "questions") {
            return undefined;
          } else {
            return value;
          }
        };

        if (qnaResponse) {
          let qnaResponseString = JSON.stringify(qnaResponse, replacer);
          qnaResponse = JSON.parse(qnaResponseString);
        }
      }

      const data = {
        type: body.type || QuestionType.User,
        serviceType: ServiceType.QnaMaker,
        clientId: body.clientId,
        appName: appName,
        appVersion: versionInfo,
        userId: ctx.auth.userId || body.userId,
        sessionId: session.id,
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

      const transaction: Transaction = await newTransactionWithDataAndSession(data, session);
      return transaction;
    } catch (error) {
      throw error;
    }
  }

  async getMintAnswer(options: any): Promise<any> {
    const question: string = options.question;
    const questionData: any = options.questionData;
    const mintMakerAppId = options.appId;
    const endpoint = this._config.MintEndpoint;
    const token = this._config.MintBasicAuthToken;

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
    session: Session,
    ctx: AuthContext,
  ): Promise<Transaction> {
    const startTime: number = new Date().getTime();
    const mintResponse = await this.getMintAnswer({
      appName: appName,
      question: body.input,
      questionData: body.inputData,
      appId: appId,
    });
    const elapsedTime: number = new Date().getTime() - startTime;
    let intentId = "";
    let intentDetail = "";
    let category = "";
    let confidence = 0;

    if (mintResponse && mintResponse[0] && mintResponse[0].nodes && mintResponse[0].nodes[0]) {
      const answerData = mintResponse[0].nodes[0];
      intentId = answerData.outputs ? answerData.outputs[0].value : "";
      confidence = answerData.outputs ? answerData.outputs[0].confidence : 0;
    }

    let versionInfo: string = `${LIMA_VERSION}#${appVersion}`;

    if (mintResponse && mintResponse.answers && mintResponse.answers[0]) {
      confidence = mintResponse.answers[0].score;
    }

    const data = {
      type: body.type || QuestionType.User,
      serviceType: ServiceType.Mint,
      clientId: body.clientId,
      appName: appName,
      appVersion: versionInfo,
      userId: body.userId,
      sessionId: session.id,
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

    return await newTransactionWithDataAndSession(data, session);
  }

  // async processGrammarTransaction(
  //   body: Question,
  //   appName: string,
  //   appId: string,
  //   appVersion: string,
  //   session: Session,
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
  //     userId: body.userId,
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

  async process(body: Question, ctx: AuthContext): Promise<Transaction> {
    if (!body.input) throw new Error("invalid question.");

    let session: Session | null = null;

    if (body.sessionId) {
      session = await getSessionWithId(body.sessionId);
    }
    if (!session) {
      session = await getNewSession();
    }

    if (!body.appName) throw new Error(`invalid appName: ${body.appName}`);

    let result: Transaction | undefined = undefined;

    let appData: Metadata | undefined = await MetadataRequestProcessor.Instance().getCachedMetadataWithAppName(body.appName);

    if (!appData) {
      log(`Can't find metadata for appname ${body.appName}`);

      return {
        id: "",
        type: body.type || QuestionType.User,
        clientId: body.clientId,
        serviceType: ServiceType.Luis,
        appName: body.appName,
        appVersion: "",
        userId: body.userId,
        sessionId: session.id,
        environment: body.environment || Environment.Production,
        input: body.input,
        inputData: body.inputData,
        intentId: "",
        intentDetail: "",
        confidence: 1.0,
        category: "",
        response: "",
        responseTime: 0,
        entities: {},
      };
    }

    const serviceType: ServiceType = body.serviceType || appData.serviceType;

    if (!(serviceType && appData.appId)) throw new Error("invalid appId or serviceType:");

    switch (serviceType) {
      case ServiceType.QnaMaker:
        result = await this.processQnaMakerTransaction(
          body,
          body.appName,
          appData.appId,
          appData.appVersion,
          session,
          ctx,
        );
        break;
      case ServiceType.Luis:
        result = await this.luisClient.processLuisTransaction(
          body,
          body.appName,
          appData.appId,
          appData.appVersion,
          session,
        );
        break;
      // case ServiceType.GrammarParser:
      //   result = await this.processGrammarTransaction(body, body.appName, appData.appId, appData.appVersion, session);
      //   break;
      case ServiceType.Mint:
        result = await this.processMintTransaction(body, body.appName, appData.appId, appData.appVersion, session, ctx);
        break;
    }

    if (result) {
      TransactionLogger.Instance().log(result);
    }

    if (result) {
      return result;
    } else {
      throw new Error(`TransactionProcessor: api call failed. unable to process transaction.`);
    }
  }
}

export async function initTransactionProcessor() { }

function stripPunctuation(s: string): string {
  if (s.endsWith(".") || s.endsWith("?")) {
    s = s.substring(0, s.length - 1);
  }

  return s.trim().toLowerCase();
}
