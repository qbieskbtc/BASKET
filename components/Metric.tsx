import { dash } from "@/lib/format";

export function Metric({ label, value = dash }: { label: string; value?: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

