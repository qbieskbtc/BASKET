"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { IndexRow } from "@/components/index/IndexRow";
import { getBasketSummaries, hasFactoryConfigured } from "@/lib/contracts/read";
import type { BasketSummary } from "@/lib/contracts/types";

export function IndexTable({ searchable = false }: { searchable?: boolean }) {
  const [baskets, setBaskets] = useState<BasketSummary[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getBasketSummaries()
      .then((result) => {
        if (active) setBaskets(result);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return baskets;
    return baskets.filter((basket) =>
      [basket.name, basket.symbol, basket.address, basket.creator].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [baskets, query]);

  if (!hasFactoryConfigured()) {
    return (
      <EmptyState title="LIVE FACTORY UNAVAILABLE">
        <h2>Unable to read indexes.</h2>
        <p>The live Robinhood Chain factory could not be loaded.</p>
      </EmptyState>
    );
  }

  return (
    <section className="index-table-section">
      {searchable ? (
        <input
          className="search-input"
          placeholder="Search name, ticker, address"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      <div className="index-table">
        <div className="index-row index-head">
          <span>INDEX</span>
          <span>COMPONENTS</span>
          <span>CREATED</span>
          <span>CREATOR</span>
        </div>
        {isLoading ? <div className="table-message">Reading Robinhood Chain</div> : null}
        {!isLoading && filtered.length === 0 ? (
          <EmptyState title="NO INDEXES YET">
            <h2>No indexes yet.</h2>
            <p>Create the first onchain index on Robinhood Chain.</p>
          </EmptyState>
        ) : null}
        {filtered.map((basket) => (
          <IndexRow key={basket.address} basket={basket} />
        ))}
      </div>
    </section>
  );
}
