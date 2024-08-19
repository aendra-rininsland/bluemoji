import { AppContext } from "../config";
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from "../../lexicons/types/app/bsky/feed/getFeedSkeleton";
import * as whatsAlf from "./emoji";

type AlgoHandler = (
  ctx: AppContext,
  params: QueryParams
) => Promise<AlgoOutput>;

const algos: Record<string, AlgoHandler> = {
  [whatsAlf.shortname]: whatsAlf.handler,
};

export default algos;
