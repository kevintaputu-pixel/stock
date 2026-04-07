"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ThemeName = "dark" | "green" | "tropical" | "whiteBlue";

type Theme = {
  bg: string;
  card: string;
  cardSoft: string;
  header: string;
  border: string;
  text: string;
  textSoft: string;
  accent: string;
  accent2: string;
  shadow: string;
  danger: string;
  dangerSoft: string;
};

const themes: Record<ThemeName, Theme> = {
  dark: {
    bg: "#0b0b0f",
    card: "#111114",
    cardSoft: "#17171c",
    header: "#1b1b22",
    border: "#2a2a34",
    text: "#f4f4f5",
    textSoft: "#b3b3bf",
    accent: "#7c3aed",
    accent2: "#a78bfa",
    shadow: "rgba(124, 58, 237, 0.15)",
    danger: "#dc2626",
    dangerSoft: "rgba(220, 38, 38, 0.18)",
  },
  green: {
    bg: "#0d1b12",
    card: "#14241a",
    cardSoft: "#1b3123",
    header: "#244330",
    border: "#355b42",
    text: "#e8fff0",
    textSoft: "#b7d7c0",
    accent: "#22c55e",
    accent2: "#86efac",
    shadow: "rgba(34, 197, 94, 0.15)",
    danger: "#dc2626",
    dangerSoft: "rgba(220, 38, 38, 0.18)",
  },
  tropical: {
    bg: "#0f1720",
    card: "#16212c",
    cardSoft: "#1d2d3b",
    header: "#234154",
    border: "#35627d",
    text: "#eefcff",
    textSoft: "#b6d7df",
    accent: "#06b6d4",
    accent2: "#f59e0b",
    shadow: "rgba(6, 182, 212, 0.16)",
    danger: "#dc2626",
    dangerSoft: "rgba(220, 38, 38, 0.18)",
  },
  whiteBlue: {
    bg: "#eff5ff",
    card: "#ffffff",
    cardSoft: "#f6f9ff",
    header: "#e6efff",
    border: "#cfe0ff",
    text: "#0f172a",
    textSoft: "#5b6b89",
    accent: "#2563eb",
    accent2: "#60a5fa",
    shadow: "rgba(37, 99, 235, 0.14)",
    danger: "#dc2626",
    dangerSoft: "rgba(220, 38, 38, 0.12)",
  },
};

const themeOrder: ThemeName[] = ["whiteBlue", "dark", "green", "tropical"];

type Movement = {
  id: string;
  categorie: string | null;
  ref_mag: string | null;
  designation: string | null;
  ref_fournisseur: string | null;
  fournisseur: string | null;
  info: string | null;
  zone: string | null;
  demandeur: string | null;
  sorties: number | null;
  intervenant: string | null;
  entrees: number | null;
  date: string | null;
};

type AppDataRow = {
  id: string;
  type: "code";
  value: string;
  created_at: string;
};

