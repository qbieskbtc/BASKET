"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { type Address, formatEther, parseEther } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { wagmiConfig } from "@/lib/chain/wagmi";
import { AddressLink } from "@/components/Address";
import { basketRouterAbi, basketVaultAbi, erc20MetadataAbi, ponsV3AdapterAbi } from "@/lib/contracts/artifacts";
import { contractAddresses } from "@/lib/contracts/addresses";
import { getBasketSummary } from "@/lib/contracts/read";
import { publicClient } from "@/lib/contracts/publicClient";
import type { BasketSummary, Component } from "@/lib/contracts/types";
import { formatTokenAmount } from "@/lib/format";
import { useRobinhoodWriteGuard } from "@/hooks/useRobinhoodWriteGuard";
import { robinhoodChain } from "@/lib/chain/robinhood";

// ─── Types ────────────────────────────────────────────────────────────────────

type TxState = "idle" | "simulating" | "signing" | "confirming" | "confirmed" | "error";
type TradeTab = "buy" | "sell";

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOCKSCOUT_BASE = "https://robinhoodchain.blockscout.com";
const BLOCKS_PER_POINT = 3600n; // ~1 hour at ~1s/block on Robinhood Chain
const HISTORY_POINTS = 24;

const SEGMENT_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6"
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const safeParseEther = (value: string): bigint => {
  try { return parseEther(value || "0"); } catch { return 0n; }
};

function applySlippage(value: bigint, bps: bigint): bigint {
  const result = (value * (10000n - bps)) / 10000n;
  return value > 0n && result === 0n ? 1n : result;
}

function formatPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

// ─── Historical NAV fetcher ───────────────────────────────────────────────────

async function fetchNavHistory(
  basket: BasketSummary
): Promise<Array<{ time: number; value: number }>> {
  if (!contractAddresses.ponsV3Adapter || basket.components.length === 0) return [];

  const latest = await publicClient.getBlockNumber().catch(() => null);
  if (!latest) return [];

  const blockNumbers = Array.from({ length: HISTORY_POINTS }, (_, i) =>
    latest - BigInt(HISTORY_POINTS - 1 - i) * BLOCKS_PER_POINT
  ).filter((b) => b > 0n);

  const points = await Promise.allSettled(
    blockNumbers.map(async (blockNumber) => {
      const [block, totalSupply] = await Promise.all([
        publicClient.getBlock({ blockNumber }),
        publicClient
          .readContract({
            address: basket.address,
            abi: basketVaultAbi,
            functionName: "totalSupply",
            blockNumber,
          })
          .catch(() => 0n),
      ]);

      const supply = totalSupply as bigint;
      if (supply === 0n) return null;

      const balances = (await Promise.all(
        basket.components.map((c) =>
          publicClient
            .readContract({
              address: c.address,
              abi: erc20MetadataAbi,
              functionName: "balanceOf",
              args: [basket.address],
              blockNumber,
            })
            .catch(() => 0n)
        )
      )) as bigint[];

      const ethValues = await Promise.all(
        basket.components.map((c, i) =>
          publicClient
            .simulateContract({
              address: contractAddresses.ponsV3Adapter!,
              abi: ponsV3AdapterAbi,
              functionName: "quoteTokenToWETH",
              args: [c.address, balances[i]],
              blockNumber,
            })
            .then((r) => r.result as bigint)
            .catch(() => 0n)
        )
      );

      const totalEth = ethValues.reduce((s, v) => s + v, 0n);
      if (totalEth === 0n) return null;

      const navPerShare = Number((totalEth * 10n ** 18n) / supply) / 1e18;
      return { time: Number(block.timestamp), value: navPerShare };
    })
  );

  return points
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((v): v is { time: number; value: number } => v !== null && v.value > 0)
    .sort((a, b) => a.time - b.time);
}

// ─── Quote functions ──────────────────────────────────────────────────────────

