export default function DocsPage() {
  return (
    <div className="page compact-page">
      <section className="page-heading">
        <p className="eyebrow">DOCS</p>
        <h1>How Basket works.</h1>
        <p>Basket is permissionless index infrastructure for PONS tokens, deployed on Robinhood Chain.</p>
      </section>
      <div className="docs-grid">
        <div className="doc-link">
          <span>ARCHITECTURE</span>
          <strong>BasketVault holds components. BasketFactory deploys vaults. BasketRouter handles ETH routing.</strong>
        </div>
        <div className="doc-link">
          <span>PONS INTEGRATION</span>
          <strong>Only tokens launched via the PONS protocol are eligible as index components.</strong>
        </div>
        <div className="doc-link">
          <span>TRADING</span>
          <strong>Buy with ETH in one transaction. The PONS V3 adapter routes each component swap automatically.</strong>
        </div>
        <div className="doc-link">
          <span>WEIGHTS</span>
          <strong>Target weights are set at creation. Rebalancing is managed by depositors over time.</strong>
        </div>
        <div className="doc-link">
          <span>SECURITY</span>
          <strong>Contracts are non-upgradeable and deployed on Robinhood Chain. Audit forthcoming.</strong>
        </div>
      </div>
    </div>
  );
}
