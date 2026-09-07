import { IndexTable } from "@/components/index/IndexTable";

export default function ExplorePage() {
  return (
    <div className="page compact-page">
      <section className="page-heading">
        <p className="eyebrow">EXPLORE</p>
        <h1>Indexes built onchain.</h1>
        <p>Every index below is composed exclusively of PONS-launched tokens on Robinhood Chain.</p>
      </section>
      <div className="pawn-featured-token">
        <div className="pawn-featured-left">
          <span className="pawn-featured-live" />
          <span className="pawn-featured-name">$PAWN</span>
          <span className="pawn-featured-sep">—</span>
          <span className="pawn-featured-desc">Official token, live on PONS · Robinhood Chain</span>
        </div>
        <a
          href="https://robinhoodchain.blockscout.com/token/0xedD3132FB9aC24438e066B767E16638E22236036"
          target="_blank"
          rel="noopener noreferrer"
          className="pawn-featured-link address-link"
        >
          0xedD3132FB9aC24438e066B767E16638E22236036 ↗
        </a>
      </div>
      <IndexTable searchable />
    </div>
  );
}
