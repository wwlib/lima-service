import {
  Annotation,
  AnnotationCriteria,
  AnnotationStatus,
  Environment,
  IssueType,
  QuestionType,
  ServiceType,
  Transaction,
  TransactionCriteria,
} from "./schema";

/** Entry point to LimaService. List all available operations */
export interface LimaService {
  question(req: Question, ctx: any): Promise<Transaction>;
  annotation(req: CreateAnnotation | UpdateAnnotation, ctx: any): Promise<Annotation>;
  search(
    req: Partial<TransactionCriteria | AnnotationCriteria> & { database: "transactions" | "annotations" },
    ctx: any,
  ): Promise<Transaction[] | Annotation[] | null>;
  metadata(req: any, ctx: any): Promise<any>;
}

export type Question = {
  clientId: string;
  sessionId?: string;
  input?: string;
  inputData?: any;
  type?: QuestionType;
  serviceType?: ServiceType;
  appName?: string;
  userId?: string;
  environment?: Environment;
};

export type CreateAnnotation = AnnotationParams & {
  transactionId: string;
  question: string;
  type: QuestionType;
  clientId?: string;
  appName?: string;
  userId?: string;
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
