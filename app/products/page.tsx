"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  categorie: string | null;
  ref_mag: string | null;
  designation: string | null;
  ref_fournisseur: string | null;
  fournisseur: string | null;
  info: string | null;
  zone: string | null;
  demandeur: string | null;
  si: number | null;
  e: number | null;
  s: number | null;
  sf: number | null;
  inventaire: number | null;
  seuil_alerte: number | null;
  prix: number | null;
  qte_souhaite: number | null;
  date_demande: string | null;
  prix_final: number | null;
  created_at?: string;
};

type ThemeName = "dark" | "green" | "tropical" | "whiteBlue";

type EditableProduct = {
  id: string;
  categorie: string;
  ref_mag: string;
  designation: string;
  ref_fournisseur: string;
  fournisseur: string;
  info: string;
  zone: string;
  demandeur: string;
  si: string;
  e: string;
  s: string;
  sf: string;
  inventaire: string;
  seuil_alerte: string;
  prix: string;
  qte_souhaite: string;
  date_demande: string;
  prix_final: string;
};

type ColumnKey =
  | "action"
  | "categorie"
  | "ref_mag"
  | "designation"
  | "ref_fournisseur"
  | "fournisseur"
  | "info"
  | "zone"
  | "demandeur"
  | "si"
  | "e"
  | "s"
  | "sf"
  | "inventaire"
  | "seuil_alerte"
  | "prix"
  | "qte_souhaite"
  | "date_demande"
  | "prix_final";

const themes: Record<
  ThemeName,
  {
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
    overlay: string;
  }
> = {
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
    overlay: "rgba(0,0,0,0.65)",
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
    overlay: "rgba(0,0,0,0.65)",
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
    overlay: "rgba(0,0,0,0.65)",
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
    overlay: "rgba(15, 23, 42, 0.42)",
  },
};

