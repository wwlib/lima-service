export const GrammarParserAppName = "grammarparser";

export function getAppNameFromRule(ruleName: string): string {
  return GrammarParserAppName + ":" + ruleName;
}

export function getRuleFromAppName(appName: string): string {
  return appName.substring(appName.lastIndexOf(":") + 1);
}

export enum QuestionType {
  User = "user",
  QA = "qa",
  Auto = "auto",
}

export enum IssueType {
  WrongAnswer = "wrongAnswer",
  MissingAnswer = "missingAnswer",
  InadequateAnswer = "inadequateAnswer",
  Other = "other",
  NoIssue = "noIssue",
}

export enum AnnotationStatus {
  Open = "open",
  Triaged = "triaged",
  Fixed = "fixed",
  WontFix = "wontFix",
  Verified = "verified",
  Closed = "closed",
  Deleted = "delteted",
}

export enum Environment {
  Test = "test",
  Production = "production",
}

export enum ServiceType {
  QnaMaker = "qnamaker",
  Luis = "luis",
  GrammarParser = "grammarparser",
  Mint = "mint",
}

export const serviceTypeOptions = {
  [ServiceType.QnaMaker]: "QNA Maker",
  [ServiceType.Luis]: "LUIS",
  [ServiceType.GrammarParser]: "Grammar Parser",
  [ServiceType.Mint]: "MINT",
};

export type Annotation = {
  id?: string;
  type?: QuestionType;
  clientId?: string; // user-app | test-system
  appName?: string; // 'sharecare-hepc',
  userId?: string; // 'anonymous' | 'auto' | user-id
  sessionId?: string;
  transactionId?: string;
  status?: AnnotationStatus;
  issueType?: IssueType;
  priority?: string;
  assignedTo?: string;
  datestamp?: number;
  datestampModified?: number;
  revision: number;
  intentId?: string;
  category?: string;
  deidentifiedInput?: string; // free of PII
  notes?: string;
  jiraIds?: string[]; // [ ids of related jira stories ]
  appSpecificData?: any;
};

export type Transaction = {
  id: string;
  type: QuestionType;
  clientId?: string;
  serviceType?: string; // qnamaker | luis | robustparser
  appName?: string; // null means unspecified
  appVersion?: string; // null means unspecified
  userId?: string; // null means anonymous
  sessionId: string;
  environment: Environment;
  datestamp?: number;
  input?: string;
  inputData?: any;
  intentId?: string;
  confidence?: number;
  intentDetail?: string;
  category?: string;
  response: any;
  transactionLogUri?: string;
  entities?: Record<string, string | string[]>;
  responseTime?: number;
};

export type Session = {
  id: string;
};

export type TransactionCriteria = Omit<
  Transaction,
  "id" | "datestamp" | "input" | "intentDetail" | "category" | "response" | "transactionLogUri"
> & { transactionId: string };

export type AnnotationCriteria = Omit<
  Annotation,
  | "id"
  | "datestamp"
  | "datestampModified"
  | "revision"
  | "deidentifiedInput"
  | "notes"
  | "jiraIds"
  | "appSpecificData"
  | "status"
> & { annotationId: string; status: AnnotationStatus | AnnotationStatus[]; jiraId: string };

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  roles: Role[];

  token?: string;
}

export enum Role {
  Admin = "Admin",
  Reviewer = "Reviewer",
  Consumer = "Consumer",
}

export interface Intent {
  intentId: string;
  intentDetail: string;
  category: string;
  proprietary: any;
}

export interface Metadata {
  id: string;
  appName: string;
  appId: string;
  appVersion: string;
  serviceType: ServiceType;
  intents: Intent[];
  categories: string[];
  isDefault: boolean;
}

export function getMetadataWithAppName(metadataArray: Metadata[], appName: string): Metadata | undefined {
  let result: Metadata | undefined = undefined;
  if (metadataArray) {
    metadataArray.forEach((metadataData: Metadata) => {
      if (metadataData.appName == appName) {
        result = metadataData;
      }
    });
  }
  return result;
}

export function getAppNames(metadataArray: Metadata[]): string[] {
  const result: string[] = [];
  if (metadataArray) {
    metadataArray.forEach((metadataData: Metadata) => {
      if (metadataData.appName) {
        result.push(metadataData.appName);
      }
    });
    result.sort();
  }
  return result;
}
