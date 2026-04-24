"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type Product = {
  id?: string;
  ref_mag?: string | null;
  designation?: string | null;
  demandeur?: string | null;
  fournisseur?: string | null;
  ref_fournisseur?: string | null;
  sf?: number | null;
  seuil_alerte?: number | null;
  qte_souhaite?: number | null;
};

type FournisseurGroup = {
  fournisseur: string;
  articles: Product[];
  totalQte: number;
};

type DemandeurGroup = {
  demandeur: string;
  articles: Product[];
  fournisseurs: FournisseurGroup[];
  totalQte: number;
};

const cleanName = (value?: string | null, fallback = "Non renseigné") => {
  const text = String(value || "").trim();
  return text.length > 0 ? text : fallback;
};

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export default function CommandePage() {
  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemandeur, setSelectedDemandeur] = useState<string | null>(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("stock-theme");
    if (savedTheme && themes[savedTheme as ThemeName]) {
      setTheme(savedTheme as ThemeName);
    }
  }, []);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase.from("products").select("*");

    if (error) {
      console.error("Erreur chargement commandes :", error.message || error);
      setProducts([]);
      setLoading(false);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const commandes = useMemo(() => {
    return products
      .filter((p) => {
        const sf = toNumber(p.sf);
        const seuil = toNumber(p.seuil_alerte);
        return seuil > 0 && sf <= seuil;
      })
      .sort((a, b) => {
        const demandeurA = cleanName(a.demandeur).toLowerCase();
        const demandeurB = cleanName(b.demandeur).toLowerCase();
        const fournisseurA = cleanName(a.fournisseur).toLowerCase();
        const fournisseurB = cleanName(b.fournisseur).toLowerCase();

        if (demandeurA !== demandeurB) return demandeurA.localeCompare(demandeurB);
        return fournisseurA.localeCompare(fournisseurB);
      });
  }, [products]);

  const demandeurGroups = useMemo<DemandeurGroup[]>(() => {
    const map = new Map<string, Product[]>();

    commandes.forEach((article) => {
      const demandeur = cleanName(article.demandeur);
      const current = map.get(demandeur) || [];
      current.push(article);
      map.set(demandeur, current);
    });

    return Array.from(map.entries()).map(([demandeur, articles]) => {
      const fournisseurMap = new Map<string, Product[]>();

      articles.forEach((article) => {
        const fournisseur = cleanName(article.fournisseur);
        const current = fournisseurMap.get(fournisseur) || [];
        current.push(article);
        fournisseurMap.set(fournisseur, current);
      });

      const fournisseurs = Array.from(fournisseurMap.entries())
        .map(([fournisseur, fournisseurArticles]) => ({
          fournisseur,
          articles: fournisseurArticles,
          totalQte: fournisseurArticles.reduce((sum, item) => sum + toNumber(item.qte_souhaite), 0),
        }))
        .sort((a, b) => a.fournisseur.localeCompare(b.fournisseur));

      return {
        demandeur,
        articles,
        fournisseurs,
        totalQte: articles.reduce((sum, item) => sum + toNumber(item.qte_souhaite), 0),
      };
    });
  }, [commandes]);

  const currentDemandeur = useMemo(() => {
    if (!selectedDemandeur) return null;
    return demandeurGroups.find((group) => group.demandeur === selectedDemandeur) || null;
  }, [demandeurGroups, selectedDemandeur]);

  const currentFournisseur = useMemo(() => {
    if (!currentDemandeur || !selectedFournisseur) return null;
    return currentDemandeur.fournisseurs.find((group) => group.fournisseur === selectedFournisseur) || null;
  }, [currentDemandeur, selectedFournisseur]);

  function openDemandeur(demandeur: string) {
    setSelectedDemandeur(demandeur);
    setSelectedFournisseur(null);
  }

  function backToDemandeurs() {
    setSelectedDemandeur(null);
    setSelectedFournisseur(null);
  }

  function backToFournisseurs() {
    setSelectedFournisseur(null);
  }

  function downloadPdf() {
    if (!currentDemandeur || !currentFournisseur) return;

    const pdf = buildCommandePdf({
      demandeur: currentDemandeur.demandeur,
      fournisseur: currentFournisseur.fournisseur,
      articles: currentFournisseur.articles,
    });

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `demande-de-devis-${safeFileName(currentDemandeur.demandeur)}-${safeFileName(currentFournisseur.fournisseur)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const t = themes[theme];
  const totalQte = commandes.reduce((sum, item) => sum + toNumber(item.qte_souhaite), 0);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at 10% 10%, ${t.glow} 0%, transparent 30%),
          radial-gradient(circle at 90% 90%, ${t.glow} 0%, transparent 30%),
          linear-gradient(135deg, ${t.bg} 0%, ${t.bg2} 100%)
        `,
        color: t.text,
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20 }}>
        <section className="no-print" style={glassCard(t, true)}>
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 20, alignItems: "center" }}>
            <div>
              <div style={badgeStyle(t)}>Stock Manager</div>
              <h1 style={titleStyle()}>Commandes</h1>
              <p style={descStyle(t)}>
                Regroupement automatique par demandeur puis par fournisseur, selon les articles dont le stock final est inférieur ou égal au seuil d’alerte.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                <Link href="/" style={ghostLink(t)}>
                  Accueil
                </Link>
                <Link href="/products" style={ghostLink(t)}>
                  Retour articles
                </Link>
                <button onClick={loadProducts} style={primaryBtn(t)}>
                  Actualiser
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <StatCard t={t} label="Articles" value={commandes.length} />
              <StatCard t={t} label="Demandeurs" value={demandeurGroups.length} />
              <StatCard t={t} label="Qté souhaitée" value={totalQte} />
            </div>
          </div>
        </section>

        <section style={glassCard(t)}>
          {loading ? (
            <EmptyState t={t} title="Chargement des commandes..." text="Lecture des articles en cours." />
          ) : commandes.length === 0 ? (
            <EmptyState t={t} title="Aucune commande à passer" text="Tous les stocks sont au-dessus du seuil d’alerte." />
          ) : !currentDemandeur ? (
            <div className="no-print" style={{ display: "grid", gap: 16 }}>
              <TopLine t={t} title="1. Choisir un demandeur" count={`${demandeurGroups.length} groupe(s)`} />
              <div style={gridCards()}>
                {demandeurGroups.map((group) => (
                  <button key={group.demandeur} onClick={() => openDemandeur(group.demandeur)} style={selectCard(t)}>
                    <div style={smallLabel(t)}>Demandeur</div>
                    <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{group.demandeur}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
                      <SmallInfo t={t} label="Fournisseurs" value={group.fournisseurs.length} />
                      <SmallInfo t={t} label="Qté" value={group.totalQte} />
                    </div>
                    <div style={{ marginTop: 16, color: t.accent, fontWeight: 900 }}>Voir les fournisseurs →</div>
                  </button>
                ))}
              </div>
            </div>
          ) : currentDemandeur && !currentFournisseur ? (
            <div className="no-print" style={{ display: "grid", gap: 16 }}>
              <div>
                <button onClick={backToDemandeurs} style={backBtn(t)}>← Retour commande / demandeurs</button>
                <TopLine t={t} title={`2. Fournisseurs de ${currentDemandeur.demandeur}`} count={`${currentDemandeur.fournisseurs.length} fournisseur(s)`} />
              </div>
              <div style={gridCards()}>
                {currentDemandeur.fournisseurs.map((group) => (
                  <button key={group.fournisseur} onClick={() => setSelectedFournisseur(group.fournisseur)} style={selectCard(t)}>
                    <div style={smallLabel(t)}>Fournisseur</div>
                    <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{group.fournisseur}</div>
                    <div style={{ marginTop: 16 }}>
                      <SmallInfo t={t} label="Quantité souhaitée" value={group.totalQte} large />
                    </div>
                    <div style={{ marginTop: 16, color: t.accent, fontWeight: 900 }}>Voir les articles →</div>
                  </button>
                ))}
              </div>
            </div>
          ) : currentDemandeur && currentFournisseur ? (
            <div style={{ display: "grid", gap: 18 }}>
              <div className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <button onClick={backToFournisseurs} style={backBtn(t)}>← Retour aux fournisseurs</button>
                    <button onClick={backToDemandeurs} style={backBtn(t)}>← Retour commande</button>
                  </div>
                  <h2 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 900 }}>3. Demande de devis</h2>
                  <p style={{ margin: "6px 0 0", color: t.textSoft }}>
                    {currentDemandeur.demandeur} / {currentFournisseur.fournisseur}
                  </p>
                </div>
                <button onClick={downloadPdf} style={primaryBtn(t)}>
                  Télécharger PDF
                </button>
              </div>

              <div className="print-title" style={{ display: "none" }}>
                <h1>Demande de devis / quotation request</h1>
                <p>Demandeur : {currentDemandeur.demandeur}</p>
                <p>Fournisseur : {currentFournisseur.fournisseur}</p>
              </div>

              <div style={{ overflowX: "auto", borderRadius: 24, border: `1px solid ${t.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: t.glass, color: t.text }}>
                      <th style={thStyle(t)}>Référence Magasin</th>
                      <th style={thStyle(t)}>Référence fournisseur</th>
                      <th style={thStyle(t)}>Désignation</th>
                      <th style={{ ...thStyle(t), textAlign: "right" }}>Quantité souhaitée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFournisseur.articles.map((p, index) => (
                      <tr key={p.id || index}>
                        <td style={{ ...tdStyle(t), fontWeight: 900 }}>{p.ref_mag || "-"}</td>
                        <td style={tdStyle(t)}>{p.ref_fournisseur || "-"}</td>
                        <td style={tdStyle(t)}>{p.designation || "-"}</td>
                        <td style={{ ...tdStyle(t), textAlign: "right", fontWeight: 900, color: t.accent }}>{toNumber(p.qte_souhaite)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          main section > div[style*="grid-template-columns: 1.15fr"] {
            grid-template-columns: 1fr !important;
          }
          main section > div > div[style*="repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-title {
            display: block !important;
            color: black !important;
            margin-bottom: 18px !important;
          }

          .print-title h1 {
            font-size: 22px !important;
            margin: 0 0 12px !important;
            color: black !important;
          }

          .print-title p {
            margin: 4px 0 !important;
            color: black !important;
            font-size: 12px !important;
          }

          main {
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }

          section,
          div {
            background: white !important;
            box-shadow: none !important;
            border-color: transparent !important;
          }

          table {
            color: black !important;
            font-size: 11px !important;
            width: 100% !important;
          }

          th {
            background: #e5e7eb !important;
            color: black !important;
            font-weight: 800 !important;
          }

          td,
          th {
            border: 1px solid #333 !important;
            color: black !important;
            padding: 8px !important;
          }
        }
      `}</style>
    </main>
  );
}


