import { AuthVerifier } from "./auth-verifier";
import { Database } from "./db";
import { IdResolver } from "@atproto/identity";

export type AppContext = {
  db: Database;
  didResolver: IdResolver;
  cfg: Config;
  authVerifier: AuthVerifier;
};

export type Config = {
  port: number;
  listenhost: string;
  hostname: string;
  sqliteLocation: string;
  subscriptionEndpoint: string;
  serviceDid: string;
  publisherDid: string;
  subscriptionReconnectDelay: number;
};
