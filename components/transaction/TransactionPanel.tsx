"use client";

import type { ReactNode } from "react";
import { blockscoutTxUrl } from "@/lib/chain/robinhood";

type TransactionPanelProps = {
  title: string;
  state: "idle" | "simulating" | "ready" | "signing" | "confirming" | "confirmed" | "error";
  error?: string;
  hash?: string;
  children: ReactNode;
};

const labels = {
  idle: "READY",
  simulating: "SIMULATING",
  ready: "REVIEWED",
  signing: "SIGN WALLET",
  confirming: "CONFIRMING",
  confirmed: "CONFIRMED",
  error: "ERROR"
};

export function TransactionPanel({ title, state, error, hash, children }: TransactionPanelProps) {
  return (
    <aside className="tx-panel">
      <div className="tx-panel-head">
        <h2>{title}</h2>
        <span>{labels[state]}</span>
      </div>
      {children}
      {error ? <p className="tx-error">{error}</p> : null}
      {hash ? (
        <a href={blockscoutTxUrl(hash)} target="_blank" rel="noreferrer" className="tx-link">
          Blockscout ↗
        </a>
      ) : null}
    </aside>
  );
}