function safeFileName(value: string) {
  return String(value || "commande")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "commande";
}

function pdfText(value: unknown) {
  return String(value ?? "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()\\]/g, "\\$&")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 140);
}

function cut(value: unknown, max: number) {
  const text = String(value ?? "-").trim() || "-";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function buildCommandePdf({
  demandeur,
  fournisseur,
  articles,
}: {
  demandeur: string;
  fournisseur: string;
  articles: Product[];
}) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 36;
  const rowHeight = 22;
  const bottom = 50;
  const objects: string[] = [];
  const pages: number[] = [];

  function addObject(content: string) {
    objects.push(content);
    return objects.length;
  }

  const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const makePage = (lines: string[]) => {
    const content = [
      "BT /F2 18 Tf 36 806 Td (Demande de devis / quotation request) Tj ET",
      `BT /F1 10 Tf 36 784 Td (Demandeur : ${pdfText(demandeur)}) Tj ET`,
      `BT /F1 10 Tf 36 768 Td (Fournisseur : ${pdfText(fournisseur)}) Tj ET`,
      ...lines,
    ].join("\n");
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pages.push(pageId);
  };

  let y = 730;
  let lines: string[] = [];

  const drawHeader = () => {
    lines.push(`0.90 0.92 0.96 rg ${margin} ${y - 4} 523 22 re f`);
    lines.push("0 g");
    lines.push(`BT /F2 8 Tf ${margin + 6} ${y + 3} Td (REF. MAGASIN) Tj ET`);
    lines.push(`BT /F2 8 Tf ${margin + 116} ${y + 3} Td (REF. FOURNISSEUR) Tj ET`);
    lines.push(`BT /F2 8 Tf ${margin + 246} ${y + 3} Td (DESIGNATION) Tj ET`);
    lines.push(`BT /F2 8 Tf ${margin + 466} ${y + 3} Td (QTE) Tj ET`);
    y -= rowHeight;
  };

  const newPageIfNeeded = () => {
    if (y < bottom) {
      makePage(lines);
      lines = [];
      y = 730;
      drawHeader();
    }
  };

  drawHeader();
  articles.forEach((article, index) => {
    newPageIfNeeded();
    if (index % 2 === 0) {
      lines.push(`0.98 0.98 0.99 rg ${margin} ${y - 4} 523 22 re f`);
      lines.push("0 g");
    }
    lines.push(`BT /F1 8 Tf ${margin + 6} ${y + 3} Td (${pdfText(cut(article.ref_mag, 18))}) Tj ET`);
    lines.push(`BT /F1 8 Tf ${margin + 116} ${y + 3} Td (${pdfText(cut(article.ref_fournisseur, 22))}) Tj ET`);
    lines.push(`BT /F1 8 Tf ${margin + 246} ${y + 3} Td (${pdfText(cut(article.designation, 42))}) Tj ET`);
    lines.push(`BT /F2 8 Tf ${margin + 466} ${y + 3} Td (${pdfText(toNumber(article.qte_souhaite))}) Tj ET`);
    y -= rowHeight;
  });
  if (lines.length) makePage(lines);

  const kids = pages.map((id) => `${id} 0 R`).join(" ");
  const pagesId = addObject(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  objects.forEach((content, index) => {
    objects[index] = content.replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
  });
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
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
    boxShadow: `0 14px 34px ${t.glow}`,
  };
}

function ghostLink(t: any): React.CSSProperties {
  return {
    background: t.glass,
    border: `1px solid ${t.border}`,
    color: t.text,
    padding: "12px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
  };
}

function gridCards(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 16,
  };
}

