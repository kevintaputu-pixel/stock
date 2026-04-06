"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ThemeName = "dark" | "green" | "tropical" | "whiteBlue";

const themes = {
  dark: {
    bg: "#050507",
    bg2: "#0f172a",
    glass: "rgba(20,20,28,0.65)",
    border: "rgba(255,255,255,0.08)",
    text: "#f5f7fb",
    textSoft: "#9ca3af",
    accent: "#8b5cf6",
    accent2: "#c084fc",
    glow: "rgba(139,92,246,0.25)",
    dangerGlow: "rgba(220,38,38,0.28)",
  },
  green: {
    bg: "#050d08",
    bg2: "#0f2e1a",
    glass: "rgba(18,30,22,0.65)",
    border: "rgba(134,239,172,0.15)",
    text: "#ecfdf5",
    textSoft: "#9fd3b3",
    accent: "#22c55e",
    accent2: "#86efac",
    glow: "rgba(34,197,94,0.25)",
    dangerGlow: "rgba(220,38,38,0.28)",
  },
  tropical: {
    bg: "#051018",
    bg2: "#0e2a3a",
    glass: "rgba(20,35,45,0.65)",
    border: "rgba(125,211,252,0.15)",
    text: "#ecfeff",
    textSoft: "#9ed7e0",
    accent: "#06b6d4",
    accent2: "#f59e0b",
    glow: "rgba(6,182,212,0.25)",
    dangerGlow: "rgba(220,38,38,0.28)",
  },
  whiteBlue: {
    bg: "#eff5ff",
    bg2: "#e6efff",
    glass: "rgba(255,255,255,0.65)",
    border: "#cfe0ff",
    text: "#0f172a",
    textSoft: "#5b6b89",
    accent: "#2563eb",
    accent2: "#60a5fa",
    glow: "rgba(37,99,235,0.25)",
    dangerGlow: "rgba(220,38,38,0.20)",
  },
};

const themeOrder: ThemeName[] = ["whiteBlue", "dark", "green", "tropical"];

type AppDataRow = {
  id: string;
  type: "code";
  value: string;
  created_at: string;
};

type AccessRequestResponse = {
  ok: boolean;
  requestId?: string;
  message?: string;
  status?: string;
};

