import express from "express";
import * as ui8 from "uint8arrays";
import { IdResolver } from "@atproto/identity";
import {
  AuthRequiredError,
  parseReqNsid,
  verifyJwt,
} from "@atproto/xrpc-server";
// import { TeamService } from "./team";

type ReqCtx = {
  req: express.Request;
};

type StandardOutput = {
  credentials: {
    type: "standard";
    aud: string;
    iss: string;
  };
};

type NullOutput = {
  credentials: {
    type: "none";
    iss: null;
  };
};

export class AuthVerifier {
  serviceDid: string;

  private adminPassword: string;

  constructor(public idResolver: IdResolver) {}

  standard = async (reqCtx: ReqCtx): Promise<StandardOutput> => {
    const getSigningKey = async (
      did: string,
      forceRefresh: boolean
    ): Promise<string> => {
      const atprotoData = await this.idResolver.did.resolveAtprotoData(
        did,
        forceRefresh
      );
      return atprotoData.signingKey;
    };

    const jwtStr = getJwtStrFromReq(reqCtx.req);
    if (!jwtStr) {
      throw new AuthRequiredError("missing jwt", "MissingJwt");
    }
    const nsid = parseReqNsid(reqCtx.req);
    const payload = await verifyJwt(
      jwtStr,
      this.serviceDid,
      nsid,
      getSigningKey
    );
    const iss = payload.iss;

    return {
      credentials: {
        type: "standard",
        iss,
        aud: payload.aud,
      },
    };
  };

  standardOptional = async (
    reqCtx: ReqCtx
  ): Promise<StandardOutput | NullOutput> => {
    if (isBearerToken(reqCtx.req)) {
      return this.standard(reqCtx);
    }
    return this.nullCreds();
  };

  standardOptionalOrAdminToken = async (
    reqCtx: ReqCtx
  ): Promise<StandardOutput | NullOutput> => {
    if (isBearerToken(reqCtx.req)) {
      return this.standard(reqCtx);
    } else {
      return this.nullCreds();
    }
  };

  nullCreds(): NullOutput {
    return {
      credentials: {
        type: "none",
        iss: null,
      },
    };
  }
}

const BEARER = "Bearer ";
const BASIC = "Basic ";

const isBearerToken = (req: express.Request): boolean => {
  return req.headers.authorization?.startsWith(BEARER) ?? false;
};

const isBasicToken = (req: express.Request): boolean => {
  return req.headers.authorization?.startsWith(BASIC) ?? false;
};

export const getJwtStrFromReq = (req: express.Request): string | null => {
  const { authorization } = req.headers;
  if (!authorization?.startsWith(BEARER)) {
    return null;
  }
  return authorization.slice(BEARER.length).trim();
};

export const parseBasicAuth = (
  token: string
): { username: string; password: string } | null => {
  if (!token.startsWith(BASIC)) return null;
  const b64 = token.slice(BASIC.length);
  let parsed: string[];
  try {
    parsed = ui8.toString(ui8.fromString(b64, "base64pad"), "utf8").split(":");
  } catch (err) {
    return null;
  }
  const [username, password] = parsed;
  if (!username || !password) return null;
  return { username, password };
};