async function quoteBuy(
  basket: BasketSummary,
  ethWei: bigint
): Promise<{ allocations: bigint[]; componentAmounts: bigint[]; estimatedShares: bigint }> {
  if (!contractAddresses.ponsV3Adapter) throw new Error("ponsV3Adapter not configured");

  let allocations: bigint[];

  if (basket.totalSupplyRaw > 0n) {
    const reserveQuotes = await Promise.all(
      basket.components.map((c) =>
        publicClient
          .simulateContract({
            address: contractAddresses.ponsV3Adapter!,
            abi: ponsV3AdapterAbi,
            functionName: "quoteTokenToWETH",
            args: [c.address, c.balanceRaw],
          })
          .catch(() => undefined)
      )
    );
    const failedIndex = reserveQuotes.findIndex((r) => !r);
    if (failedIndex >= 0)
      throw new Error(`Buy unavailable: ${basket.components[failedIndex].symbol} has no route.`);
    const reserveValues = reserveQuotes.map((r) => r!.result as bigint);
    const totalValue = reserveValues.reduce((s, v) => s + v, 0n);
    if (totalValue === 0n) throw new Error("Unable to value vault reserves.");
    allocations = reserveValues.map((rv) => (ethWei * rv) / totalValue);
  } else {
    allocations = basket.components.map((c) => (ethWei * BigInt(c.targetWeightBps)) / 10_000n);
  }

  const componentQuotes = await Promise.all(
    basket.components.map((c, i) =>
      publicClient
        .simulateContract({
          address: contractAddresses.ponsV3Adapter!,
          abi: ponsV3AdapterAbi,
          functionName: "quoteWETHToToken",
          args: [c.address, allocations[i]],
        })
        .catch(() => undefined)
    )
  );
  const failedCQ = componentQuotes.findIndex((r) => !r);
  if (failedCQ >= 0)
    throw new Error(`Buy unavailable: ${basket.components[failedCQ].symbol} has no route.`);
  const componentAmounts = componentQuotes.map((r) => r!.result as bigint);

  const preview = await publicClient.simulateContract({
    address: basket.address,
    abi: basketVaultAbi,
    functionName: "previewDeposit",
    args: [componentAmounts],
  });
  const estimatedShares = (preview.result as readonly [bigint, bigint[]])[0];

  return { allocations, componentAmounts, estimatedShares };
}

async function quoteSell(
  basket: BasketSummary,
  sharesWei: bigint
): Promise<{ componentAmountsOut: bigint[]; ethOut: bigint }> {
  if (!contractAddresses.ponsV3Adapter) throw new Error("ponsV3Adapter not configured");

  const componentAmountsOut = basket.components.map(
    (c) => (c.balanceRaw * sharesWei) / basket.totalSupplyRaw
  );

  const ethQuotes = await Promise.all(
    basket.components.map((c, i) =>
      publicClient
        .simulateContract({
          address: contractAddresses.ponsV3Adapter!,
          abi: ponsV3AdapterAbi,
          functionName: "quoteTokenToWETH",
          args: [c.address, componentAmountsOut[i]],
        })
        .catch(() => undefined)
    )
  );
  const failedIndex = ethQuotes.findIndex((r) => !r);
  if (failedIndex >= 0)
    throw new Error(`Sell unavailable: ${basket.components[failedIndex].symbol} has no route.`);
  const ethOut = ethQuotes.reduce((s, r) => s + (r!.result as bigint), 0n);

  return { componentAmountsOut, ethOut };
}

// ─── NAV Chart ────────────────────────────────────────────────────────────────

function NavChart({
  data,
  loading,
}: {
  data: Array<{ time: number; value: number }>;
  loading: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length < 2) return;
    const container = containerRef.current;
    let disposed = false;
    let dispose: (() => void) | undefined;

    import("lightweight-charts").then(({ createChart, ColorType, AreaSeries }) => {
      if (disposed || !container) return;

      const chart = createChart(container, {
        width: container.clientWidth,
        height: 280,
        layout: {
          background: { type: ColorType.Solid, color: "#f4f1ea" },
          textColor: "#6e6b62",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "#ddd8cf" },
          horzLines: { color: "#ddd8cf" },
        },
        crosshair: { vertLine: { color: "#0b0b0a" }, horzLine: { color: "#0b0b0a" } },
        rightPriceScale: { borderColor: "#ddd8cf" },
        timeScale: { borderColor: "#ddd8cf", timeVisible: true },
        handleScroll: true,
        handleScale: true,
      });

      const series = chart.addSeries(AreaSeries, {
        lineColor: "#0b0b0a",
        topColor: "rgba(11,11,10,0.12)",
        bottomColor: "rgba(11,11,10,0)",
        lineWidth: 2,
        priceFormat: { type: "price", precision: 6, minMove: 0.000001 },
      });

      series.setData(data as Parameters<typeof series.setData>[0]);
      chart.timeScale().fitContent();

      const observer = new ResizeObserver(() => {
        chart.applyOptions({ width: container.clientWidth });
      });
      observer.observe(container);

      dispose = () => { observer.disconnect(); chart.remove(); };
    });

    return () => { disposed = true; dispose?.(); };
  }, [data]);

  if (loading) {
    return (
      <div className="basket-chart-empty">
        <span>Loading price history…</span>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="basket-chart-empty">
        <span>No price history yet — data builds over time.</span>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: "100%", height: 280 }} />;
}

