import { createPublicClient, http } from "viem";
import { robinhoodChain } from "@/lib/chain/robinhood";

const appRpcUrl = typeof window === "undefined" ? robinhoodChain.rpcUrls.default.http[0] : "/api/rpc";

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(appRpcUrl)
});
