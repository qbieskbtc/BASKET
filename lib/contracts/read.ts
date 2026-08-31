import { isAddress, parseAbiItem, type Address, formatUnits } from "viem";
import { robinhoodChain } from "@/lib/chain/robinhood";
import { publicClient } from "@/lib/contracts/publicClient";
import { basketFactoryAbi, basketVaultAbi, erc20MetadataAbi } from "@/lib/contracts/artifacts";
import { contractAddresses } from "@/lib/contracts/addresses";
import { basketDeployment } from "@/lib/contracts/deployments";
import type { BasketSummary, Component } from "@/lib/contracts/types";

const fallbackTokenName = (address: Address) => `Token ${address.slice(2, 8).toUpperCase()}`;
const basketCreatedEvent = parseAbiItem(
  "event BasketCreated(address indexed basket,address indexed creator,string name,string symbol,address[] components,uint16[] weights,uint256 timestamp)"
);

const uniqueAddresses = (addresses: Address[]) =>
  [...new Map(addresses.map((address) => [address.toLowerCase(), address])).values()];

export const getBasketAddresses = async (): Promise<Address[]> => {
  const factory = contractAddresses.basketFactory;
  if (!factory) return [];

  if (basketDeployment.factoryStartBlock !== undefined) {
    const latest = await publicClient.getBlockNumber();
    const logs = await publicClient.getLogs({
      address: factory,
      event: basketCreatedEvent,
      fromBlock: basketDeployment.factoryStartBlock,
      toBlock: latest
    });
    return uniqueAddresses(logs.map((log) => log.args.basket as Address));
  }

  const count = await publicClient.readContract({
    address: factory,
    abi: basketFactoryAbi,
    functionName: "basketCount"
  });

  const calls = Array.from({ length: Number(count) }, (_, index) => ({
    address: factory,
    abi: basketFactoryAbi,
    functionName: "basketAt",
    args: [BigInt(index)]
  }));

  const results = await publicClient.multicall({ contracts: calls, allowFailure: true });
  return results
    .map((result) => (result.status === "success" ? result.result : undefined))
    .filter((address): address is Address => typeof address === "string");
};

export const getBasketSummary = async (address: Address, user?: Address): Promise<BasketSummary | undefined> => {
  if (!isAddress(address)) return undefined;
  const code = await publicClient.getCode({ address });
  if (!code || code === "0x") return undefined;

  const baseContracts = [
    { address, abi: basketVaultAbi, functionName: "name" },
    { address, abi: basketVaultAbi, functionName: "symbol" },
    { address, abi: basketVaultAbi, functionName: "creator" },
    { address, abi: basketVaultAbi, functionName: "components" },
    { address, abi: basketVaultAbi, functionName: "targetWeights" },
    { address, abi: basketVaultAbi, functionName: "totalSupply" },
    { address, abi: basketVaultAbi, functionName: "creationTimestamp" },
    ...(user ? [{ address, abi: basketVaultAbi, functionName: "balanceOf", args: [user] }] : [])
  ];

  const base = await publicClient.multicall({
    allowFailure: false,
    contracts: baseContracts
  }).catch(() => undefined);

  if (!base) return undefined;

  const [name, symbol, creator, componentAddresses, weights, totalSupplyRaw, createdAt, userSharesRaw] = base as [
    string,
    string,
    Address,
    Address[],
    number[],
    bigint,
    bigint,
    bigint | undefined
  ];

  const componentCalls = componentAddresses.flatMap((component) => [
    { address: component, abi: erc20MetadataAbi, functionName: "symbol" },
    { address: component, abi: erc20MetadataAbi, functionName: "name" },
    { address: component, abi: erc20MetadataAbi, functionName: "decimals" },
    { address: component, abi: erc20MetadataAbi, functionName: "balanceOf", args: [address] }
  ]);

  const componentResults = await publicClient.multicall({
    allowFailure: true,
    contracts: componentCalls
  });

  const components: Component[] = componentAddresses.map((component, index) => {
    const offset = index * 4;
    const symbolResult = componentResults[offset];
    const nameResult = componentResults[offset + 1];
    const decimalsResult = componentResults[offset + 2];
    const balanceResult = componentResults[offset + 3];

    return {
      address: component,
      symbol:
        symbolResult?.status === "success" && typeof symbolResult.result === "string"
          ? symbolResult.result
          : component.slice(2, 8).toUpperCase(),
      name:
        nameResult?.status === "success" && typeof nameResult.result === "string"
          ? nameResult.result
          : fallbackTokenName(component),
      decimals:
        decimalsResult?.status === "success" && typeof decimalsResult.result === "number"
          ? decimalsResult.result
          : 18,
      targetWeightBps: Number(weights[index] ?? 0),
      balanceRaw:
        balanceResult?.status === "success" && typeof balanceResult.result === "bigint"
          ? balanceResult.result
          : 0n
    };
  });

  return { address, name, symbol, creator, components, totalSupplyRaw, createdAt, userSharesRaw };
};

export const getBasketSummaries = async (): Promise<BasketSummary[]> => {
  const addresses = await getBasketAddresses();
  const summaries = await Promise.all(addresses.map((address) => getBasketSummary(address)));
  return summaries.filter((basket): basket is BasketSummary => Boolean(basket));
};

export const formatComponentBalance = (component: Component) => {
  const value = Number(formatUnits(component.balanceRaw, component.decimals));
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value >= 1_000 ? 0 : 4 }).format(
    value
  );
};

export const hasFactoryConfigured = () => Boolean(contractAddresses.basketFactory);
export const chainId = robinhoodChain.id;
