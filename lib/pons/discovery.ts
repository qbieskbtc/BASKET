import { isAddress, parseAbiItem, type Address } from "viem";
import { robinhoodChain } from "@/lib/chain/robinhood";
import { erc20MetadataAbi, ponsV3AdapterAbi } from "@/lib/contracts/artifacts";
import { contractAddresses } from "@/lib/contracts/addresses";
import { publicClient } from "@/lib/contracts/publicClient";
import type { PonsToken, TokenResolution } from "@/lib/contracts/types";

const PONS_V1_FACTORY = "0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB" as const;
const PONS_V2_FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e" as const;
const PONS_V1_START_BLOCK = 8_991_118n;
const PONS_V2_START_BLOCK = 50_506_757n;
const DISCOVERY_BLOCK_SPAN = 250_000n;
const DEFAULT_LIMIT = 24;
const STORAGE_KEY = "basket:pons-token-directory:v1";

const v1TokenLaunchedEvent = parseAbiItem(
  "event TokenLaunched(address indexed token,address indexed deployer,address indexed dexFactory,address pairToken,address pool,uint256 dexId,uint256 launchConfigId,uint256 positionId,uint256 restrictionsEndBlock,uint256 initialBuyAmount)"
);

const v2TokenLaunchedEvent = parseAbiItem(
  "event TokenLaunched(address indexed token,address indexed curve,address indexed deployer,address pairToken,uint256 launchConfigId,uint256 launchFeePaid)"
);

const v2PoolGraduatedEvent = parseAbiItem(
  "event PoolGraduated(address indexed token,uint256 poolId,uint256 amount0,uint256 amount1)"
);

let directoryCache: { latest: bigint; tokens: PonsToken[] } | undefined;

type StoredPonsToken = Omit<PonsToken, "blockNumber"> & { blockNumber: string };

const readStoredDirectory = (): PonsToken[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as StoredPonsToken[];
    return parsed.map((token) => ({ ...token, blockNumber: BigInt(token.blockNumber) }));
  } catch {
    return [];
  }
};

