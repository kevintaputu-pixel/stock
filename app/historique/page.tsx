"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { jsPDF } from "jspdf";

type ThemeName = "dark" | "green" | "tropical" | "whiteBlue";

type Theme = {
  bg: string;
  card: string;
  cardSoft: string;
  border: string;
  text: string;
  textSoft: string;
  accent: string;
  accent2: string;
  shadow: string;
  overlay: string;
};

type Movement = {
  id: string;
  designation: string | null;
  categorie: string | null;
  fournisseur: string | null;
  zone: string | null;
  info: string | null;
  demandeur: string | null;
  intervenant: string | null;
  entrees: number | null;
  sorties: number | null;
  date: string | null;
};

type MonthGroup = {
  key: string;
  label: string;
  items: Movement[];
};

const themes: Record<ThemeName, Theme> = {
  dark: {
    bg: "#0b0b0f",
    card: "#111114",
    cardSoft: "#17171c",
    border: "#2a2a34",
    text: "#f4f4f5",
    textSoft: "#b3b3bf",
    accent: "#7c3aed",
    accent2: "#a78bfa",
    shadow: "rgba(124,58,237,0.15)",
    overlay: "rgba(0,0,0,0.65)",
  },
  green: {
    bg: "#0d1b12",
    card: "#14241a",
    cardSoft: "#1b3123",
    border: "#355b42",
    text: "#e8fff0",
    textSoft: "#b7d7c0",
    accent: "#22c55e",
    accent2: "#86efac",
    shadow: "rgba(34,197,94,0.15)",
    overlay: "rgba(0,0,0,0.65)",
  },
  tropical: {
    bg: "#0f1720",
    card: "#16212c",
    cardSoft: "#1d2d3b",
    border: "#35627d",
    text: "#eefcff",
    textSoft: "#b6d7df",
    accent: "#06b6d4",
    accent2: "#f59e0b",
    shadow: "rgba(6,182,212,0.16)",
    overlay: "rgba(0,0,0,0.65)",
  },
  whiteBlue: {
    bg: "#eff5ff",
    card: "#ffffff",
    cardSoft: "#f6f9ff",
    border: "#cfe0ff",
    text: "#0f172a",
    textSoft: "#5b6b89",
    accent: "#2563eb",
    accent2: "#60a5fa",
    shadow: "rgba(37,99,235,0.14)",
    overlay: "rgba(15,23,42,0.42)",
  },
};

const themeOrder: ThemeName[] = ["whiteBlue", "dark", "green", "tropical"];

