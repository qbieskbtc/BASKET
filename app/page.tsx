import Link from "next/link";
import { IndexTable } from "@/components/index/IndexTable";

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">ONCHAIN INDEXES FOR EVERYTHING</p>
        <h1>Own the whole idea.</h1>
        <p>Create and invest in permissionless onchain indexes.</p>
        <div className="hero-actions">
          <Link href="/explore" className="button button-dark">
            EXPLORE BASKETS
          </Link>
          <Link href="/create" className="button button-light">
            CREATE AN INDEX
          </Link>
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

