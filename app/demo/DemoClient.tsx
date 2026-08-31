"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// ─── Data ────────────────────────────────────────────────────────────────────

const TOKENS = [
  { symbol: "RHOOD", name: "Robinhood Coin",  weight: 30, color: "#22c55e" },
  { symbol: "PEPE",  name: "Pepe Token",       weight: 25, color: "#3b82f6" },
  { symbol: "DEGEN", name: "Degen Finance",    weight: 20, color: "#f59e0b" },
  { symbol: "MOON",  name: "MoonShot",         weight: 15, color: "#ef4444" },
  { symbol: "CHAD",  name: "Chad Coin",        weight: 10, color: "#8b5cf6" },
];

const EXPLORE_ROWS = [
  { symbol: "RHDX",  name: "Robinhood Diversified Index", tokens: ["RHOOD","PEPE","DEGEN","MOON","CHAD"], supply: "12,400" },
  { symbol: "PONS3", name: "PONS Top 3",                  tokens: ["RHOOD","PEPE","DEGEN"],               supply:  "8,200" },
  { symbol: "MEME",  name: "Meme Season",                 tokens: ["PEPE","CHAD","MOON"],                 supply:  "4,100" },
  { symbol: "BCC",   name: "Blue Chip Chain",             tokens: ["RHOOD","DEGEN"],                      supply:  "2,800" },
];

// ─── Camera states ────────────────────────────────────────────────────────────
// [scale, tx, ty, durationMs, easing]
// tx/ty shift content within the 1920×1080 canvas; applied as translate3d(tx,ty,0) scale(scale)
// Positive ty = move content DOWN (reveals higher content in viewport)
// Negative tx = move content LEFT (reveals right-side content in center)

type CamState = [number, number, number, number, string];

const CAM: Record<number, CamState> = {
  // Scenes 1–2: full canvas title cards
  0:  [1.00,    0,    0,  400, "ease-out"],
  1:  [1.00,    0,    0,  400, "ease-out"],
  2:  [1.00,    0,    0,  400, "ease-out"],
  3:  [1.00,    0,    0,  400, "ease-out"],
  // Scene 3: slight push toward selector
  4:  [1.06,    0,   24,  600, "ease-out"],
  5:  [1.06,    0,   24,  300, "ease-out"],
  6:  [1.06,    0,   24,  300, "ease-out"],
  7:  [1.06,    0,   24,  300, "ease-out"],
  8:  [1.06,    0,   24,  300, "ease-out"],
  9:  [1.06,    0,   24,  300, "ease-out"],
  // Scene 4: push into weight panel
  10: [1.10,    0,    0,  700, "ease-out"],
  // Scene 5: clean, full canvas
  11: [1.00,    0,    0,  600, "ease-out"],
  12: [1.00,    0,    0,  400, "ease-out"],
  13: [1.00,    0,    0,  250, "ease-out"],
  // Scene 6: processing
  14: [1.00,    0,    0,  500, "ease-out"],
  // Scene 7: zoom into index page, crop navbar
  15: [1.52,    0,  172,  700, "ease-out"],
  // Scene 7b: slow pullback
  16: [1.26,    0,  132, 2200, "cubic-bezier(0.37, 0, 0.63, 1)"],
  // Scene 8: push into trade panel (right side, centered at x≈1634)
  17: [1.80, -672,   82,  850, "cubic-bezier(0.25, 0.46, 0.45, 0.94)"],
  18: [1.80, -672,   82,  300, "ease-out"],
  19: [1.80, -672,   82,  250, "ease-out"],
  20: [1.80, -672,   82,  250, "ease-out"],
  // Scene 9: pull all the way out for full product reveal
  21: [1.00,    0,    0,  900, "cubic-bezier(0.25, 0.46, 0.45, 0.94)"],
  // Scene 10: end card
  22: [1.00,    0,    0,  500, "ease-out"],
  23: [1.00,    0,    0,  400, "ease-out"],
};

function getCam(phase: number): CamState {
  // Walk back to find nearest defined camera state
  for (let p = phase; p >= 0; p--) {
    if (CAM[p]) return CAM[p];
  }
  return [1, 0, 0, 400, "ease-out"];
}

// ─── Timeline ────────────────────────────────────────────────────────────────

