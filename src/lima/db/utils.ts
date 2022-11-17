import { ObjectId } from "mongodb";
import { uuid } from "uuidv4";

export function unwrapId(objs: any) {
  if (!objs) {
    return objs;
  }

  for (const obj of ensureArray(objs)) {
    obj.id = obj._id.toString();
  }

  return deleteProps(objs, "_id");
}

export function deleteProps<T>(objs: T | T[], ...props: Array<keyof T>) {
  if (!objs) {
    return objs;
  }

  for (const obj of ensureArray(objs)) {
    for (const prop of props) {
      delete obj[prop];
    }
  }

  return objs;
}

export function skipId<T extends { id?: string }>(t: T): WithoutId<T> {
  if (!t) return t;

  const copy = { ...t };
  delete copy.id;
  return copy;
}

export type WithoutId<T> = Omit<T, "id">;
export type WithMongoId<T> = WithoutId<T> & { _id: MongoId };

export function ensureArray<T>(objs: T | T[]): T[] {
  return Array.isArray(objs) ? objs : [objs];
}

export function inTests() {
  return typeof global.describe != "undefined";
}

type MongoId = ObjectId | string;

export function mongoId(s: string = uuid()): MongoId {
  if (s.indexOf("-") >= 0) {
    // UUID format
    return s;
  }

  return new ObjectId(s);
}

export function byMongoId(s: string): { _id: MongoId } {
  return {
    _id: mongoId(s),
  };
}
