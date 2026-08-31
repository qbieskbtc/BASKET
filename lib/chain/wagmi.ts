"use client";

import { QueryClient } from "@tanstack/react-query";
import { injected } from "@wagmi/core";
import { createConfig, http } from "wagmi";
import { robinhoodChain } from "@/lib/chain/robinhood";

export const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected()],
  transports: {
    [robinhoodChain.id]: http(robinhoodChain.rpcUrls.default.http[0])
  },
  ssr: true
});
