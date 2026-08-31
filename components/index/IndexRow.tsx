import Link from "next/link";
import { CompositionStrip } from "@/components/index/CompositionStrip";
import type { BasketSummary } from "@/lib/contracts/types";
import { shortenAddress } from "@/lib/format";

const formatDate = (timestamp?: bigint) => {
  if (!timestamp) return "—";
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export function IndexRow({ basket }: { basket: BasketSummary }) {
  return (
    <Link href={`/basket/${basket.address}`} className="index-row">
      <div className="index-primary">
        <strong>{basket.name}</strong>
        <span>{basket.symbol}</span>
      </div>
      <div className="index-components">
        <span>{basket.components.length} assets</span>
        <CompositionStrip
          segments={basket.components.map((component) => ({
            label: component.symbol,
            weightBps: component.targetWeightBps
          }))}
        />
      </div>
      <span>{formatDate(basket.createdAt)}</span>
      <span>{shortenAddress(basket.creator)}</span>
    </Link>
  );
}
