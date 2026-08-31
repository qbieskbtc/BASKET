import { IndexTable } from "@/components/index/IndexTable";

export default function ExplorePage() {
  return (
    <div className="page compact-page">
      <section className="page-heading">
        <p className="eyebrow">EXPLORE</p>
        <h1>PONS indexes, built by anyone.</h1>
        <p>Every index below is composed exclusively of PONS-launched tokens on Robinhood Chain.</p>
      </section>
      <IndexTable searchable />
    </div>
  );
}
