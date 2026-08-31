import { CreateClient } from "./CreateClient";

export default function CreatePage() {
  return (
    <div className="page compact-page">
      <section className="page-heading">
        <p className="eyebrow">CREATE</p>
        <h1>Build an index.</h1>
        <p>Choose the assets. Set the weights. Own the basket.</p>
      </section>
      <CreateClient />
    </div>
  );
}
