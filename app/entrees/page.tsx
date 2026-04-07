"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { jsPDF } from "jspdf";

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
  e: number | null;
  sf: number | null;
};

type ThemeName = "dark" | "green" | "tropical" | "whiteBlue";

type EntryItem = {
  localId: string;
  source: "existing" | "new";
  productId: string | null;
  categorie: string;
  ref_mag: string;
  designation: string;
  ref_fournisseur: string;
  fournisseur: string;
  info: string;
  zone: string;
  demandeur: string;
  seuil_alerte: string;
  prix: string;
  qte_souhaite: string;
  quantity: string;
};

type NewArticleForm = {
  action: string;
  categorie: string;
  ref_mag: string;
  designation: string;
  ref_fournisseur: string;
  fournisseur: string;
  info: string;
  zone: string;
  demandeur: string;
  seuil_alerte: string;
  prix: string;
  qte_souhaite: string;
};

type ReceiptModalState = {
  open: boolean;
  receptionDate: string;
  bc: string;
};

type PdfConfirmModalState = {
  open: boolean;
  selected: "oui" | "non";
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
  },
};

const themeOrder: ThemeName[] = ["whiteBlue", "dark", "green", "tropical"];

export default function EntreesPage() {
  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");

  const [entryItems, setEntryItems] = useState<EntryItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [showNewArticleModal, setShowNewArticleModal] = useState(false);
  const [creatingArticle, setCreatingArticle] = useState(false);
  const [nextRefMag, setNextRefMag] = useState("");
  const [newArticleForm, setNewArticleForm] = useState<NewArticleForm>({
    action: "Entrée",
    categorie: "",
    ref_mag: "",
    designation: "",
    ref_fournisseur: "",
    fournisseur: "",
    info: "",
    zone: "",
    demandeur: "",
    seuil_alerte: "",
    prix: "",
    qte_souhaite: "",
  });

  const [receiptModal, setReceiptModal] = useState<ReceiptModalState>({
    open: false,
    receptionDate: new Date().toISOString().slice(0, 10),
    bc: "",
  });
  const [pdfConfirmModal, setPdfConfirmModal] = useState<PdfConfirmModalState>({
    open: false,
    selected: "non",
  });

  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);
  const bcInputRef = useRef<HTMLInputElement | null>(null);
  const saveOnlyButtonRef = useRef<HTMLButtonElement | null>(null);
  const pdfConfirmNoButtonRef = useRef<HTMLButtonElement | null>(null);

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
    quantityRefs.current = quantityRefs.current.slice(0, entryItems.length);
  }, [entryItems.length]);

  useEffect(() => {
    if (entryItems.length === 0 || receiptModal.open) return;

    const hasFilledQuantity = entryItems.some((item) => item.quantity.trim() !== "");
    if (hasFilledQuantity) return;

    const timer = window.setTimeout(() => {
      quantityRefs.current[0]?.focus();
      quantityRefs.current[0]?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [entryItems, receiptModal.open]);

  useEffect(() => {
    if (!receiptModal.open || pdfConfirmModal.open) return;

    const timer = window.setTimeout(() => {
      saveOnlyButtonRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [receiptModal.open, pdfConfirmModal.open]);

  useEffect(() => {
    if (!pdfConfirmModal.open) return;

    const timer = window.setTimeout(() => {
      pdfConfirmNoButtonRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pdfConfirmModal.open]);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, categorie, ref_mag, designation, ref_fournisseur, fournisseur, info, zone, demandeur, seuil_alerte, prix, qte_souhaite, e, sf"
      )
      .order("designation", { ascending: true });

    if (error) {
      console.error(error);
      alert(error.message);
      setLoading(false);
      return;
    }

    const rows = (data as Product[]) || [];
    setProducts(rows);

    const nextRef = computeNextRefMag(rows);
    setNextRefMag(nextRef);
    setNewArticleForm((prev) => ({
      ...prev,
      ref_mag: nextRef,
    }));

    setLoading(false);
  }

  function computeNextRefMag(list: Product[]) {
    let maxNumber = 0;

    for (const item of list) {
      const raw = item.ref_mag || "";
      const matches = raw.match(/\d+/g);
      if (!matches) continue;

      for (const m of matches) {
        const n = Number(m);
        if (Number.isFinite(n) && n > maxNumber) {
          maxNumber = n;
        }
      }
    }

    return String(maxNumber + 1);
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

  function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XPF",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function normalizeText(value: string) {
    const t = value.trim();
    return t === "" ? null : t;
  }

  function normalizeNumber(value: string) {
    const t = value.trim();
    if (!t) return null;
    const n = Number(t.replace(",", "."));
    return Number.isNaN(n) ? null : n;
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

      return true;
    });
  }, [products, search1, search2]);

  const currentTheme = themes[theme];

  function addExistingProductToLeft(product: Product) {
    setEntryItems((prev) => {
      const exists = prev.find(
        (item) => item.source === "existing" && item.productId === product.id
      );

      if (exists) return prev;

      return [
        ...prev,
        {
          localId: crypto.randomUUID(),
          source: "existing",
          productId: product.id,
          categorie: product.categorie || "",
          ref_mag: product.ref_mag || "",
          designation: product.designation || "",
          ref_fournisseur: product.ref_fournisseur || "",
          fournisseur: product.fournisseur || "",
          info: product.info || "",
          zone: product.zone || "",
          demandeur: product.demandeur || "",
          seuil_alerte:
            product.seuil_alerte !== null && product.seuil_alerte !== undefined
              ? String(product.seuil_alerte)
              : "",
          prix:
            product.prix !== null && product.prix !== undefined
              ? String(product.prix)
              : "",
          qte_souhaite:
            product.qte_souhaite !== null && product.qte_souhaite !== undefined
              ? String(product.qte_souhaite)
              : "",
          quantity: "",
        },
      ];
    });
  }

  function updateEntryQuantity(localId: string, quantity: string) {
    setEntryItems((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, quantity } : item
      )
    );
  }

  function removeEntryItem(localId: string) {
    setEntryItems((prev) => prev.filter((item) => item.localId !== localId));
  }

  function openNewArticleModal() {
    const ref = computeNextRefMag(products);
    setNextRefMag(ref);
    setNewArticleForm({
      action: "Entrée",
      categorie: "",
      ref_mag: ref,
      designation: "",
      ref_fournisseur: "",
      fournisseur: "",
      info: "",
      zone: "",
      demandeur: "",
      seuil_alerte: "",
      prix: "",
      qte_souhaite: "",
    });
    setShowNewArticleModal(true);
  }

  function addNewArticleToLeft(keepOpen: boolean) {
    if (!newArticleForm.designation.trim()) {
      alert("Renseigne au moins la désignation.");
      return;
    }

    const currentRef = newArticleForm.ref_mag.trim() || nextRefMag;

    const newItem: EntryItem = {
      localId: crypto.randomUUID(),
      source: "new",
      productId: null,
      categorie: newArticleForm.categorie.trim(),
      ref_mag: currentRef,
      designation: newArticleForm.designation.trim(),
      ref_fournisseur: newArticleForm.ref_fournisseur.trim(),
      fournisseur: newArticleForm.fournisseur.trim(),
      info: newArticleForm.info.trim(),
      zone: newArticleForm.zone.trim(),
      demandeur: newArticleForm.demandeur.trim(),
      seuil_alerte: newArticleForm.seuil_alerte.trim(),
      prix: newArticleForm.prix.trim(),
      qte_souhaite: newArticleForm.qte_souhaite.trim(),
      quantity: "",
    };

    setEntryItems((prev) => [...prev, newItem]);

    const nextNumber = Number(currentRef.replace(/\D/g, "")) || Number(currentRef) || 0;
    const nextRef = String(nextNumber + 1);

    setNextRefMag(nextRef);
    setNewArticleForm({
      action: "Entrée",
      categorie: "",
      ref_mag: nextRef,
      designation: "",
      ref_fournisseur: "",
      fournisseur: "",
      info: "",
      zone: "",
      demandeur: "",
      seuil_alerte: "",
      prix: "",
      qte_souhaite: "",
    });

    if (!keepOpen) {
      setShowNewArticleModal(false);
    }
  }


  function validateEntryItemsBeforeSave() {
    if (entryItems.length === 0) {
      return false;
    }

    for (let index = 0; index < entryItems.length; index += 1) {
      const item = entryItems[index];
      const qty = Number(item.quantity.replace(",", "."));
      if (!Number.isFinite(qty) || qty <= 0) {
        window.setTimeout(() => {
          quantityRefs.current[index]?.focus();
          quantityRefs.current[index]?.select();
        }, 0);
        return false;
      }
    }

    return true;
  }

  function handleQuantityEnter(localId: string) {
    const currentIndex = entryItems.findIndex((item) => item.localId === localId);
    if (currentIndex === -1) return;

    const currentItem = entryItems[currentIndex];
    const qty = Number(currentItem.quantity.replace(",", "."));

    if (!Number.isFinite(qty) || qty <= 0) {
      window.setTimeout(() => {
        quantityRefs.current[currentIndex]?.focus();
        quantityRefs.current[currentIndex]?.select();
      }, 0);
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < entryItems.length) {
      window.setTimeout(() => {
        quantityRefs.current[nextIndex]?.focus();
        quantityRefs.current[nextIndex]?.select();
      }, 0);
      return;
    }

    openReceiptModal();
  }

  function openReceiptModal() {
    if (!validateEntryItemsBeforeSave()) return;

    setReceiptModal((prev) => ({
      ...prev,
      open: true,
    }));
  }

  function askBeforeSaveWithoutPdf() {
    if (!validateEntryItemsBeforeSave()) return;

    setPdfConfirmModal({
      open: true,
      selected: "non",
    });
  }

  async function confirmSaveWithoutPdf() {
    if (pdfConfirmModal.selected === "non") {
      setPdfConfirmModal({
        open: false,
        selected: "non",
      });
      await saveEntriesOnly();
      return;
    }

    setPdfConfirmModal({
      open: false,
      selected: "non",
    });
  }

  async function saveEntriesOnly() {
    if (!validateEntryItemsBeforeSave()) return;

    setSaving(true);

    try {
      for (const item of entryItems) {
        const qty = Number(item.quantity.replace(",", "."));

        if (item.source === "existing" && item.productId) {
          const product = products.find((p) => p.id === item.productId);
          if (!product) continue;

          const currentE = product.e ?? 0;
          const currentSf = product.sf ?? 0;

          const { error } = await supabase
            .from("products")
            .update({
              e: currentE + qty,
              sf: currentSf + qty,
            })
            .eq("id", item.productId);

          if (error) throw error;

          const { error: movementError } = await supabase.from("movements").insert({
            categorie: item.categorie || null,
            ref_mag: item.ref_mag || null,
            designation: item.designation || null,
            ref_fournisseur: item.ref_fournisseur || null,
            fournisseur: item.fournisseur || null,
            info: item.info || null,
            zone: item.zone || null,
            demandeur: item.demandeur || null,
            sorties: 0,
            intervenant: null,
            entrees: qty,
            date: new Date().toISOString(),
          });

          if (movementError) throw movementError;
        }

        if (item.source === "new") {
          const { error } = await supabase.from("products").insert({
            categorie: normalizeText(item.categorie),
            ref_mag: normalizeText(item.ref_mag),
            designation: normalizeText(item.designation),
            ref_fournisseur: normalizeText(item.ref_fournisseur),
            fournisseur: normalizeText(item.fournisseur),
            info: normalizeText(item.info),
            zone: normalizeText(item.zone),
            demandeur: normalizeText(item.demandeur),
            si: 0,
            e: qty,
            s: 0,
            sf: qty,
            inventaire: null,
            seuil_alerte: normalizeNumber(item.seuil_alerte),
            prix: normalizeNumber(item.prix),
            qte_souhaite: normalizeNumber(item.qte_souhaite),
            prix_final:
              (normalizeNumber(item.prix) ?? 0) *
              (normalizeNumber(item.qte_souhaite) ?? 0),
          });

          if (error) throw error;

          const { error: movementError } = await supabase.from("movements").insert({
            categorie: normalizeText(item.categorie),
            ref_mag: normalizeText(item.ref_mag),
            designation: normalizeText(item.designation),
            ref_fournisseur: normalizeText(item.ref_fournisseur),
            fournisseur: normalizeText(item.fournisseur),
            info: normalizeText(item.info),
            zone: normalizeText(item.zone),
            demandeur: normalizeText(item.demandeur),
            sorties: 0,
            intervenant: null,
            entrees: qty,
            date: new Date().toISOString(),
          });

          if (movementError) throw movementError;
        }
      }

      
      setEntryItems([]);
      setReceiptModal({
        open: false,
        receptionDate: new Date().toISOString().slice(0, 10),
        bc: "",
      });
      setPdfConfirmModal({
        open: false,
        selected: "non",
      });
      await loadProducts();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erreur pendant l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  function formatDateForPdf(value: string) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("fr-FR");
  }

  async function downloadEntriesPdf() {
    if (!validateEntryItemsBeforeSave()) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Bon de réception - Entrées stock", 14, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Date de réception : ${formatDateForPdf(receiptModal.receptionDate)}`, 14, y);
    y += 7;
    doc.text(`BC : ${receiptModal.bc || "-"}`, 14, y);
    y += 10;

    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(210, 220, 240);
    doc.rect(14, y, pageWidth - 28, 10, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Réf.", 16, y + 6.5);
    doc.text("Désignation", 38, y + 6.5);
    doc.text("Fournisseur", 105, y + 6.5);
    doc.text("Qté", 175, y + 6.5);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    for (const item of entryItems) {
      const qty = item.quantity || "0";
      const rowHeight = 10;

      if (y + rowHeight > pageHeight - 50) {
        doc.addPage();
        y = 16;
      }

      doc.rect(14, y, pageWidth - 28, rowHeight);
      doc.text(item.ref_mag || "-", 16, y + 6.5, { maxWidth: 18 });
      doc.text(item.designation || "-", 38, y + 6.5, { maxWidth: 62 });
      doc.text(item.fournisseur || "-", 105, y + 6.5, { maxWidth: 58 });
      doc.text(String(qty), 175, y + 6.5, { maxWidth: 20 });
      y += rowHeight;
    }

    y += 12;

    if (y + 45 > pageHeight) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Signature Magasinier", 20, y);
    doc.text("Signature Demandeur", 120, y);
    y += 4;

    doc.rect(20, y, 65, 28);
    doc.rect(120, y, 65, 28);

    const safeDate = formatDateForPdf(receiptModal.receptionDate).replace(/\//g, "-");
    const fileName = `Entrees-${safeDate}.pdf`;
    doc.save(fileName);
    await saveEntriesOnly();
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
            <div style={{ fontSize: 22, fontWeight: 900 }}>Entrées à valider</div>

            <button
              onClick={openReceiptModal}
              disabled={saving || entryItems.length === 0}
              style={{
                background: currentTheme.accent,
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "12px 16px",
                fontWeight: 900,
                cursor: "pointer",
                opacity: saving || entryItems.length === 0 ? 0.6 : 1,
              }}
            >
              {saving ? "Enregistrement..." : "Valider les entrées"}
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
            {entryItems.length === 0 ? (
              <div
                style={{
                  background: currentTheme.cardSoft,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 16,
                  padding: 16,
                  color: currentTheme.textSoft,
                }}
              >
                Double-clique sur un article à droite pour l’ajouter ici, ou crée
                un nouvel article.
              </div>
            ) : (
              entryItems.map((item, index) => (
                <div
                  key={item.localId}
                  style={{
                    background: currentTheme.cardSoft,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 16,
                    padding: 14,
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
                      <div style={{ fontWeight: 900, fontSize: 16 }}>
                        {item.designation || "-"}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: currentTheme.textSoft,
                        }}
                      >
                        Réf. magasin : {item.ref_mag || "-"} • Fournisseur :{" "}
                        {item.fournisseur || "-"}
                      </div>
                    </div>

                    <button
                      onClick={() => removeEntryItem(item.localId)}
                      style={{
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: 12,
                        padding: "10px 12px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Retirer
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 170px",
                      gap: 12,
                      alignItems: "end",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: currentTheme.textSoft,
                        lineHeight: 1.6,
                      }}
                    >
                      Catégorie : {item.categorie || "-"}
                      <br />
                      Zone : {item.zone || "-"}
                      <br />
                      Type : {item.source === "new" ? "Nouvel article" : "Article existant"}
                    </div>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13, color: currentTheme.textSoft }}>
                        Quantité
                      </span>
                      <input
                        ref={(el) => {
                          quantityRefs.current[index] = el;
                        }}
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateEntryQuantity(item.localId, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleQuantityEnter(item.localId);
                          }
                        }}
                        placeholder="0" 
                        style={{...inputStyle(currentTheme),
                        width: 100, // 👈 change la taille ici
                        textAlign: "center",
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))
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
            <input
              value={search1}
              onChange={(e) => setSearch1(e.target.value)}
              placeholder="Recherche 1"
              style={inputStyle(currentTheme)}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
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

              <button
                onClick={openNewArticleModal}
                style={{
                  background: currentTheme.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "0 14px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Nouvel article
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
              <div style={itemStyle(currentTheme, false)}>Chargement...</div>
            ) : filteredProducts.length === 0 ? (
              <div style={itemStyle(currentTheme, false)}>
                Aucun article trouvé
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onDoubleClick={() => addExistingProductToLeft(product)}
                  style={itemStyle(currentTheme, false)}
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
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 13,
                        color: currentTheme.textSoft,
                      }}
                    >
                      Prix : {formatPrice(product.prix)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {showNewArticleModal && (
        <div
          onClick={() => !creatingArticle && setShowNewArticleModal(false)}
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
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                if (pdfConfirmModal.open) return;
                setReceiptModal((prev) => ({ ...prev, open: false }));
                return;
              }

              if (e.key === "Enter" && !pdfConfirmModal.open) {
                e.preventDefault();
                askBeforeSaveWithoutPdf();
              }
            }}
            tabIndex={-1}
            style={{
              width: "100%",
              maxWidth: 1050,
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
                gap: 12,
                alignItems: "center",
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                Nouvel article
              </div>

              <button
                onClick={() => setShowNewArticleModal(false)}
                style={{
                  background: currentTheme.cardSoft,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 800,
                  cursor: "pointer",
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
                label="Action"
                value={newArticleForm.action}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, action: v }))
                }
                theme={currentTheme}
              />
              <Field
                label="Catégorie"
                value={newArticleForm.categorie}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, categorie: v }))
                }
                theme={currentTheme}
              />
              <Field
                label="Réf. magasin"
                value={newArticleForm.ref_mag}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, ref_mag: v }))
                }
                theme={currentTheme}
              />
              <Field
                label="Désignation"
                value={newArticleForm.designation}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, designation: v }))
                }
                theme={currentTheme}
              />
              <Field
                label="Réf. fournisseur"
                value={newArticleForm.ref_fournisseur}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({
                    ...prev,
                    ref_fournisseur: v,
                  }))
                }
                theme={currentTheme}
              />
              <Field
                label="Fournisseur"
                value={newArticleForm.fournisseur}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, fournisseur: v }))
                }
                theme={currentTheme}
              />
              <Field
                label="Info"
                value={newArticleForm.info}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, info: v }))
                }
                theme={currentTheme}
              />
              <Field
                label="Zone"
                value={newArticleForm.zone}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, zone: v }))
                }
                theme={currentTheme}
              />
              <Field
                label="Demandeur"
                value={newArticleForm.demandeur}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, demandeur: v }))
                }
                theme={currentTheme}
              />
              <Field
                label="Seuil d’alerte"
                value={newArticleForm.seuil_alerte}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, seuil_alerte: v }))
                }
                theme={currentTheme}
                type="number"
              />
              <Field
                label="Prix unitaire"
                value={newArticleForm.prix}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, prix: v }))
                }
                theme={currentTheme}
                type="number"
              />
              <Field
                label="Qté souhaitée"
                value={newArticleForm.qte_souhaite}
                onChange={(v) =>
                  setNewArticleForm((prev) => ({ ...prev, qte_souhaite: v }))
                }
                theme={currentTheme}
                type="number"
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 20,
              }}
            >
              <button
                onClick={() => addNewArticleToLeft(false)}
                disabled={creatingArticle}
                style={{
                  background: currentTheme.cardSoft,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 14,
                  padding: "12px 18px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Enregistrer
              </button>

              <button
                onClick={() => addNewArticleToLeft(true)}
                disabled={creatingArticle}
                style={{
                  background: currentTheme.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 14,
                  padding: "12px 18px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
      {receiptModal.open && (
        <div
          onClick={() => {
            if (saving || pdfConfirmModal.open) return;
            setReceiptModal((prev) => ({ ...prev, open: false }));
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: currentTheme.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 1000,
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
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>
                  Validation des entrées
                </div>
                <div style={{ marginTop: 4, color: currentTheme.textSoft, fontSize: 14 }}>
                  Vérifie les informations avant enregistrement ou export PDF.
                </div>
              </div>

              <button
                onClick={() => {
                  if (pdfConfirmModal.open) return;
                  setReceiptModal((prev) => ({ ...prev, open: false }));
                }}
                style={buttonLinkStyle(currentTheme)}
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 14,
                marginBottom: 18,
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: currentTheme.textSoft }}>
                  Date de réception
                </span>
                <input
                  type="date"
                  value={receiptModal.receptionDate}
                  onChange={(e) =>
                    setReceiptModal((prev) => ({
                      ...prev,
                      receptionDate: e.target.value,
                    }))
                  }
                  style={inputStyle(currentTheme)}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: currentTheme.textSoft }}>
                  BC
                </span>
                <input
                  ref={bcInputRef}
                  type="text"
                  value={receiptModal.bc}
                  onChange={(e) =>
                    setReceiptModal((prev) => ({
                      ...prev,
                      bc: e.target.value,
                    }))
                  }
                  style={inputStyle(currentTheme)}
                />
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                marginBottom: 18,
              }}
            >
              {entryItems.map((item) => (
                <div
                  key={item.localId}
                  style={{
                    background: currentTheme.cardSoft,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {item.designation || "-"}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: currentTheme.textSoft,
                      lineHeight: 1.6,
                    }}
                  >
                    Réf. magasin : {item.ref_mag || "-"} • Fournisseur : {item.fournisseur || "-"}
                    <br />
                    Catégorie : {item.categorie || "-"} • Zone : {item.zone || "-"}
                    <br />
                    Quantité : <b style={{ color: currentTheme.text }}>{item.quantity || "0"}</b>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  border: `2px dashed ${currentTheme.border}`,
                  borderRadius: 18,
                  padding: 16,
                  minHeight: 120,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontWeight: 900 }}>Magasinier</div>
                <div style={{ color: currentTheme.textSoft, fontSize: 13 }}>
                  Signature
                </div>
              </div>

              <div
                style={{
                  border: `2px dashed ${currentTheme.border}`,
                  borderRadius: 18,
                  padding: 16,
                  minHeight: 120,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontWeight: 900 }}>Demandeur</div>
                <div style={{ color: currentTheme.textSoft, fontSize: 13 }}>
                  Signature
                </div>
              </div>
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
                onClick={downloadEntriesPdf}
                disabled={saving}
                style={{
                  background: currentTheme.accent2,
                  color: theme === "whiteBlue" ? "#0f172a" : "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Télécharger le PDF
              </button>

              <button
                ref={saveOnlyButtonRef}
                onClick={askBeforeSaveWithoutPdf}
                disabled={saving || pdfConfirmModal.open}
                style={{
                  background: currentTheme.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Enregistrement..." : "Uniquement Enregistrer l'entrée"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfConfirmModal.open && (
        <div
          onClick={() =>
            !saving &&
            setPdfConfirmModal({
              open: false,
              selected: "non",
            })
          }
          style={{
            position: "fixed",
            inset: 0,
            background: currentTheme.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                setPdfConfirmModal((prev) => ({
                  ...prev,
                  selected: prev.selected === "non" ? "oui" : "non",
                }));
                return;
              }

              if (e.key === "Escape") {
                e.preventDefault();
                setPdfConfirmModal({
                  open: false,
                  selected: "non",
                });
                return;
              }

              if (e.key === "Enter") {
                e.preventDefault();
                confirmSaveWithoutPdf();
              }
            }}
            style={{
              width: "100%",
              maxWidth: 520,
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 24,
              padding: 20,
              boxShadow: `0 20px 60px ${currentTheme.shadow}`,
            }}
          >
            <div style={{ fontSize: 23, fontWeight: 900, marginBottom: 8 }}>
              PDF
            </div>

            <div
              style={{
                color: currentTheme.textSoft,
                fontSize: 15,
                lineHeight: 1.6,
                marginBottom: 18,
              }}
            >
               pas besoin du PDF ?
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <button
                onClick={() =>
                  setPdfConfirmModal({
                    open: false,
                    selected: "non",
                  })
                }
                onFocus={() =>
                  setPdfConfirmModal((prev) => ({
                    ...prev,
                    selected: "non",
                  }))
                }
                ref={pdfConfirmNoButtonRef}
                style={{
                  background:
                    pdfConfirmModal.selected === "non"
                      ? currentTheme.accent
                      : currentTheme.cardSoft,
                  color:
                    pdfConfirmModal.selected === "non"
                      ? "#fff"
                      : currentTheme.text,
                  border:
                    pdfConfirmModal.selected === "non"
                      ? "none"
                      : `1px solid ${currentTheme.border}`,
                  borderRadius: 14,
                  padding: "14px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Non
              </button>

              <button
                onClick={() => {
                  setPdfConfirmModal({
                    open: false,
                    selected: "non",
                  });
                }}
                onFocus={() =>
                  setPdfConfirmModal((prev) => ({
                    ...prev,
                    selected: "oui",
                  }))
                }
                style={{
                  background:
                    pdfConfirmModal.selected === "oui"
                      ? currentTheme.accent
                      : currentTheme.cardSoft,
                  color:
                    pdfConfirmModal.selected === "oui"
                      ? "#fff"
                      : currentTheme.text,
                  border:
                    pdfConfirmModal.selected === "oui"
                      ? "none"
                      : `1px solid ${currentTheme.border}`,
                  borderRadius: 14,
                  padding: "14px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Oui
              </button>
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
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: theme.textSoft }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: theme.cardSoft,
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

function itemStyle(
  theme: {
    cardSoft: string;
    border: string;
    text: string;
    shadow: string;
  },
  active: boolean
): React.CSSProperties {
  return {
    width: "100%",
    background: theme.cardSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
    boxShadow: active ? `0 10px 30px ${theme.shadow}` : "none",
  };
}