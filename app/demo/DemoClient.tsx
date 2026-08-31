"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// ─── Token data ───────────────────────────────────────────────────────────────

const TOKENS = [
  { symbol: "RHOOD", name: "Robinhood Coin",   weight: 30, color: "#22c55e" },
  { symbol: "PEPE",  name: "Pepe Token",        weight: 25, color: "#3b82f6" },
  { symbol: "DEGEN", name: "Degen Finance",     weight: 20, color: "#f59e0b" },
  { symbol: "MOON",  name: "MoonShot",          weight: 15, color: "#ef4444" },
  { symbol: "CHAD",  name: "Chad Coin",         weight: 10, color: "#8b5cf6" },
];

const EXPLORE_ROWS = [
  { symbol: "RHDX",  name: "Robinhood Diversified Index", tokens: ["RHOOD","PEPE","DEGEN","MOON","CHAD"], supply: "12,400" },
  { symbol: "PONS3", name: "PONS Top 3",                  tokens: ["RHOOD","PEPE","DEGEN"],               supply:  "8,200" },
  { symbol: "MEME",  name: "Meme Season",                 tokens: ["PEPE","CHAD","MOON"],                 supply:  "4,100" },
  { symbol: "BCC",   name: "Blue Chip Chain",             tokens: ["RHOOD","DEGEN"],                      supply:  "2,800" },
];

// ─── Timeline ─────────────────────────────────────────────────────────────────
// phase: [phase number, ms from play start]
const TIMELINE: [number, number][] = [
  [1,  300],   // logo fades in
  [2,  1000],  // "Build a market." appears
  [3,  2300],  // → "Own the whole idea."
  [4,  4000],  // selector panel
  [5,  4600],  // token 1 selected
  [6,  5100],  // token 2
  [7,  5600],  // token 3
  [8,  6000],  // token 4
  [9,  6400],  // token 5
  [10, 7000],  // weight editor
  [11, 8800],  // create button scene
  [12, 9400],  // cursor starts moving
  [13, 10000], // cursor clicks / button depresses
  [14, 10500], // processing scene
  [15, 12500], // index page revealed
  [16, 15500], // buy panel focused
  [17, 16200], // "0.10" typed in
  [18, 17500], // BUY clicked
  [19, 18000], // confirmed
  [20, 18800], // explore page
  [21, 21200], // end card
  [22, 21800], // tagline appears
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

type CSSVars = React.CSSProperties & Record<string, string | number>;

function fade(
  visible: boolean,
  delayMs = 0,
  durationMs = 380,
): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.98)",
    transition: `opacity ${durationMs}ms ease ${delayMs}ms, transform ${durationMs}ms ease ${delayMs}ms`,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PawnLogo({ size = 48 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/pawn-logo.png"
      alt=""
      style={{ width: size, height: size, objectFit: "contain", mixBlendMode: "multiply" }}
    />
  );
}

