import { CreateClient } from "./CreateClient";

export default function CreatePage() {
  return (
    <div className="page compact-page">
      <section className="page-heading">
        <p className="eyebrow">CREATE AN INDEX</p>
        <h1>Build your position.</h1>
        <p>Choose the pawns. Set the weights. Own the index.</p>
      </section>
      <CreateClient />
    </div>
  );
}
