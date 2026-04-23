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
  seuil_alerte: number | null;
  prix: number | null;
  qte_souhaite: number | null;
  s: number | null;
  sf: number | null;
};

type AppDataRow = {
  id: string;
  type: "email" | "person";
  value: string;
  created_at: string;
};

type ThemeName = "dark" | "green" | "tropical" | "whiteBlue";

type InventoryItem = {
  localId: string;
  productId: string;
  categorie: string;
  ref_mag: string;
  designation: string;
  ref_fournisseur: string;
  fournisseur: string;
  info: string;
  zone: string;
  demandeur: string;
  stock_systeme: string;
  stock_compte: string;
};

type FinalModalState = {
  open: boolean;
  message: string;
};

type ZoneFilter = {
  type: "group" | "exact";
  value: string;
  label: string;
};

type WarehouseZoneBox = {
  code: string;
  left: string;
  top: string;
  width: string;
  height: string;
  color?: string;
  fontSize?: number;
};

const themes: Record<
  ThemeName,
  {
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
    danger: string;
    success: string;
    warning: string;
  }
> = {
  dark: {
    bg: "#0b0b0f",
    card: "#111114",
    cardSoft: "#17171c",
    border: "#2a2a34",
    text: "#f4f4f5",
    textSoft: "#b3b3bf",
    accent: "#7c3aed",
    accent2: "#a78bfa",
    shadow: "rgba(124, 58, 237, 0.15)",
    overlay: "rgba(0,0,0,0.65)",
    danger: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
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
    shadow: "rgba(34, 197, 94, 0.15)",
    overlay: "rgba(0,0,0,0.65)",
    danger: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
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
    shadow: "rgba(6, 182, 212, 0.16)",
    overlay: "rgba(0,0,0,0.65)",
    danger: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
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
    shadow: "rgba(37, 99, 235, 0.14)",
    overlay: "rgba(15, 23, 42, 0.42)",
    danger: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
  },
};

const themeOrder: ThemeName[] = ["dark", "green", "tropical", "whiteBlue"];

const zoneGroups = [
  { code: "A", label: "Zone A", color: "rgba(34,197,94,0.14)" },
  { code: "B", label: "Zone B", color: "rgba(217,70,239,0.14)" },
  { code: "C", label: "Zone C", color: "rgba(132,204,22,0.14)" },
  { code: "D", label: "Zone D", color: "rgba(59,130,246,0.14)" },
];