const monthNames = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export default function HistoriquePage() {
  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [selected, setSelected] = useState<MonthGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState("historique.pdf");
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error(error);
      alert(error.message);
      setLoading(false);
      return;
    }

    setMovements((data as Movement[]) || []);
    setLoading(false);
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

  function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("fr-FR").format(value);
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("fr-FR");
  }

  const months = useMemo(() => {
    const map = new Map<string, MonthGroup>();

    movements.forEach((m) => {
      if (!m.date) return;
      const d = new Date(m.date);
      if (Number.isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      if (!map.has(key)) {
        map.set(key, { key, label, items: [] });
      }
      map.get(key)!.items.push(m);
    });

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [movements]);

  const t = themes[theme];

  const selectedTotalEntries = selected
    ? selected.items.reduce((sum, item) => sum + (item.entrees ?? 0), 0)
    : 0;

  const selectedTotalOutputs = selected
    ? selected.items.reduce((sum, item) => sum + (item.sorties ?? 0), 0)
    : 0;

  async function buildPdfPreview() {
    if (!selected) return;

    setGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let y = 14;

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 18, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`Mouvement ${selected.label}`, 10, 12);

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(selected.label, 10, 28);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total mouvements : ${selected.items.length}`, 10, 35);
      doc.text(`Total entrées : ${formatNumber(selectedTotalEntries)}`, 70, 35);
      doc.text(`Total sorties : ${formatNumber(selectedTotalOutputs)}`, 120, 35);

      y = 43;

      const columns = [
        { label: "Désignation", x: 10, w: 55 },
        { label: "Catégorie", x: 65, w: 35 },
        { label: "Fournisseur", x: 100, w: 42 },
        { label: "Zone", x: 142, w: 20 },
        { label: "Entrées", x: 162, w: 20 },
        { label: "Sorties", x: 182, w: 20 },
        { label: "Date", x: 202, w: 30 },
        { label: "Intervenant", x: 232, w: 48 },
      ];

      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(210, 220, 240);
      doc.rect(10, y, 270, 10, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      columns.forEach((col) => {
        doc.text(col.label, col.x + 1.5, y + 6.4, { maxWidth: col.w - 2 });
      });

      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      for (const item of selected.items) {
        const rowHeight = 11;

        if (y + rowHeight > pageHeight - 12) {
          doc.addPage();
          y = 14;
          doc.setFillColor(239, 246, 255);
          doc.rect(10, y, 270, 10, "FD");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          columns.forEach((col) => {
            doc.text(col.label, col.x + 1.5, y + 6.4, { maxWidth: col.w - 2 });
          });
          y += 10;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
        }

        doc.setDrawColor(225, 225, 225);
        doc.rect(10, y, 270, rowHeight);

        const values = [
          item.designation || "-",
          item.categorie || "-",
          item.fournisseur || "-",
          item.zone || "-",
          formatNumber(item.entrees),
          formatNumber(item.sorties),
          formatDate(item.date),
          item.intervenant || "-",
        ];

        values.forEach((value, index) => {
          doc.text(String(value), columns[index].x + 1.5, y + 6.7, {
            maxWidth: columns[index].w - 2,
          });
        });

        y += rowHeight;
      }

      const blob = doc.output("blob");
      const nextUrl = URL.createObjectURL(blob);

      if (pdfUrl) URL.revokeObjectURL(pdfUrl);

      setPdfUrl(nextUrl);
      setPdfFileName(`Mouvement ${selected.label}.pdf`);
      setShowPdfPreview(true);
    } catch (error) {
      console.error(error);
      alert("Impossible de générer le PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  function downloadPdf() {
    if (!pdfUrl) return;

    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = pdfFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function closeAllModals() {
    setSelected(null);
    setShowPdfPreview(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.text,
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "grid",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link href="/" style={buttonLinkStyle(t)}>
            Page d’accueil
          </Link>

          <Link href="/mouvement" style={buttonLinkStyle(t)}>
            Mouvements
          </Link>

          <button
            onClick={cycleTheme}
            style={{
              background: t.accent,
              color: "#fff",
              border: "none",
              padding: "11px 16px",
              borderRadius: 12,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: `0 10px 30px ${t.shadow}`,
            }}
          >
            Mode : {getThemeLabel(theme)}
          </button>
        </div>

        <section
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 24,
            padding: 20,
            boxShadow: `0 10px 30px ${t.shadow}`,
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 900 }}>Historique des mouvements</div>
          <div
            style={{
              marginTop: 6,
              color: t.textSoft,
              fontSize: 14,
            }}
          >
            Clique sur un mois pour ouvrir le détail, puis génère un vrai PDF téléchargeable.
          </div>
        </section>

        <section
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 24,
            padding: 20,
            boxShadow: `0 10px 30px ${t.shadow}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {loading ? (
              <div style={monthCardStyle(t)}>Chargement...</div>
            ) : months.length === 0 ? (
              <div style={monthCardStyle(t)}>Aucun historique disponible</div>
            ) : (
              months.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setSelected(m);
                    setShowPdfPreview(false);
                  }}
                  style={monthCardStyle(t)}
                >
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{m.label}</div>
                  <div style={{ marginTop: 8, color: t.textSoft, fontSize: 13 }}>
                    {m.items.length} mouvement{m.items.length > 1 ? "s" : ""}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {selected && !showPdfPreview && (
        <div
          onClick={closeAllModals}
          style={{
            position: "fixed",
            inset: 0,
            background: t.overlay,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 960,
              maxHeight: "90vh",
              overflowY: "auto",
              background: t.card,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 24,
              padding: 20,
              boxShadow: `0 20px 60px ${t.shadow}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>{selected.label}</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={buildPdfPreview}
                  disabled={generatingPdf}
                  style={{
                    background: t.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "11px 16px",
                    fontWeight: 800,
                    cursor: "pointer",
                    opacity: generatingPdf ? 0.7 : 1,
                  }}
                >
                  {generatingPdf ? "Génération..." : "Aperçu PDF"}
                </button>

                <button onClick={closeAllModals} style={buttonLinkStyle(t)}>
                  Fermer
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {selected.items.map((i) => (
                <div key={i.id} style={detailItemStyle(t)}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>
                        {i.designation || "-"}
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                          color: t.textSoft,
                          lineHeight: 1.6,
                        }}
                      >
                        Catégorie : {i.categorie || "-"} • Fournisseur : {i.fournisseur || "-"}
                        <br />
                        Zone : {i.zone || "-"} • Demandeur : {i.demandeur || "-"}
                        <br />
                        Intervenant : {i.intervenant || "-"} • Info : {i.info || "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        minWidth: 160,
                        fontSize: 13,
                        color: t.textSoft,
                        lineHeight: 1.8,
                      }}
                    >
                      <div>Date : {formatDate(i.date)}</div>
                      <div>Entrées : {formatNumber(i.entrees)}</div>
                      <div>Sorties : {formatNumber(i.sorties)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPdfPreview && selected && pdfUrl && (
        <div
          onClick={closeAllModals}
          style={{
            position: "fixed",
            inset: 0,
            background: t.overlay,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 1200,
              height: "90vh",
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: 24,
              padding: 16,
              boxShadow: `0 20px 60px ${t.shadow}`,
              display: "grid",
              gridTemplateRows: "auto 1fr",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                Aperçu PDF - {selected.label}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={downloadPdf}
                  style={{
                    background: t.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "11px 16px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Télécharger sur le PC
                </button>

                <button
                  onClick={() => setShowPdfPreview(false)}
                  style={buttonLinkStyle(t)}
                >
                  Retour
                </button>

                <button onClick={closeAllModals} style={buttonLinkStyle(t)}>
                  Fermer
                </button>
              </div>
            </div>

            <iframe
              src={pdfUrl}
              title="Aperçu PDF"
              style={{
                width: "100%",
                height: "100%",
                border: `1px solid ${t.border}`,
                borderRadius: 16,
                background: "#fff",
              }}
            />
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
}): React.CSSProperties {
  return {
    textDecoration: "none",
    background: theme.cardSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    padding: "11px 16px",
    borderRadius: 12,
    fontWeight: 700,
    boxShadow: `0 10px 30px ${theme.shadow}`,
    cursor: "pointer",
  };
}

function monthCardStyle(theme: {
  cardSoft: string;
  border: string;
  text: string;
  textSoft: string;
  shadow: string;
}): React.CSSProperties {
  return {
    textAlign: "left",
    background: theme.cardSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 18,
    padding: 18,
    cursor: "pointer",
    boxShadow: `0 10px 30px ${theme.shadow}`,
  };
}

function detailItemStyle(theme: {
  cardSoft: string;
  border: string;
}): React.CSSProperties {
  return {
    background: theme.cardSoft,
    border: `1px solid ${theme.border}`,
    borderRadius: 18,
    padding: 16,
  };
}
