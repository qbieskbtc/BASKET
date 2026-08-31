import Link from "next/link";
import { CompositionStrip } from "@/components/index/CompositionStrip";
import type { BasketSummary } from "@/lib/contracts/types";

const formatDate = (timestamp?: bigint) => {
  if (!timestamp) return "—";
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const shortenAddr = (addr: string) =>
  `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export function IndexRow({ basket }: { basket: BasketSummary }) {
  const chips = basket.components.slice(0, 5);
  const overflow = basket.components.length - chips.length;

  return (
    <Link href={`/basket/${basket.address}`} className="index-row">
      <div className="index-primary">
        <strong>{basket.name}</strong>
        <span style={{ fontSize: 12, letterSpacing: "0.06em" }}>{basket.symbol}</span>
      </div>

      <div className="index-components">
        <div className="index-token-chips">
          {chips.map((c) => (
            <span key={c.address} className="index-token-chip">{c.symbol}</span>
          ))}
          {overflow > 0 && (
            <span className="index-token-chip" style={{ color: "var(--muted)" }}>+{overflow}</span>
          )}
        </div>
        <CompositionStrip
          segments={basket.components.map((c) => ({
            label: c.symbol,
            weightBps: c.targetWeightBps
          }))}
        />
      </div>

      <span style={{ fontSize: 13 }}>{formatDate(basket.createdAt)}</span>
      <span style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>
        {shortenAddr(basket.creator)}
      </span>
    </Link>
  );
}
