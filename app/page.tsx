"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAccessRealtime } from "@/lib/useAccessRealtime";

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
    glass: "rgba(255,255,255,0.72)",
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

const HOME_ACCESS_KEY = "access:/";

export default function HomePage() {
  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [regularizeCount, setRegularizeCount] = useState(0);
  const [codes, setCodes] = useState<string[]>([]);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const [codeInput, setCodeInput] = useState("");
  const [showCode, setShowCode] = useState(false);

  const [codeTarget, setCodeTarget] = useState<"/" | "/donnees" | "/regularisation" | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestingForgotCode, setRequestingForgotCode] = useState(false);
  const [requestStatusText, setRequestStatusText] = useState("");

  const router = useRouter();
useAccessRealtime(
  requestId,
  codeTarget || "/",
  () => {
    setForgotModalOpen(false);
    setCodeModalOpen(false);
    setRequestId(null);
    setRequestStatusText("");

    if (codeTarget === "/") {
      localStorage.setItem(HOME_ACCESS_KEY, "true");
      setIsAuthenticated(true);
      return;
    }

    if (codeTarget) {
      localStorage.setItem(`access:${codeTarget}`, "true");
      window.location.href = codeTarget;
    }
  },
  () => {
    setRequestStatusText("Refusé");
  }
);

  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const forgotOkButtonRef = useRef<HTMLButtonElement | null>(null);

  

  useEffect(() => {
    const savedTheme = localStorage.getItem("stock-theme");
    if (savedTheme && themes[savedTheme as ThemeName]) {
      setTheme(savedTheme as ThemeName);
    } else {
      localStorage.setItem("stock-theme", "whiteBlue");
    }
  }, []);

  useEffect(() => {
    loadCodes();
    loadRegularizeCount();

    const hasHomeAccess = localStorage.getItem(HOME_ACCESS_KEY) === "true";
    setIsAuthenticated(hasHomeAccess);
    setAuthChecked(true);

    if (!hasHomeAccess) {
      setCodeTarget("/");
      setCodeModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!codeModalOpen) return;

    const timer = window.setTimeout(() => {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    }, 30);

    return () => window.clearTimeout(timer);
  }, [codeModalOpen]);

  useEffect(() => {
    if (!forgotModalOpen) return;

    const timer = window.setTimeout(() => {
      forgotOkButtonRef.current?.focus();
    }, 30);

    return () => window.clearTimeout(timer);
  }, [forgotModalOpen]);

async function loadCodes() {
  const { data, error } = await supabase
    .from("app_data")
    .select("id, type, value")
    .eq("type", "code");

  if (error) {
    console.log("LOAD CODES ERROR =", error);
    return;
  }

  const rows = (data as AppDataRow[]) || [];
  setCodes(rows.map((row) => (row.value || "").trim()).filter(Boolean));
}

