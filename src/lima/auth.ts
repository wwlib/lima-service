// import { RpcConnectionContext } from "@push-rpc/core";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { Role } from "./schema";
import { Auth } from "./services";

const SIGN_KEY = "_R6,2}C:P5kUUf7";
const PASSWORD_SALT = "f[.edy65E<ehVf$"

export function hashPassword(password: string): string {
  const salt = crypto
    .createHash("sha256")
    .update(PASSWORD_SALT)
    .digest("hex")
  const hash = crypto
    .createHash("sha256")
    .update(password + salt)
    .digest("hex")
  return hash
}

export function isValidPassword(password: string, passwordHash: string): boolean {
  return hashPassword(password) == passwordHash
}

export function signAuthToken(auth: Auth, expiresIn: number, type: TokenType): string {
  return jwt.sign(auth, SIGN_KEY, {expiresIn, audience: type})
}

export function decodeAuthToken(token: string, type: TokenType): Auth {
  const payload =  jwt.verify(token, SIGN_KEY, {
    audience: type
  })
  return payload as Auth
}

type ServiceOp = (req: unknown, ctx: AuthContext, ...other: any) => Promise<unknown>

export function roles(...roles: Role[]) {
  return (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<ServiceOp>) => {
    const impl: ServiceOp | undefined = descriptor.value

    if (impl) {
      descriptor.value = function (req, ctx: AuthContext, ...other) {
        assertRole(ctx, ...roles)
        return impl.call(this, req, ctx, ...other)
      }
    }
  }
}

export function assertRole(ctx: AuthContext, ...roles: any) {
  try {
    decodeAuthToken(ctx.token, TokenType.Access)
  } catch (e) {
    throw new Unauthorized()
  }

  if (roles.length) {
    let isValidUser = false;

    for (const item of roles) {
      if (ctx.auth && ctx.auth.roles && ctx.auth.roles.indexOf(item) >= 0) isValidUser = true
    }

    if (!isValidUser) throw new Forbidden()
  }
}

export interface AuthContext { //extends RpcConnectionContext {
  auth: Auth
  token: string
}

export class Unauthorized extends Error {
  public code = 401
}

export class Forbidden extends Error {
  public code = 403
}

export enum TokenType {
  Access = "Access",
  Refresh = "Refresh",
}