"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { type Address, isAddress, parseEventLogs } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { wagmiConfig } from "@/lib/chain/wagmi";
import { TokenSelector } from "@/components/create/TokenSelector";
import { WeightEditor, type WeightEntry } from "@/components/create/WeightEditor";
import { TransactionPanel } from "@/components/transaction/TransactionPanel";
import { blockscoutAddressUrl, robinhoodChain } from "@/lib/chain/robinhood";
import { basketFactoryAbi } from "@/lib/contracts/artifacts";
import { contractAddresses } from "@/lib/contracts/addresses";
import { publicClient } from "@/lib/contracts/publicClient";
import { useRobinhoodWriteGuard } from "@/hooks/useRobinhoodWriteGuard";
import { resolveToken } from "@/lib/pons/discovery";
import type { TokenResolution } from "@/lib/contracts/types";

type TxState = "idle" | "simulating" | "ready" | "signing" | "confirming" | "confirmed" | "error";

export function CreateClient() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const router = useRouter();
  const [selected, setSelected] = useState<Address[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [txState, setTxState] = useState<TxState>("idle");
  const [error, setError] = useState<string>();
  const [hash, setHash] = useState<string>();
  const [createdBasket, setCreatedBasket] = useState<Address>();
  const [gasEstimate, setGasEstimate] = useState<bigint>();
  const { ensureRobinhoodChain, isSwitchingNetwork, wrongNetwork } = useRobinhoodWriteGuard();
  const [tokenResolutions, setTokenResolutions] = useState<Map<Address, TokenResolution>>(new Map());
  const [isCheckingRoutes, setIsCheckingRoutes] = useState(false);

  // Sync weights with selected tokens. Always equalize when tokens are added so no
  // component ever enters at 0 bps (the factory rejects zero-weight components).
  useEffect(() => {
    setWeights((current) => {
      const retained = current.filter((entry) => selected.includes(entry.address));
      const retainedAddresses = new Set(retained.map((entry) => entry.address));
      const added = selected
        .filter((token) => !retainedAddresses.has(token))
        .map((token) => ({ address: token, weightBps: 0 }));
      const next = [...retained, ...added];
      if (next.length === 0) return [];
      if (added.length > 0 || next.every((entry) => entry.weightBps === 0)) {
        const equal = Math.floor(10_000 / next.length);
        const remainder = 10_000 - equal * next.length;
        return next.map((entry, index) => ({
          ...entry,
          weightBps: equal + (index === 0 ? remainder : 0)
        }));
      }
      return next;
    });
  }, [selected]);

  // Live routability check whenever the selection changes.
  useEffect(() => {
    if (selected.length === 0) {
      setTokenResolutions(new Map());
      return;
    }
    let cancelled = false;
    setIsCheckingRoutes(true);
    Promise.all(
      selected.map(async (token) => {
        const resolution = await resolveToken(token);
        return [token, resolution] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) {
          setTokenResolutions(new Map(entries));
          setIsCheckingRoutes(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsCheckingRoutes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const totalWeight = useMemo(
    () => weights.reduce((sum, entry) => sum + entry.weightBps, 0),
    [weights]
  );

  // --- named conditions (used for debug block and blocker message) ---
  const walletConnected = Boolean(address);
  const correctChain = chainId === robinhoodChain.id;
  const hasName = name.trim().length > 0;
  const hasSymbol = symbol.trim().length > 0;
  const tokenCountValid = selected.length >= 2 && selected.length <= 10;
  const allRoutesSupported =
    !isCheckingRoutes &&
    selected.length > 0 &&
    selected.every((t) => tokenResolutions.get(t)?.swapSupported === true);
  const weightsValid = totalWeight === 10_000;
  const factoryConfigured = Boolean(contractAddresses.basketFactory);
  const isPending = txState === "signing" || txState === "confirming" || isSwitchingNetwork;

  // correctChain is NOT a gate here — clicking the button triggers auto-switch via
  // ensureRobinhoodChain. The blocker message shows the info; the button stays
  // clickable so the user can act on it without leaving the app.
  const canCreate =
    factoryConfigured &&
    walletConnected &&
    hasName &&
    hasSymbol &&
    tokenCountValid &&
    allRoutesSupported &&
    weightsValid;

  // DEV-ONLY debug object — remove after confirming all conditions are correct.
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[CreateClient]", {
      walletConnected,
      correctChain,
      hasName,
      hasSymbol,
      tokenCountValid,
      allRoutesSupported,
      weightsValid,
      factoryConfigured,
      isPending,
    });
  }

  // First failing condition shown directly above the button.
  // correctChain is listed here for visibility but does NOT disable the button —
  // clicking still works and triggers the auto-switch inside createIndex.
  const blockerMessage = (() => {
    if (isPending || txState === "confirmed") return null;
    if (!factoryConfigured) return "Contract not configured";
    if (!walletConnected) return "Connect wallet";
    if (!hasName) return "Enter an index name";
    if (!hasSymbol) return "Enter a ticker";
    if (!tokenCountValid)
      return selected.length < 2 ? "Add at least 2 assets" : "Maximum 10 assets";
    if (isCheckingRoutes) return null;
    if (!allRoutesSupported) {
      const unsupported = selected.find((t) => tokenResolutions.get(t)?.swapSupported === false);
      if (unsupported) {
        const res = tokenResolutions.get(unsupported);
        const label = res?.symbol ?? `${unsupported.slice(0, 6)}…${unsupported.slice(-4)}`;
        return `${label} route unavailable`;
      }
      return "One or more assets have no route";
    }
    if (!weightsValid)
      return `Weights must total 100% (currently ${(totalWeight / 100).toFixed(2)}%)`;
    return null;
  })();

  const createIndex = async () => {
    if (!contractAddresses.basketFactory || !address || !canCreate) return;
    setError(undefined);
    setHash(undefined);
    setCreatedBasket(undefined);
    setGasEstimate(undefined);
    try {
      const ready = await ensureRobinhoodChain();
      if (!ready) {
        setTxState("idle");
        return;
      }
      // Get a fresh wallet client after the chain switch — the hook-provided
      // walletClient may be null if the wallet was on a different chain.
      const client = walletClient ?? await getWalletClient(wagmiConfig, { chainId: robinhoodChain.id });
      if (!client) {
        throw new Error("Wallet client unavailable. Please refresh and try again.");
      }
      setTxState("simulating");
      const args = [
        name.trim(),
        symbol.trim().toUpperCase(),
        weights.map((entry) => entry.address),
        weights.map((entry) => entry.weightBps)
      ] as const;
      const simulation = await publicClient.simulateContract({
        account: address,
        address: contractAddresses.basketFactory,
        abi: basketFactoryAbi,
        functionName: "createBasket",
        args
      });
      const estimatedGas = await publicClient.estimateContractGas(simulation.request);
      setGasEstimate(estimatedGas);

      setTxState("signing");
      const txHash = await client.writeContract(simulation.request);
      setHash(txHash);
      setTxState("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const [createdEvent] = parseEventLogs({
        abi: basketFactoryAbi,
        eventName: "BasketCreated",
        logs: receipt.logs
      });
      const created = (createdEvent as { args?: { basket?: Address } } | undefined)?.args?.basket;
      if (created && isAddress(created)) {
        setCreatedBasket(created);
        router.push(`/basket/${created}`);
      }
      setTxState("confirmed");
    } catch (caught) {
      setTxState("error");
      setError(caught instanceof Error ? caught.message : "Transaction failed");
    }
  };

  return (
    <div className="create-grid">
      <section className="create-main">
        <div className="step-block">
          <p className="eyebrow">STEP 01</p>
          <h2>SELECT ASSETS</h2>
          <TokenSelector selected={selected} weights={weights} onChange={setSelected} />
        </div>
        <div className="step-block">
          <p className="eyebrow">STEP 02</p>
          <h2>SET WEIGHTS</h2>
          <WeightEditor weights={weights} onChange={setWeights} />
        </div>
        <div className="step-block">
          <p className="eyebrow">STEP 03</p>
          <h2>NAME IT</h2>
          <div className="form-grid">
            <label>
              <span>Index Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Robinhood Meme Index" />
            </label>
            <label>
              <span>Ticker</span>
              <input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="RMI" />
            </label>
          </div>
        </div>
      </section>

      <TransactionPanel title="REVIEW" state={txState} error={error} hash={hash}>
        <div className="review-list">
          <span>Assets</span>
          <strong>{selected.length || "—"}</strong>
          <span>Total</span>
          <strong>{(totalWeight / 100).toFixed(2)}%</strong>
          <span>Network</span>
          <strong>Robinhood Chain</strong>
          <span>Creator</span>
          <strong>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—"}</strong>
          <span>Gas</span>
          <strong>{gasEstimate ? gasEstimate.toLocaleString() : "—"}</strong>
        </div>
        {blockerMessage ? <p className="tx-error">{blockerMessage}</p> : null}
        <button
          className="button button-dark button-full"
          disabled={!canCreate || isPending}
          onClick={createIndex}
        >
          {wrongNetwork
            ? "WRONG NETWORK"
            : txState === "confirmed"
              ? "INDEX CREATED"
              : isSwitchingNetwork
                ? "SWITCHING"
                : "CREATE INDEX"}
        </button>
        {createdBasket ? (
          <div className="route-list">
            <span>INDEX LIVE</span>
            <p>
              <strong>{symbol.trim().toUpperCase()}</strong>
              <span>{createdBasket.slice(0, 6)}...{createdBasket.slice(-4)}</span>
            </p>
            <Link href={`/basket/${createdBasket}`} className="tx-link">
              View index
            </Link>
            <a href={blockscoutAddressUrl(createdBasket)} target="_blank" rel="noreferrer" className="tx-link">
              Blockscout ↗
            </a>
          </div>
        ) : null}
      </TransactionPanel>
    </div>
  );
}
