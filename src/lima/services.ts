// import { Topic } from "@push-rpc/core";
import { Metadata, Role, User } from "./schema";

export interface Services {
  // users: UserService;
  // metadata: MetadataService;
  auth: AuthService;
}

// export interface UserService {
//   users: Topic<User[]>;

//   makeUser(req: Partial<User & { password: string }>): Promise<void>;
//   deleteUser(req: { id: string }): Promise<void>;
// }

// export interface MetadataService {
//   metadata: Topic<Metadata[]>;

//   makeMetadata(req: Partial<Metadata>): Promise<void>;
//   deleteMetadata(req: { id: string }): Promise<void>;
// }

export interface AuthService {
  login(req: { email: string; password: string }): Promise<{ accessToken: string; refreshToken: string }>;
  refresh(req: { refreshToken: string }): Promise<{ accessToken: string }>;
}

export interface Auth {
  userId?: string;
  roles?: Role[];
}

export let services: Services;

export function setServices(s: Services) {
  services = s;
}