function selectCard(t: any): React.CSSProperties {
  return {
    ...glassCard(t),
    minHeight: 190,
    textAlign: "left",
    color: t.text,
    cursor: "pointer",
    transition: "transform 0.18s ease, border 0.18s ease",
    width: "100%",
  };
}

function smallLabel(t: any): React.CSSProperties {
  return {
    color: t.textSoft,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  };
}

function SmallInfo({ t, label, value, large = false }: any) {
  return (
    <div
      style={{
        background: t.glass,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <div style={{ color: t.textSoft, fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: large ? 32 : 22, fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function StatCard({ t, label, value }: any) {
  return (
    <div style={{ ...glassCard(t), padding: 16, minHeight: 110 }}>
      <div style={{ color: t.textSoft, fontSize: 13, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 34, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function EmptyState({ t, title, text }: any) {
  return (
    <div
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 22,
        padding: 32,
        textAlign: "center",
        background: t.glass,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{title}</h2>
      <p style={{ margin: "10px 0 0", color: t.textSoft }}>{text}</p>
    </div>
  );
}

function TopLine({ t, title, count }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{title}</h2>
      <span
        style={{
          background: t.glass,
          border: `1px solid ${t.border}`,
          color: t.textSoft,
          borderRadius: 999,
          padding: "7px 12px",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {count}
      </span>
    </div>
  );
}

function backBtn(t: any): React.CSSProperties {
  return {
    background: "transparent",
    border: "none",
    color: t.accent,
    fontWeight: 900,
    cursor: "pointer",
    padding: 0,
    fontSize: 14,
  };
}

function thStyle(t: any): React.CSSProperties {
  return {
    padding: 13,
    borderBottom: `1px solid ${t.border}`,
    textAlign: "left",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };
}

function tdStyle(t: any): React.CSSProperties {
  return {
    padding: 13,
    borderTop: `1px solid ${t.border}`,
    color: t.text,
  };
}
