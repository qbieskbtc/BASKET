import { CreateClient } from "./CreateClient";

export default function CreatePage() {
  return (
    <div className="page compact-page">
      <section className="page-heading">
        <p className="eyebrow">CREATE AN INDEX</p>
        <h1>Build a PONS index.</h1>
        <p>Choose any PONS-launched tokens, set their weights, and deploy an onchain index fund in minutes. Only tokens from the PONS protocol on Robinhood Chain are supported.</p>
      </section>
      <CreateClient />
    </div>
  );
}