const writeStoredDirectory = (tokens: PonsToken[]) => {
  if (typeof window === "undefined") return;
  try {
    const encoded = tokens.map((token) => ({ ...token, blockNumber: token.blockNumber.toString() }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(encoded));
  } catch {
    // Storage availability is a convenience, not part of the trust path.
  }
};

const fallbackSymbol = (address: Address) => address.slice(2, 8).toUpperCase();

const normalizeAddress = (value: string): Address | undefined => {
  const trimmed = value.trim();
  return isAddress(trimmed) ? trimmed : undefined;
};

const readMetadata = async (addresses: Address[]) => {
  const unique = [...new Set(addresses)];
  const entries = await Promise.all(
    unique.map(async (address) => {
      const [name, symbol, decimals] = await Promise.all([
        publicClient
          .readContract({ address, abi: erc20MetadataAbi, functionName: "name" })
          .catch(() => undefined),
        publicClient
          .readContract({ address, abi: erc20MetadataAbi, functionName: "symbol" })
          .catch(() => undefined),
        publicClient
          .readContract({ address, abi: erc20MetadataAbi, functionName: "decimals" })
          .catch(() => undefined)
      ]);
      return [
        address,
        {
          name: typeof name === "string" ? name : undefined,
          symbol: typeof symbol === "string" ? symbol : undefined,
          decimals: typeof decimals === "number" ? decimals : undefined
        }
      ] as const;
    })
  );

  return new Map(entries);
};

const readRouteSupport = async (addresses: Address[]) => {
  if (!contractAddresses.ponsV3Adapter) {
    return new Map(addresses.map((address) => [address, false]));
  }

  const entries = await Promise.all(
    addresses.map(async (address) => {
      const supported = await publicClient
        .readContract({
          address: contractAddresses.ponsV3Adapter!,
          abi: ponsV3AdapterAbi,
          functionName: "isSupportedToken",
          args: [address]
        })
        .catch(() => false);
      return [address, supported === true] as const;
    })
  );

  return new Map(entries);
};

const scanLaunches = async ({ latest, limit }: { latest: bigint; limit: number }) => {
  const v1Logs = [];
  const v2Logs = [];

  for (
    let toBlock = latest;
    toBlock >= PONS_V1_START_BLOCK && v1Logs.length + v2Logs.length < limit;
    toBlock = toBlock > DISCOVERY_BLOCK_SPAN ? toBlock - DISCOVERY_BLOCK_SPAN - 1n : 0n
  ) {
    const fromBlock = toBlock > DISCOVERY_BLOCK_SPAN ? toBlock - DISCOVERY_BLOCK_SPAN : 0n;
    if (toBlock >= PONS_V1_START_BLOCK) {
      const logs = await publicClient.getLogs({
        address: PONS_V1_FACTORY,
        event: v1TokenLaunchedEvent,
        fromBlock: fromBlock > PONS_V1_START_BLOCK ? fromBlock : PONS_V1_START_BLOCK,
        toBlock
      });
      v1Logs.push(...logs.reverse());
    }
    if (toBlock >= PONS_V2_START_BLOCK) {
      const logs = await publicClient.getLogs({
        address: PONS_V2_FACTORY,
        event: v2TokenLaunchedEvent,
        fromBlock: fromBlock > PONS_V2_START_BLOCK ? fromBlock : PONS_V2_START_BLOCK,
        toBlock
      });
      v2Logs.push(...logs.reverse());
    }
  }

  return { v1Logs, v2Logs };
};

export const discoverPonsTokens = async ({ limit = DEFAULT_LIMIT } = {}): Promise<PonsToken[]> => {
  const stored = readStoredDirectory();
  const latest = await publicClient.getBlockNumber().catch(() => undefined);
  if (!latest) return stored.slice(0, limit);
  if (directoryCache && latest - directoryCache.latest < 2_000n) return directoryCache.tokens.slice(0, limit);

  const { v1Logs, v2Logs } = await scanLaunches({ latest, limit });
  const launches = [
    ...v1Logs.map((log) => ({
      token: log.args.token as Address,
      deployer: log.args.deployer as Address,
      ponsVersion: "V1" as const,
      dexFactory: log.args.dexFactory as Address,
      pairToken: log.args.pairToken as Address,
      pool: log.args.pool as Address,
      blockNumber: log.blockNumber ?? 0n
    })),
    ...v2Logs.map((log) => ({
      token: log.args.token as Address,
      deployer: log.args.deployer as Address,
      ponsVersion: "V2" as const,
      pairToken: log.args.pairToken as Address,
      curve: log.args.curve as Address,
      blockNumber: log.blockNumber ?? 0n
    }))
  ]
    .sort((a, b) => Number(b.blockNumber - a.blockNumber))
    .slice(0, limit);

  const addresses = launches.map((launch) => launch.token);
  const [metadata, support, graduatedLogs] = await Promise.all([
    readMetadata(addresses),
    readRouteSupport(addresses),
    publicClient
      .getLogs({
        address: PONS_V2_FACTORY,
        event: v2PoolGraduatedEvent,
        fromBlock: PONS_V2_START_BLOCK,
        toBlock: latest
      })
      .catch(() => [])
  ]);

  const graduated = new Set(graduatedLogs.map((log) => log.args.token as Address));
  const tokens = launches.map((launch) => {
    const meta = metadata.get(launch.token);
    const swapSupported = support.get(launch.token) ?? false;
    return {
      ...launch,
      name: meta?.name ?? `Pons ${fallbackSymbol(launch.token)}`,
      symbol: meta?.symbol ?? fallbackSymbol(launch.token),
      decimals: meta?.decimals ?? 18,
      graduated: launch.ponsVersion === "V2" ? graduated.has(launch.token) : undefined,
      swapSupported,
      reasonUnsupported: swapSupported
        ? undefined
        : contractAddresses.ponsV3Adapter
          ? "No supported executable route through the installed adapter."
          : "Adapter address is not configured."
    };
  });

  directoryCache = { latest, tokens };
  writeStoredDirectory(tokens);
  return tokens;
};

export const resolveKnownPonsToken = async (address: Address): Promise<PonsToken | undefined> => {
  const tokens = await discoverPonsTokens();
  return tokens.find((token) => token.token.toLowerCase() === address.toLowerCase());
};

export const resolveToken = async (value: string): Promise<TokenResolution> => {
  const address = normalizeAddress(value);
  if (!address) {
    return {
      address: "0x0000000000000000000000000000000000000000",
      validContract: false,
      validErc20: false,
      knownPonsToken: false,
      swapSupported: false,
      liquidityStatus: "unknown",
      reasonUnsupported: "Invalid token contract"
    };
  }

  const code = await publicClient.getCode({ address });
  if (!code || code === "0x") {
    return {
      address,
      validContract: false,
      validErc20: false,
      knownPonsToken: false,
      swapSupported: false,
      liquidityStatus: "not-routable",
      reasonUnsupported: `No contract bytecode exists on ${robinhoodChain.name}.`
    };
  }

  const [metadata, support] = await Promise.all([
    readMetadata([address]),
    readRouteSupport([address])
  ]);
  const known = readStoredDirectory().find((token) => token.token.toLowerCase() === address.toLowerCase());
  const meta = metadata.get(address);
  const validErc20 = Boolean(meta?.name && meta.symbol && typeof meta.decimals === "number");
  const swapSupported = support.get(address) ?? false;

  return {
    address,
    name: meta?.name,
    symbol: meta?.symbol,
    decimals: meta?.decimals,
    validContract: true,
    validErc20,
    knownPonsToken: Boolean(known),
    ponsVersion: known?.ponsVersion,
    swapSupported,
    adapter: swapSupported ? contractAddresses.ponsV3Adapter : undefined,
    pool: known?.pool,
    curve: known?.curve,
    liquidityStatus: swapSupported ? "routable" : "not-routable",
    reasonUnsupported: validErc20
      ? swapSupported
        ? undefined
        : contractAddresses.ponsV3Adapter
          ? "Route not currently supported"
          : "Route not currently supported because no adapter is configured"
      : "Invalid token contract"
  };
};
