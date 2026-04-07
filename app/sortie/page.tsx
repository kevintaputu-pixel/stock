"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
type FavoritesGroup = "epi" | "conso" | "washtec";

type OutputItem = {
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
  seuil_alerte: string;
  prix: string;
  qte_souhaite: string;
  stock_actuel: string;
  quantity: string;
};

type FinalModalState = {
  open: boolean;
  personName: string;
  sortieDate: string;
};

type SignatureRequestStatus = "idle" | "sending" | "pending" | "signed" | "error";

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

const FAVORITES_KEYS: Record<FavoritesGroup, string> = {
  epi: "stock-sortie-favorites-epi",
  conso: "stock-sortie-favorites-conso",
  washtec: "stock-sortie-favorites-washtec",
};

export default function SortiePage() {
  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [personOptions, setPersonOptions] = useState<string[]>([]);
  const finalPersonInputRef = useRef<HTMLInputElement | null>(null);

  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");

  const [outputItems, setOutputItems] = useState<OutputItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [favorites, setFavorites] = useState<Record<FavoritesGroup, string[]>>({
    epi: [],
    conso: [],
    washtec: [],
  });

  const [favoritesModal, setFavoritesModal] = useState<{
    open: boolean;
    group: FavoritesGroup | null;
    search: string;
    selectedIds: string[];
    showAll: boolean;
  }>({
    open: false,
    group: null,
    search: "",
    selectedIds: [],
    showAll: false,
  });

  const [finalModal, setFinalModal] = useState<FinalModalState>({
    open: false,
    personName: "",
    sortieDate: new Date().toISOString().slice(0, 10),
  });
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureStatus, setSignatureStatus] = useState<SignatureRequestStatus>("idle");
  const [signatureRequestToken, setSignatureRequestToken] = useState<string | null>(null);
  const [signatureSignedAt, setSignatureSignedAt] = useState<string | null>(null);
  const [signatureMessage, setSignatureMessage] = useState<string>("");
  const router = useRouter();

  const quantityRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const firstQuantityRef = useRef<HTMLInputElement | null>(null);
  const previousOutputLengthRef = useRef(0);

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

    const epi = readFavoriteIds("epi");
    const conso = readFavoriteIds("conso");
    const washtec = readFavoriteIds("washtec");

    setFavorites({
      epi,
      conso,
      washtec,
    });
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!signatureRequestToken || signatureStatus !== "pending") return;

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/signature-request?token=${encodeURIComponent(signatureRequestToken)}`, {
          cache: "no-store",
        });
        const json = await response.json();

        if (!response.ok || cancelled) return;

        if (json.status === "signed") {
          setSignatureStatus("signed");
          setSignatureDataUrl(json.signature_data_url || null);
          setSignatureSignedAt(json.signed_at || null);
          setSignatureMessage("Signature reçue depuis le téléphone.");
        }
      } catch (error) {
        console.error(error);
      }
    };

    poll();
    const interval = window.setInterval(poll, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [signatureRequestToken, signatureStatus]);

  useEffect(() => {
    const previousLength = previousOutputLengthRef.current;
    const currentLength = outputItems.length;

    if (currentLength === 0) {
      firstQuantityRef.current = null;
      previousOutputLengthRef.current = 0;
      return;
    }

    if (currentLength > previousLength) {
      const firstItem = outputItems[0];
      const input = quantityRefs.current[firstItem.localId] ?? firstQuantityRef.current;

      if (input) {
        setTimeout(() => {
          input.focus();
          input.select();
        }, 0);
      }
    }

    previousOutputLengthRef.current = currentLength;
  }, [outputItems]);


  function readFavoriteIds(group: FavoritesGroup) {
    try {
      const raw = localStorage.getItem(FAVORITES_KEYS[group]);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((v) => typeof v === "string");
    } catch {
      return [];
    }
  }

  function saveFavoriteIds(group: FavoritesGroup, ids: string[]) {
    localStorage.setItem(FAVORITES_KEYS[group], JSON.stringify(ids));
    setFavorites((prev) => ({ ...prev, [group]: ids }));
  }

  async function loadProducts() {
    setLoading(true);

    const [productsRes, personsRes] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, categorie, ref_mag, designation, ref_fournisseur, fournisseur, info, zone, demandeur, seuil_alerte, prix, qte_souhaite, s, sf"
        )
        .order("designation", { ascending: true }),

      supabase
        .from("app_data")
        .select("id, type, value, created_at")
        .eq("type", "person")
        .order("value", { ascending: true }),
    ]);

    if (productsRes.error) {
      console.error(productsRes.error);
      alert(productsRes.error.message);
      setLoading(false);
      return;
    }

    if (personsRes.error) {
      console.error(personsRes.error);
      alert(personsRes.error.message);
      setLoading(false);
      return;
    }

    setProducts((productsRes.data as Product[]) || []);

    const persons = ((personsRes.data as AppDataRow[]) || [])
      .map((row) => row.value?.trim() || "")
      .filter((value) => value.length > 0);

    setPersonOptions(
      Array.from(new Set(persons)).sort((a, b) => a.localeCompare(b, "fr"))
    );

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

  function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XPF",
      maximumFractionDigits: 0,
    }).format(value);
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
    const newLocalId = crypto.randomUUID();

    setOutputItems((prev) => {
      const exists = prev.find((item) => item.productId === product.id);

      if (exists) {
        const firstItem = prev[0];

        if (firstItem) {
          setTimeout(() => {
            const input = quantityRefs.current[firstItem.localId] ?? firstQuantityRef.current;
            input?.focus();
            input?.select();
          }, 0);
        }

        return prev;
      }

      return [
        ...prev,
        {
          localId: newLocalId,
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
          stock_actuel:
            product.sf !== null && product.sf !== undefined
              ? String(product.sf)
              : "0",
          quantity: "",
        },
      ];
    });
  }

  function addFavoriteProductToLeft(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    addExistingProductToLeft(product);
  }

  function updateOutputQuantity(localId: string, quantity: string) {
    setOutputItems((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, quantity } : item
      )
    );
  }

  function removeOutputItem(localId: string) {
    setOutputItems((prev) => prev.filter((item) => item.localId !== localId));
    delete quantityRefs.current[localId];
  }

  function focusFinalPersonInput() {
    setTimeout(() => {
      finalPersonInputRef.current?.focus();
      finalPersonInputRef.current?.select();
    }, 0);
  }

  function handleQuantityKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    localId: string
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const index = outputItems.findIndex((item) => item.localId === localId);
    if (index === -1) return;

    const nextItem = outputItems[index + 1];

    if (nextItem) {
      quantityRefs.current[nextItem.localId]?.focus();
      quantityRefs.current[nextItem.localId]?.select();
      return;
    }

    const allFilled =
      outputItems.length > 0 &&
      outputItems.every((item) => {
        const qty = Number(item.quantity.replace(",", "."));
        return Number.isFinite(qty) && qty > 0;
      });

    if (allFilled) {
      openFinalModal();
    }
  }

  function handleFinalModalNameKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (!saving) {
      handleValidateOutputs(finalModal.personName);
    }
  }

  async function handleValidateOutputs(personNameOverride?: string) {
    if (outputItems.length === 0) {
      alert("Ajoute au moins un article.");
      return;
    }

    for (const item of outputItems) {
      const qty = Number(item.quantity.replace(",", "."));
      const stockActuel = Number(item.stock_actuel.replace(",", "."));

      if (!Number.isFinite(qty) || qty <= 0) {
        alert(`Quantité invalide pour : ${item.designation || item.ref_mag}`);
        return;
      }

      if (qty > stockActuel) {
        alert(`Stock insuffisant pour : ${item.designation || item.ref_mag}`);
        return;
      }
    }

    setSaving(true);

    try {
      for (const item of outputItems) {
        const qty = Number(item.quantity.replace(",", "."));
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;

        const currentS = product.s ?? 0;
        const currentSf = product.sf ?? 0;

        const noteBase = personNameOverride?.trim()
          ? `Sortie pour ${personNameOverride.trim()}`
          : null;

        const { error } = await supabase
          .from("products")
          .update({
            s: currentS + qty,
            sf: currentSf - qty,
            ...(noteBase ? { info: noteBase } : {}),
          })
          .eq("id", item.productId);

        if (error) throw error;

        const { error: movementError } = await supabase
          .from("movements")
          .insert({
            categorie: item.categorie || null,
            ref_mag: item.ref_mag || null,
            designation: item.designation || null,
            ref_fournisseur: item.ref_fournisseur || null,
            fournisseur: item.fournisseur || null,
            info: item.info || null,
            zone: item.zone || null,
            demandeur: item.demandeur || null,
            sorties: qty,
            intervenant: personNameOverride?.trim() || null,
            entrees: 0,
            date: new Date().toISOString(),
          });

        if (movementError) throw movementError;
      }

      setOutputItems([]);
      setFinalModal({
        open: false,
        personName: "",
        sortieDate: new Date().toISOString().slice(0, 10),
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

  function validateOutputItemsBeforePdf() {
    if (outputItems.length === 0) {
      alert("Ajoute au moins un article.");
      return false;
    }

    for (const item of outputItems) {
      const qty = Number(item.quantity.replace(",", "."));
      const stockActuel = Number(item.stock_actuel.replace(",", "."));

      if (!Number.isFinite(qty) || qty <= 0) {
        alert(`Quantité invalide pour : ${item.designation || item.ref_mag}`);
        return false;
      }

      if (qty > stockActuel) {
        alert(`Stock insuffisant pour : ${item.designation || item.ref_mag}`);
        return false;
      }
    }

    return true;
  }

  function openFinalModal() {
    setFinalModal((prev) => ({
      open: true,
      personName: prev.personName || "",
      sortieDate: prev.sortieDate || new Date().toISOString().slice(0, 10),
    }));
    focusFinalPersonInput();
  }

  async function downloadSortiePdf() {
    if (!validateOutputItemsBeforePdf()) return;

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
    doc.text("Bon de sortie - Sorties stock", 14, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Date de sortie : ${formatDateForPdf(finalModal.sortieDate)}`, 14, y);
    y += 7;
    doc.text(`Demandeur : ${finalModal.personName.trim() || "-"}`, 14, y);
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

    for (const item of outputItems) {
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

    if (signatureDataUrl) {
      try {
        doc.addImage(signatureDataUrl, "PNG", 122, y + 2, 61, 20, undefined, "FAST");
      } catch (error) {
        console.error(error);
      }
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(finalModal.personName.trim() || "-", 122, y + 25);
    doc.text(`Date : ${formatDateForPdf(finalModal.sortieDate)}`, 122, y + 28.5);

    const safeDate = formatDateForPdf(finalModal.sortieDate).replace(/\//g, "-");
    const fileName = `Sorties-${safeDate}.pdf`;
    doc.save(fileName);
  }


  async function sendSignatureLink() {
    if (!finalModal.personName.trim()) {
      alert("Renseigne d'abord le demandeur.");
      return;
    }

    if (!validateOutputItemsBeforePdf()) return;

    try {
      setSignatureStatus("sending");
      setSignatureMessage("");

      const response = await fetch("/api/signature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demandeur: finalModal.personName.trim(),
          sortieDate: finalModal.sortieDate,
          items: outputItems.map((item) => ({
            ref_mag: item.ref_mag || "-",
            designation: item.designation || "-",
            fournisseur: item.fournisseur || "-",
            quantity: item.quantity || "0",
          })),
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Impossible d'envoyer l'email de signature.");
      }

      setSignatureRequestToken(json.token || null);
      setSignatureStatus("pending");
      setSignatureDataUrl(null);
      setSignatureSignedAt(null);
      setSignatureMessage("Mail envoyé à l'email admin. Ouvre-le sur ton téléphone pour signer.");
      alert("Mail de signature envoyé à l'email admin.");
    } catch (error: any) {
      console.error(error);
      setSignatureStatus("error");
      setSignatureMessage(error?.message || "Impossible d'envoyer le lien de signature.");
      alert(error?.message || "Impossible d'envoyer le lien de signature.");
    }
  }

  function openSignaturePageLocally() {
    if (!signatureRequestToken) return;
    router.push(`/signature?token=${encodeURIComponent(signatureRequestToken)}`);
  }

  function openFavoritesModal(group: FavoritesGroup) {
    const selected = [...favorites[group]];

    setFavoritesModal({
      open: true,
      group,
      search: "",
      selectedIds: selected,
      showAll: selected.length === 0,
    });
  }

  const favoritesModalProducts = useMemo(() => {
    if (!favoritesModal.group) return [];

    const q = favoritesModal.search.trim().toLowerCase();

    let base = products;

    if (!favoritesModal.showAll) {
      base = products.filter((product) =>
        favoritesModal.selectedIds.includes(product.id)
      );
    }

    return base.filter((product) => {
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

      if (!q) return true;
      return haystack.includes(q);
    });
  }, [
    favoritesModal.group,
    favoritesModal.search,
    favoritesModal.selectedIds,
    favoritesModal.showAll,
    products,
  ]);

  function toggleFavoriteSelection(productId: string) {
    setFavoritesModal((prev) => {
      if (!prev.group) return prev;
      const exists = prev.selectedIds.includes(productId);
      return {
        ...prev,
        selectedIds: exists
          ? prev.selectedIds.filter((id) => id !== productId)
          : [...prev.selectedIds, productId],
      };
    });
  }

  function saveFavoritesModalSelection() {
    if (!favoritesModal.group) return;

    saveFavoriteIds(favoritesModal.group, favoritesModal.selectedIds);

    setFavoritesModal((prev) => ({
      ...prev,
      search: "",
      showAll: false,
    }));
  }

  function getFavoritesLabel(group: FavoritesGroup) {
    if (group === "epi") return "E.P.I.";
    if (group === "conso") return "Conso";
    return "Washtec";
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

        <button onClick={sendSignatureLink} style={buttonGhostStyle(currentTheme)}>Signature ajoutée</button>
        <button onClick={openFinalModal} style={buttonGhostStyle(currentTheme)}>PDF</button>

        <button
          onClick={() => openFavoritesModal("epi")}
          style={buttonGhostStyle(currentTheme)}
        >
          E.P.I.
        </button>

        <button
          onClick={() => openFavoritesModal("conso")}
          style={buttonGhostStyle(currentTheme)}
        >
          Conso
        </button>

        <button
          onClick={() => openFavoritesModal("washtec")}
          style={buttonGhostStyle(currentTheme)}
        >
          Washtec
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
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              Sorties à valider
            </div>

            <button
              onClick={() => {
                openFinalModal();
              }}
              disabled={saving || outputItems.length === 0}
              style={{
                background: currentTheme.accent,
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "12px 16px",
                fontWeight: 900,
                cursor: "pointer",
                opacity: saving || outputItems.length === 0 ? 0.6 : 1,
              }}
            >
              {saving ? "Enregistrement..." : "Valider les sorties"}
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
            {outputItems.length === 0 ? (
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
              outputItems.map((item) => (
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
                      onClick={() => removeOutputItem(item.localId)}
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
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 14,
                      alignItems: "end",
                    }}
                  >
                    <div
                      style={{
                        flex: "1 1 220px",
                        minWidth: 0,
                        fontSize: 13,
                        color: currentTheme.textSoft,
                        lineHeight: 1.6,
                      }}
                    >
                      Catégorie : {item.categorie || "-"}
                      <br />
                      Zone : {item.zone || "-"}
                      <br />
                      Stock actuel : {item.stock_actuel || "0"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "end",
                        flexShrink: 0,
                      }}
                    >
                      <label style={{ display: "grid", gap: 6, width: 96 }}>
                        <span style={{ fontSize: 13, color: currentTheme.textSoft }}>
                          Stock actuel
                        </span>
                        <input
                          value={item.stock_actuel}
                          readOnly
                          style={{
                            ...inputStyle(currentTheme),
                            width: 60,
                            textAlign: "center",
                            opacity: 0.7,
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6, width: 96 }}>
                        <span style={{ fontSize: 13, color: currentTheme.textSoft }}>
                          Quantité
                        </span>
                        <input
                          ref={(el) => {
                            quantityRefs.current[item.localId] = el;

                            if (outputItems[0]?.localId === item.localId) {
                              firstQuantityRef.current = el;
                            }
                          }}
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateOutputQuantity(item.localId, e.target.value)
                          }
                          onKeyDown={(e) => handleQuantityKeyDown(e, item.localId)}
                          placeholder="0"
                          style={{
                            ...inputStyle(currentTheme),
                            width: 75,
                            textAlign: "center",
                          }}
                        />
                      </label>
                    </div>
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
              <div style={itemStyle(currentTheme)}>Aucun article trouvé</div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onDoubleClick={() => addExistingProductToLeft(product)}
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

      {favoritesModal.open && favoritesModal.group && (
        <div
          onClick={() =>
            setFavoritesModal({
              open: false,
              group: null,
              search: "",
              selectedIds: [],
              showAll: false,
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
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
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
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {getFavoritesLabel(favoritesModal.group)}
              </div>

              <button
                onClick={() =>
                  setFavoritesModal({
                    open: false,
                    group: null,
                    search: "",
                    selectedIds: [],
                    showAll: false,
                  })
                }
                style={buttonGhostStyle(currentTheme)}
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <input
                value={favoritesModal.search}
                onChange={(e) =>
                  setFavoritesModal((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                placeholder="Rechercher dans le stock..."
                style={inputStyle(currentTheme)}
              />

              <button
                onClick={() =>
                  setFavoritesModal((prev) => ({ ...prev, search: "" }))
                }
                style={buttonGhostStyle(currentTheme)}
              >
                Effacer
              </button>

              <button
                onClick={() =>
                  setFavoritesModal((prev) => ({
                    ...prev,
                    showAll: true,
                  }))
                }
                style={buttonGhostStyle(currentTheme)}
              >
                Ajouter
              </button>

              <button
                onClick={saveFavoritesModalSelection}
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
                Enregistrer
              </button>
            </div>

            <div
              style={{
                marginBottom: 12,
                fontSize: 13,
                color: currentTheme.textSoft,
              }}
            >
              {favoritesModal.showAll
                ? "Affichage : tous les articles du stock"
                : "Affichage : uniquement les articles sélectionnés"}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {favoritesModalProducts.map((product) => {
                const selected = favoritesModal.selectedIds.includes(product.id);

                return (
                  <div
                    key={product.id}
                    style={{
                      background: currentTheme.cardSoft,
                      border: `1px solid ${
                        selected ? currentTheme.accent : currentTheme.border
                      }`,
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
                          Stock actuel : {formatNumber(product.sf)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => toggleFavoriteSelection(product.id)}
                          style={{
                            background: selected
                              ? currentTheme.accent
                              : currentTheme.card,
                            color: "#fff",
                            border: "none",
                            borderRadius: 12,
                            padding: "10px 12px",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {selected ? "Sélectionné" : "Sélectionner"}
                        </button>

                        <button
                          onClick={() => addFavoriteProductToLeft(product.id)}
                          style={buttonGhostStyle(currentTheme)}
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {favoritesModalProducts.length === 0 && (
                <div style={itemStyle(currentTheme)}>Aucun article trouvé</div>
              )}
            </div>
          </div>
        </div>
      )}



      {finalModal.open && (
        <div
          onClick={() =>
            setFinalModal((prev) => ({ ...prev, open: false }))
          }
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
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 24,
              padding: 20,
              boxShadow: `0 20px 60px ${currentTheme.shadow}`,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 14 }}>
              Validation finale
            </div>

            <label style={{ display: "grid", gap: 6, marginBottom: 18 }}>
              <span style={{ fontSize: 13, color: currentTheme.textSoft }}>
                Nom de la personne
              </span>

              <input
                ref={finalPersonInputRef}
                list="person-options"
                value={finalModal.personName}
                onChange={(e) =>
                  setFinalModal((prev) => ({
                    ...prev,
                    personName: e.target.value,
                  }))
                }
                onKeyDown={handleFinalModalNameKeyDown}
                placeholder="Choisir ou écrire un nom"
                style={inputStyle(currentTheme)}
              />

              <datalist id="person-options">
                {personOptions.map((person) => (
                  <option key={person} value={person} />
                ))}
              </datalist>
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 18 }}>
              <span style={{ fontSize: 13, color: currentTheme.textSoft }}>
                Date de sortie
              </span>

              <input
                type="date"
                value={finalModal.sortieDate}
                onChange={(e) =>
                  setFinalModal((prev) => ({
                    ...prev,
                    sortieDate: e.target.value,
                  }))
                }
                style={inputStyle(currentTheme)}
              />
            </label>

            <div
              style={{
                marginBottom: 14,
                fontSize: 13,
                color: currentTheme.textSoft,
                lineHeight: 1.6,
              }}
            >
              Signature : {signatureStatus === "signed" ? "reçue et ajoutée au PDF" : signatureStatus === "pending" ? "mail envoyé, en attente de signature" : signatureDataUrl ? "ajoutée au PDF" : "non ajoutée"}
              {signatureMessage ? <><br />{signatureMessage}</> : null}
              {signatureSignedAt ? <><br />Signée le : {new Date(signatureSignedAt).toLocaleString("fr-FR")}</> : null}
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
                onClick={() => handleValidateOutputs(finalModal.personName)}
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
                type="button"
                onClick={downloadSortiePdf}
                disabled={!finalModal.personName.trim()}
                style={{
                  ...buttonGhostStyle(currentTheme),
                  opacity: finalModal.personName.trim() ? 1 : 0.5,
                  cursor: finalModal.personName.trim() ? "pointer" : "not-allowed",
                }}
              >
                Télécharger PDF
              </button>

              <button
                type="button"
                onClick={sendSignatureLink}
                disabled={!finalModal.personName.trim() || signatureStatus === "sending"}
                style={{
                  ...buttonGhostStyle(currentTheme),
                  opacity: finalModal.personName.trim() ? 1 : 0.5,
                  cursor: finalModal.personName.trim() ? "pointer" : "not-allowed",
                }}
              >
                {signatureStatus === "sending" ? "Envoi..." : signatureStatus === "pending" ? "Mail envoyé" : signatureStatus === "signed" ? "Signature reçue" : "Signature ajoutée"}
              </button>

              {signatureRequestToken && signatureStatus !== "signed" && (
                <button
                  type="button"
                  onClick={openSignaturePageLocally}
                  style={buttonGhostStyle(currentTheme)}
                >
                  Ouvrir le lien
                </button>
              )}

              <button
                onClick={() =>
                  setFinalModal((prev) => ({ ...prev, open: false }))
                }
                style={buttonGhostStyle(currentTheme)}
              >
                Fermer
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
    borderRadius: 12,
    padding: "12px 14px",
    outline: "none",
    fontSize: 14,
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
  };
}