async function loadRegularizeCount() {
  const { data, error } = await supabase
    .from("products")
    .select("*"); // ⚠️ on prend tout pour éviter erreur de colonne

  if (error) {
    console.log("LOAD REGULARIZE ERROR =", error);
    return;
  }

  const rows = Array.isArray(data) ? data : [];

  const count = rows.filter((item: any) => {
    const sf = item?.sf;
    const inventaire = item?.inventaire;

    return (
      sf !== null &&
      sf !== undefined &&
      inventaire !== null &&
      inventaire !== undefined &&
      sf !== inventaire
    );
  }).length;

  setRegularizeCount(count);
}

  function cycleTheme() {
    const next = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
    setTheme(next);
    localStorage.setItem("stock-theme", next);
  }

  function getThemeLabel(value: ThemeName) {
    if (value === "dark") return "Sombre";
    if (value === "green") return "Vert";
    if (value === "tropical") return "Tropical";
    return "Blanc / Bleu";
  }

  function openCodeModal(target: "/" | "/donnees" | "/regularisation") {
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

    setCodeModalOpen(false);

    if (codeTarget === "/") {
      localStorage.setItem(HOME_ACCESS_KEY, "true");
      setIsAuthenticated(true);
      return;
    }

    if (codeTarget) {
      router.push(codeTarget);
    }
  }

  async function handleForgotCodeRequest() {
    if (!codeTarget) return;

    try {
      setRequestingForgotCode(true);

      const pageForApi = codeTarget;

      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: pageForApi,
        }),
      });

      const json = (await res.json()) as AccessRequestResponse;

      if (!res.ok || !json.ok || !json.requestId) {
        alert(json.message || "Impossible d'envoyer la demande.");
        return;
      }

      setRequestId(json.requestId);
      setRequestStatusText("La demande d'accès a bien été envoyée. En attente de validation.");
      setForgotModalOpen(true);
      console.log("REQUEST ID =", json.requestId);
    } catch (error) {
      console.error(error);
      alert("Impossible d'envoyer la demande.");
    } finally {
      setRequestingForgotCode(false);
    }
  }

  function logoutHomeAccess() {
    localStorage.removeItem(HOME_ACCESS_KEY);
    setIsAuthenticated(false);
    openCodeModal("/");
  }

  const t = themes[theme];
  const hasAlert = regularizeCount > 0;

  if (!authChecked) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${t.bg} 0%, ${t.bg2} 100%)`,
        }}
      />
    );
  }

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
      <style jsx global>{`
        @keyframes kitt-scan {
          0% { left: 6%; }
          100% { left: calc(94% - 72px); }
        }
      `}</style>

      {isAuthenticated && (
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20 }}>
          <section style={glassCard(t, true)}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
              <div>
                <div style={badgeStyle(t)}>Stock Manager</div>

                <h1 style={titleStyle()}>
                  Gestion de stock
                </h1>

                <p style={descStyle(t)}>
                  
                </p>

                <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                  <button onClick={cycleTheme} style={ghostBtn(t)}>
                    Mode : {getThemeLabel(theme)}
                  </button>

                  <button onClick={logoutHomeAccess} style={ghostBtn(t)}>
                    Verrouiller le site
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <button
                  onClick={() => openCodeModal("/donnees")}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    color: "inherit",
                  }}
                >
                  <MiniCard
                    t={t}
                    title="Données"
                    text="Gestion des emails, personnes, codes et e-mails admin"
                  />
                </button>

                <Link href="/commande" style={{ textDecoration: "none", color: "inherit" }}>
                  <MiniCard
                    t={t}
                    title="Commande"
                    text="Suivi et gestion des commandes"
                  />
                </Link>

                <Link href="/historique" style={{ textDecoration: "none", color: "inherit" }}>
                  <MiniCard
                    t={t}
                    title="Historique des mouvements"
                    text="Voir tous les mouvements enregistrés"
                  />
                </Link>
              </div>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 20,
              alignItems: "stretch",
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

          <section style={kittPanelStyle(t)}>
            <div style={kittTrackStyle(t)}>
              <div style={kittScannerStyle()} />
            </div>
          </section>
        </div>
      )}

      {codeModalOpen && (
        <div
          onClick={() => {
            if (codeTarget !== "/") setCodeModalOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && codeTarget !== "/") setCodeModalOpen(false);
          }}
          tabIndex={-1}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.52)",
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
              maxWidth: 520,
              background: t.glass,
              backdropFilter: "blur(18px)",
              border: `1px solid ${t.border}`,
              borderRadius: 26,
              padding: 26,
              boxShadow: `0 20px 50px ${t.glow}`,
            }}
          >
            <div
              style={{
                color: t.textSoft,
                fontSize: 13,
                marginBottom: 8,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Authentification
            </div>

            <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 10 }}>
              {codeTarget === "/" ? "Accès sécurisé" : "Code confidentiel"}
            </div>

            <div
              style={{
                fontSize: 14,
                color: t.textSoft,
                marginBottom: 18,
                lineHeight: 1.6,
              }}
            >
              {codeTarget === "/"
                ? "Entre le code pour accéder à la page d’accueil."
                : "Entre le code confidentiel pour accéder à cette page."}
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
                ref={codeInputRef}
                type={showCode ? "text" : "password"}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") validateCodeAccess();
                }}
                placeholder="Saisir le code"
                style={inputStyle(t)}
              />

              <button
                onClick={() => {
                  setShowCode((prev) => !prev);
                  window.setTimeout(() => codeInputRef.current?.focus(), 0);
                }}
                style={iconButtonStyle(t)}
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
              {codeTarget !== "/" && (
                <button onClick={() => setCodeModalOpen(false)} style={ghostBtn(t)}>
                  Annuler
                </button>
              )}
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setForgotModalOpen(false);
            }
            if (e.key === "Escape") setForgotModalOpen(false);
          }}
          tabIndex={-1}
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
              background: t.glass,
              backdropFilter: "blur(18px)",
              border: `1px solid ${t.border}`,
              borderRadius: 24,
              padding: 24,
              boxShadow: `0 20px 50px ${t.glow}`,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
              Demande d'accès
            </div>
            <div style={{ fontSize: 14, color: t.textSoft, lineHeight: 1.6, marginBottom: 18 }}>
              {requestStatusText || "Une demande d'accès sera envoyée pour validation."}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                ref={forgotOkButtonRef}
                onClick={() => setForgotModalOpen(false)}
                style={primaryBtn(t)}
              >
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
    letterSpacing: "-0.02em",
  };
}

function descStyle(t: any): React.CSSProperties {
  return {
    marginTop: 12,
    fontSize: 15,
    color: t.textSoft,
    maxWidth: 680,
    lineHeight: 1.7,
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

function inputStyle(t: any): React.CSSProperties {
  return {
    width: "100%",
    background: t.glass,
    border: `1px solid ${t.border}`,
    color: t.text,
    padding: "14px 16px",
    borderRadius: 14,
    outline: "none",
    fontSize: 15,
  };
}

function iconButtonStyle(t: any): React.CSSProperties {
  return {
    background: t.glass,
    border: `1px solid ${t.border}`,
    color: t.text,
    width: 48,
    height: 48,
    borderRadius: 14,
    cursor: "pointer",
    fontSize: 18,
  };
}

function kittPanelStyle(t: any): React.CSSProperties {
  return {
    ...glassCard(t),
    position: "relative",
    overflow: "hidden",
    minHeight: 76,
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function kittTrackStyle(t: any): React.CSSProperties {
  return {
    position: "relative",
    width: "100%",
    height: 16,
    borderRadius: 999,
    background: "linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
    border: `1px solid ${t.border}`,
    overflow: "hidden",
    boxShadow: "inset 0 0 18px rgba(0,0,0,0.22)",
  };
}

function kittScannerStyle(): React.CSSProperties {
  return {
    position: "absolute",
    top: 1,
    left: "6%",
    width: 72,
    height: 12,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,120,120,0.92), rgba(255,36,36,1), rgba(255,120,120,0.92), rgba(255,255,255,0))",
    boxShadow:
      "0 0 10px rgba(255,0,0,0.88), 0 0 22px rgba(255,0,0,0.55), 0 0 34px rgba(255,0,0,0.28)",
    animation: "kitt-scan 1.6s ease-in-out infinite alternate",
  };
}

function MiniCard({ t, title, text }: any) {
  return (
    <div
      style={{
        ...glassCard(t),
        minHeight: 104,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18, color: t.text }}>{title}</div>
      <div style={{ fontSize: 13, color: t.textSoft, marginTop: 6 }}>{text}</div>
    </div>
  );
}

function Card({ href, t, title, highlight = false }: any) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        display: "block",
        width: "100%",
        color: "inherit",
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
          minHeight: 120,
          width: "100%",
          boxSizing: "border-box",
          background: highlight ? "rgba(220,38,38,0.18)" : t.glass,
          border: highlight ? "1px solid rgba(220,38,38,0.38)" : `1px solid ${t.border}`,
          boxShadow: highlight ? "0 20px 50px rgba(220,38,38,0.24)" : `0 20px 50px ${t.glow}`,
          color: t.text,
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
        width: "100%",
        display: "block",
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
          minHeight: 120,
          width: "100%",
          boxSizing: "border-box",
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