"use client";

import { useEffect, useMemo, useState } from "react";
import { isAddress, type Address } from "viem";
import type { WeightEntry } from "@/components/create/WeightEditor";
import type { PonsToken, TokenResolution } from "@/lib/contracts/types";
import { discoverPonsTokens, resolveToken } from "@/lib/pons/discovery";
import { shortenAddress } from "@/lib/format";

export function TokenSelector({
  selected,
  weights,
  onChange
}: {
  selected: Address[];
  weights: WeightEntry[];
  onChange: (tokens: Address[]) => void;
}) {
  const [tokens, setTokens] = useState<PonsToken[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [resolved, setResolved] = useState<TokenResolution>();

  useEffect(() => {
    let active = true;
    discoverPonsTokens()
      .then((result) => {
        if (active) setTokens(result);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    if (!isAddress(normalized)) {
      setResolved(undefined);
      setIsResolving(false);
      return;
    }

    let active = true;
    setIsResolving(true);
    const timeout = window.setTimeout(() => {
      resolveToken(normalized)
        .then((result) => {
          if (active) setResolved(result);
        })
        .finally(() => {
          if (active) setIsResolving(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized || isAddress(normalized)) return tokens;
    return tokens.filter((token) =>
      [token.name, token.symbol, token.token].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query, tokens]);

  const tokenLabels = useMemo(() => {
    const labels = new Map<Address, { name: string; symbol: string }>();
    for (const token of tokens) labels.set(token.token, { name: token.name, symbol: token.symbol });
    if (resolved?.validErc20 && resolved.name && resolved.symbol) {
      labels.set(resolved.address, { name: resolved.name, symbol: resolved.symbol });
    }
    return labels;
  }, [resolved, tokens]);

  const add = (token: Address) => {
    if (selected.includes(token) || selected.length >= 10) return;
    onChange([...selected, token]);
  };

  const remove = (token: Address) => {
    onChange(selected.filter((value) => value !== token));
  };

  return (
    <div className="selector">
      <input
        className="search-input"
        placeholder="Search ticker, name, or paste contract address"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {isResolving ? <div className="token-result table-message">Validating token contract</div> : null}
      {resolved ? (
        <div className={`token-result ${resolved.validErc20 ? "token-result-good" : "token-result-bad"}`}>
          <p className="eyebrow">{resolved.validErc20 ? "TOKEN FOUND" : "INVALID TOKEN CONTRACT"}</p>
          <div>
            <strong>{resolved.symbol ? `$${resolved.symbol}` : "Unknown token"}</strong>
            <small>{resolved.name ?? resolved.reasonUnsupported}</small>
          </div>
          <span>{shortenAddress(resolved.address)}</span>
          <span>{resolved.knownPonsToken ? `Pons ${resolved.ponsVersion}` : "Valid Robinhood Chain token"}</span>
          <span>{resolved.swapSupported ? "Route available" : resolved.reasonUnsupported}</span>
          <button
            type="button"
            className="button button-dark"
            disabled={!resolved.validErc20 || !resolved.swapSupported || selected.includes(resolved.address)}
            onClick={() => add(resolved.address)}
          >
            {selected.includes(resolved.address) ? "ADDED" : resolved.swapSupported ? "ADD TO INDEX" : "ROUTE REQUIRED"}
          </button>
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="selected-stack">
          {weights.map((entry) => {
            const label = tokenLabels.get(entry.address);
            return (
              <button type="button" key={entry.address} onClick={() => remove(entry.address)}>
                <span>
                  <strong>{label?.symbol ?? shortenAddress(entry.address)}</strong>
                  <small>{shortenAddress(entry.address)}</small>
                </span>
                <span>{(entry.weightBps / 100).toFixed(0)}%</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="selector-tabs">
        <span>RECENT PONS TOKENS</span>
      </div>
      <div className="token-list">
        {isLoading ? <div className="table-message">Discovering Pons launches</div> : null}
        {!isLoading && filtered.length === 0 ? (
          <div className="table-message">No recent Pons tokens match this search. Paste any contract address to inspect it.</div>
        ) : null}
        {filtered.map((token) => {
          const active = selected.includes(token.token);
          return (
            <div key={`${token.ponsVersion}-${token.token}`} className={`token-row ${active ? "token-row-active" : ""}`}>
              <span className="token-dot">{token.symbol.slice(0, 1)}</span>
              <span>
                <strong>{token.name}</strong>
                <small>${token.symbol}</small>
              </span>
              <span>{token.ponsVersion}</span>
              <span className={token.swapSupported ? "route-good" : "route-muted"}>
                {token.swapSupported ? "ROUTABLE" : token.graduated ? "GRADUATED" : "ROUTE PENDING"}
              </span>
              <button type="button" className="button button-light" disabled={active || !token.swapSupported} onClick={() => add(token.token)}>
                {active ? "ADDED" : token.swapSupported ? "ADD" : "PENDING"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