// ─── Composition bar ──────────────────────────────────────────────────────────

function CompositionStrip({ components }: { components: Component[] }) {
  const total = components.reduce((s, c) => s + c.targetWeightBps, 0);
  return (
    <div className="composition-strip">
      {components.map((c, i) => (
        <span
          key={c.address}
          className="composition-segment"
          style={{
            width: `${(c.targetWeightBps / total) * 100}%`,
            background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BasketDetailClient({ address }: { address: Address }) {
  const { address: walletAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { ensureRobinhoodChain, isSwitchingNetwork, wrongNetwork } = useRobinhoodWriteGuard();

  const [basket, setBasket] = useState<BasketSummary>();
  const [isLoading, setIsLoading] = useState(true);

  const [tab, setTab] = useState<TradeTab>("buy");
  const [ethAmount, setEthAmount] = useState("0.5");
  const [sharesAmount, setSharesAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(100n);

  const [buyQuote, setBuyQuote] = useState<{
    allocations: bigint[];
    componentAmounts: bigint[];
    estimatedShares: bigint;
  } | null>(null);
  const [sellQuote, setSellQuote] = useState<{ componentAmountsOut: bigint[]; ethOut: bigint } | null>(null);
  const [quoteError, setQuoteError] = useState<string>();

  const [txState, setTxState] = useState<TxState>("idle");
  const [txError, setTxError] = useState<string>();
  const [txHash, setTxHash] = useState<string>();
  const [gasEstimate, setGasEstimate] = useState<bigint>();

  const [navPerShareWei, setNavPerShareWei] = useState<bigint>();
  const [navHistory, setNavHistory] = useState<Array<{ time: number; value: number }>>([]);
  const [navHistoryLoading, setNavHistoryLoading] = useState(false);

  // ── Load basket ──

  const refreshBasket = useCallback(async () => {
    const result = await getBasketSummary(address, walletAddress);
    setBasket(result ?? undefined);
  }, [address, walletAddress]);

  useEffect(() => {
    let active = true;
    const MAX_ATTEMPTS = 6;
    const RETRY_MS = 2000;

    const load = async (attempt: number) => {
      const result = await getBasketSummary(address, walletAddress);
      if (!active) return;
      if (result) {
        setBasket(result);
        setIsLoading(false);
      } else if (attempt < MAX_ATTEMPTS) {
        setTimeout(() => { if (active) load(attempt + 1); }, RETRY_MS);
      } else {
        setIsLoading(false);
      }
    };

    load(0);
    return () => { active = false; };
  }, [address, walletAddress]);

  // ── NAV live ──

  useEffect(() => {
    if (!basket || basket.totalSupplyRaw === 0n || !contractAddresses.ponsV3Adapter) return;
    let active = true;

    const calc = async () => {
      const quotes = await Promise.all(
        basket.components.map((c) =>
          publicClient
            .simulateContract({
              address: contractAddresses.ponsV3Adapter!,
              abi: ponsV3AdapterAbi,
              functionName: "quoteTokenToWETH",
              args: [c.address, c.balanceRaw],
            })
            .catch(() => undefined)
        )
      );
      if (!active) return;
      const totalEth = quotes.reduce((s, r) => s + (r ? (r.result as bigint) : 0n), 0n);
      if (active) setNavPerShareWei((totalEth * 10n ** 18n) / basket.totalSupplyRaw);
    };

    calc().catch(() => undefined);
    return () => { active = false; };
  }, [basket]);

  // ── NAV history (initial load + refresh every 5 min) ──

  useEffect(() => {
    if (!basket) return;
    let active = true;

    const load = () => {
      fetchNavHistory(basket)
        .then((data) => { if (active) setNavHistory(data); })
        .catch(() => { if (active) setNavHistory([]); })
        .finally(() => { if (active) setNavHistoryLoading(false); });
    };

    setNavHistoryLoading(true);
    load();

    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { active = false; clearInterval(interval); };
  }, [basket]);

  // ── Buy quote (display) ──

  useEffect(() => {
    if (!basket || tab !== "buy") return;
    let active = true;
    setBuyQuote(null);
    setQuoteError(undefined);
    const ethWei = safeParseEther(ethAmount);
    if (ethWei === 0n) return;

    quoteBuy(basket, ethWei)
      .then((q) => { if (active) setBuyQuote(q); })
      .catch((err) => { if (active) setQuoteError(err instanceof Error ? err.message : "Unable to quote."); });

    return () => { active = false; };
  }, [basket, ethAmount, tab]);

  // ── Sell quote (display) ──

  useEffect(() => {
    if (!basket || tab !== "sell") return;
    let active = true;
    setSellQuote(null);
    setQuoteError(undefined);
    const sharesWei = safeParseEther(sharesAmount);
    if (sharesWei === 0n || basket.totalSupplyRaw === 0n) return;

    quoteSell(basket, sharesWei)
      .then((q) => { if (active) setSellQuote(q); })
      .catch((err) => { if (active) setQuoteError(err instanceof Error ? err.message : "Unable to quote."); });

    return () => { active = false; };
  }, [basket, sharesAmount, tab]);

  // ── Execute ──

  const transact = async () => {
    if (!walletAddress || !basket) return;
    setTxHash(undefined);
    setTxError(undefined);
    setGasEstimate(undefined);

    try {
      const ready = await ensureRobinhoodChain();
      if (!ready) { setTxState("idle"); return; }

      const wc = walletClient ?? (await getWalletClient(wagmiConfig, { chainId: robinhoodChain.id }));
      if (!wc) throw new Error("No wallet client available.");

      setTxState("simulating");

      if (tab === "buy") {
        if (!contractAddresses.basketRouter) throw new Error("BasketRouter not configured.");
        const ethWei = safeParseEther(ethAmount);
        if (ethWei === 0n) throw new Error("Enter an ETH amount.");

        const fresh = await quoteBuy(basket, ethWei);
        const args = [
          {
            vault: basket.address,
            recipient: walletAddress,
            minSharesOut: applySlippage(fresh.estimatedShares, slippageBps),
            deadline: BigInt(Math.floor(Date.now() / 1000) + 900),
            wethAmountsIn: fresh.allocations,
            minComponentAmountsOut: fresh.componentAmounts.map((a) => applySlippage(a, slippageBps)),
          },
        ] as const;

        const sim = await publicClient.simulateContract({
          account: walletAddress,
          address: contractAddresses.basketRouter,
          abi: basketRouterAbi,
          functionName: "buyBasketWithETH",
          args,
          value: ethWei,
        });
        setGasEstimate(await publicClient.estimateContractGas(sim.request));
        setTxState("signing");
        const hash = await wc.writeContract(sim.request);
        setTxHash(hash);
        setTxState("confirming");
        await publicClient.waitForTransactionReceipt({ hash });

      } else {
        if (!contractAddresses.basketRouter) throw new Error("BasketRouter not configured.");
        const sharesWei = safeParseEther(sharesAmount);
        if (sharesWei === 0n) throw new Error("Enter a shares amount.");
        if (basket.totalSupplyRaw === 0n) throw new Error("Index has no supply.");

        const fresh = await quoteSell(basket, sharesWei);

        const allowance = (await publicClient.readContract({
          address: basket.address,
          abi: basketVaultAbi,
          functionName: "allowance",
          args: [walletAddress, contractAddresses.basketRouter],
        })) as bigint;

        if (allowance < sharesWei) {
          setTxState("signing");
          const approvalHash = await wc.writeContract({
            address: basket.address,
            abi: basketVaultAbi,
            functionName: "approve",
            args: [contractAddresses.basketRouter, sharesWei],
          });
          setTxHash(approvalHash);
          setTxState("confirming");
          await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          setTxState("simulating");
        }

        const redeemPreview = basket.components.map(
          (c) => (c.balanceRaw * sharesWei) / basket.totalSupplyRaw
        );

        const args = [
          {
            vault: basket.address,
            recipient: walletAddress,
            shares: sharesWei,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 900),
            minComponentAmountsOut: redeemPreview.map((a) => applySlippage(a, slippageBps)),
            minWethAmountsOut: basket.components.map(() => 1n),
            minETHOut: applySlippage(fresh.ethOut, slippageBps),
          },
        ] as const;

        const sim = await publicClient.simulateContract({
          account: walletAddress,
          address: contractAddresses.basketRouter,
          abi: basketRouterAbi,
          functionName: "redeemBasketToETH",
          args,
        });
        setGasEstimate(await publicClient.estimateContractGas(sim.request));
        setTxState("signing");
        const hash = await wc.writeContract(sim.request);
        setTxHash(hash);
        setTxState("confirming");
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setTxState("confirmed");
      await refreshBasket();
    } catch (err) {
      setTxState("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed.");
    }
  };

  // ── Derived ──

  const userSharesRaw = basket?.userSharesRaw ?? 0n;

  const ownershipPct = useMemo(() => {
    if (!basket || basket.totalSupplyRaw === 0n) return 0;
    return Number((userSharesRaw * 1_000_000n) / basket.totalSupplyRaw) / 10_000;
  }, [basket, userSharesRaw]);

  const busy = txState === "signing" || txState === "confirming" || isSwitchingNetwork;

  const executeDisabled =
    !walletAddress ||
    busy ||
    (tab === "buy"
      ? !!quoteError || safeParseEther(ethAmount) === 0n
      : !!quoteError || safeParseEther(sharesAmount) === 0n || !basket || basket.totalSupplyRaw === 0n);

  const executeLabel = wrongNetwork
    ? "WRONG NETWORK"
    : isSwitchingNetwork
    ? "SWITCHING…"
    : txState === "simulating"
    ? "SIMULATING…"
    : txState === "signing"
    ? "SIGN IN WALLET…"
    : txState === "confirming"
    ? "CONFIRMING…"
    : tab === "buy"
    ? "BUY"
    : "SELL";

  // ── Early returns ──

  if (isLoading) {
    return (
      <div className="page compact-page basket-loading">
        Reading index…
      </div>
    );
  }

  if (!basket) {
    return (
      <div className="page compact-page basket-loading">
        Index not found.
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="page compact-page">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="basket-page-header">
        <div className="basket-page-identity">
          <p className="eyebrow">INDEX</p>
          <h1 className="basket-ticker">{basket.symbol}</h1>
          <div className="basket-name-sub">{basket.name}</div>
        </div>

        <div className="basket-page-stats">
          <div className="basket-page-stat">
            <span className="basket-page-stat-label">NAV / SHARE</span>
            <strong className="basket-page-stat-value">
              {navPerShareWei !== undefined
                ? `${Number(formatEther(navPerShareWei)).toFixed(6)} ETH`
                : "—"}
            </strong>
          </div>
          <div className="basket-page-stat">
            <span className="basket-page-stat-label">SUPPLY</span>
            <strong className="basket-page-stat-value">
              {formatTokenAmount(basket.totalSupplyRaw, 18)}
            </strong>
          </div>
          <div className="basket-page-stat">
            <span className="basket-page-stat-label">YOUR SHARES</span>
            <strong className="basket-page-stat-value">
              {formatTokenAmount(userSharesRaw, 18)}
            </strong>
          </div>
          <div className="basket-page-stat">
            <span className="basket-page-stat-label">OWNERSHIP</span>
            <strong className="basket-page-stat-value">
              {ownershipPct.toFixed(4)}%
            </strong>
          </div>
        </div>
      </div>

      {/* ── BODY GRID ────────────────────────────────────────────────────────── */}
      <div className="detail-grid">

        {/* ── LEFT: chart + composition ─────────────────────────────────────── */}
        <div>
          {/* Chart */}
          <div className="basket-chart-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p className="eyebrow" style={{ margin: 0 }}>NAV / SHARE HISTORY</p>
              {navPerShareWei !== undefined && (
                <span style={{ fontSize: 13, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                  {Number(formatEther(navPerShareWei)).toFixed(6)} ETH
                </span>
              )}
            </div>
            <NavChart data={navHistory} loading={navHistoryLoading} />
          </div>

          {/* Composition */}
          <div className="composition-table">
            <p className="eyebrow" style={{ padding: "18px 0 4px" }}>INDEX COMPOSITION</p>
            <CompositionStrip components={basket.components} />
            <div className="composition-row composition-head">
              <span>ASSET</span>
              <span>TARGET</span>
              <span>BALANCE</span>
              <span>ADDRESS</span>
            </div>
            {basket.components.map((c, i) => (
              <div className="composition-row" key={c.address}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <strong>{c.symbol}</strong>
                  <span style={{ color: "var(--muted)" }}>{c.name}</span>
                </span>
                <span>{formatPercent(c.targetWeightBps)}</span>
                <span>{formatTokenAmount(c.balanceRaw, c.decimals)}</span>
                <span>
                  <AddressLink address={c.address} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: trade panel ──────────────────────────────────────────────── */}
        <div className="tx-panel">
          <div className="tx-panel-head">
            <h2>TRADE</h2>
            <span>
              <AddressLink address={basket.address} />
            </span>
          </div>

          {/* BUY / SELL tabs */}
          <div className="basket-trade-tabs">
            <button
              className={tab === "buy" ? "active" : ""}
              onClick={() => { setTab("buy"); setQuoteError(undefined); }}
            >
              BUY
            </button>
            <button
              className={tab === "sell" ? "active" : ""}
              onClick={() => { setTab("sell"); setQuoteError(undefined); }}
            >
              SELL
            </button>
          </div>

          {/* Amount input */}
          <label className="field">
            <span>{tab === "buy" ? "YOU PAY (ETH)" : `SHARES TO SELL (${basket.symbol})`}</span>
            {tab === "buy" ? (
              <input value={ethAmount} onChange={(e) => setEthAmount(e.target.value)} placeholder="0.0" />
            ) : (
              <input value={sharesAmount} onChange={(e) => setSharesAmount(e.target.value)} placeholder="0.0" />
            )}
          </label>

          {/* Quote */}
          <div className="basket-quote">
            {tab === "buy" ? (
              <>
                <div className="basket-quote-row">
                  <span>Est. shares out</span>
                  <strong>
                    {buyQuote ? formatTokenAmount(buyQuote.estimatedShares, 18) : quoteError ? "—" : "…"}
                  </strong>
                </div>
                {basket.components.map((c, i) => (
                  <div className="basket-quote-row" key={c.address}>
                    <span>{c.symbol} allocation</span>
                    <strong>
                      {buyQuote
                        ? `${Number(formatEther(buyQuote.allocations[i] ?? 0n)).toFixed(6)} ETH`
                        : "—"}
                    </strong>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="basket-quote-row">
                  <span>Est. ETH out</span>
                  <strong>
                    {sellQuote
                      ? `${Number(formatEther(sellQuote.ethOut)).toFixed(6)} ETH`
                      : quoteError ? "—" : "…"}
                  </strong>
                </div>
                {basket.components.map((c, i) => (
                  <div className="basket-quote-row" key={c.address}>
                    <span>{c.symbol} returned</span>
                    <strong>
                      {sellQuote
                        ? formatTokenAmount(sellQuote.componentAmountsOut[i] ?? 0n, c.decimals)
                        : "—"}
                    </strong>
                  </div>
                ))}
              </>
            )}
            {gasEstimate && txState === "confirmed" && (
              <div className="basket-quote-row">
                <span>Gas used</span>
                <strong>{gasEstimate.toLocaleString()}</strong>
              </div>
            )}
          </div>

          {/* Slippage */}
          <div className="basket-slippage-row">
            <span>SLIPPAGE</span>
            {([50n, 100n, 200n] as const).map((bps) => (
              <button
                key={String(bps)}
                className={`basket-slip-btn${slippageBps === bps ? " slip-active" : ""}`}
                onClick={() => setSlippageBps(bps)}
              >
                {bps === 50n ? "0.5%" : bps === 100n ? "1%" : "2%"}
              </button>
            ))}
          </div>

          {/* Execute */}
          {quoteError && <p className="tx-error" style={{ margin: 0 }}>{quoteError}</p>}
          <button
            className={`button button-full${tab === "buy" ? " button-buy" : " button-sell"}`}
            onClick={transact}
            disabled={executeDisabled}
          >
            {executeLabel}
          </button>

          {/* Status */}
          <div className="basket-status">
            {txState === "idle" && !txError && (
              <span>{walletAddress ? "" : "Connect wallet to trade"}</span>
            )}
            {txState === "simulating" && <span>Simulating…</span>}
            {txState === "signing" && <span>Check your wallet…</span>}
            {txState === "confirming" && txHash && (
              <span>
                Confirming…{" "}
                <a
                  href={`${BLOCKSCOUT_BASE}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link"
                >
                  {txHash.slice(0, 10)}…
                </a>
              </span>
            )}
            {txState === "confirmed" && txHash && (
              <span style={{ color: "var(--gold)" }}>
                Confirmed —{" "}
                <a
                  href={`${BLOCKSCOUT_BASE}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link"
                  style={{ color: "var(--gold)" }}
                >
                  view tx
                </a>
              </span>
            )}
            {txState === "error" && txError && (
              <span className="tx-error">{txError}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
