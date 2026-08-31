"use client";

import type { Address } from "viem";
import { CompositionStrip } from "@/components/index/CompositionStrip";
import { shortenAddress } from "@/lib/format";

export type WeightEntry = {
  address: Address;
  weightBps: number;
};

export function WeightEditor({
  weights,
  onChange
}: {
  weights: WeightEntry[];
  onChange: (weights: WeightEntry[]) => void;
}) {
  const total = weights.reduce((sum, entry) => sum + entry.weightBps, 0);

  const updateWeight = (address: Address, percent: number) => {
    const weightBps = Math.max(0, Math.min(10_000, Math.round(percent * 100)));
    onChange(weights.map((entry) => (entry.address === address ? { ...entry, weightBps } : entry)));
  };

  return (
    <div className="weight-editor">
      <CompositionStrip
        segments={weights.map((entry) => ({
          label: shortenAddress(entry.address),
          weightBps: entry.weightBps
        }))}
      />
      <div className="weight-total">
        <span>TOTAL</span>
        <strong className={total === 10_000 ? "total-good" : "total-bad"}>{(total / 100).toFixed(2)}%</strong>
      </div>
      {weights.map((entry) => (
        <div className="weight-row" key={entry.address}>
          <span>{shortenAddress(entry.address)}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.01"
            value={entry.weightBps / 100}
            onChange={(event) => updateWeight(entry.address, Number(event.target.value))}
          />
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={(entry.weightBps / 100).toFixed(2)}
            onChange={(event) => updateWeight(entry.address, Number(event.target.value))}
          />
        </div>
      ))}
    </div>
  );
}
