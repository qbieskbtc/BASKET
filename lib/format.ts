import { formatEther, formatUnits, type Address } from "viem";

export const dash = "—";

export const shortenAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(address.length - 4)}`;

export const formatPercent = (bps: number) => `${(bps / 100).toFixed(2)}%`;

export const formatTokenAmount = (raw: bigint, decimals = 18) => {
  const value = Number(formatUnits(raw, decimals));
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1_000 ? 0 : 4
  }).format(value);
};

export const formatEthInput = (value: string) => {
  const numeric = Number(value || "0");
  if (!Number.isFinite(numeric) || numeric === 0) return "0 ETH";
  return `${numeric.toLocaleString("en-US", { maximumFractionDigits: 6 })} ETH`;
};

export const formatShares = (raw: bigint) => `${formatEther(raw)} shares`;

export type AddressLike = Address | string;

