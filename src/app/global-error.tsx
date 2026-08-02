"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Root application failure.", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f8fbfa", color: "#064b47", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "min(720px, 100%)", boxSizing: "border-box", border: "1px solid #dfe6e8", borderRadius: 28, background: "white", padding: "clamp(28px, 6vw, 56px)", boxShadow: "0 30px 90px rgba(16,53,58,.08)" }}>
            <p style={{ margin: 0, color: "#0da691", fontSize: 12, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase" }}>System recovery</p>
            <h1 style={{ margin: "20px 0 0", fontFamily: "Georgia, serif", fontWeight: 500, fontSize: "clamp(42px, 8vw, 72px)", lineHeight: .95 }}>The explorer needs a fresh start.</h1>
            <p style={{ margin: "28px 0 0", color: "#68758a", lineHeight: 1.7 }}>An unexpected application error occurred. No sensitive diagnostic details are displayed.</p>
            <button onClick={reset} style={{ marginTop: 32, border: 0, borderRadius: 999, background: "#064b47", color: "white", padding: "13px 22px", fontWeight: 800, cursor: "pointer" }}>Restart explorer</button>
          </section>
        </main>
      </body>
    </html>
  );
}
