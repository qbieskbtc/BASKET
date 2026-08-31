import type { Address } from "viem";

export type Component = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  targetWeightBps: number;
  balanceRaw: bigint;
};

export type ComponentClaim = Component & {
  claimRaw: bigint;
};

export type BasketSummary = {
  address: Address;
  name: string;
  symbol: string;
  creator: Address;
  components: Component[];
  totalSupplyRaw: bigint;
  createdAt?: bigint;
  userSharesRaw?: bigint;
};

export type PonsToken = {
  token: Address;
  deployer: Address;
  ponsVersion: "V1" | "V2";
  dexFactory?: Address;
  pairToken?: Address;
  pool?: Address;
  curve?: Address;
  blockNumber: bigint;
  name: string;
  symbol: string;
  decimals: number;
  graduated?: boolean;
  swapSupported: boolean;
  reasonUnsupported?: string;
};

export type TokenResolution = {
  address: Address;
  name?: string;
  symbol?: string;
  decimals?: number;
  validContract: boolean;
  validErc20: boolean;
  knownPonsToken: boolean;
  ponsVersion?: "V1" | "V2";
  swapSupported: boolean;
  adapter?: Address;
  pool?: Address;
  curve?: Address;
  liquidityStatus: "routable" | "not-routable" | "unknown";
  reasonUnsupported?: string;
};
