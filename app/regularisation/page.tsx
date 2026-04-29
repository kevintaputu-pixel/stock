"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  danger: string;
  success: string;
};

type Product = {
  id: string;
  categorie: string | null;
  designation: string | null;
  ref_mag: string | null;
  fournisseur: string | null;
  zone: string | null;
  info: string | null;
  sf: number | null;
  inventaire: number | null;
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
    danger: "#dc2626",
    success: "#16a34a",
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
    danger: "#dc2626",
    success: "#16a34a",
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
    danger: "#dc2626",
    success: "#16a34a",
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
    danger: "#dc2626",
    success: "#16a34a",
  },
};

const themeOrder: ThemeName[] = ["whiteBlue", "dark", "green", "tropical"];

export default function RegularisationPage() {
  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

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

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, categorie, designation, ref_mag, fournisseur, zone, info, sf, inventaire")
      .order("designation", { ascending: true });

    if (error) {
      console.error(error);
      alert(error.message);
      setLoading(false);
      return;
    }

    setProducts((data as Product[]) || []);
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

  function getDelta(product: Product) {
    return (product.inventaire ?? 0) - (product.sf ?? 0);
  }

  function sameNumber(a: number | null | undefined, b: number | null | undefined) {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return Number(a) === Number(b);
  }

  async function clearInventairesIdentiquesAuStockFinal() {
    const { data, error } = await supabase
      .from("products")
      .select("id, sf, inventaire")
      .not("inventaire", "is", null)
      .not("sf", "is", null);

    if (error) throw error;

    const idsToClear = ((data as Pick<Product, "id" | "sf" | "inventaire">[]) || [])
      .filter((product) => sameNumber(product.inventaire, product.sf))
      .map((product) => product.id);

    if (idsToClear.length === 0) return;

    const { error: updateError } = await supabase
      .from("products")
      .update({ inventaire: null, info: "" })
      .in("id", idsToClear);

    if (updateError) throw updateError;
  }

  const toRegularize = useMemo(() => {
    return products.filter(
      (p) => p.inventaire !== null && p.sf !== null && p.inventaire !== p.sf
    );
  }, [products]);

  const totalEntries = useMemo(
    () => toRegularize.reduce((sum, p) => sum + Math.max(getDelta(p), 0), 0),
    [toRegularize]
  );

  const totalOutputs = useMemo(
    () => toRegularize.reduce((sum, p) => sum + Math.max(-getDelta(p), 0), 0),
    [toRegularize]
  );

  async function applyRegularization(product: Product) {
    if (product.inventaire === null || product.sf === null) return;

    const diff = product.inventaire - product.sf;
    const regDate = new Date();
    const { error: movementError } = await supabase.from("movements").insert({
      categorie: product.categorie ?? "",
      designation: product.designation,
      ref_mag: product.ref_mag,
      fournisseur: product.fournisseur,
      zone: product.zone,
      info: "",
      entrees: diff > 0 ? diff : 0,
      sorties: diff < 0 ? Math.abs(diff) : 0,
      intervenant: "Régul inventaire",
      date: regDate.toISOString(),
    });

    if (movementError) throw movementError;

    const { error: updateError } = await supabase
      .from("products")
      .update({
        sf: product.inventaire,
        inventaire: null,
        info: "",
      })
      .eq("id", product.id);

    if (updateError) throw updateError;
  }

  async function handleRegularize(product: Product) {
    setSavingId(product.id);
    try {
      await applyRegularization(product);
      await clearInventairesIdentiquesAuStockFinal();
      await load();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erreur de régularisation.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleRegularizeAll() {
    if (toRegularize.length === 0) return;
    const ok = window.confirm(`Valider la régularisation de ${toRegularize.length} article(s) ?`);
    if (!ok) return;

    setSavingAll(true);
    try {
      for (const product of toRegularize) {
        await applyRegularization(product);
      }

      await clearInventairesIdentiquesAuStockFinal();
      await load();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erreur de régularisation.");
    } finally {
      setSavingAll(false);
    }
  }

  const t = themes[theme];

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
          <Link href="/" style={buttonStyle(t, false)}>
            Page d’accueil
          </Link>

          <Link href="/products" style={buttonStyle(t, false)}>
            Articles
          </Link>

          <button onClick={cycleTheme} style={buttonStyle(t, true)}>
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
          <div style={{ fontSize: 30, fontWeight: 900 }}>Régularisation</div>
          <div style={{ marginTop: 6, color: t.textSoft, fontSize: 14 }}>
            Cette page compare le SF et l’inventaire. La validation crée un mouvement
            "Régul inventaire" puis aligne le SF sur l’inventaire.
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          <div style={statCardStyle(t)}>
            <div style={{ color: t.textSoft, fontSize: 13 }}>Articles à régulariser</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>
              {loading ? "..." : toRegularize.length}
            </div>
          </div>

          <div style={statCardStyle(t)}>
            <div style={{ color: t.textSoft, fontSize: 13 }}>Total entrées</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6, color: t.success }}>
              +{formatNumber(totalEntries)}
            </div>
          </div>

          <div style={statCardStyle(t)}>
            <div style={{ color: t.textSoft, fontSize: 13 }}>Total sorties</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6, color: t.danger }}>
              -{formatNumber(totalOutputs)}
            </div>
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
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900 }}>Articles concernés</div>

            <button
              onClick={handleRegularizeAll}
              disabled={loading || savingAll || toRegularize.length === 0}
              style={{
                background: t.accent,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "12px 16px",
                fontWeight: 800,
                cursor: "pointer",
                opacity: loading || savingAll || toRegularize.length === 0 ? 0.6 : 1,
              }}
            >
              {savingAll ? "Régularisation..." : "Tout régulariser"}
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {loading ? (
              <div style={itemStyle(t)}>Chargement...</div>
            ) : toRegularize.length === 0 ? (
              <div style={itemStyle(t)}>Aucune régularisation nécessaire.</div>
            ) : (
              toRegularize.map((product) => {
                const diff = getDelta(product);
                const direction = diff > 0 ? "Entrée" : "Sortie";
                const regDateText =
                  product.info && product.info.startsWith("Inv. fait le")
                    ? product.info
                    : null;

                return (
                  <div key={product.id} style={itemStyle(t)}>
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
                          {product.designation || "-"}
                        </div>
                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 13,
                            color: t.textSoft,
                            lineHeight: 1.6,
                          }}
                        >
                          Réf. magasin : {product.ref_mag || "-"} • Fournisseur : {product.fournisseur || "-"}
                          <br />
                          Zone : {product.zone || "-"}
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: 280,
                          display: "grid",
                          gap: 6,
                          justifyItems: "end",
                        }}
                      >
                        <div style={{ fontSize: 13, color: t.textSoft }}>
                          SF : <b style={{ color: t.text }}>{formatNumber(product.sf)}</b> •
                          Inventaire : <b style={{ color: t.text }}>{formatNumber(product.inventaire)}</b>
                        </div>

                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 900,
                            color: diff > 0 ? t.success : t.danger,
                          }}
                        >
                          {direction} : {formatNumber(Math.abs(diff))}
                        </div>

                        {regDateText ? (
                          <div style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>
                            {regDateText}
                          </div>
                        ) : null}

                        <button
                          onClick={() => handleRegularize(product)}
                          disabled={savingId === product.id || savingAll}
                          style={{
                            background: t.accent,
                            color: "#fff",
                            border: "none",
                            borderRadius: 12,
                            padding: "10px 14px",
                            fontWeight: 800,
                            cursor: "pointer",
                            opacity: savingId === product.id || savingAll ? 0.7 : 1,
                          }}
                        >
                          {savingId === product.id ? "Validation..." : "Valider régularisation"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function buttonStyle(
  theme: {
    cardSoft: string;
    border: string;
    text: string;
    accent: string;
    shadow: string;
  },
  active: boolean
): React.CSSProperties {
  return {
    textDecoration: "none",
    background: active ? theme.accent : theme.cardSoft,
    color: active ? "#fff" : theme.text,
    border: active ? "none" : `1px solid ${theme.border}`,
    padding: "11px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: `0 10px 30px ${theme.shadow}`,
  };
}

function statCardStyle(theme: {
  card: string;
  border: string;
  shadow: string;
}): React.CSSProperties {
  return {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 22,
    padding: 18,
    boxShadow: `0 10px 30px ${theme.shadow}`,
  };
}

function itemStyle(theme: {
  cardSoft: string;
  border: string;
}): React.CSSProperties {
  return {
    background: theme.cardSoft,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 16,
  };
}