const TIMELINE: [number, number][] = [
  [1,    300],  // logo
  [2,    800],  // "Build a market."
  [3,   1700],  // → "Own the whole idea."
  [4,   3150],  // selector
  [5,   3750],  // token 1
  [6,   4200],  // token 2
  [7,   4620],  // token 3
  [8,   4980],  // token 4
  [9,   5280],  // token 5
  [10,  5780],  // weights
  [11,  7500],  // create button
  [12,  8100],  // cursor moves
  [13,  8700],  // click
  [14,  9150],  // processing
  [15, 10050],  // index reveal (zoom in)
  [16, 10850],  // slow pullback starts
  [17, 13100],  // buy focus
  [18, 13900],  // 0.10 typed
  [19, 15050],  // buy click
  [20, 15550],  // confirmed
  [21, 16350],  // explore
  [22, 18350],  // end card
  [23, 19050],  // tagline
];
// Total: ~21s

// ─── Helpers ─────────────────────────────────────────────────────────────────

function appear(visible: boolean, delayMs = 0, dur = 360): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(14px)",
    transition: `opacity ${dur}ms ease ${delayMs}ms, transform ${dur}ms ease ${delayMs}ms`,
  };
}

// ─── Logo (inline img to avoid next/image wrapping) ──────────────────────────

function PawnLogo({ size }: { size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/pawn-logo.png"
      alt=""
      draggable={false}
      style={{ width: size, height: size, objectFit: "contain", mixBlendMode: "multiply", display: "block" }}
    />
  );
}

// ─── Cursor SVG ───────────────────────────────────────────────────────────────

