import { isAddress, zeroAddress, type Address } from "viem";
import { robinhoodChain } from "@/lib/chain/robinhood";

export type DeploymentConfig = {
  chainId: number;
  chainName: string;
  factory?: Address;
  router?: Address;
  adapter?: Address;
  factoryStartBlock?: bigint;
  deploymentTransaction?: `0x${string}`;
  configured: boolean;
  missing: string[];
};

const liveDeployment = {
  factory: "0xa8498c29620794bf6a07a51ecedb6eefcabeca13",
  router: "0x302a9fa851ce31b5bcea4d6ee21dfb78d0bd16b5",
  adapter: "0xd5f575a9d0c4270668ae595b7cbc05f75b75f1f0",
  factoryStartBlock: 50_554_718n,
  deploymentTransaction: "0x94cc4ee467cace46d2e938f88d0d480ee594ed0937c849dbec5f46d0f4a6f9c1"
} as const satisfies {
  factory: Address;
  router: Address;
  adapter: Address;
  factoryStartBlock: bigint;
  deploymentTransaction: `0x${string}`;
};

const readAddress = (name: string, value: string | undefined, fallback: Address): Address | undefined => {
  if (!value) return fallback;
  if (!isAddress(value) || value === zeroAddress) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(name + " must be a nonzero EVM address.");
    }
    return undefined;
  }
  return value;
};

const factory = readAddress(
  "NEXT_PUBLIC_BASKET_FACTORY_ADDRESS",
  process.env.NEXT_PUBLIC_BASKET_FACTORY_ADDRESS,
  liveDeployment.factory
);
const router = readAddress(
  "NEXT_PUBLIC_BASKET_ROUTER_ADDRESS",
  process.env.NEXT_PUBLIC_BASKET_ROUTER_ADDRESS,
  liveDeployment.router
);
const adapter = readAddress(
  "NEXT_PUBLIC_PONS_V3_ADAPTER_ADDRESS",
  process.env.NEXT_PUBLIC_PONS_V3_ADAPTER_ADDRESS,
  liveDeployment.adapter
);
const factoryStartBlock = process.env.NEXT_PUBLIC_BASKET_FACTORY_START_BLOCK
  ? BigInt(process.env.NEXT_PUBLIC_BASKET_FACTORY_START_BLOCK)
  : liveDeployment.factoryStartBlock;

const missing = [
  !factory ? "NEXT_PUBLIC_BASKET_FACTORY_ADDRESS" : undefined,
  !router ? "NEXT_PUBLIC_BASKET_ROUTER_ADDRESS" : undefined,
  !adapter ? "NEXT_PUBLIC_PONS_V3_ADAPTER_ADDRESS" : undefined
].filter((value): value is string => Boolean(value));

export const basketDeployment: DeploymentConfig = {
  chainId: robinhoodChain.id,
  chainName: robinhoodChain.name,
  factory,
  router,
  adapter,
  factoryStartBlock,
  deploymentTransaction: liveDeployment.deploymentTransaction,
  configured: missing.length === 0,
  missing
};

export const requireBasketDeployment = () => {
  if (!basketDeployment.configured) {
    throw new Error("BASKET deployment is not configured: " + basketDeployment.missing.join(", "));
  }
  return basketDeployment as DeploymentConfig & {
    factory: Address;
    router: Address;
    adapter: Address;
    factoryStartBlock: bigint;
  };
};
