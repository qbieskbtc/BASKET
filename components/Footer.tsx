import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="footer-inner">
          <div className="footer-left">
            <span className="footer-brand">Pawn</span>
            <span className="footer-tagline">Permissionless indexes on Robinhood Chain.</span>
          </div>
          <div className="footer-right">
            <span>Powered by</span>
            <a href="https://pons.fun" target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
              PONS Protocol
            </a>
            <span style={{ color: "var(--hairline-strong)" }}>·</span>
            <Link href="/docs">Docs</Link>
            <span style={{ color: "var(--hairline-strong)" }}>·</span>
            <Link href="/explore">Explore</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