function Cursor({ pressed }: { pressed: boolean }) {
  return (
    <svg
      width="28"
      height="36"
      viewBox="0 0 28 36"
      fill="none"
      style={{ transform: pressed ? "scale(0.88)" : "scale(1)", transition: "transform 0.12s ease" }}
    >
      <path
        d="M3 3L3 29L10 22L15 33L18 31.5L13 21H23L3 3Z"
        fill="#0f0e0c"
        stroke="#f4f1ea"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DemoClient() {
  const searchParams = useSearchParams();
  const isRecording = searchParams.get("recording") === "true";

  const [viewportScale, setViewportScale] = useState(1);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasAutoplayed = useRef(false);

  // Scale 1920×1080 canvas to fill the browser viewport
  useEffect(() => {
    const update = () =>
      setViewportScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Lock body scroll, hide scrollbars
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
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
    timeoutsRef.current.push(setTimeout(() => setPlaying(false), 22000));
  }, [clearAll]);

  const restart = useCallback(() => {
    clearAll();
    setPhase(0);
    setPlaying(false);
    requestAnimationFrame(() => play());
  }, [clearAll, play]);

  useEffect(() => {
    if (isRecording && !hasAutoplayed.current) {
      hasAutoplayed.current = true;
      const t = setTimeout(play, 500);
      return () => clearTimeout(t);
    }
  }, [isRecording, play]);

  useEffect(() => () => clearAll(), [clearAll]);

  // ── Camera ──────────────────────────────────────────────────────────────────

  const [camScale, camTx, camTy, camDur, camEase] = getCam(phase);

  // ── Derived state ────────────────────────────────────────────────────────────

  const tokensSelected   = Math.max(0, Math.min(5, phase - 4));
  const inHero           = phase >= 1  && phase <= 3;
  const inSelector       = phase >= 4  && phase <= 9;
  const inWeights        = phase === 10;
  const inCreate         = phase >= 11 && phase <= 13;
  const inProcess        = phase === 14;
  const inIndexPage      = phase >= 15 && phase <= 20;
  const inExplore        = phase === 21;
  const inEndCard        = phase >= 22;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Global recording-mode overrides */}
      {isRecording && (
        <style>{`
          * { cursor: none !important; }
          ::-webkit-scrollbar { display: none !important; }
        `}</style>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes pawnsAssemble {
          from { opacity: 0; transform-origin: left center; transform: scaleX(0); }
          to   { opacity: 1; transform-origin: left center; transform: scaleX(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes confirmReveal {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoBreath {
          0%, 100% { opacity: 0.65; transform: scale(1);    }
          50%       { opacity: 1;    transform: scale(1.04); }
        }
      `}</style>

      {/* ── Full-viewport overlay ──────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#111110",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* ── 1920×1080 viewport shell (scales to browser) ─────────────────── */}
        <div
          style={{
            width: 1920,
            height: 1080,
            flexShrink: 0,
            transform: `scale(${viewportScale})`,
            transformOrigin: "center center",
            position: "relative",
            overflow: "hidden",
            background: "#f4f1ea",
          }}
        >
          {/* ── Camera layer (pan + zoom inside canvas) ───────────────────── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "center center",
              transform: `translate3d(${camTx}px, ${camTy}px, 0) scale(${camScale})`,
              transition: `transform ${camDur}ms ${camEase}`,
              willChange: "transform",
            }}
          >

            {/* ══════════════════════════════════════════════════════════════
                SCENE 1 + 2 — Title cards
            ══════════════════════════════════════════════════════════════ */}
            {inHero && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 52,
                }}
              >
                {/* Logo mark */}
                <div style={appear(phase >= 1, 0, 420)}>
                  <PawnLogo size={64} />
                </div>

                {/* Text cross-fade container */}
                <div style={{ position: "relative", height: 120 }}>
                  {/* "Build a market." */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...appear(phase === 2, 0, 380),
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 112,
                        fontWeight: 800,
                        letterSpacing: "-0.028em",
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
                      ...appear(phase === 3, 0, 380),
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 112,
                        fontWeight: 800,
                        letterSpacing: "-0.028em",
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

            {/* ══════════════════════════════════════════════════════════════
                SCENE 3 — Token selector (close-up)
            ══════════════════════════════════════════════════════════════ */}
            {inSelector && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...appear(phase >= 4, 0, 340),
                }}
              >
                <div
                  style={{
                    width: 1160,
                    background: "#ffffff",
                    border: "1px solid #e4e0d6",
                  }}
                >
                  {/* Panel header */}
                  <div style={{ padding: "32px 40px 0" }}>
                    <p
                      style={{
                        margin: "0 0 18px",
                        fontSize: 11,
                        fontWeight: 750,
                        letterSpacing: "0.14em",
                        color: "#6e6b62",
                      }}
                    >
                      SELECT PAWNS
                    </p>

                    {/* Search bar — large, readable */}
                    <div
                      style={{
                        border: "1px solid #0f0e0c",
                        padding: "18px 22px",
                        fontSize: 17,
                        color: "#6e6b62",
                        background: "#f4f1ea",
                        marginBottom: 0,
                        letterSpacing: "0.01em",
                      }}
                    >
                      Search ticker, name, or paste contract address
                    </div>
                  </div>

                  {/* Token rows */}
                  <div style={{ padding: "0 0 10px" }}>
                    {TOKENS.map((token, i) => (
                      <div
                        key={token.symbol}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "68px 1fr auto",
                          alignItems: "center",
                          minHeight: 86,
                          borderBottom: "1px solid #e4e0d6",
                          padding: "0 40px 0 28px",
                          opacity: i < tokensSelected ? 1 : 0,
                          transform: i < tokensSelected ? "translateY(0)" : "translateY(8px)",
                          transition: "opacity 0.25s ease, transform 0.25s ease",
                          background: i < tokensSelected ? "rgba(11,11,10,0.025)" : "transparent",
                        }}
                      >
                        {/* Avatar dot */}
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: "50%",
                            border: "1px solid #ccc8bd",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
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
                          <div
                            style={{
                              fontWeight: 650,
                              fontSize: 18,
                              color: "#0f0e0c",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {token.symbol}
                          </div>
                          <div style={{ fontSize: 14, color: "#6e6b62", marginTop: 3 }}>
                            {token.name}
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            border: `1px solid ${i < tokensSelected ? "#0f0e0c" : "#ccc8bd"}`,
                            borderRadius: 4,
                            background: i < tokensSelected ? "#0f0e0c" : "transparent",
                            transition: "all 0.18s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {i < tokensSelected && (
                            <span style={{ color: "#f4f1ea", fontSize: 13, lineHeight: 1 }}>
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SCENE 4 — Weight editor (close-up)
            ══════════════════════════════════════════════════════════════ */}
            {inWeights && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...appear(phase >= 10, 0, 340),
                }}
              >
                <div style={{ width: 1240 }}>
                  <p
                    style={{
                      margin: "0 0 36px",
                      fontSize: 11,
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
                        gridTemplateColumns: "1fr 320px 100px",
                        alignItems: "center",
                        gap: 36,
                        minHeight: 78,
                        borderBottom: "1px solid #e4e0d6",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 650,
                            fontSize: 20,
                            color: "#0f0e0c",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {token.symbol}
                        </div>
                        <div style={{ fontSize: 13, color: "#6e6b62", marginTop: 3 }}>
                          {token.name}
                        </div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{
                          height: 4,
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
                            transition: "width 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                          }}
                        />
                      </div>

                      {/* Weight number — visually dominant */}
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          color: "#0f0e0c",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {token.weight}%
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 28,
                      padding: "18px 0 0",
                      borderTop: "1px solid #ccc8bd",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 750,
                        letterSpacing: "0.14em",
                        color: "#6e6b62",
                      }}
                    >
                      TOTAL
                    </span>
                    <span
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: "#0f0e0c",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      100%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SCENE 5 — Create button + cursor
            ══════════════════════════════════════════════════════════════ */}
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
                <div style={{ textAlign: "center", ...appear(phase >= 11, 0, 340) }}>
                  <p
                    style={{
                      margin: "0 0 44px",
                      fontSize: 11,
                      fontWeight: 750,
                      letterSpacing: "0.14em",
                      color: "#6e6b62",
                    }}
                  >
                    READY TO DEPLOY
                  </p>

                  {/* Button */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 420,
                      height: 80,
                      background: phase >= 13 ? "#272725" : "#0f0e0c",
                      color: "#f4f1ea",
                      fontSize: 19,
                      fontWeight: 750,
                      letterSpacing: "0.1em",
                      transform: phase >= 13 ? "scale(0.97)" : "scale(1)",
                      transition: "transform 0.12s ease, background 0.12s ease",
                      userSelect: "none",
                    }}
                  >
                    {phase >= 13 ? "CREATING INDEX…" : "CREATE INDEX"}
                  </div>
                </div>

                {/* Cursor — starts lower-right, moves to button center */}
                {phase >= 12 && (
                  <div
                    style={{
                      position: "absolute",
                      // Anchor at button center (960, 540). Cursor tip offset ~(3,3) into svg
                      left: 960,
                      top: 540,
                      // phase 12: cursor far lower-right; phase 13: on button
                      transform: phase >= 13
                        ? "translate(-3px, -3px)"
                        : "translate(180px, 120px)",
                      transition: "transform 0.62s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                      pointerEvents: "none",
                      zIndex: 20,
                    }}
                  >
                    <Cursor pressed={phase >= 13} />
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SCENE 6 — Processing
            ══════════════════════════════════════════════════════════════ */}
            {inProcess && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 48,
                  ...appear(phase >= 14, 0, 340),
                }}
              >
                <div style={{ animation: "logoBreath 1.2s ease infinite" }}>
                  <PawnLogo size={112} />
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: 46,
                    fontWeight: 300,
                    color: "#6e6b62",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Putting the pawns together…
                </p>

                {/* Assembling segment bar */}
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  {TOKENS.map((token, i) => (
                    <div
                      key={token.symbol}
                      style={{
                        height: 5,
                        width: 90,
                        background: token.color,
                        borderRadius: 3,
                        opacity: 0,
                        animation: `pawnsAssemble 0.45s ease ${i * 0.22}s forwards`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SCENES 7 + 8 — Index page (camera zooms in/pulls back/pushes)
            ══════════════════════════════════════════════════════════════ */}
            {inIndexPage && (() => {
              const tradePanel380 = 380; // px in 1920 canvas
              const showEth = phase >= 18;
              const buyClicked = phase >= 19;
              const confirmed = phase >= 20;

              return (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#f4f1ea",
                    ...appear(phase >= 15, 0, 380),
                  }}
                >
                  {/* Mock nav (cropped by camera zoom in scene 7) */}
                  <div
                    style={{
                      height: 64,
                      borderBottom: "1px solid #e4e0d6",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 96px",
                      justifyContent: "space-between",
                      background: "#f4f1ea",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <PawnLogo size={26} />
                      <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "0.06em", color: "#0f0e0c" }}>
                        Pawn
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 36, color: "#6e6b62", fontSize: 14 }}>
                      <span>Explore</span><span>Create</span><span>Docs</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "#6e6b62",
                        padding: "4px 12px",
                        border: "1px solid #e4e0d6",
                        borderRadius: 100,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#b5924c",
                          display: "inline-block",
                        }}
                      />
                      ROBINHOOD CHAIN
                    </div>
                  </div>

                  {/* Page content */}
                  <div style={{ padding: "0 96px" }}>

                    {/* Page header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                        padding: "38px 0 26px",
                        borderBottom: "1px solid #e4e0d6",
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
                            fontSize: 58,
                            fontWeight: 700,
                            letterSpacing: "-0.015em",
                            color: "#0f0e0c",
                            lineHeight: 1,
                            animation: "slideUp 0.45s ease both",
                          }}
                        >
                          RHDX
                        </h1>
                        <div
                          style={{
                            color: "#6e6b62",
                            fontSize: 15,
                            marginTop: 6,
                            animation: "slideUp 0.45s ease 80ms both",
                          }}
                        >
                          Robinhood Diversified Index
                        </div>
                      </div>

                      {/* Stats strip */}
                      <div style={{ display: "flex", border: "1px solid #e4e0d6" }}>
                        {[
                          { label: "NAV / SHARE", value: "0.001847 ETH" },
                          { label: "SUPPLY",       value: "12,400"       },
                          { label: "YOUR SHARES",  value: "—"            },
                        ].map((s, i) => (
                          <div
                            key={s.label}
                            style={{
                              padding: "12px 22px",
                              borderRight: i < 2 ? "1px solid #e4e0d6" : "none",
                              animation: `slideUp 0.4s ease ${i * 70}ms both`,
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
                              {s.label}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 650, color: "#0f0e0c" }}>
                              {s.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Body grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `1fr ${tradePanel380}px`,
                        gap: 48,
                        paddingTop: 28,
                      }}
                    >
                      {/* LEFT: Composition */}
                      <div style={{ animation: "slideUp 0.45s ease 120ms both" }}>
                        {/* Color bar */}
                        <div style={{ display: "flex", height: 9, marginBottom: 24, borderRadius: 1, overflow: "hidden" }}>
                          {TOKENS.map((t) => (
                            <div key={t.symbol} style={{ flex: t.weight, background: t.color }} />
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

                        {/* Column headers */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 0.8fr 0.8fr 1.2fr",
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
                              gridTemplateColumns: "2fr 0.8fr 0.8fr 1.2fr",
                              alignItems: "center",
                              minHeight: 60,
                              borderBottom: "1px solid #e4e0d6",
                              fontSize: 14,
                              color: "#6e6b62",
                              animation: `slideUp 0.38s ease ${130 + i * 65}ms both`,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div
                                style={{
                                  width: 9,
                                  height: 9,
                                  borderRadius: 2,
                                  background: token.color,
                                  flexShrink: 0,
                                }}
                              />
                              <strong
                                style={{ color: "#0f0e0c", fontSize: 16, fontWeight: 650 }}
                              >
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
                                textDecorationColor: "rgba(181,146,76,0.35)",
                                textUnderlineOffset: 3,
                              }}
                            >
                              0x71a3…f9c2
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* RIGHT: Trade panel — camera zooms into this in scene 8 */}
                      <div
                        style={{
                          display: "grid",
                          gap: 14,
                          alignContent: "start",
                          animation: "slideUp 0.45s ease 180ms both",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <h2
                            style={{
                              margin: 0,
                              fontSize: 14,
                              letterSpacing: "0.08em",
                              color: "#0f0e0c",
                              fontWeight: 750,
                            }}
                          >
                            TRADE
                          </h2>
                          <span
                            style={{ fontSize: 11, color: "#b5924c", fontFamily: "monospace" }}
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
                          {["BUY", "SELL"].map((label, i) => (
                            <div
                              key={label}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 38,
                                borderRight: i === 0 ? "1px solid #e4e0d6" : "none",
                                background: i === 0 ? "#0f0e0c" : "transparent",
                                color: i === 0 ? "#f4f1ea" : "#6e6b62",
                                fontSize: 11,
                                fontWeight: 750,
                                letterSpacing: "0.12em",
                              }}
                            >
                              {label}
                            </div>
                          ))}
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
                              border: `1px solid ${phase >= 17 ? "#0f0e0c" : "#e4e0d6"}`,
                              padding: "14px 18px",
                              fontSize: 28,
                              fontWeight: 600,
                              color: "#0f0e0c",
                              background: "#f4f1ea",
                              fontVariantNumeric: "tabular-nums",
                              letterSpacing: "-0.01em",
                              transition: "border-color 0.3s ease",
                              minHeight: 62,
                            }}
                          >
                            {showEth ? "0.10" : phase >= 17 ? "0." : "0"}
                          </div>
                        </div>

                        {/* Quote box */}
                        <div
                          style={{
                            padding: "14px 16px",
                            border: "1px solid #e4e0d6",
                            background: "#ffffff",
                            display: "grid",
                            gap: 10,
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
                              {showEth ? "54.12" : "—"}
                            </strong>
                          </div>

                          {/* Confirmed message */}
                          {confirmed && (
                            <div
                              style={{
                                paddingTop: 10,
                                borderTop: "1px solid #e4e0d6",
                                fontSize: 20,
                                color: "#b5924c",
                                fontWeight: 750,
                                letterSpacing: "0.04em",
                                animation: "confirmReveal 0.38s ease forwards",
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
                                padding: "4px 10px",
                                border: `1px solid ${s === "1%" ? "#0f0e0c" : "#ccc8bd"}`,
                                color: s === "1%" ? "#0f0e0c" : "#6e6b62",
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
                            minHeight: 54,
                            background: confirmed ? "#0f6b2d" : "#15803d",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 750,
                            letterSpacing: "0.1em",
                            transform: buyClicked && !confirmed ? "scale(0.97)" : "scale(1)",
                            transition: "transform 0.12s ease, background 0.25s ease",
                            userSelect: "none",
                          }}
                        >
                          {confirmed ? "CONFIRMED" : buyClicked ? "CONFIRMING…" : "BUY INDEX"}
                        </div>

                        {/* Status line */}
                        <div style={{ fontSize: 11, color: "#6e6b62", minHeight: 16 }}>
                          {confirmed && (
                            <span style={{ color: "#b5924c" }}>
                              Transaction confirmed on Robinhood Chain
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ══════════════════════════════════════════════════════════════
                SCENE 9 — Full product reveal (explore page)
            ══════════════════════════════════════════════════════════════ */}
            {inExplore && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: "68px 72px 0",
                  background: "#f4f1ea",
                  ...appear(phase >= 21, 0, 380),
                }}
              >
                <p
                  style={{
                    margin: "0 0 14px",
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
                    margin: "0 0 56px",
                    fontSize: 76,
                    fontWeight: 800,
                    letterSpacing: "-0.028em",
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
                    gridTemplateColumns: "2fr 2.4fr 0.7fr 1fr",
                    gap: 24,
                    minHeight: 40,
                    borderBottom: "1px solid #e4e0d6",
                    fontSize: 10,
                    fontWeight: 750,
                    letterSpacing: "0.12em",
                    color: "#6e6b62",
                    alignItems: "center",
                    paddingBottom: 4,
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
                      gridTemplateColumns: "2fr 2.4fr 0.7fr 1fr",
                      gap: 24,
                      minHeight: 88,
                      borderBottom: "1px solid #e4e0d6",
                      alignItems: "center",
                      animation: `slideUp 0.4s ease ${i * 100}ms both`,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 650,
                          fontSize: 22,
                          color: "#0f0e0c",
                          lineHeight: 1,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {row.symbol}
                      </div>
                      <div style={{ fontSize: 13, color: "#6e6b62", marginTop: 5 }}>
                        {row.name}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {row.tokens.map((t) => (
                        <span
                          key={t}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            height: 24,
                            padding: "0 10px",
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
                        fontSize: 16,
                        color: "#0f0e0c",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.supply}
                    </div>

                    <div style={{ fontSize: 12, color: "#6e6b62", fontFamily: "monospace" }}>
                      0x{row.symbol.toLowerCase().slice(0, 4)}…c3f1
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SCENE 10 — End card
            ══════════════════════════════════════════════════════════════ */}
            {inEndCard && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 32,
                }}
              >
                <div style={appear(phase >= 22, 0, 420)}>
                  <PawnLogo size={116} />
                </div>

                <div
                  style={{
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 104,
                      fontWeight: 800,
                      letterSpacing: "-0.028em",
                      color: "#0f0e0c",
                      lineHeight: 1,
                      ...appear(phase >= 22, 100, 420),
                    }}
                  >
                    Pawn
                  </div>

                  <div
                    style={{
                      fontSize: 32,
                      color: "#6e6b62",
                      fontWeight: 400,
                      letterSpacing: "0.01em",
                      ...appear(phase >= 23, 0, 560),
                      transition: "opacity 560ms ease 0ms, transform 560ms ease 0ms",
                    }}
                  >
                    Every pawn builds the king.
                  </div>
                </div>
              </div>
            )}

          </div>{/* end camera layer */}
        </div>{/* end canvas */}

        {/* ── Dev controls (hidden in recording mode) ────────────────────── */}
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
              background: "rgba(15,14,12,0.9)",
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
                padding: "7px 20px",
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
                minWidth: 90,
              }}
            >
              p{phase} · cam {camScale.toFixed(2)}×
              {playing && ` · ~${((TIMELINE.findIndex(([p]) => p > phase) / TIMELINE.length) * 21).toFixed(1)}s`}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
