export const GrammarParserAppName = "grammarparser";

export function getAppNameFromRule(ruleName: string): string {
  return GrammarParserAppName + ":" + ruleName;
}

export function getRuleFromAppName(appName: string): string {
  return appName.substring(appName.lastIndexOf(":") + 1);
}

export enum AccountType {
  User = "user",
  QA = "qa",
  Auto = "auto",
  NA = "na",
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
  NA = 'na'
}

export enum ServiceType {
  NA = 'na',
  QnaMaker = "qnamaker",
  Luis = "luis",
  GrammarParser = "grammarparser",
  Mint = "mint",
  GPT3Text = "gpt3text",
}

export const serviceTypeOptions = {
  [ServiceType.QnaMaker]: "QNA Maker",
  [ServiceType.Luis]: "LUIS",
  [ServiceType.GrammarParser]: "Grammar Parser",
  [ServiceType.Mint]: "MINT",
  [ServiceType.GPT3Text]: "GPT3 Text",
};

export type Annotation = {
  id?: string;
  type?: AccountType;
  clientId?: string; // user-app | test-system
  appName?: string; // model name
  serviceType?: string;
  accountId?: string; // 'anonymous' | 'auto' | user-id
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
  type: AccountType;
  clientId?: string;
  limaVersion: string; // llima service version
  serviceType?: string; // qnamaker | luis | robustparser
  serviceVersion?: string; // cognitive service version
  appName?: string; // null means unspecified
  appVersion?: string; // null means unspecified
  accountId?: string; // null means anonymous
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
  responseSummary?: string;
  transactionLogUri?: string;
  entities?: Record<string, string | string[]>;
  responseTime?: number;
};

export type TransactionCriteria = {
  id: string
  sessionId: string
  serviceType: string
  accountId: string
  criteriaString: string
}

export type AnnotationCriteria = {
  id: string
  transactionId: string
  sessionId: string
  serviceType: string
  accountId: string
  criteriaString: string
}

export interface Intent {
  intentId: string;
  intentDetail: string;
  category: string;
  proprietary: any;
}

export interface Metadata {
  appName: string;
  appId: string;
  appVersion: string;
  serviceType: ServiceType;
  serviceConfig: any;
  intents: Intent[];
  categories: string[];
  isDefault: boolean;
  tags?: string;
}

export type QueryBody = {
  clientId: string;
  sessionId?: string;
  input?: string;
  inputData?: any;
  type?: AccountType;
  serviceType?: ServiceType;
  appName?: string;
  accountId?: string;
  environment?: Environment;
};

export type CreateAnnotation = AnnotationParams & {
  transactionId: string;
  question: string;
  type: AccountType;
  clientId?: string;
  appName?: string;
  accountId?: string;
};

export type UpdateAnnotation = AnnotationParams & {
  id: string;
  revision: number;
};

// common fields for creating & update annotations
type AnnotationParams = {
  status: AnnotationStatus;
  issueType: IssueType;
  priority: string;
  assignedTo?: string;
  intentId: string;
  category?: string;
  deidentifiedInput?: string;
  notes?: string;
  jiraIds?: string[];
  appSpecificData?: any;
};