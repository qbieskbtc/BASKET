export default function DocsPage() {
  return (
    <div className="page compact-page">
      <section className="page-heading">
        <p className="eyebrow">DOCS</p>
        <h1>Build the market you want to own.</h1>
      </section>
      <div className="docs-grid">
        <div className="doc-link">
          <span>ACCOUNTING</span>
          <strong>Proportional deposits and raw component redemptions.</strong>
        </div>
        <div className="doc-link">
          <span>ROUTER</span>
          <strong>One-click ETH routing without weakening vault accounting.</strong>
        </div>
        <div className="doc-link">
          <span>AUDIT</span>
          <strong>Adversarial Phase 1 findings and invariant coverage.</strong>
        </div>
        <div className="doc-link">
          <span>DEPLOYMENT</span>
          <strong>Deployment configuration and verification checklist.</strong>
        </div>
        <div className="doc-link">
          <span>E2E</span>
          <strong>Lifecycle test plan and transaction record.</strong>
        </div>
      </div>
    </div>
  );
}
