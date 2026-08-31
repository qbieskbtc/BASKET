type Segment = {
  label: string;
  weightBps: number;
};

const COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6"
];

export function CompositionStrip({ segments }: { segments: Segment[] }) {
  if (segments.length === 0) return <div className="composition-strip composition-empty" />;

  return (
    <div className="composition-strip" aria-label="Index composition">
      {segments.map((segment, index) => (
        <span
          key={`${segment.label}-${index}`}
          className="composition-segment"
          style={{
            width: `${segment.weightBps / 100}%`,
            background: COLORS[index % COLORS.length]
          }}
          title={`${segment.label} ${(segment.weightBps / 100).toFixed(2)}%`}
        />
      ))}
    </div>
  );
}
