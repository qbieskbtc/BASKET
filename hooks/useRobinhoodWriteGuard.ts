"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { robinhoodChain } from "@/lib/chain/robinhood";

export function useRobinhoodWriteGuard() {
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const ensureRobinhoodChain = async () => {
    if (!isConnected) return false;
    if (chainId === robinhoodChain.id) {
      setWrongNetwork(false);
      return true;
    }

    try {
      await switchChainAsync({ chainId: robinhoodChain.id });
      setWrongNetwork(false);
      return true;
    } catch {
      setWrongNetwork(true);
      return false;
    }
  };

  return { ensureRobinhoodChain, isSwitchingNetwork: isPending, wrongNetwork };
}