function CursorSVG() {
  return (
    <svg width="22" height="29" viewBox="0 0 22 29" fill="none">
      <path
        d="M2 2L2 24L7.5 18.5L12 27.5L14.5 26.3L10 17H18L2 2Z"
        fill="#0f0e0c"
        stroke="#f4f1ea"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DemoClient() {
  const searchParams = useSearchParams();
  const isRecording = searchParams.get("recording") === "true";

  const [scale, setScale] = useState(1);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasAutoplayed = useRef(false);

  // Scale 1920×1080 canvas to fill viewport
  useEffect(() => {
    const update = () =>
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Lock body scroll while demo is mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const play = useCallback(() => {
    clearAll();
    setPhase(0);
    setPlaying(true);
    TIMELINE.forEach(([p, ms]) => {
      timeoutsRef.current.push(setTimeout(() => setPhase(p), ms));
    });
    timeoutsRef.current.push(setTimeout(() => setPlaying(false), 24000));
  }, [clearAll]);

  const restart = useCallback(() => {
    clearAll();
    setPhase(0);
    setPlaying(false);
    requestAnimationFrame(() => play());
  }, [clearAll, play]);

  // Autoplay when ?recording=true
  useEffect(() => {
    if (isRecording && !hasAutoplayed.current) {
      hasAutoplayed.current = true;
      const t = setTimeout(play, 500);
      return () => clearTimeout(t);
    }
  }, [isRecording, play]);

  // Cleanup on unmount
  useEffect(() => () => clearAll(), [clearAll]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const tokensSelected = Math.max(0, Math.min(5, phase - 4)); // 0-5
  const inHero      = phase >= 1  && phase <= 3;
  const inSelector  = phase >= 4  && phase <= 9;
  const inWeights   = phase === 10;
  const inCreate    = phase >= 11 && phase <= 13;
  const inProcess   = phase === 14;
  const inIndexPage = phase >= 15 && phase <= 19;
  const inExplore   = phase === 20;
  const inEndCard   = phase >= 21;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes pawnsAssemble {
          from { opacity: 0; transform-origin: left; transform: scaleX(0); }
          to   { opacity: 1; transform-origin: left; transform: scaleX(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes confirmPop {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes subtlePulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1;   }
        }
      `}</style>

      {/* ── Full-viewport overlay ─────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#0f0e0c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* ── 1920×1080 canvas ──────────────────────────────────────────── */}
        <div
          style={{
            width: 1920,
            height: 1080,
            background: "#f4f1ea",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {/* ════════════════════════════════════════════════════════════════
              SCENES 1 + 2 — Hero copy
          ════════════════════════════════════════════════════════════════ */}
          {inHero && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 44,
              }}
            >
              {/* Logo */}
              <div style={fade(phase >= 1)}>
                <PawnLogo size={54} />
              </div>

              {/* Text container */}
              <div style={{ position: "relative", height: 96 }}>
                {/* "Build a market." */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...fade(phase === 2),
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 76,
                      fontWeight: 800,
                      letterSpacing: "-0.025em",
                      color: "#0f0e0c",
                      lineHeight: 1,
                    }}
                  >
                    Build a market.
                  </span>
                </div>

                {/* "Own the whole idea." */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...fade(phase === 3),
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 76,
                      fontWeight: 800,
                      letterSpacing: "-0.025em",
                      color: "#0f0e0c",
                      lineHeight: 1,
                    }}
                  >
                    Own the whole idea.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SCENE 3 — Asset selector
          ════════════════════════════════════════════════════════════════ */}
          {inSelector && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...fade(phase >= 4),
              }}
            >
              <div
                style={{
                  width: 740,
                  background: "#ffffff",
                  border: "1px solid #e4e0d6",
                }}
              >
                {/* Panel header */}
                <div style={{ padding: "28px 32px 0" }}>
                  <p
                    style={{
                      margin: "0 0 14px",
                      fontSize: 10,
                      fontWeight: 750,
                      letterSpacing: "0.14em",
                      color: "#6e6b62",
                    }}
                  >
                    SELECT PAWNS
                  </p>
                  {/* Search field */}
                  <div
                    style={{
                      border: "1px solid #0f0e0c",
                      padding: "15px 18px",
                      fontSize: 15,
                      color: "#6e6b62",
                      background: "#f4f1ea",
                      marginBottom: 4,
                    }}
                  >
                    Search ticker, name, or paste contract address
                  </div>
                </div>

                {/* Token rows */}
                <div style={{ padding: "0 0 8px" }}>
                  {TOKENS.map((token, i) => (
                    <div
                      key={token.symbol}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "52px 1fr auto",
                        alignItems: "center",
                        gap: 0,
                        minHeight: 68,
                        borderBottom: "1px solid #e4e0d6",
                        padding: "0 32px 0 20px",
                        opacity: i < tokensSelected ? 1 : 0,
                        transform: i < tokensSelected ? "translateY(0)" : "translateY(6px)",
                        transition: "opacity 0.28s ease, transform 0.28s ease",
                        background: i < tokensSelected ? "rgba(11,11,10,0.03)" : "transparent",
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          border: "1px solid #ccc8bd",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#0f0e0c",
                          background: "#f4f1ea",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {token.symbol.slice(0, 2)}
                      </div>

                      {/* Name */}
                      <div>
                        <div style={{ fontWeight: 650, fontSize: 15, color: "#0f0e0c" }}>
                          {token.symbol}
                        </div>
                        <div style={{ fontSize: 12, color: "#6e6b62", marginTop: 2 }}>
                          {token.name}
                        </div>
                      </div>

                      {/* Checkbox */}
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          border: `1px solid ${i < tokensSelected ? "#0f0e0c" : "#ccc8bd"}`,
                          borderRadius: 3,
                          background: i < tokensSelected ? "#0f0e0c" : "transparent",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {i < tokensSelected && (
                          <span style={{ color: "#f4f1ea", fontSize: 11, lineHeight: 1 }}>✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SCENE 4 — Weight editor
          ════════════════════════════════════════════════════════════════ */}
          {inWeights && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...fade(phase >= 10),
              }}
            >
              <div style={{ width: 700 }}>
                <p
                  style={{
                    margin: "0 0 32px",
                    fontSize: 10,
                    fontWeight: 750,
                    letterSpacing: "0.14em",
                    color: "#6e6b62",
                  }}
                >
                  YOUR PAWNS — SET WEIGHTS
                </p>

                {TOKENS.map((token, i) => (
                  <div
                    key={token.symbol}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 200px 72px",
                      alignItems: "center",
                      gap: 28,
                      minHeight: 68,
                      borderBottom: "1px solid #e4e0d6",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 650, fontSize: 16, color: "#0f0e0c" }}>
                        {token.symbol}
                      </div>
                      <div style={{ fontSize: 12, color: "#6e6b62", marginTop: 2 }}>
                        {token.name}
                      </div>
                    </div>

                    {/* Bar */}
                    <div
                      style={{
                        height: 3,
                        background: "#e4e0d6",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${token.weight}%`,
                          background: token.color,
                          transition: "width 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#0f0e0c",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {token.weight}%
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 24,
                    fontSize: 11,
                    fontWeight: 750,
                    letterSpacing: "0.12em",
                    color: "#6e6b62",
                  }}
                >
                  <span>TOTAL</span>
                  <span style={{ color: "#0f0e0c" }}>100%</span>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SCENE 5 — Create button + cursor
          ════════════════════════════════════════════════════════════════ */}
          {inCreate && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Button */}
              <div style={{ textAlign: "center", ...fade(phase >= 11) }}>
                <p
                  style={{
                    margin: "0 0 40px",
                    fontSize: 10,
                    fontWeight: 750,
                    letterSpacing: "0.14em",
                    color: "#6e6b62",
                  }}
                >
                  READY TO DEPLOY
                </p>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 360,
                    height: 68,
                    background: phase >= 13 ? "#2a2a28" : "#0f0e0c",
                    color: "#f4f1ea",
                    border: "1px solid #0f0e0c",
                    fontSize: 17,
                    fontWeight: 750,
                    letterSpacing: "0.1em",
                    transform: phase >= 13 ? "scale(0.975)" : "scale(1)",
                    transition: "transform 0.12s ease, background 0.12s ease",
                    userSelect: "none",
                  }}
                >
                  {phase >= 13 ? "CREATING INDEX…" : "CREATE INDEX"}
                </div>
              </div>

              {/* Cursor */}
              {phase >= 12 && (
                <div
                  style={{
                    position: "absolute",
                    left: 960,
                    top: 556,
                    transform: phase >= 13
                      ? "translate(-50%, -50%) scale(0.85)"
                      : "translate(160px, 100px) scale(1)",
                    transition: "transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  <CursorSVG />
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SCENE 6 — Processing
          ════════════════════════════════════════════════════════════════ */}
          {inProcess && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 52,
                ...fade(phase >= 14),
              }}
            >
              <div
                style={{
                  animation: "subtlePulse 1.4s ease infinite",
                }}
              >
                <PawnLogo size={52} />
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  color: "#6e6b62",
                  letterSpacing: "0.02em",
                }}
              >
                Putting the pawns together…
              </p>

              {/* Assembling segments — Pawn-specific loading */}
              <div style={{ display: "flex", gap: 8 }}>
                {TOKENS.map((token, i) => (
                  <div
                    key={token.symbol}
                    style={{
                      height: 4,
                      width: 72,
                      background: token.color,
                      borderRadius: 2,
                      opacity: 0,
                      animation: `pawnsAssemble 0.5s ease ${i * 0.28}s forwards`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SCENES 7 + 8 — Index page
          ════════════════════════════════════════════════════════════════ */}
          {inIndexPage && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: "0 96px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  padding: "44px 0 28px",
                  borderBottom: "1px solid #e4e0d6",
                  ...fade(phase >= 15),
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 10,
                      fontWeight: 750,
                      letterSpacing: "0.14em",
                      color: "#6e6b62",
                    }}
                  >
                    INDEX
                  </p>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 52,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      color: "#0f0e0c",
                      lineHeight: 1,
                    }}
                  >
                    RHDX
                  </h1>
                  <div style={{ color: "#6e6b62", fontSize: 14, marginTop: 5 }}>
                    Robinhood Diversified Index
                  </div>
                </div>

                {/* Stats strip */}
                <div style={{ display: "flex", border: "1px solid #e4e0d6" }}>
                  {[
                    { label: "NAV / SHARE",  value: "0.001847 ETH" },
                    { label: "SUPPLY",        value: "12,400"       },
                    { label: "COMPONENTS",    value: "5"            },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      style={{
                        padding: "12px 24px",
                        borderRight: i < 2 ? "1px solid #e4e0d6" : "none",
                        ...fade(phase >= 15, i * 80),
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 750,
                          letterSpacing: "0.12em",
                          color: "#6e6b62",
                          marginBottom: 6,
                        }}
                      >
                        {stat.label}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 650, color: "#0f0e0c" }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 360px",
                  gap: 48,
                  paddingTop: 32,
                  flex: 1,
                }}
              >
                {/* LEFT: Composition */}
                <div style={fade(phase >= 15, 100)}>
                  {/* Color bar */}
                  <div style={{ display: "flex", height: 8, marginBottom: 28 }}>
                    {TOKENS.map((t) => (
                      <div
                        key={t.symbol}
                        style={{
                          flex: t.weight,
                          background: t.color,
                          transition: "flex 0.6s ease",
                        }}
                      />
                    ))}
                  </div>

                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 10,
                      fontWeight: 750,
                      letterSpacing: "0.14em",
                      color: "#6e6b62",
                    }}
                  >
                    INDEX COMPOSITION
                  </p>

                  {/* Composition rows */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1.4fr",
                      fontSize: 10,
                      fontWeight: 750,
                      letterSpacing: "0.12em",
                      color: "#6e6b62",
                      minHeight: 36,
                      alignItems: "center",
                      borderBottom: "1px solid #e4e0d6",
                    }}
                  >
                    <span>ASSET</span>
                    <span>TARGET</span>
                    <span>BALANCE</span>
                    <span>ADDRESS</span>
                  </div>

                  {TOKENS.map((token, i) => (
                    <div
                      key={token.symbol}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1.4fr",
                        alignItems: "center",
                        gap: 0,
                        minHeight: 58,
                        borderBottom: "1px solid #e4e0d6",
                        fontSize: 13,
                        color: "#6e6b62",
                        animation: `slideIn 0.35s ease ${100 + i * 80}ms both`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: token.color,
                            flexShrink: 0,
                          }}
                        />
                        <strong style={{ color: "#0f0e0c", fontSize: 15, fontWeight: 650 }}>
                          {token.symbol}
                        </strong>
                        <span style={{ fontSize: 13 }}>{token.name}</span>
                      </div>
                      <span>{token.weight}%</span>
                      <span>—</span>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "#b5924c",
                          textDecoration: "underline",
                          textDecorationColor: "rgba(181,146,76,0.4)",
                          textUnderlineOffset: 3,
                        }}
                      >
                        0x71a3…f9c2
                      </span>
                    </div>
                  ))}
                </div>

                {/* RIGHT: Trade panel */}
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    paddingTop: 0,
                    alignContent: "start",
                    ...fade(phase >= 15, 180),
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingBottom: 2,
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 15,
                        letterSpacing: "0.06em",
                        color: "#0f0e0c",
                        fontWeight: 750,
                      }}
                    >
                      TRADE
                    </h2>
                    <span
                      style={{ fontSize: 10, color: "#b5924c", fontFamily: "monospace" }}
                    >
                      0x8f2a…d19e
                    </span>
                  </div>

                  {/* Tabs */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      border: "1px solid #e4e0d6",
                    }}
                  >
                    <button
                      style={{
                        minHeight: 36,
                        border: "none",
                        borderRight: "1px solid #e4e0d6",
                        background: "#0f0e0c",
                        color: "#f4f1ea",
                        fontSize: 11,
                        fontWeight: 750,
                        letterSpacing: "0.12em",
                        cursor: "default",
                      }}
                    >
                      BUY
                    </button>
                    <button
                      style={{
                        minHeight: 36,
                        border: "none",
                        background: "transparent",
                        color: "#6e6b62",
                        fontSize: 11,
                        fontWeight: 750,
                        letterSpacing: "0.12em",
                        cursor: "default",
                      }}
                    >
                      SELL
                    </button>
                  </div>

                  {/* ETH input */}
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 750,
                        letterSpacing: "0.12em",
                        color: "#6e6b62",
                        marginBottom: 8,
                      }}
                    >
                      YOU PAY (ETH)
                    </div>
                    <div
                      style={{
                        border: `1px solid ${phase >= 16 ? "#0f0e0c" : "#e4e0d6"}`,
                        padding: "13px 18px",
                        fontSize: 26,
                        fontWeight: 600,
                        color: "#0f0e0c",
                        background: "#f4f1ea",
                        fontVariantNumeric: "tabular-nums",
                        transition: "border-color 0.3s ease",
                      }}
                    >
                      {phase >= 17 ? "0.10" : phase >= 16 ? "0." : "0"}
                    </div>
                  </div>

                  {/* Quote box */}
                  <div
                    style={{
                      padding: 14,
                      border: "1px solid #e4e0d6",
                      background: "#ffffff",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: "#6e6b62",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <span>Est. shares out</span>
                      <strong style={{ color: "#0f0e0c" }}>
                        {phase >= 17 ? "54.12" : "—"}
                      </strong>
                    </div>

                    {/* Confirmed state */}
                    {phase >= 19 && (
                      <div
                        style={{
                          paddingTop: 10,
                          borderTop: "1px solid #e4e0d6",
                          fontSize: 13,
                          color: "#b5924c",
                          fontWeight: 750,
                          letterSpacing: "0.04em",
                          animation: "confirmPop 0.4s ease forwards",
                        }}
                      >
                        INDEX SHARES RECEIVED ✓
                      </div>
                    )}
                  </div>

                  {/* Slippage */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 10,
                      fontWeight: 750,
                      letterSpacing: "0.12em",
                      color: "#6e6b62",
                    }}
                  >
                    <span>SLIPPAGE</span>
                    {["0.5%", "1%", "2%"].map((s) => (
                      <div
                        key={s}
                        style={{
                          padding: "3px 10px",
                          border: `1px solid ${s === "1%" ? "#0f0e0c" : "#ccc8bd"}`,
                          fontSize: 10,
                          color: s === "1%" ? "#0f0e0c" : "#6e6b62",
                          fontWeight: 750,
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>

                  {/* Buy button */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      minHeight: 52,
                      background: phase >= 19 ? "#0f6b2d" : "#15803d",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 750,
                      letterSpacing: "0.08em",
                      transform: phase === 18 ? "scale(0.97)" : "scale(1)",
                      transition: "transform 0.12s ease, background 0.2s ease",
                      userSelect: "none",
                    }}
                  >
                    {phase >= 19 ? "CONFIRMED" : phase >= 18 ? "CONFIRMING…" : "BUY INDEX"}
                  </div>

                  {/* Status */}
                  <div style={{ fontSize: 11, color: "#6e6b62", minHeight: 16 }}>
                    {phase >= 19 && (
                      <span style={{ color: "#b5924c" }}>
                        Transaction confirmed on Robinhood Chain
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SCENE 9 — Explore page
          ════════════════════════════════════════════════════════════════ */}
          {inExplore && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: "72px 96px",
                ...fade(phase >= 20),
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 10,
                  fontWeight: 750,
                  letterSpacing: "0.14em",
                  color: "#6e6b62",
                }}
              >
                EXPLORE
              </p>
              <h2
                style={{
                  margin: "0 0 48px",
                  fontSize: 62,
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  color: "#0f0e0c",
                  lineHeight: 0.95,
                }}
              >
                Indexes built onchain.
              </h2>

              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2.2fr 0.8fr 1fr",
                  gap: 24,
                  minHeight: 40,
                  borderBottom: "1px solid #e4e0d6",
                  fontSize: 10,
                  fontWeight: 750,
                  letterSpacing: "0.12em",
                  color: "#6e6b62",
                  alignItems: "center",
                }}
              >
                <span>INDEX</span>
                <span>COMPOSITION</span>
                <span>SUPPLY</span>
                <span>CREATOR</span>
              </div>

              {EXPLORE_ROWS.map((row, i) => (
                <div
                  key={row.symbol}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2.2fr 0.8fr 1fr",
                    gap: 24,
                    minHeight: 86,
                    borderBottom: "1px solid #e4e0d6",
                    alignItems: "center",
                    animation: `slideIn 0.38s ease ${i * 110}ms both`,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 650,
                        fontSize: 20,
                        color: "#0f0e0c",
                        lineHeight: 1,
                      }}
                    >
                      {row.symbol}
                    </div>
                    <div style={{ fontSize: 13, color: "#6e6b62", marginTop: 4 }}>
                      {row.name}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {row.tokens.map((t) => (
                      <span
                        key={t}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          height: 22,
                          padding: "0 9px",
                          border: "1px solid #e4e0d6",
                          borderRadius: 100,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#0f0e0c",
                          background: "#ffffff",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      fontSize: 15,
                      color: "#0f0e0c",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {row.supply}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#6e6b62",
                      fontFamily: "monospace",
                    }}
                  >
                    0x{row.symbol.toLowerCase().slice(0, 4)}…c3f1
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SCENE 10 — End card
          ════════════════════════════════════════════════════════════════ */}
          {inEndCard && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 28,
              }}
            >
              <div style={fade(phase >= 21)}>
                <PawnLogo size={56} />
              </div>

              <div
                style={{
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 64,
                    fontWeight: 800,
                    letterSpacing: "-0.025em",
                    color: "#0f0e0c",
                    lineHeight: 1,
                    ...fade(phase >= 21, 120),
                  }}
                >
                  Pawn
                </div>

                <div
                  style={{
                    fontSize: 22,
                    color: "#6e6b62",
                    letterSpacing: "0.01em",
                    fontWeight: 400,
                    ...fade(phase >= 22),
                    transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms",
                  }}
                >
                  Every pawn builds the king.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Dev controls (hidden when ?recording=true) ─────────────────── */}
        {!isRecording && (
          <div
            style={{
              position: "fixed",
              bottom: 28,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(15,14,12,0.92)",
              padding: "10px 16px",
              borderRadius: 10,
              zIndex: 10000,
              backdropFilter: "blur(8px)",
            }}
          >
            <button
              onClick={playing ? undefined : play}
              disabled={playing}
              style={{
                padding: "7px 18px",
                background: playing ? "#2a2a28" : "#f4f1ea",
                color: playing ? "#6e6b62" : "#0f0e0c",
                border: "none",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 700,
                cursor: playing ? "not-allowed" : "pointer",
                letterSpacing: "0.08em",
                transition: "all 0.15s ease",
              }}
            >
              {playing ? "PLAYING…" : "▶  PLAY"}
            </button>

            <button
              onClick={restart}
              style={{
                padding: "7px 16px",
                background: "transparent",
                color: "#ccc8bd",
                border: "1px solid #3a3a38",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.08em",
              }}
            >
              ↺  RESTART
            </button>

            <span
              style={{
                fontSize: 11,
                color: "#6e6b62",
                marginLeft: 6,
                fontVariantNumeric: "tabular-nums",
                minWidth: 80,
              }}
            >
              phase {phase}
              {playing && ` · ~${((phase / 22) * 21.8).toFixed(1)}s`}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