export default function HomePage() {
  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [regularizeCount, setRegularizeCount] = useState(0);
  const [codes, setCodes] = useState<string[]>([]);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [codeTarget, setCodeTarget] = useState<"/donnees" | "/regularisation" | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestingForgotCode, setRequestingForgotCode] = useState(false);
  const [requestStatusText, setRequestStatusText] = useState("");

  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("stock-theme");
    if (savedTheme && themes[savedTheme as ThemeName]) {
      setTheme(savedTheme as ThemeName);
    } else {
      localStorage.setItem("stock-theme", "whiteBlue");
    }
  }, []);

  useEffect(() => {
    loadRegularizeCount();
    loadCodes();
  }, []);

  useEffect(() => {
    if (!requestId || !codeTarget) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/access-request?id=${encodeURIComponent(requestId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = (await res.json()) as AccessRequestResponse;

        if (json.status === "approved") {
          clearInterval(interval);
          setForgotModalOpen(false);
          setCodeModalOpen(false);
          setRequestId(null);
          setRequestStatusText("");
          router.push(codeTarget);
        }
      } catch (error) {
        console.error(error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [requestId, codeTarget, router]);

  async function loadCodes() {
    const { data, error } = await supabase
      .from("app_data")
      .select("id, type, value, created_at")
      .eq("type", "code")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const rows = (data as AppDataRow[]) || [];
    setCodes(rows.map((row) => row.value.trim()).filter(Boolean));
  }

  async function loadRegularizeCount() {
    const { data, error } = await supabase
      .from("products")
      .select("sf, inventaire");

    if (error) {
      console.error(error);
      return;
    }

    const count = (data || []).filter(
      (item: any) =>
        item.inventaire !== null &&
        item.sf !== null &&
        item.inventaire !== item.sf
    ).length;

    setRegularizeCount(count);
  }

  function cycleTheme() {
    const next =
      themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
    setTheme(next);
    localStorage.setItem("stock-theme", next);
  }

  function openCodeModal(target: "/donnees" | "/regularisation") {
    setCodeTarget(target);
    setCodeInput("");
    setShowCode(false);
    setRequestId(null);
    setRequestStatusText("");
    setCodeModalOpen(true);
  }

  function validateCodeAccess() {
    const value = codeInput.trim();
    if (!value) {
      alert("Entre le code confidentiel.");
      return;
    }

    const isValid = codes.some((code) => code === value);

    if (!isValid) {
      alert("Code confidentiel incorrect.");
      return;
    }

    if (codeTarget) {
      setCodeModalOpen(false);
      router.push(codeTarget);
    }
  }

  async function handleForgotCodeRequest() {
    if (!codeTarget) return;

    try {
      setRequestingForgotCode(true);

      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: codeTarget,
        }),
      });

      const json = (await res.json()) as AccessRequestResponse;

      if (!res.ok || !json.ok || !json.requestId) {
        alert(json.message || "Impossible d'envoyer la demande.");
        return;
      }

      setRequestId(json.requestId);
      setRequestStatusText("Une demande a été envoyée par e-mail. En attente de validation.");
      setForgotModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Impossible d'envoyer la demande.");
    } finally {
      setRequestingForgotCode(false);
    }
  }

  const t = themes[theme];
  const hasAlert = regularizeCount > 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at 10% 10%, ${hasAlert ? t.dangerGlow : t.glow} 0%, transparent 30%),
          radial-gradient(circle at 90% 90%, ${t.glow} 0%, transparent 30%),
          linear-gradient(135deg, ${t.bg} 0%, ${t.bg2} 100%)
        `,
        color: t.text,
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20 }}>
        <section style={glassCard(t, true)}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
            <div>
              <div style={badgeStyle(t)}>Stock Manager</div>

              <h1 style={titleStyle()}>
                Tableau de stock
              </h1>

              <p style={descStyle(t)}>
                Interface haut de gamme, rapide et agréable pour piloter ton stock,
                suivre les mouvements et gérer l’inventaire efficacement.
              </p>

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <Link href="/products" style={primaryBtn(t)}>Ouvrir</Link>
                <Link href="/inventaire" style={ghostBtn(t)}>Inventaire</Link>
                <button onClick={cycleTheme} style={ghostBtn(t)}>Mode</button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <MiniCard t={t} title="UI Premium" text="Design moderne" />
              <button
                onClick={() => openCodeModal("/donnees")}
                style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
              >
                <MiniCard t={t} title="Données" text="Gestion des emails et personnes" />
              </button>
              <Link href="/historique" style={{ textDecoration: "none" }}>
                <MiniCard t={t} title="Historique des Mouvements" text="Voir tous les mouvements" />
              </Link>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          <Card href="/products" t={t} title="Articles" />
          <Card href="/mouvement" t={t} title="Mouvements" />
          <Card href="/inventaire" t={t} title="Inventaire" />
          <Card href="/entrees" t={t} title="Entrées" />
          <Card href="/sortie" t={t} title="Sortie" />
          <ActionCard
            onClick={() => openCodeModal("/regularisation")}
            t={t}
            title={hasAlert ? `Régularisation (${regularizeCount})` : "Régularisation"}
            highlight={hasAlert}
          />
        </section>

        <section style={glassCard(t)}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>
            Base prête pour évoluer
          </div>
        </section>
      </div>

      {codeModalOpen && (
        <div
          onClick={() => setCodeModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              ...glassCard(t),
              borderRadius: 24,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              Code confidentiel
            </div>
            <div style={{ fontSize: 14, color: t.textSoft, marginBottom: 16 }}>
              Entre le code confidentiel pour accéder à cette page.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                type={showCode ? "text" : "password"}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") validateCodeAccess();
                }}
                placeholder="Saisir le code"
                style={{
                  width: "100%",
                  background: t.glass,
                  border: `1px solid ${t.border}`,
                  color: t.text,
                  padding: "14px 16px",
                  borderRadius: 14,
                  outline: "none",
                  fontSize: 15,
                }}
              />

              <button
                onClick={() => setShowCode((prev) => !prev)}
                style={{
                  background: t.glass,
                  border: `1px solid ${t.border}`,
                  color: t.text,
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  cursor: "pointer",
                  fontSize: 18,
                }}
                title={showCode ? "Masquer le code" : "Afficher le code"}
              >
                {showCode ? "🙈" : "👁️"}
              </button>
            </div>

            <button
              onClick={handleForgotCodeRequest}
              disabled={requestingForgotCode}
              style={{
                background: "transparent",
                border: "none",
                color: t.textSoft,
                padding: 0,
                marginBottom: 20,
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: 13,
              }}
            >
              {requestingForgotCode ? "Envoi..." : "Code oublié"}
            </button>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setCodeModalOpen(false)} style={ghostBtn(t)}>
                Annuler
              </button>
              <button onClick={validateCodeAccess} style={primaryBtn(t)}>
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {forgotModalOpen && (
        <div
          onClick={() => setForgotModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              ...glassCard(t),
              borderRadius: 24,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
              Code oublié
            </div>
            <div style={{ fontSize: 14, color: t.textSoft, lineHeight: 1.6, marginBottom: 18 }}>
              {requestStatusText || "Une demande sera envoyée par e-mail."}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setForgotModalOpen(false)} style={primaryBtn(t)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function glassCard(t: any, hero = false): React.CSSProperties {
  return {
    background: t.glass,
    backdropFilter: "blur(16px)",
    border: `1px solid ${t.border}`,
    borderRadius: hero ? 30 : 24,
    padding: hero ? 26 : 20,
    boxShadow: `0 20px 50px ${t.glow}`,
  };
}

function badgeStyle(t: any): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    background: t.glass,
    border: `1px solid ${t.border}`,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 14,
  };
}

function titleStyle(): React.CSSProperties {
  return {
    fontSize: 42,
    fontWeight: 900,
    margin: 0,
  };
}

function descStyle(t: any): React.CSSProperties {
  return {
    marginTop: 12,
    fontSize: 15,
    color: t.textSoft,
  };
}

function primaryBtn(t: any): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
    color: "#fff",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 800,
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
  };
}

function ghostBtn(t: any): React.CSSProperties {
  return {
    background: t.glass,
    border: `1px solid ${t.border}`,
    color: t.text,
    padding: "12px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function MiniCard({ t, title, text }: any) {
  return (
    <div style={glassCard(t)}>
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div style={{ fontSize: 13, color: t.textSoft }}>{text}</div>
    </div>
  );
}

function Card({ href, t, title, highlight = false }: any) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          ...glassCard(t),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 18,
          height: 110,
          background: highlight ? "rgba(220,38,38,0.18)" : t.glass,
          border: highlight ? "1px solid rgba(220,38,38,0.38)" : `1px solid ${t.border}`,
          boxShadow: highlight ? "0 20px 50px rgba(220,38,38,0.24)" : `0 20px 50px ${t.glow}`,
        }}
      >
        {title}
      </div>
    </Link>
  );
}

function ActionCard({ onClick, t, title, highlight = false }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          ...glassCard(t),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 18,
          height: 110,
          width: "100%",
          background: highlight ? "rgba(220,38,38,0.18)" : t.glass,
          border: highlight ? "1px solid rgba(220,38,38,0.38)" : `1px solid ${t.border}`,
          boxShadow: highlight ? "0 20px 50px rgba(220,38,38,0.24)" : `0 20px 50px ${t.glow}`,
          color: t.text,
        }}
      >
        {title}
      </div>
    </button>
  );
}
