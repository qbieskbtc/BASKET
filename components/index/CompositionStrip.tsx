type Segment = {
  label: string;
  weightBps: number;
};

const shades = ["#0b0b0a", "#3b3935", "#625f58", "#8c877e", "#b8b1a6", "#d6d0c7"];

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
            background: shades[index % shades.length]
          }}
          title={`${segment.label} ${(segment.weightBps / 100).toFixed(2)}%`}
        />
      ))}
    </div>
  );
}

