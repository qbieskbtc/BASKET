"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortenAddress } from "@/lib/format";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const injected = connectors[0];

  if (isConnected && address) {
    return (
      <button className="button button-quiet" onClick={() => disconnect()}>
        {shortenAddress(address)}
      </button>
    );
  }

  return (
    <button className="button button-dark" disabled={isPending || !injected} onClick={() => connect({ connector: injected })}>
      {isPending ? "CONNECTING" : "CONNECT WALLET"}
    </button>
  );
}
