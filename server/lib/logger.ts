import { type IncomingMessage } from "node:http";
import pinoHttp, { stdSerializers, StdSerializedResults } from "pino-http";
import { obfuscateHeaders, subsystemLogger } from "@atproto/common";

export const dbLogger: ReturnType<typeof subsystemLogger> =
  subsystemLogger("bluemoji:db");
export const seqLogger: ReturnType<typeof subsystemLogger> =
  subsystemLogger("bluemoji:sequencer");
export const httpLogger: ReturnType<typeof subsystemLogger> =
  subsystemLogger("bluemoji");
export const langLogger: ReturnType<typeof subsystemLogger> =
  subsystemLogger("bluemoji:lang");

export const loggerMiddleware = pinoHttp({
  logger: httpLogger,
  serializers: {
    err: (err: StdSerializedResults["err"]) => ({
      code: err?.["code"],
      message: err?.["message"]
    }),
    req: (req: IncomingMessage) => {
      const serialized = stdSerializers.req(req);
      const headers = obfuscateHeaders(serialized.headers);
      return { ...serialized, headers };
    }
  }
});
