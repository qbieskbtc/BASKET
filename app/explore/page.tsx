import { IndexTable } from "@/components/index/IndexTable";

export default function ExplorePage() {
  return (
    <div className="page compact-page">
      <section className="page-heading">
        <p className="eyebrow">EXPLORE</p>
        <h1>Indexes, created by anyone.</h1>
      </section>
      <IndexTable searchable />
    </div>
  );
}

