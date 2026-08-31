import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="footer-inner">
          <div className="footer-left">
            <span className="footer-brand">BASKET</span>
            <span className="footer-tagline">Permissionless index funds for PONS tokens.</span>
          </div>
          <div className="footer-right">
            <span>Powered by</span>
            <a href="https://pons.fun" target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
              PONS Protocol
            </a>
            <span style={{ color: "var(--hairline-strong)" }}>·</span>
            <span>Robinhood Chain</span>
            <span style={{ color: "var(--hairline-strong)" }}>·</span>
            <Link href="/docs">Docs</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
