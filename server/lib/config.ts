import { AuthVerifier } from "./auth-verifier";
import { Database } from "./db";
import { IdResolver } from "@atproto/identity";
import { NodeOAuthClient } from "@atproto/oauth-client-node";

export type AppContext = {
  db: Database;
  didResolver: IdResolver;
  cfg: Config;
  authVerifier: AuthVerifier;
  client?: NodeOAuthClient;
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
  service: {
    version: string;
  };
};