const themeOrder: ThemeName[] = ["dark", "green", "tropical", "whiteBlue"];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [showFilters, setShowFilters] = useState(false);

  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [search3, setSearch3] = useState("");
  const [collapsedColumns, setCollapsedColumns] = useState<Record<ColumnKey, boolean>>({
    action: false,
    categorie: false,
    ref_mag: false,
    designation: false,
    ref_fournisseur: false,
    fournisseur: false,
    info: false,
    zone: false,
    demandeur: false,
    si: false,
    e: false,
    s: false,
    sf: false,
    inventaire: false,
    seuil_alerte: false,
    prix: false,
    qte_souhaite: false,
    date_demande: false,
    prix_final: false,
  });

  const columns: { key: ColumnKey; label: string; baseWidth: number }[] = [
    { key: "action", label: "Action", baseWidth: 140 },
    { key: "categorie", label: "Catégorie", baseWidth: 120 },
    { key: "ref_mag", label: "Réf. magasin", baseWidth: 120 },
    { key: "designation", label: "Désignation", baseWidth: 220 },
    { key: "ref_fournisseur", label: "Réf. fournisseur", baseWidth: 150 },
    { key: "fournisseur", label: "Fournisseur", baseWidth: 150 },
    { key: "info", label: "Info", baseWidth: 150 },
    { key: "zone", label: "Zone", baseWidth: 90 },
    { key: "demandeur", label: "Demandeur", baseWidth: 120 },
    { key: "si", label: "Stock initial", baseWidth: 110 },
    { key: "e", label: "Entrées", baseWidth: 90 },
    { key: "s", label: "Sorties", baseWidth: 90 },
    { key: "sf", label: "Stock final", baseWidth: 120 },
    { key: "inventaire", label: "Inventaire", baseWidth: 110 },
    { key: "seuil_alerte", label: "Seuil d’alerte", baseWidth: 120 },
    { key: "prix", label: "Prix unitaire", baseWidth: 120 },
    { key: "qte_souhaite", label: "Qté souhaitée", baseWidth: 120 },
    { key: "date_demande", label: "Date demande", baseWidth: 120 },
    { key: "prix_final", label: "Prix final", baseWidth: 130 },
  ];

  const allColumnsCollapsed = columns.every((column) => collapsedColumns[column.key]);

  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const topScrollInnerRef = useRef<HTMLDivElement | null>(null);

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
    loadProducts();
  }, []);

  useEffect(() => {
    syncFakeScrollbarWidth();
    window.addEventListener("resize", syncFakeScrollbarWidth);
    return () => window.removeEventListener("resize", syncFakeScrollbarWidth);
  }, [products]);

  function syncFakeScrollbarWidth() {
    if (!tableScrollRef.current || !topScrollInnerRef.current) return;
    const table = tableScrollRef.current.querySelector("table");
    if (!table) return;
    topScrollInnerRef.current.style.width = `${table.scrollWidth}px`;
  }

  function handleTopScroll() {
    if (!topScrollRef.current || !tableScrollRef.current) return;
    tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
  }

  function handleTableScroll() {
    if (!topScrollRef.current || !tableScrollRef.current) return;
    topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
  }

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

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
    const currentIndex = themeOrder.indexOf(theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    applyTheme(nextTheme);
  }

  function getThemeLabel(value: ThemeName) {
    if (value === "dark") return "Sombre";
    if (value === "green") return "Vert";
    if (value === "tropical") return "Tropical";
    return "Blanc / Bleu";
  }

  function applyTheme(nextTheme: ThemeName) {
    setTheme(nextTheme);
    localStorage.setItem("stock-theme", nextTheme);
  }

  function num(value: number | null | undefined) {
    return value ?? 0;
  }

  function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("fr-FR").format(value);
  }

  function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XPF",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("fr-FR");
  }

  function getInventaireDisplay(product: Product) {
    if (
      product.sf !== null &&
      product.inventaire !== null &&
      product.sf === product.inventaire &&
      product.info &&
      product.info.startsWith("Inv. fait le")
    ) {
      return product.info;
    }

    return formatNumber(product.inventaire);
  }

  function getStockBadgeStyle(product: Product): React.CSSProperties {
    const stock = num(product.sf);
    const alert = num(product.seuil_alerte);

    if (stock <= alert) {
      return {
        color: "#ffb4b4",
        background: "rgba(220, 38, 38, 0.15)",
        border: "1px solid rgba(220, 38, 38, 0.35)",
      };
    }

    if (stock <= alert * 2 && alert > 0) {
      return {
        color: "#ffd98e",
        background: "rgba(245, 158, 11, 0.14)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
      };
    }

    return {
      color: "#b9f7c8",
      background: "rgba(34, 197, 94, 0.14)",
      border: "1px solid rgba(34, 197, 94, 0.35)",
    };
  }

  function normalizeText(value: string) {
    const text = value.trim();
    return text === "" ? null : text;
  }

  function normalizeNumber(value: string) {
    const text = value.trim();
    if (!text) return null;
    const parsed = Number(text.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  }

  function toEditable(product: Product): EditableProduct {
    return {
      id: product.id,
      categorie: product.categorie || "",
      ref_mag: product.ref_mag || "",
      designation: product.designation || "",
      ref_fournisseur: product.ref_fournisseur || "",
      fournisseur: product.fournisseur || "",
      info: product.info || "",
      zone: product.zone || "",
      demandeur: product.demandeur || "",
      si: product.si?.toString() || "",
      e: product.e?.toString() || "",
      s: product.s?.toString() || "",
      sf: product.sf?.toString() || "",
      inventaire: product.inventaire?.toString() || "",
      seuil_alerte: product.seuil_alerte?.toString() || "",
      prix: product.prix?.toString() || "",
      qte_souhaite: product.qte_souhaite?.toString() || "",
      date_demande: product.date_demande || "",
      prix_final: product.prix_final?.toString() || "",
    };
  }

  function openEditModal(product: Product) {
    setEditingProduct(toEditable(product));
  }

  function updateEditingField(field: keyof EditableProduct, value: string) {
    setEditingProduct((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [field]: value };

      const si = normalizeNumber(next.si) ?? 0;
      const e = normalizeNumber(next.e) ?? 0;
      const s = normalizeNumber(next.s) ?? 0;
      const prix = normalizeNumber(next.prix) ?? 0;
      const qte = normalizeNumber(next.qte_souhaite) ?? 0;

      next.sf = String(si + e - s);
      next.prix_final = String(prix * qte);

      return next;
    });
  }

  async function handleSave() {
    if (!editingProduct) return;

    setSaving(true);

    const si = normalizeNumber(editingProduct.si);
    const e = normalizeNumber(editingProduct.e);
    const s = normalizeNumber(editingProduct.s);
    const prix = normalizeNumber(editingProduct.prix);
    const qte = normalizeNumber(editingProduct.qte_souhaite);

    const sf = (si ?? 0) + (e ?? 0) - (s ?? 0);
    const prixFinal = (prix ?? 0) * (qte ?? 0);

    const payload = {
      categorie: normalizeText(editingProduct.categorie),
      ref_mag: normalizeText(editingProduct.ref_mag),
      designation: normalizeText(editingProduct.designation),
      ref_fournisseur: normalizeText(editingProduct.ref_fournisseur),
      fournisseur: normalizeText(editingProduct.fournisseur),
      info: normalizeText(editingProduct.info),
      zone: normalizeText(editingProduct.zone),
      demandeur: normalizeText(editingProduct.demandeur),
      si,
      e,
      s,
      sf,
      inventaire: normalizeNumber(editingProduct.inventaire),
      seuil_alerte: normalizeNumber(editingProduct.seuil_alerte),
      prix,
      qte_souhaite: qte,
      date_demande: editingProduct.date_demande || null,
      prix_final: prixFinal,
    };

    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", editingProduct.id);

    if (error) {
      console.error(error);
      alert(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditingProduct(null);
    await loadProducts();
  }

  async function handleDelete() {
    if (!editingProduct) return;

    const ok = window.confirm("Supprimer complètement cet article ?");
    if (!ok) return;

    setDeleting(true);

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", editingProduct.id);

    if (error) {
      console.error(error);
      alert(error.message);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setEditingProduct(null);
    await loadProducts();
  }

  function rowToSearchableText(product: Product) {
    return [
      product.categorie,
      product.ref_mag,
      product.designation,
      product.ref_fournisseur,
      product.fournisseur,
      product.info,
      product.zone,
      product.demandeur,
      product.si,
      product.e,
      product.s,
      product.sf,
      product.inventaire,
      product.seuil_alerte,
      product.prix,
      product.qte_souhaite,
      product.date_demande,
      product.prix_final,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase();
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const haystack = rowToSearchableText(product);

      const q1 = search1.trim().toLowerCase();
      const q2 = search2.trim().toLowerCase();
      const q3 = search3.trim().toLowerCase();

      if (q1 && !haystack.includes(q1)) return false;
      if (q2 && !haystack.includes(q2)) return false;
      if (q3 && !haystack.includes(q3)) return false;

      return true;
    });
  }, [products, search1, search2, search3]);

  const autoColumnWidths = useMemo(() => {
    const pxPerChar = 8;
    const extraPadding = 26;

    function getColumnText(product: Product, column: ColumnKey) {
      switch (column) {
        case "action":
          return "Modifier";
        case "categorie":
          return product.categorie || "-";
        case "ref_mag":
          return product.ref_mag || "-";
        case "designation":
          return product.designation || "-";
        case "ref_fournisseur":
          return product.ref_fournisseur || "-";
        case "fournisseur":
          return product.fournisseur || "-";
        case "info":
          return product.info || "-";
        case "zone":
          return product.zone || "-";
        case "demandeur":
          return product.demandeur || "-";
        case "si":
          return formatNumber(product.si);
        case "e":
          return formatNumber(product.e);
        case "s":
          return formatNumber(product.s);
        case "sf":
          return formatNumber(product.sf);
        case "inventaire":
          return getInventaireDisplay(product);
        case "seuil_alerte":
          return formatNumber(product.seuil_alerte);
        case "prix":
          return formatPrice(product.prix);
        case "qte_souhaite":
          return formatNumber(product.qte_souhaite);
        case "date_demande":
          return formatDate(product.date_demande);
        case "prix_final":
          return formatPrice(product.prix_final);
        default:
          return "";
      }
    }

    const widths = {} as Record<ColumnKey, number>;

    for (const column of columns) {
      let longest = column.label.length;

      for (const product of filteredProducts) {
        const value = String(getColumnText(product, column.key) || "");
        if (value.length > longest) longest = value.length;
      }

      const estimated = Math.ceil(longest * pxPerChar + extraPadding);
      widths[column.key] = Math.min(column.baseWidth, Math.max(estimated, 58));
    }

    widths.action = 110;

    return widths;
  }, [filteredProducts]);

  const currentTheme = themes[theme];

  function toggleColumn(column: ColumnKey) {
    setCollapsedColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  }

  function toggleAllColumns() {
    const nextValue = !allColumnsCollapsed;
    setCollapsedColumns({
      action: nextValue,
      categorie: nextValue,
      ref_mag: nextValue,
      designation: nextValue,
      ref_fournisseur: nextValue,
      fournisseur: nextValue,
      info: nextValue,
      zone: nextValue,
      demandeur: nextValue,
      si: nextValue,
      e: nextValue,
      s: nextValue,
      sf: nextValue,
      inventaire: nextValue,
      seuil_alerte: nextValue,
      prix: nextValue,
      qte_souhaite: nextValue,
      date_demande: nextValue,
      prix_final: nextValue,
    });
  }

  function getColumnStyle(column: ColumnKey): React.CSSProperties {
    if (!collapsedColumns[column]) {
      const width = autoColumnWidths[column];
      return {
        width,
        minWidth: width,
        maxWidth: width,
        overflow: "hidden",
        textOverflow: "ellipsis",
      };
    }

    return {
      width: 34,
      minWidth: 34,
      maxWidth: 34,
      overflow: "hidden",
      textOverflow: "ellipsis",
      textAlign: "left",
      padding: "12px 8px",
    };
  }

  function getCollapsedHeaderColor(): string {
    if (theme === "dark") return currentTheme.accent2;
    if (theme === "green") return currentTheme.accent2;
    if (theme === "tropical") return currentTheme.accent2;
    return currentTheme.accent;
  }

  const computedTableMinWidth = columns.reduce((total, column) => {
    return total + (collapsedColumns[column.key] ? 34 : autoColumnWidths[column.key]);
  }, 0);

  return (
    <main
      style={{
        height: "100vh",
        background: currentTheme.bg,
        color: currentTheme.text,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              background: currentTheme.cardSoft,
              color: currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
              padding: "11px 16px",
              borderRadius: 12,
              fontWeight: 700,
              boxShadow: `0 10px 30px ${currentTheme.shadow}`,
            }}
          >
            Page d’accueil
          </Link>

          <button
            onClick={() => setShowFilters((prev) => !prev)}
            style={{
              background: currentTheme.cardSoft,
              color: currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
              padding: "11px 16px",
              borderRadius: 12,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: `0 10px 30px ${currentTheme.shadow}`,
            }}
          >
            {showFilters ? "Masquer filtres" : "Filtres"}
          </button>

          <button
            onClick={toggleAllColumns}
            style={{
              background: allColumnsCollapsed
                ? currentTheme.accent
                : currentTheme.cardSoft,
              color: allColumnsCollapsed ? "#fff" : currentTheme.text,
              border: allColumnsCollapsed
                ? "none"
                : `1px solid ${currentTheme.border}`,
              padding: "11px 16px",
              borderRadius: 12,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: `0 10px 30px ${currentTheme.shadow}`,
            }}
          >
            {allColumnsCollapsed ? "Rétablir" : "Rétrécir"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 8,
              borderRadius: 14,
              background: currentTheme.cardSoft,
              border: `1px solid ${currentTheme.border}`,
              boxShadow: `0 10px 30px ${currentTheme.shadow}`,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={cycleTheme}
              style={{
                background: currentTheme.accent,
                color: "#ffffff",
                border: "none",
                padding: "11px 16px",
                borderRadius: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Mode : {getThemeLabel(theme)}
            </button>

                      </div>
        </div>

        {showFilters && (
          <section
            style={{
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 18,
              padding: 16,
              marginBottom: 18,
              boxShadow: `0 10px 30px ${currentTheme.shadow}`,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <input
                value={search1}
                onChange={(e) => setSearch1(e.target.value)}
                placeholder="Recherche 1"
                style={inputStyle(currentTheme)}
              />

              <input
                value={search2}
                onChange={(e) => setSearch2(e.target.value)}
                placeholder="Recherche 2"
                style={inputStyle(currentTheme)}
              />

              <input
                value={search3}
                onChange={(e) => setSearch3(e.target.value)}
                placeholder="Recherche 3"
                style={inputStyle(currentTheme)}
              />

              <button
                onClick={() => {
                  setSearch1("");
                  setSearch2("");
                  setSearch3("");
                }}
                style={{
                  ...inputStyle(currentTheme),
                  background: currentTheme.accent,
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Réinitialiser
              </button>
            </div>
          </section>
        )}

        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            height: 18,
            marginBottom: 10,
            borderRadius: 999,
            background: currentTheme.cardSoft,
            border: `1px solid ${currentTheme.border}`,
            boxShadow: `0 10px 30px ${currentTheme.shadow}`,
          }}
        >
          <div ref={topScrollInnerRef} style={{ height: 1 }} />
        </div>
      </div>

      <div
        ref={tableScrollRef}
        onScroll={handleTableScroll}
        style={{
          flex: 1,
          minHeight: 0,
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
            minWidth: computedTableMinWidth,
            borderCollapse: "collapse",
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onDoubleClick={() => toggleColumn(column.key)}
                  title="Double-clic pour rétrécir / rétablir"
                  style={{
                    ...thStyle(currentTheme),
                    ...getColumnStyle(column.key),
                    color: collapsedColumns[column.key]
                      ? getCollapsedHeaderColor()
                      : currentTheme.text,
                    cursor: "col-resize",
                    userSelect: "none",
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td style={tdStyle(currentTheme)} colSpan={19}>
                  Chargement...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td style={tdStyle(currentTheme)} colSpan={19}>
                  Aucune donnée trouvée
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  onDoubleClick={() => openEditModal(product)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("action") }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(product);
                      }}
                      style={{
                        background: currentTheme.accent,
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "8px 12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Modifier
                    </button>
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("categorie") }}>{product.categorie || "-"}</td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("ref_mag") }}>{product.ref_mag || "-"}</td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("designation"), fontWeight: 700 }}>
                    {product.designation || "-"}
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("ref_fournisseur") }}>
                    {product.ref_fournisseur || "-"}
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("fournisseur") }}>
                    {product.fournisseur || "-"}
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("info") }}>{product.info || "-"}</td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("zone") }}>{product.zone || "-"}</td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("demandeur") }}>
                    {product.demandeur || "-"}
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("si") }}>{formatNumber(product.si)}</td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("e") }}>{formatNumber(product.e)}</td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("s") }}>{formatNumber(product.s)}</td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("sf") }}>
                    <span
                      style={{
                        display: "inline-block",
                        minWidth: 58,
                        textAlign: "center",
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontWeight: 800,
                        ...getStockBadgeStyle(product),
                      }}
                    >
                      {formatNumber(product.sf)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("inventaire") }}>
                    {getInventaireDisplay(product)}
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("seuil_alerte") }}>
                    {formatNumber(product.seuil_alerte)}
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("prix") }}>{formatPrice(product.prix)}</td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("qte_souhaite") }}>
                    {formatNumber(product.qte_souhaite)}
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("date_demande") }}>
                    {formatDate(product.date_demande)}
                  </td>
                  <td style={{ ...tdStyle(currentTheme), ...getColumnStyle("prix_final") }}>
                    {formatPrice(product.prix_final)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingProduct && (
        <div
          onClick={() => !saving && !deleting && setEditingProduct(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: currentTheme.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 1100,
              maxHeight: "90vh",
              overflowY: "auto",
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 24,
              padding: 20,
              boxShadow: `0 20px 60px ${currentTheme.shadow}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div />

              <button
                onClick={() => setEditingProduct(null)}
                style={{
                  background: currentTheme.cardSoft,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <Field
                label="Catégorie"
                value={editingProduct.categorie}
                onChange={(v) => updateEditingField("categorie", v)}
                theme={currentTheme}
              />
              <Field
                label="Réf. magasin"
                value={editingProduct.ref_mag}
                onChange={(v) => updateEditingField("ref_mag", v)}
                theme={currentTheme}
              />
              <Field
                label="Désignation"
                value={editingProduct.designation}
                onChange={(v) => updateEditingField("designation", v)}
                theme={currentTheme}
              />
              <Field
                label="Réf. fournisseur"
                value={editingProduct.ref_fournisseur}
                onChange={(v) => updateEditingField("ref_fournisseur", v)}
                theme={currentTheme}
              />
              <Field
                label="Fournisseur"
                value={editingProduct.fournisseur}
                onChange={(v) => updateEditingField("fournisseur", v)}
                theme={currentTheme}
              />
              <Field
                label="Info"
                value={editingProduct.info}
                onChange={(v) => updateEditingField("info", v)}
                theme={currentTheme}
              />
              <Field
                label="Zone"
                value={editingProduct.zone}
                onChange={(v) => updateEditingField("zone", v)}
                theme={currentTheme}
              />
              <Field
                label="Demandeur"
                value={editingProduct.demandeur}
                onChange={(v) => updateEditingField("demandeur", v)}
                theme={currentTheme}
              />
              <Field
                label="Stock initial"
                value={editingProduct.si}
                onChange={(v) => updateEditingField("si", v)}
                theme={currentTheme}
                type="number"
              />
              <Field
                label="Entrées"
                value={editingProduct.e}
                onChange={(v) => updateEditingField("e", v)}
                theme={currentTheme}
                type="number"
              />
              <Field
                label="Sorties"
                value={editingProduct.s}
                onChange={(v) => updateEditingField("s", v)}
                theme={currentTheme}
                type="number"
              />
              <Field
                label="Stock final"
                value={editingProduct.sf}
                onChange={() => {}}
                theme={currentTheme}
                type="number"
                readOnly
              />
              <Field
                label="Inventaire"
                value={editingProduct.inventaire}
                onChange={(v) => updateEditingField("inventaire", v)}
                theme={currentTheme}
                type="number"
              />
              <Field
                label="Seuil d’alerte"
                value={editingProduct.seuil_alerte}
                onChange={(v) => updateEditingField("seuil_alerte", v)}
                theme={currentTheme}
                type="number"
              />
              <Field
                label="Prix unitaire"
                value={editingProduct.prix}
                onChange={(v) => updateEditingField("prix", v)}
                theme={currentTheme}
                type="number"
              />
              <Field
                label="Qté souhaitée"
                value={editingProduct.qte_souhaite}
                onChange={(v) => updateEditingField("qte_souhaite", v)}
                theme={currentTheme}
                type="number"
              />
              <Field
                label="Date demande"
                value={editingProduct.date_demande}
                onChange={(v) => updateEditingField("date_demande", v)}
                theme={currentTheme}
                type="date"
              />
              <Field
                label="Prix final"
                value={editingProduct.prix_final}
                onChange={() => {}}
                theme={currentTheme}
                type="number"
                readOnly
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleDelete}
                disabled={saving || deleting}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 14,
                  padding: "12px 18px",
                  fontWeight: 800,
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => setEditingProduct(null)}
                  disabled={saving || deleting}
                  style={{
                    background: currentTheme.cardSoft,
                    color: currentTheme.text,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 14,
                    padding: "12px 18px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving || deleting}
                  style={{
                    background: currentTheme.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    padding: "12px 18px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  theme,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  theme: {
    cardSoft: string;
    border: string;
    text: string;
    textSoft: string;
  };
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: theme.textSoft }}>{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: readOnly ? theme.cardSoft : theme.cardSoft,
          color: theme.text,
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          padding: "12px 14px",
          outline: "none",
          fontSize: 14,
        }}
      />
    </label>
  );
}

function inputStyle(theme: {
  cardSoft: string;
  border: string;
  text: string;
}): React.CSSProperties {
  return {
    width: "100%",
    background: theme.cardSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: "12px 14px",
    outline: "none",
    fontSize: 14,
  };
}

function thStyle(theme: {
  header: string;
  border: string;
  text: string;
}): React.CSSProperties {
  return {
    textAlign: "left",
    background: theme.header,
    color: theme.text,
    padding: "14px 12px",
    fontSize: 13,
    fontWeight: 800,
    borderBottom: `1px solid ${theme.border}`,
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 2,
  };
}

function tdStyle(theme: {
  border: string;
  text: string;
}): React.CSSProperties {
  return {
    padding: "12px",
    fontSize: 13,
    color: theme.text,
    borderBottom: `1px solid ${theme.border}`,
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  };
}