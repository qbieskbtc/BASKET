import Link from "next/link";
import { IndexTable } from "@/components/index/IndexTable";

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">PERMISSIONLESS ONCHAIN INDEXES</p>
        <h1>Every pawn<br />builds the king.</h1>
        <p>Build and own indexes of the markets you believe in.</p>
        <div className="hero-actions">
          <Link href="/explore" className="button button-dark">EXPLORE INDEXES</Link>
          <Link href="/create" className="button button-light">CREATE AN INDEX</Link>
        </div>
      </section>

      <section className="pawn-token-section">
        <div className="pawn-token-inner">
          <div className="pawn-token-text">
            <p className="eyebrow">OFFICIAL TOKEN — LIVE NOW ON ROBINHOOD CHAIN</p>
            <h2>$PAWN is live.</h2>
            <p>The native token of the Pawn ecosystem, launched on PONS. Trade it, hold it, or build an index around it.</p>
            <div className="pawn-address-row">
              <span className="pawn-address-label">CONTRACT</span>
              <a
                href="https://robinhoodchain.blockscout.com/token/0xedD3132FB9aC24438e066B767E16638E22236036"
                target="_blank"
                rel="noopener noreferrer"
                className="pawn-address-value address-link"
              >
                0xedD3132FB9aC24438e066B767E16638E22236036
              </a>
            </div>
          </div>
          <div className="pawn-token-actions">
            <a
              href="https://robinhoodchain.blockscout.com/token/0xedD3132FB9aC24438e066B767E16638E22236036"
              target="_blank"
              rel="noopener noreferrer"
              className="button button-dark"
            >
              VIEW $PAWN ↗
            </a>
            <Link href="/create" className="button button-light">BUILD AN INDEX</Link>
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-grid">
          <div className="feature-card">
            <p className="feature-label">PONS TOKENS ONLY</p>
            <p>Every index is built from tokens launched on the PONS protocol. Pure ecosystem exposure — no outside assets.</p>
          </div>
          <div className="feature-card">
            <p className="feature-label">ONE TRANSACTION</p>
            <p>Buy or sell any index with ETH. The PONS router handles all component swaps in a single onchain call.</p>
          </div>
          <div className="feature-card">
            <p className="feature-label">FULLY PERMISSIONLESS</p>
            <p>Anyone can create an index. Pick your pawns, set the weights — it lives on Robinhood Chain forever.</p>
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
