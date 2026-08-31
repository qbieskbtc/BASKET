import Link from "next/link";
import { IndexTable } from "@/components/index/IndexTable";

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-eyebrow-row">
          <p className="eyebrow" style={{ margin: 0 }}>BASKET — PONS INDEX PROTOCOL</p>
          <span className="nav-chain">ROBINHOOD CHAIN</span>
        </div>
        <h1>Own the whole<br />PONS ecosystem.</h1>
        <p>
          Basket is permissionless index infrastructure built exclusively for PONS-launched tokens.
          Create a basket of any PONS tokens and trade the whole thing with a single ETH transaction.
        </p>
        <div className="hero-actions">
          <Link href="/explore" className="button button-dark">EXPLORE INDEXES</Link>
          <Link href="/create" className="button button-light">CREATE AN INDEX</Link>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-grid">
          <div className="feature-card">
            <p className="feature-label">PONS TOKENS ONLY</p>
            <p>Every index is built exclusively from tokens launched on the PONS protocol. Pure, curated ecosystem exposure — no outside tokens.</p>
          </div>
          <div className="feature-card">
            <p className="feature-label">ONE TRANSACTION</p>
            <p>Buy or sell any index with ETH. The PONS router handles all component swaps automatically in a single onchain call.</p>
          </div>
          <div className="feature-card">
            <p className="feature-label">FULLY PERMISSIONLESS</p>
            <p>Anyone can create an index onchain. Pick your PONS tokens, set your weights, name it — and it lives on Robinhood Chain forever.</p>
          </div>
        </div>
      </section>

      <section className="live-section">
        <div className="section-head">
          <p className="eyebrow">LIVE INDEXES</p>
        </div>
        <IndexTable />
      </section>
    </div>
  );
}