const warehouseBoxes: WarehouseZoneBox[] = [
  { code: "A10", left: "4%", top: "5%", width: "7%", height: "12%" },
  { code: "A11", left: "11.4%", top: "5%", width: "7%", height: "12%" },
  { code: "A12", left: "18.7%", top: "5%", width: "4.2%", height: "6%" },
  { code: "A13", left: "22.95%", top: "5%", width: "4.2%", height: "6%" },
  { code: "A14", left: "27.2%", top: "5%", width: "4.2%", height: "6%" },
  { code: "A15", left: "18.7%", top: "11%", width: "4.2%", height: "6%" },
  { code: "A16", left: "22.95%", top: "11%", width: "4.2%", height: "6%" },
  { code: "A17", left: "27.2%", top: "11%", width: "4.2%", height: "6%" },
  { code: "A18", left: "18.7%", top: "17%", width: "4.2%", height: "6%" },
  { code: "A19", left: "22.95%", top: "17%", width: "4.2%", height: "6%" },
  { code: "A20", left: "27.2%", top: "17%", width: "4.2%", height: "6%" },
  { code: "A9", left: "0%", top: "5%", width: "4%", height: "40%" },
  { code: "A8", left: "0%", top: "45%", width: "4%", height: "55%" },
  { code: "A7", left: "4%", top: "69%", width: "9.8%", height: "31%" },
  { code: "A6", left: "13.8%", top: "69%", width: "7.3%", height: "31%" },
  { code: "A34", left: "21.1%", top: "85%", width: "6.1%", height: "15%" },
  { code: "A30", left: "27.2%", top: "37%", width: "4%", height: "15%" },
  { code: "A31", left: "27.2%", top: "52%", width: "4%", height: "15%" },
  { code: "A32", left: "27.2%", top: "67%", width: "4%", height: "15%" },
  { code: "A33", left: "27.2%", top: "82%", width: "4%", height: "18%" },

  { code: "B1", left: "30.5%", top: "5%", width: "3.4%", height: "23%" },
  { code: "B2", left: "33.9%", top: "5%", width: "3.4%", height: "23%" },
  { code: "B3", left: "37.3%", top: "5%", width: "3.4%", height: "23%" },
  { code: "B4", left: "40.7%", top: "5%", width: "3.4%", height: "23%" },
  { code: "B5", left: "44.1%", top: "5%", width: "3.4%", height: "23%" },
  { code: "B6", left: "47.5%", top: "5%", width: "3.4%", height: "23%" },
  { code: "B7", left: "50.9%", top: "5%", width: "3.4%", height: "23%" },

  { code: "C8", left: "54.3%", top: "5%", width: "3.3%", height: "23%" },
  { code: "C9", left: "57.6%", top: "5%", width: "3.3%", height: "23%" },
  { code: "C10", left: "60.9%", top: "5%", width: "3.3%", height: "23%" },
  { code: "C11", left: "64.2%", top: "5%", width: "3.3%", height: "23%" },
  { code: "C12", left: "67.5%", top: "5%", width: "3.3%", height: "23%" },
  { code: "C13", left: "70.8%", top: "5%", width: "3.3%", height: "23%" },
  { code: "C14", left: "74.1%", top: "5%", width: "3.3%", height: "23%" },
  { code: "C18", left: "54.3%", top: "28%", width: "3.3%", height: "18%" },
  { code: "C17", left: "60.9%", top: "28%", width: "3.3%", height: "18%" },
  { code: "C16", left: "67.5%", top: "28%", width: "3.3%", height: "18%" },
  { code: "C15", left: "74.1%", top: "28%", width: "3.3%", height: "18%" },
  { code: "C25", left: "54.3%", top: "77%", width: "3.3%", height: "23%" },
  { code: "C24", left: "57.6%", top: "77%", width: "3.3%", height: "23%" },
  { code: "C23", left: "60.9%", top: "77%", width: "3.3%", height: "23%" },
  { code: "C22", left: "64.2%", top: "77%", width: "3.3%", height: "23%" },
  { code: "C21", left: "67.5%", top: "77%", width: "3.3%", height: "23%" },
  { code: "C20", left: "70.8%", top: "77%", width: "3.3%", height: "23%" },
  { code: "C19", left: "74.1%", top: "77%", width: "3.3%", height: "23%" },
];

