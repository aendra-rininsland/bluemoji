import express from "express";
import {
  NodeOAuthClient,
  NodeSavedState,
  NodeSavedSession
} from "@atproto/oauth-client-node";
import { randomBytes } from "crypto";
import keysJson from "../../keys.json";
import ngrok from "@ngrok/ngrok";
import { JoseKey } from "@atproto/jwk-jose"; // NodeJS/Browser only
import { AppContext } from "../config";

const keyset = Promise.all(keysJson.map((d) => JoseKey.fromJWK(d.jwk)));

const SESSION = new Map();
const STATE = new Map();

const makeRouter = async (ctx: AppContext) => {
  const ENDPOINT =
    process.env.NODE_ENV !== "production"
      ? await ngrok
          .connect({ addr: 5577, authtoken_from_env: true })
          .then((listener) => listener.url())
      : "https://moji.blue";

  console.info(`ENDPOINT: ${ENDPOINT}`);

  if (!ENDPOINT || !keyset) throw new Error("OAuth config busted");

  const client = new NodeOAuthClient({
    // This object will be used to build the payload of the /client-metadata.json
    // endpoint metadata, exposing the client metadata to the OAuth server.
    clientMetadata: {
      // Must be a URL that will be exposing this metadata
      client_id: `${ENDPOINT}/client-metadata.json`,
      client_name: "Bluemoji",
      client_uri: ENDPOINT,
      logo_uri: `${ENDPOINT}/logo.png`,
      tos_uri: `${ENDPOINT}/tos`,
      policy_uri: `${ENDPOINT}/policy`,
      redirect_uris: [`${ENDPOINT}/atproto-oauth-callback`],
      scope: "profile email repo offline_access",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      dpop_bound_access_tokens: true,
      jwks_uri: `${ENDPOINT}/jwks.json`
    },

    // Used to authenticate the client to the token endpoint. Will be used to
    // build the jwks object to be exposed on the "jwks_uri" endpoint.
    keyset: await keyset,

    // Interface to store authorization state data (during authorization flows)
    stateStore: {
      async set(key: string, internalState: NodeSavedState): Promise<void> {
        STATE.set(key, internalState);
      },
      async get(key: string): Promise<NodeSavedState | undefined> {
        return STATE.get(key);
      },
      async del(key: string): Promise<void> {
        STATE.delete(key);
      }
    },

    // Interface to store authenticated session data
    sessionStore: {
      async set(sub: string, sessionData: NodeSavedSession) {
        SESSION.set(sub, sessionData);
      },

      async get(sub: string) {
        // Retrieve the session data from your database
        // const sessionData = await getSessionDataFromDb(sub);
        // if (!sessionData) return undefined;

        // return sessionData;
        return SESSION.get(sub);
      },

      async del(sub: string) {
        SESSION.delete(sub);
      }
    }

    // A lock to prevent concurrent access to the session store. Optional if only one instance is running.
    //   requestLock,
  });

  ctx.client = client;

  const router = express.Router();
  // Expose the metadata and jwks
  router.get("/client-metadata.json", (req, res) =>
    res.json(client.clientMetadata)
  );
  router.get("/jwks.json", (req, res) => res.json(client.jwks));

  // Create an endpoint to initiate the OAuth flow
  router.get("/redirect-oauth", async (req, res, next) => {
    try {
      const handle = req.query.handle?.toString();
      const state = req.query.state?.toString() || randomBytes(256).toString();

      if (!handle) {
        return {
          encoding: "application/json",
          body: "No handle specified",
          statusCode: 500
        };
      }

      // Revoke any pending authentication requests if the connection is closed (optional)
      const ac = new AbortController();
      req.on("close", () => ac.abort());

      const url = await client.authorize(handle, {
        signal: ac.signal,
        state
        // Only supported if OAuth server is openid-compliant
        // ui_locales: "fr-CA fr en",
      });

      res.redirect(url.toString());
    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  // Create an endpoint to handle the OAuth callback
  router.get("/atproto-oauth-callback", async (req, res, next) => {
    console.log(req.url);
    try {
      const params = new URLSearchParams(req.url.split("?")[1]);

      const { agent, state } = await client.callback(params);

      // Process successful authentication here
      console.log("authorize() was called with state:", state);

      console.log("User authenticated as:", agent.did);

      // Make Authenticated API calls
      const profile = await agent.getProfile({ actor: agent.did });
      console.log("Bsky profile:", profile.data);
      res.cookie("did", profile.data.did);
      res.redirect("/");
    } catch (err) {
      next(err);
    }
  });

  return router;
};

export default makeRouter;

// // Whenever needed, restore a user's session
// async function worker() {
//   const userDid = "did:plc:123";

//   const agent = await client.restore(userDid);

//   // Note: If the current access_token is expired, the agent will automatically
//   // (and transparently) refresh it. The new token set will be saved though
//   // the client's session store.

//   // Make Authenticated API calls
//   const profile = await agent.getProfile({ actor: agent.did });
//   console.log("Bsky profile:", profile.data);
// }