export default function MouvementPage() {
  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [data, setData] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const [codes, setCodes] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [showDeleteCode, setShowDeleteCode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("stock-theme");
    if (
      savedTheme === "dark" ||
      savedTheme === "green" ||
      savedTheme === "tropical" ||
      savedTheme === "whiteBlue"
    ) {
      setTheme(savedTheme);
    } else {
      localStorage.setItem("stock-theme", "whiteBlue");
    }
  }, []);

  useEffect(() => {
    loadData();
    loadCodes();
  }, []);

  useEffect(() => {
    if (!deleteModalOpen) return;

    const timeout = window.setTimeout(() => {
      deleteInputRef.current?.focus();
      deleteInputRef.current?.select();
    }, 30);

    return () => window.clearTimeout(timeout);
  }, [deleteModalOpen]);

  function cycleTheme() {
    const currentIndex = themeOrder.indexOf(theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(nextTheme);
    localStorage.setItem("stock-theme", nextTheme);
  }

  function getThemeLabel(value: ThemeName) {
    if (value === "dark") return "Sombre";
    if (value === "green") return "Vert";
    if (value === "tropical") return "Tropical";
    return "Blanc / Bleu";
  }

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

  async function loadData() {
    setLoading(true);

    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setData(data || []);
    setLoading(false);
  }

  function openDeleteModal() {
    setDeleteCode("");
    setShowDeleteCode(false);
    setDeleteError("");
    setDeleteModalOpen(true);
  }

  async function handleDeleteHistory() {
    const codeValue = deleteCode.trim();

    if (!codeValue) {
      setDeleteError("Entre le code confidentiel.");
      return;
    }

    const isValid = codes.some((code) => code === codeValue);

    if (!isValid) {
      setDeleteError("Code confidentiel incorrect.");
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");

      const { error } = await supabase
        .from("movements")
        .delete()
        .not("id", "is", null);

      if (error) {
        console.error(error);
        setDeleteError("Impossible de supprimer l'historique.");
        return;
      }

      setData([]);
      setDeleteModalOpen(false);
      setDeleteCode("");
      setShowDeleteCode(false);
      setDeleteError("");
    } catch (error) {
      console.error(error);
      setDeleteError("Impossible de supprimer l'historique.");
    } finally {
      setDeleting(false);
    }
  }

  const currentTheme = themes[theme];

  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: 20,
        background: currentTheme.bg,
        color: currentTheme.text,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          flexShrink: 0,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={openDeleteModal}
            style={{
              background: currentTheme.danger,
              color: "#fff",
              border: "none",
              padding: "11px 16px",
              borderRadius: 12,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: `0 10px 30px ${currentTheme.dangerSoft}`,
            }}
          >
            Supprimé l&apos;historique
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" style={buttonLinkStyle(currentTheme)}>
            Page d’accueil
          </Link>

          <button
            onClick={cycleTheme}
            style={{
              background: currentTheme.accent,
              color: "#fff",
              border: "none",
              padding: "11px 16px",
              borderRadius: 12,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: `0 10px 30px ${currentTheme.shadow}`,
            }}
          >
            Mode : {getThemeLabel(theme)}
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          border: `1px solid ${currentTheme.border}`,
          borderRadius: 18,
          background: currentTheme.card,
          boxShadow: `0 10px 30px ${currentTheme.shadow}`,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1400,
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              background: currentTheme.header,
              zIndex: 10,
            }}
          >
            <tr>
              {[
                "CATEGORIE",
                "REF_MAG",
                "DESIGNATION",
                "REF_FOURNISSEUR",
                "FOURNISSEUR",
                "INFO",
                "ZONE",
                "DEMANDEUR",
                "SORTIES",
                "INTERVENANT",
                "ENTREES",
                "DATE",
              ].map((col) => (
                <th key={col} style={thStyle(currentTheme)}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} style={tdStyle(currentTheme)}>
                  Chargement...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={12} style={tdStyle(currentTheme)}>
                  Aucun mouvement enregistré
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle(currentTheme)}>{item.categorie || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.ref_mag || "-"}</td>
                  <td style={{ ...tdStyle(currentTheme), fontWeight: 700 }}>
                    {item.designation || "-"}
                  </td>
                  <td style={tdStyle(currentTheme)}>{item.ref_fournisseur || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.fournisseur || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.info || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.zone || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.demandeur || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.sorties ?? "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.intervenant || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.entrees ?? "-"}</td>
                  <td style={tdStyle(currentTheme)}>
                    {item.date ? new Date(item.date).toLocaleDateString("fr-FR") : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteModalOpen && (
        <div
          onClick={() => !deleting && setDeleteModalOpen(false)}
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
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 24,
              padding: 22,
              boxShadow: `0 20px 50px ${currentTheme.shadow}`,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              Supprimer l&apos;historique
            </div>

            <div
              style={{
                fontSize: 14,
                color: currentTheme.textSoft,
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              Entre le code confidentiel enregistré dans la page Données pour
              valider la suppression complète de tous les mouvements.
            </div>

            {deleteError ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: currentTheme.dangerSoft,
                  border: `1px solid ${currentTheme.danger}`,
                  color: currentTheme.text,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {deleteError}
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <input
                ref={deleteInputRef}
                autoFocus
                type={showDeleteCode ? "text" : "password"}
                value={deleteCode}
                onChange={(e) => setDeleteCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !deleting) {
                    handleDeleteHistory();
                  }
                }}
                placeholder="Saisir le code"
                style={{
                  width: "100%",
                  background: currentTheme.cardSoft,
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.text,
                  padding: "14px 16px",
                  borderRadius: 14,
                  outline: "none",
                  fontSize: 15,
                }}
              />

              <button
                onClick={() => setShowDeleteCode((prev) => !prev)}
                style={{
                  background: currentTheme.cardSoft,
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.text,
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  cursor: "pointer",
                  fontSize: 18,
                }}
                title={showDeleteCode ? "Masquer le code" : "Afficher le code"}
                disabled={deleting}
              >
                {showDeleteCode ? "🙈" : "👁️"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                style={{
                  background: currentTheme.cardSoft,
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.text,
                  padding: "12px 16px",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                Annuler
              </button>

              <button
                onClick={handleDeleteHistory}
                disabled={deleting}
                style={{
                  background: currentTheme.danger,
                  color: "#fff",
                  border: "none",
                  padding: "12px 16px",
                  borderRadius: 12,
                  fontWeight: 800,
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Suppression..." : "Valider la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function buttonLinkStyle(theme: {
  cardSoft: string;
  border: string;
  text: string;
  shadow: string;
}): CSSProperties {
  return {
    textDecoration: "none",
    background: theme.cardSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    padding: "11px 16px",
    borderRadius: 12,
    fontWeight: 700,
    boxShadow: `0 10px 30px ${theme.shadow}`,
  };
}

function thStyle(theme: {
  header: string;
  border: string;
  text: string;
}): CSSProperties {
  return {
    padding: 12,
    textAlign: "left",
    borderBottom: `1px solid ${theme.border}`,
    fontSize: 13,
    fontWeight: 800,
    color: theme.text,
    whiteSpace: "nowrap",
  };
}

function tdStyle(theme: {
  border: string;
  text: string;
}): CSSProperties {
  return {
    padding: 10,
    borderBottom: `1px solid ${theme.border}`,
    fontSize: 13,
    color: theme.text,
    whiteSpace: "nowrap",
  };
}