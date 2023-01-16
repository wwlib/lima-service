import { Transaction } from "@types";
import { log } from "./logger";

export default class TransactionLogger {
  private static _instance: TransactionLogger;

  constructor() {}

  static Instance() {
    return this._instance || (this._instance = new this());
  }

  log(transaction: Transaction) {
    log("TransactionLog", transaction);
  }
}