function normalizeZone(value?: string | null) {
  return (value || "")
    .toUpperCase()
    .replace(/ZONE/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function matchesZoneFilter(productZone: string | null | undefined, filter: ZoneFilter | null) {
  if (!filter) return true;

  const normalized = normalizeZone(productZone);
  if (!normalized) return false;

  if (filter.type === "group") {
    return normalized.startsWith(filter.value);
  }

  return normalized === filter.value;
}

export default function InventairePage() {
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const countedRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const finalModalRef = useRef<HTMLDivElement | null>(null);
  const ignoreNextModalEnterRef = useRef(false);

  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter | null>(null);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [finalModal, setFinalModal] = useState<FinalModalState>({
    open: false,
    message: "",
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("stock-theme");
    if (
      savedTheme === "dark" ||
      savedTheme === "green" ||
      savedTheme === "tropical" ||
      savedTheme === "whiteBlue"
    ) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);

    const productsRes = await supabase
      .from("products")
      .select(
        "id, categorie, ref_mag, designation, ref_fournisseur, fournisseur, info, zone, demandeur, seuil_alerte, prix, qte_souhaite, s, sf"
      )
      .order("designation", { ascending: true });

    if (productsRes.error) {
      console.error(productsRes.error);
      setLoading(false);
      return;
    }

    setProducts((productsRes.data as Product[]) || []);
    setLoading(false);
  }

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

  function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("fr-FR").format(value);
  }

  function parseNumber(value: string) {
    return Number(value.replace(",", "."));
  }

  const filteredProducts = useMemo(() => {
    const q1 = search1.trim().toLowerCase();
    const q2 = search2.trim().toLowerCase();

    return products.filter((product) => {
      const haystack = [
        product.categorie,
        product.ref_mag,
        product.designation,
        product.ref_fournisseur,
        product.fournisseur,
        product.info,
        product.zone,
        product.demandeur,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (q1 && !haystack.includes(q1)) return false;
      if (q2 && !haystack.includes(q2)) return false;
      if (!matchesZoneFilter(product.zone, zoneFilter)) return false;

      return true;
    });
  }, [products, search1, search2, zoneFilter]);

  useEffect(() => {
    if (!finalModal.open) return;

    const focusTimer = window.setTimeout(() => {
      finalModalRef.current?.focus();
    }, 0);

    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        if (ignoreNextModalEnterRef.current) {
          ignoreNextModalEnterRef.current = false;
          event.preventDefault();
          return;
        }

        event.preventDefault();
        if (!saving) {
          handleValidateInventory();
        }
      }

      if (event.key === "Escape" && !saving) {
        setFinalModal((prev) => ({ ...prev, open: false, message: "" }));
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [finalModal.open, saving]);

  const currentTheme = themes[theme];

  function addProductToInventory(product: Product) {
    const localId = crypto.randomUUID();

    setInventoryItems((prev) => {
      const exists = prev.find((item) => item.productId === product.id);
      if (exists) {
        setTimeout(() => {
          const targetId = prev[0]?.localId || exists.localId;
          countedRefs.current[targetId]?.focus();
          countedRefs.current[targetId]?.select();
        }, 0);
        return prev;
      }

      const nextItems = [
        ...prev,
        {
          localId,
          productId: product.id,
          categorie: product.categorie || "",
          ref_mag: product.ref_mag || "",
          designation: product.designation || "",
          ref_fournisseur: product.ref_fournisseur || "",
          fournisseur: product.fournisseur || "",
          info: product.info || "",
          zone: product.zone || "",
          demandeur: product.demandeur || "",
          stock_systeme:
            product.sf !== null && product.sf !== undefined
              ? String(product.sf)
              : "0",
          stock_compte: "",
        },
      ];

      setTimeout(() => {
        const targetId = nextItems[0]?.localId || localId;
        countedRefs.current[targetId]?.focus();
        countedRefs.current[targetId]?.select();
      }, 0);

      return nextItems;
    });
  }

  function updateCountedStock(localId: string, value: string) {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, stock_compte: value } : item
      )
    );
  }

  function removeInventoryItem(localId: string) {
    setInventoryItems((prev) => {
      const next = prev.filter((item) => item.localId !== localId);
      setTimeout(() => {
        if (next.length > 0) {
          countedRefs.current[next[0].localId]?.focus();
          countedRefs.current[next[0].localId]?.select();
        }
      }, 0);
      return next;
    });
    delete countedRefs.current[localId];
  }

  function focusFirstCountedInput(localId?: string) {
    setTimeout(() => {
      if (localId) {
        countedRefs.current[localId]?.focus();
        countedRefs.current[localId]?.select();
        return;
      }

      const firstItem = inventoryItems[0];
      if (!firstItem) return;
      countedRefs.current[firstItem.localId]?.focus();
      countedRefs.current[firstItem.localId]?.select();
    }, 0);
  }

  function getDifference(item: InventoryItem) {
    const systemQty = parseNumber(item.stock_systeme || "0");
    const countedQty = parseNumber(item.stock_compte || "0");

    if (!Number.isFinite(systemQty)) return null;
    if (!Number.isFinite(countedQty)) return null;

    return countedQty - systemQty;
  }

  function handleCountedKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    localId: string
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const index = inventoryItems.findIndex((item) => item.localId === localId);
    if (index === -1) return;

    const nextItem = inventoryItems[index + 1];

    if (nextItem) {
      countedRefs.current[nextItem.localId]?.focus();
      countedRefs.current[nextItem.localId]?.select();
      return;
    }

    const allFilled =
      inventoryItems.length > 0 &&
      inventoryItems.every((item) => {
        const qty = parseNumber(item.stock_compte);
        return Number.isFinite(qty) && qty >= 0;
      });

    if (allFilled) {
      ignoreNextModalEnterRef.current = true;
      setFinalModal({ open: true, message: "" });
    }
  }

  async function handleValidateInventory() {
    if (inventoryItems.length === 0) {
      return;
    }

    for (const item of inventoryItems) {
      const countedQty = parseNumber(item.stock_compte);

      if (!Number.isFinite(countedQty) || countedQty < 0) {
        setFinalModal({
          open: true,
          message: `Stock compté invalide pour : ${item.designation || item.ref_mag}`,
        });
        return;
      }
    }

    setSaving(true);

    try {
      for (const item of inventoryItems) {
        const countedQty = parseNumber(item.stock_compte);
        const systemQty = parseNumber(item.stock_systeme || "0");
        const diff = countedQty - systemQty;

        const noteBase = "Inventaire";

        const { error } = await supabase
        .from("products")
        .update({
        inventaire: countedQty,
        info: noteBase,
  })
  .eq("ref_mag", item.ref_mag);

        if (error) throw error;

        const { error: movementError } = await supabase.from("movements").insert({
          categorie: item.categorie || null,
          ref_mag: item.ref_mag || null,
          designation: item.designation || null,
          ref_fournisseur: item.ref_fournisseur || null,
          fournisseur: item.fournisseur || null,
          info: `${noteBase} • système: ${systemQty} • compté: ${countedQty} • écart: ${diff}`,
          zone: item.zone || null,
          demandeur: item.demandeur || null,
          sorties: diff < 0 ? Math.abs(diff) : 0,
          intervenant: null,
          entrees: diff > 0 ? diff : 0,
          date: new Date().toISOString(),
        });

        if (movementError) throw movementError;
      }

      setInventoryItems([]);
      setFinalModal({ open: false, message: "" });
      await loadAll();
    } catch (error: any) {
      console.error(error);
      setFinalModal({
        open: true,
        message: error.message || "Erreur pendant l'enregistrement.",
      });
    } finally {
      setSaving(false);
    }
  }

  function selectZoneGroup(code: string, label: string) {
    setZoneFilter({ type: "group", value: code, label });
    setZoneModalOpen(false);
  }

  function selectZoneExact(code: string) {
    setZoneFilter({ type: "exact", value: normalizeZone(code), label: `Zone ${code}` });
    setZoneModalOpen(false);
  }

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
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
          flexShrink: 0,
        }}
      >
        <Link href="/" style={buttonLinkStyle(currentTheme)}>
          Page d’accueil
        </Link>

        <Link href="/products" style={buttonLinkStyle(currentTheme)}>
          Tableau
        </Link>

        <Link href="/sortie" style={buttonLinkStyle(currentTheme)}>
          Sortie
        </Link>

        <Link href="/entrees" style={buttonLinkStyle(currentTheme)}>
          Entrées
        </Link>

        <button
          onClick={() => setZoneModalOpen(true)}
          style={{
            background: currentTheme.accent2,
            color: theme === "whiteBlue" ? "#0f172a" : "#fff",
            border: "none",
            padding: "11px 16px",
            borderRadius: 12,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: `0 10px 30px ${currentTheme.shadow}`,
          }}
        >
          Zone
        </button>

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

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1.1fr",
          gap: 18,
        }}
      >
        <section
          style={{
            background: currentTheme.card,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: 22,
            padding: 18,
            boxShadow: `0 10px 30px ${currentTheme.shadow}`,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Inventaire</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: currentTheme.textSoft,
                }}
              >
                Stock système vs stock compté
              </div>
            </div>

            <button
              onClick={() => {
                setFinalModal({ open: true, message: "" });
              }}
              disabled={saving || inventoryItems.length === 0}
              style={{
                background: currentTheme.accent,
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "12px 16px",
                fontWeight: 900,
                cursor: "pointer",
                opacity: saving || inventoryItems.length === 0 ? 0.6 : 1,
              }}
            >
              {saving ? "Enregistrement..." : "Valider l’inventaire"}
            </button>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "grid",
              gap: 10,
            }}
          >
            {inventoryItems.length === 0 ? (
              <div
                style={{
                  background: currentTheme.cardSoft,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 16,
                  padding: 16,
                  color: currentTheme.textSoft,
                }}
              >
                Double-clique sur un article à droite pour l’ajouter ici.
              </div>
            ) : (
              inventoryItems.map((item) => {
                const diff = getDifference(item);

                return (
                  <div
                    key={item.localId}
                    style={{
                      background: currentTheme.cardSoft,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: 14,
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        marginBottom: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15 }}>
                          {item.designation || "-"}
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 12,
                            color: currentTheme.textSoft,
                          }}
                        >
                          Réf. magasin : {item.ref_mag || "-"} • Fournisseur :{" "}
                          {item.fournisseur || "-"}
                        </div>
                      </div>

                      <button
                        onClick={() => removeInventoryItem(item.localId)}
                        style={{
                          background: currentTheme.danger,
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          padding: "8px 10px",
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Retirer
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(140px, 1fr) minmax(60px, 20px) minmax(80px, 65px) minmax(80px, 95px)",
                        gap: 26,
                        alignItems: "end",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: currentTheme.textSoft,
                          lineHeight: 1.45,
                        }}
                      >
                        Catégorie : {item.categorie || "-"}
                        <br />
                        Zone : {item.zone || "-"}
                      </div>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, color: currentTheme.textSoft }}>
                          Stock système
                        </span>
                        <input
                          value={item.stock_systeme}
                          readOnly
                          style={{
                            ...inputStyle(currentTheme),
                            opacity: 0.7,
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, color: currentTheme.textSoft }}>
                          Stock compté
                        </span>
                        <input
                          ref={(el) => {
                            countedRefs.current[item.localId] = el;
                          }}
                          type="number"
                          value={item.stock_compte}
                          onChange={(e) =>
                            updateCountedStock(item.localId, e.target.value)
                          }
                          onKeyDown={(e) => handleCountedKeyDown(e, item.localId)}
                          placeholder="0"
                          style={inputStyle(currentTheme)}
                        />
                      </label>

                      <div style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, color: currentTheme.textSoft }}>
                          Écart
                        </span>
                        <div
                          style={{
                            ...differenceBoxStyle(currentTheme, diff),
                          }}
                        >
                          {diff === null
                            ? "-"
                            : diff > 0
                            ? `+${formatNumber(diff)}`
                            : formatNumber(diff)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section
          style={{
            background: currentTheme.card,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: 22,
            padding: 18,
            boxShadow: `0 10px 30px ${currentTheme.shadow}`,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 10,
              marginBottom: 14,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 900 }}>Articles</div>

              {zoneFilter ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      background: currentTheme.cardSoft,
                      border: `1px solid ${currentTheme.border}`,
                      color: currentTheme.text,
                      borderRadius: 999,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {zoneFilter.label}
                  </div>
                  <button
                    onClick={() => setZoneFilter(null)}
                    style={buttonGhostStyle(currentTheme)}
                  >
                    Retirer filtre zone
                  </button>
                </div>
              ) : null}
            </div>

            <input
              value={search1}
              onChange={(e) => setSearch1(e.target.value)}
              placeholder="Recherche 1"
              style={inputStyle(currentTheme)}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
              }}
            >
              <input
                value={search2}
                onChange={(e) => setSearch2(e.target.value)}
                placeholder="Recherche 2"
                style={inputStyle(currentTheme)}
              />

              <button
                onClick={() => {
                  setSearch1("");
                  setSearch2("");
                  setZoneFilter(null);
                }}
                style={{
                  background: currentTheme.cardSoft,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Effacer
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "grid",
              gap: 10,
            }}
          >
            {loading ? (
              <div style={itemStyle(currentTheme)}>Chargement...</div>
            ) : filteredProducts.length === 0 ? (
              <div style={itemStyle(currentTheme)}>
                {zoneFilter ? `Aucun article trouvé pour ${zoneFilter.label}` : "Aucun article trouvé"}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onDoubleClick={() => addProductToInventory(product)}
                  style={itemStyle(currentTheme)}
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
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>
                        {product.designation || "-"}
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                          color: currentTheme.textSoft,
                          lineHeight: 1.5,
                        }}
                      >
                        Réf. magasin : {product.ref_mag || "-"} • Fournisseur :{" "}
                        {product.fournisseur || "-"}
                        <br />
                        Catégorie : {product.categorie || "-"} • Stock actuel :{" "}
                        {formatNumber(product.sf)}
                        <br />
                        Zone : {product.zone || "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 13,
                        color: currentTheme.textSoft,
                      }}
                    >
                      Double-clic
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {zoneModalOpen && (
        <div
          onClick={() => setZoneModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: currentTheme.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 1100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 1450,
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 28,
              padding: 20,
              boxShadow: `0 20px 60px ${currentTheme.shadow}`,
              maxHeight: "92vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>Plan des zones</div>
                <div style={{ marginTop: 4, color: currentTheme.textSoft, fontSize: 14 }}>
                  Clic sur une grande zone = tous les articles de la zone. Clic sur une case = zone précise.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => setZoneFilter(null)}
                  style={buttonGhostStyle(currentTheme)}
                >
                  Tout afficher
                </button>
                <button
                  onClick={() => setZoneModalOpen(false)}
                  style={{
                    background: currentTheme.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "11px 16px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 18,
              }}
            >
              {zoneGroups.map((group) => (
                <button
                  key={group.code}
                  onClick={() => selectZoneGroup(group.code, group.label)}
                  style={{
                    background: group.color,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 18,
                    padding: "14px 16px",
                    color: currentTheme.text,
                    fontWeight: 900,
                    fontSize: 16,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                minWidth: 1180,
                aspectRatio: "16 / 6",
                borderRadius: 24,
                background: currentTheme.cardSoft,
                border: `2px solid ${currentTheme.border}`,
                overflow: "hidden",
              }}
            >
                                          <div style={{ position: "absolute", left: "65.2%", top: "84.5%", width: "13.4%", height: 2, background: currentTheme.border }} />

              <button
                onClick={() => selectZoneGroup("A", "Zone A")}
                style={{
                  ...zoneAreaStyle(currentTheme, "rgba(34,197,94,0.13)"),
                  left: "9.0%",
                  top: "52%",
                  width: "11.2%",
                  height: "12%",
                }}
              >
                Zone A
              </button>

              <button
                onClick={() => selectZoneGroup("B", "Zone B")}
                style={{
                  ...zoneAreaStyle(currentTheme, "rgba(217,70,239,0.13)"),
                  left: "36.2%",
                  top: "52%",
                  width: "11.2%",
                  height: "12%",
                }}
              >
                Zone B
              </button>

              <button
                onClick={() => selectZoneGroup("C", "Zone C")}
                style={{
                  ...zoneAreaStyle(currentTheme, "rgba(132,204,22,0.13)"),
                  left: "63.4%",
                  top: "52%",
                  width: "11.2%",
                  height: "12%",
                }}
              >
                Zone C
              </button>

              <button
                onClick={() => selectZoneGroup("D", "Zone D")}
                style={{
                  ...zoneAreaStyle(currentTheme, "rgba(59,130,246,0.13)"),
                  left: "84.0%",
                  top: "52%",
                  width: "12.0%",
                  height: "12%",
                }}
              >
                Zone D
              </button>

              <div
                style={{
                  position: "absolute",
                  left: "84.0%",
                  top: "10.5%",
                  color: currentTheme.textSoft,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Salle du fond à droite
              </div>

              <div
                style={{
                  position: "absolute",
                  left: "36.6%",
                  bottom: "0%",
                  width: "13.3%",
                  height: "8%",
                  border: `2px solid ${currentTheme.border}`,
                  borderBottom: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 900,
                  color: currentTheme.text,
                  background: currentTheme.card,
                }}
              >
                ENTREE
              </div>

              {warehouseBoxes.map((box) => (
                <button
                  key={box.code}
                  onClick={() => selectZoneExact(box.code)}
                  title={`Filtrer ${box.code}`}
                  style={{
                    position: "absolute",
                    left: box.left,
                    top: box.top,
                    width: box.width,
                    height: box.height,
                    border: `2px solid ${currentTheme.border}`,
                    background: currentTheme.card,
                    color: currentTheme.text,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 500,
                    fontSize: box.fontSize || 14,
                  }}
                >
                  {box.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {finalModal.open && (
        <div
          onClick={() => setFinalModal({ open: false, message: "" })}
          style={{
            position: "fixed",
            inset: 0,
            background: currentTheme.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            ref={finalModalRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (ignoreNextModalEnterRef.current) {
                  ignoreNextModalEnterRef.current = false;
                  e.preventDefault();
                  return;
                }

                e.preventDefault();
                if (!saving) {
                  handleValidateInventory();
                }
              }

              if (e.key === "Escape" && !saving) {
                e.preventDefault();
                setFinalModal({ open: false, message: "" });
              }
            }}
            style={{
              width: "100%",
              maxWidth: 560,
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 24,
              padding: 20,
              boxShadow: `0 20px 60px ${currentTheme.shadow}`,
              outline: "none",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 10 }}>
              Validation finale
            </div>

            <div
              style={{
                marginBottom: 18,
                color: currentTheme.textSoft,
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Tous les articles ont été remplis. Appuie sur Entrée pour valider directement.
            </div>

            {finalModal.message ? (
              <div
                style={{
                  marginBottom: 18,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: currentTheme.cardSoft,
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.danger,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {finalModal.message}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => handleValidateInventory()}
                disabled={saving}
                style={{
                  background: currentTheme.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Valider
              </button>

              <button
                onClick={() => setFinalModal({ open: false, message: "" })}
                style={buttonGhostStyle(currentTheme)}
              >
                Annuler
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
  };
}

function buttonGhostStyle(theme: {
  cardSoft: string;
  border: string;
  text: string;
  shadow: string;
}): React.CSSProperties {
  return {
    background: theme.cardSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    padding: "11px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: `0 10px 30px ${theme.shadow}`,
  };
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
    borderRadius: 8,
    padding: "6px 8px",
    outline: "none",
    fontSize: 12,
  };
}

function itemStyle(theme: {
  cardSoft: string;
  border: string;
  text: string;
}): React.CSSProperties {
  return {
    width: "100%",
    background: theme.cardSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
    textAlign: "left",
  };
}

function zoneAreaStyle(
  theme: { border: string; text: string },
  background: string
): React.CSSProperties {
  return {
    position: "absolute",
    border: `1px solid ${theme.border}`,
    background,
    color: theme.text,
    borderRadius: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function differenceBoxStyle(
  theme: {
    cardSoft: string;
    border: string;
    text: string;
    textSoft: string;
    success: string;
    danger: string;
    warning: string;
  },
  diff: number | null
): React.CSSProperties {
  let borderColor = theme.border;
  let color = theme.text;

  if (diff !== null) {
    if (diff > 0) {
      borderColor = theme.success;
      color = theme.success;
    } else if (diff < 0) {
      borderColor = theme.danger;
      color = theme.danger;
    } else {
      borderColor = theme.warning;
      color = theme.warning;
    }
  }

  return {
    background: theme.cardSoft,
    border: `1px solid ${borderColor}`,
    color,
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 32,
    display: "flex",
    alignItems: "center",
  };
}
