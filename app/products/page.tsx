"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccessRealtime } from "@/lib/useAccessRealtime";
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

type AppDataRow = {
  id: string;
  type: string;
  value: string;
  created_at: string;
};

type AccessRequestResponse = {
  ok: boolean;
  requestId?: string;
  message?: string;
  status?: string;
};

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
  | "prix_final";

type SortableColumnKey = ColumnKey;
type SortDirection = "asc" | "desc";

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
  overlay: string;
  success: string;
  danger: string;
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
    overlay: "rgba(0,0,0,0.65)",
    success: "#16a34a",
    danger: "#dc2626",
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
    success: "#16a34a",
    danger: "#dc2626",
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
    success: "#16a34a",
    danger: "#dc2626",
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
    success: "#16a34a",
    danger: "#dc2626",
  },
};

const themeOrder: ThemeName[] = ["dark", "green", "tropical", "whiteBlue"];

const columns: { key: ColumnKey; label: string; baseWidth: number }[] = [
  { key: "action", label: "Action", baseWidth: 140 },
  { key: "categorie", label: "Catégorie", baseWidth: 120 },
  { key: "ref_mag", label: "Référence Magasin", baseWidth: 150 },
  { key: "designation", label: "Désignation", baseWidth: 220 },
  { key: "ref_fournisseur", label: "Référence Fournisseur", baseWidth: 170 },
  { key: "fournisseur", label: "Fournisseur", baseWidth: 150 },
  { key: "info", label: "Info", baseWidth: 150 },
  { key: "zone", label: "Zone", baseWidth: 90 },
  { key: "demandeur", label: "Demandeur", baseWidth: 120 },
  { key: "si", label: "Stock initiale", baseWidth: 120 },
  { key: "e", label: "Entrée", baseWidth: 90 },
  { key: "s", label: "Sortie", baseWidth: 90 },
  { key: "sf", label: "Stock Final", baseWidth: 120 },
  { key: "inventaire", label: "Inventaire", baseWidth: 110 },
  { key: "seuil_alerte", label: "Seuille d'alerte", baseWidth: 130 },
  { key: "prix", label: "Prix unitaire", baseWidth: 120 },
  { key: "qte_souhaite", label: "Quantité souhaité pour la commande", baseWidth: 220 },
  { key: "prix_final", label: "Prix Globale", baseWidth: 130 },
];

const PRODUCTS_CACHE_KEY = "stock-products-cache-v1";

function getProductsSelectFields() {
  return "id,categorie,ref_mag,designation,ref_fournisseur,fournisseur,info,zone,demandeur,si,e,s,sf,inventaire,seuil_alerte,prix,qte_souhaite,date_demande,prix_final,created_at";
}

function sanitizeProducts(rows: Product[] | null | undefined) {
  return (rows || []).map((row) => ({
    ...row,
    categorie: row.categorie ?? null,
    ref_mag: row.ref_mag ?? null,
    designation: row.designation ?? null,
    ref_fournisseur: row.ref_fournisseur ?? null,
    fournisseur: row.fournisseur ?? null,
    info: row.info ?? null,
    zone: row.zone ?? null,
    demandeur: row.demandeur ?? null,
    si: row.si ?? null,
    e: row.e ?? null,
    s: row.s ?? null,
    sf: row.sf ?? null,
    inventaire: row.inventaire ?? null,
    seuil_alerte: row.seuil_alerte ?? null,
    prix: row.prix ?? null,
    qte_souhaite: row.qte_souhaite ?? null,
    date_demande: row.date_demande ?? null,
    prix_final: row.prix_final ?? null,
    created_at: row.created_at ?? undefined,
  }));
}

function readProductsCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items?: Product[] } | null;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return sortProductsByRefMagAsc(sanitizeProducts(parsed.items));
  } catch {
    return null;
  }
}

function sortProductsByRefMagAsc(rows: Product[]) {
  return [...rows].sort((a, b) =>
    String(a.ref_mag ?? "").localeCompare(String(b.ref_mag ?? ""), "fr", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function writeProductsCache(rows: Product[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PRODUCTS_CACHE_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), items: sortProductsByRefMagAsc(sanitizeProducts(rows)) }),
    );
  } catch {}
}

const excelHeaders = [
  "Catégorie",
  "Référence Magasin",
  "Désignation",
  "Référence Fournisseur",
  "Fournisseur",
  "Info",
  "Zone",
  "Demandeur",
  "Stock initiale",
  "Entrée",
  "Sortie",
  "Stock Final",
  "Inventaire",
  "Seuille d'alerte",
  "Prix unitaire",
  "Quantité souhaité pour la commande",
  "Prix Globale",
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeName>("whiteBlue");
  const [showFilters, setShowFilters] = useState(false);
  const [sortEnabled, setSortEnabled] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortableColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [runDeleteAllOnNoticeOk, setRunDeleteAllOnNoticeOk] = useState(false);
  const [skipSortReminderChecked, setSkipSortReminderChecked] = useState(false);
  const [skipSortReminder, setSkipSortReminder] = useState(false);

  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  const [search3, setSearch3] = useState("");
  const [collapsedColumns, setCollapsedColumns] = useState<
    Record<ColumnKey, boolean>
  >({
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
    prix_final: false,
  });

  const allColumnsCollapsed = columns.every(
    (column) => collapsedColumns[column.key],
  );

  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [deleteAuthModalOpen, setDeleteAuthModalOpen] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [showDeleteCode, setShowDeleteCode] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestingForgotCode, setRequestingForgotCode] = useState(false);
  const [requestStatusText, setRequestStatusText] = useState("");

  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const topScrollInnerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFirstInputRef = useRef<HTMLInputElement | null>(null);
  const noticeOkButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortOkButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteCodeInputRef = useRef<HTMLInputElement | null>(null);
  const forgotOkButtonRef = useRef<HTMLButtonElement | null>(null);
  const importPrimaryButtonRef = useRef<HTMLButtonElement | null>(null);

  useAccessRealtime(
    requestId,
    "/products-delete-all",
    () => {
      setForgotModalOpen(false);
      setDeleteAuthModalOpen(false);
      setRequestId(null);
      setRequestStatusText("");
      openNotice(
        "Demande validée",
        "La validation de suppression a été acceptée. Tu peux maintenant lancer automatiquement la suppression totale des articles en appuyant sur OK.",
        { runDeleteAllOnOk: true },
      );
    },
    () => {
      setRequestStatusText("La demande de validation de suppression a été refusée.");
    },
  );

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
    const hidden = localStorage.getItem("stock-sort-reminder-hidden") === "1";
    setSkipSortReminder(hidden);
    setSkipSortReminderChecked(hidden);
  }, []);

  useEffect(() => {
    if (!editingProduct?.id) return;
    const timer = window.setTimeout(() => {
      editFirstInputRef.current?.focus();
      editFirstInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editingProduct?.id]);

  useEffect(() => {
    if (!showNoticeModal) return;
    const timer = window.setTimeout(
      () => noticeOkButtonRef.current?.focus(),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [showNoticeModal]);

  useEffect(() => {
    if (!showSortModal) return;
    const timer = window.setTimeout(() => sortOkButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [showSortModal]);

  useEffect(() => {
    if (!showImportModal) return;
    const timer = window.setTimeout(
      () => importPrimaryButtonRef.current?.focus(),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [showImportModal]);

  useEffect(() => {
    function handleModalKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (editingProduct && !saving && !deleting) {
          event.preventDefault();
          setEditingProduct(null);
          return;
        }
        if (showImportModal && !importing) {
          event.preventDefault();
          setShowImportModal(false);
          return;
        }
        if (showSortModal) {
          event.preventDefault();
          closeSortModal();
          return;
        }
        if (showNoticeModal) {
          event.preventDefault();
          void handleNoticeOk();
        }
        return;
      }

      if (event.key !== "Enter") return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase() || "";
      if (tagName === "textarea") return;

      if (editingProduct && !saving && !deleting) {
        event.preventDefault();
        handleSave();
        return;
      }

      if (showNoticeModal) {
        event.preventDefault();
        void handleNoticeOk();
        return;
      }

      if (showSortModal) {
        event.preventDefault();
        closeSortModal();
        return;
      }

      if (showImportModal && !importing) {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    }

    window.addEventListener("keydown", handleModalKeyboard);
    return () => window.removeEventListener("keydown", handleModalKeyboard);
  }, [
    editingProduct,
    saving,
    deleting,
    showNoticeModal,
    showSortModal,
    showImportModal,
    importing,
    skipSortReminderChecked,
  ]);

  useEffect(() => {
    const cachedProducts = readProductsCache();
    if (cachedProducts && cachedProducts.length > 0) {
      setProducts(cachedProducts);
      setLoading(false);
    }

    void loadProducts({ showLoader: !cachedProducts || cachedProducts.length === 0 });
  }, []);

  useEffect(() => {
    syncFakeScrollbarWidth();
    window.addEventListener("resize", syncFakeScrollbarWidth);
    return () => window.removeEventListener("resize", syncFakeScrollbarWidth);
  }, [products, collapsedColumns, sortColumn, sortDirection]);

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

  function openNotice(
    title: string,
    message: string,
    options?: { runDeleteAllOnOk?: boolean },
  ) {
    setRunDeleteAllOnNoticeOk(Boolean(options?.runDeleteAllOnOk));
    setNoticeTitle(title);
    setNoticeMessage(message);
    setShowNoticeModal(true);
  }

  async function handleNoticeOk() {
    setShowNoticeModal(false);

    if (!runDeleteAllOnNoticeOk) return;

    setRunDeleteAllOnNoticeOk(false);
    await executeDeleteAllProducts();
  }

  function closeSortModal() {
    if (skipSortReminderChecked) {
      localStorage.setItem("stock-sort-reminder-hidden", "1");
      setSkipSortReminder(true);
    } else {
      localStorage.removeItem("stock-sort-reminder-hidden");
      setSkipSortReminder(false);
    }
    setShowSortModal(false);
  }

  useEffect(() => {
    loadCodes();
  }, []);

  useEffect(() => {
    if (!deleteAuthModalOpen) return;
    const timer = window.setTimeout(() => {
      deleteCodeInputRef.current?.focus();
      deleteCodeInputRef.current?.select();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [deleteAuthModalOpen]);

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

  async function executeDeleteAllProducts() {
    setDeletingAll(true);
    const { error } = await supabase
      .from("products")
      .delete()
      .not("id", "is", null);
    if (error) {
      console.error(error);
      openNotice("Erreur", error.message);
      setDeletingAll(false);
      return;
    }
    setDeletingAll(false);
    setEditingProduct(null);
    openNotice(
      "Suppression terminée",
      "Tous les articles ont été supprimés avec succès.",
    );
    await loadProducts();
  }

  function openDeleteAuthModal() {
    setDeleteCodeInput("");
    setShowDeleteCode(false);
    setRequestId(null);
    setRequestStatusText("");
    setDeleteAuthModalOpen(true);
  }

  function validateDeleteCodeAccess() {
    const value = deleteCodeInput.trim();
    if (!value) {
      openNotice("Authentification", "Entre le code confidentiel.");
      return;
    }
    const isValid = codes.some((code) => code === value);
    if (!isValid) {
      openNotice("Authentification", "Code confidentiel incorrect.");
      return;
    }
    setDeleteAuthModalOpen(false);
    void executeDeleteAllProducts();
  }

  async function handleForgotCodeRequest() {
    const candidates = [
      "/products-delete-all",
      "/products",
      "/regularisation",
    ];

    try {
      setRequestingForgotCode(true);
      setForgotModalOpen(true);
      setRequestStatusText(
        "Envoi d'une demande de validation pour la suppression totale...",
      );

      let lastMessage = "Impossible d'envoyer la demande de validation.";

      for (const candidate of candidates) {
        const res = await fetch("/api/access-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: candidate,
            requested_action: "delete_all_products",
            source_page: "/products",
          }),
        });

        const json = (await res.json()) as AccessRequestResponse;

        if (res.ok && json.ok && json.requestId) {
          setRequestId(json.requestId);
          setRequestStatusText(
            "La demande de validation pour supprimer tous les articles a bien été envoyée. En attente de validation sur l'app.",
          );
          return;
        }

        lastMessage = json.message || lastMessage;
      }

      setRequestStatusText(
        "Impossible d'envoyer la demande de validation pour la suppression totale.",
      );
      openNotice("Code oublié", lastMessage);
    } catch (error) {
      console.error(error);
      setRequestStatusText(
        "Impossible d'envoyer la demande de validation pour la suppression totale.",
      );
      openNotice(
        "Code oublié",
        "Impossible d'envoyer la demande de validation pour la suppression totale.",
      );
    } finally {
      setRequestingForgotCode(false);
    }
  }

async function loadProducts(options?: { showLoader?: boolean }) {
  const shouldShowLoader = options?.showLoader ?? true;
  if (shouldShowLoader) setLoading(true);

  const { data, error } = await supabase
    .from("products")
    .select(getProductsSelectFields())
    .order("ref_mag", { ascending: true });

  if (error) {
    console.log("LOAD PRODUCTS ERROR =", error);
    if (products.length === 0) {
      openNotice(
        "Erreur",
        error?.message || error?.details || error?.hint || "Erreur de chargement."
      );
    }
    if (shouldShowLoader) setLoading(false);
    return;
  }

    const initialProducts = sortProductsByRefMagAsc(sanitizeProducts(Array.isArray(data) ? ((data as unknown) as Product[]) : []));
    setProducts(initialProducts);
    writeProductsCache(initialProducts);

    try {
      await syncProductsWithMovementsByRefMag(
        initialProducts.map((product) => product.ref_mag || ""),
      );

      const { data: refreshedData, error: refreshedError } = await supabase
        .from("products")
        .select(getProductsSelectFields())
        .order("ref_mag", { ascending: true });

      if (refreshedError) {
        console.error(refreshedError);
        const fallbackProducts = initialProducts;
        setProducts(fallbackProducts);
        writeProductsCache(fallbackProducts);
        if (shouldShowLoader) setLoading(false);
        return;
      }

      const finalProducts = sortProductsByRefMagAsc(sanitizeProducts(Array.isArray(refreshedData) ? ((refreshedData as unknown) as Product[]) : []));
      setProducts(finalProducts);
      writeProductsCache(finalProducts);
    } catch (syncError) {
      console.error(syncError);
      setProducts(initialProducts);
      writeProductsCache(initialProducts);
    } finally {
      if (shouldShowLoader) setLoading(false);
    }
  }

  async function syncProductsWithMovementsByRefMag(refMags: string[]) {
    const uniqueRefMags = Array.from(
      new Set(refMags.map((value) => String(value || "").trim()).filter(Boolean)),
    );

    if (!uniqueRefMags.length) return;

    const { data: productsRows, error: productsError } = await supabase
      .from("products")
      .select("id, ref_mag, si")
      .in("ref_mag", uniqueRefMags);

    if (productsError) throw productsError;

    const { data: movementRows, error: movementsError } = await supabase
      .from("movements")
      .select("ref_mag, entrees, sorties")
      .in("ref_mag", uniqueRefMags);

    if (movementsError) throw movementsError;

    const movementTotals = new Map<string, { e: number; s: number }>();

    ((movementRows || []) as Array<{
      ref_mag: string | null;
      entrees: number | null;
      sorties: number | null;
    }>).forEach((row) => {
      const refMag = String(row.ref_mag || "").trim();
      if (!refMag) return;
      const current = movementTotals.get(refMag) || { e: 0, s: 0 };
      current.e += Number(row.entrees || 0);
      current.s += Number(row.sorties || 0);
      movementTotals.set(refMag, current);
    });

    const updates = ((productsRows || []) as Array<{
      id: string;
      ref_mag: string | null;
      si: number | null;
    }>).map((row) => {
      const refMag = String(row.ref_mag || "").trim();
      const totals = movementTotals.get(refMag) || { e: 0, s: 0 };
      const si = Number(row.si || 0);
      return {
        id: row.id,
        e: totals.e,
        s: totals.s,
        sf: si + totals.e - totals.s,
      };
    });

    if (!updates.length) return;

    const updateResults = await Promise.all(
      updates.map((row) =>
        supabase
          .from("products")
          .update({ e: row.e, s: row.s, sf: row.sf })
          .eq("id", row.id),
      ),
    );

    const failedUpdate = updateResults.find((result) => result.error);
    if (failedUpdate?.error) throw failedUpdate.error;
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
    const textColor = theme === "whiteBlue" ? "#0f172a" : undefined;
    if (stock <= alert) {
      return {
        color: textColor ?? "#ffb4b4",
        background: "rgba(220, 38, 38, 0.15)",
        border: "1px solid rgba(220, 38, 38, 0.35)",
      };
    }
    if (stock <= alert * 2 && alert > 0) {
      return {
        color: textColor ?? "#ffd98e",
        background: "rgba(245, 158, 11, 0.14)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
      };
    }
    return {
      color: textColor ?? "#b9f7c8",
      background: "rgba(34, 197, 94, 0.14)",
      border: "1px solid rgba(34, 197, 94, 0.35)",
    };
  }

  function normalizeText(value: string) {
    const text = value.trim();
    return text === "" ? null : text;
  }

  function normalizeNumber(value: string | number | null | undefined) {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const parsed = Number(text.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  }

  function normalizeHeader(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
  }

  function excelDateToISO(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") {
      const jsDate = new Date(Math.round((value - 25569) * 86400 * 1000));
      return Number.isNaN(jsDate.getTime())
        ? null
        : jsDate.toISOString().slice(0, 10);
    }
    const text = String(value).trim();
    if (!text) return null;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toISOString().slice(0, 10);
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
      openNotice("Erreur", error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditingProduct(null);
    await loadProducts();
  }

  async function handleDelete() {
    if (!editingProduct) return;
    setDeleting(true);
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", editingProduct.id);
    if (error) {
      console.error(error);
      openNotice("Erreur", error.message);
      setDeleting(false);
      return;
    }
    setDeleting(false);
    setEditingProduct(null);
    openNotice("Suppression terminée", "L’article a été supprimé avec succès.");
    await loadProducts();
  }

  async function handleDeleteAllProducts() {
    if (products.length === 0) {
      openNotice("Suppression", "Aucun article à supprimer.");
      return;
    }

    openDeleteAuthModal();
  }




  function hasInventoryMismatch(product: Product) {
    return product.inventaire !== null && product.sf !== null && product.inventaire !== product.sf;
  }

  function getActionLabel(product: Product) {
    return hasInventoryMismatch(product) ? "Régul." : "Modifier";
  }

  function getActionButtonStyle(product: Product): React.CSSProperties {
    if (hasInventoryMismatch(product)) {
      return {
        background: theme === "whiteBlue" ? "#f59e0b" : "#f97316",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "8px 12px",
        fontWeight: 700,
        cursor: "pointer",
      };
    }

    return {
      background: currentTheme.accent,
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "8px 12px",
      fontWeight: 700,
      cursor: "pointer",
    };
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

  function getSortableValue(product: Product, column: SortableColumnKey) {
    switch (column) {
      case "action":
        return getActionLabel(product);
      case "categorie":
        return product.categorie ?? "";
      case "ref_mag":
        return product.ref_mag ?? "";
      case "designation":
        return product.designation ?? "";
      case "ref_fournisseur":
        return product.ref_fournisseur ?? "";
      case "fournisseur":
        return product.fournisseur ?? "";
      case "info":
        return product.info ?? "";
      case "zone":
        return product.zone ?? "";
      case "demandeur":
        return product.demandeur ?? "";
      case "si":
        return product.si ?? Number.NEGATIVE_INFINITY;
      case "e":
        return product.e ?? Number.NEGATIVE_INFINITY;
      case "s":
        return product.s ?? Number.NEGATIVE_INFINITY;
      case "sf":
        return product.sf ?? Number.NEGATIVE_INFINITY;
      case "inventaire":
        return product.inventaire ?? Number.NEGATIVE_INFINITY;
      case "seuil_alerte":
        return product.seuil_alerte ?? Number.NEGATIVE_INFINITY;
      case "prix":
        return product.prix ?? Number.NEGATIVE_INFINITY;
      case "qte_souhaite":
        return product.qte_souhaite ?? Number.NEGATIVE_INFINITY;
      case "date_demande":
        return product.date_demande
          ? new Date(product.date_demande).getTime()
          : Number.NEGATIVE_INFINITY;
      case "prix_final":
        return product.prix_final ?? Number.NEGATIVE_INFINITY;
      default:
        return "";
    }
  }

  function compareValues(a: string | number, b: string | number) {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), "fr", {
      numeric: true,
      sensitivity: "base",
    });
  }

  function handleSortHeaderClick(column: ColumnKey) {
    if (!sortEnabled) return;
    const sortableColumn = column as SortableColumnKey;
    if (sortColumn !== sortableColumn) {
      setSortColumn(sortableColumn);
      setSortDirection("asc");
      return;
    }
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  function handleSortToggle() {
    const next = !sortEnabled;
    setSortEnabled(next);
    if (next) {
      if (skipSortReminder) {
        setShowSortModal(false);
      } else {
        setShowSortModal(true);
      }
    } else {
      setSortColumn(null);
      setSortDirection("asc");
      setShowSortModal(false);
    }
  }

  function getSortIndicator(column: ColumnKey) {
    if (!sortEnabled) return "";
    if (sortColumn !== column) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  function openImportModal() {
    setImportMessage("");
    setSelectedFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowImportModal(true);
  }

  async function handleExcelFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setImporting(true);
    setImportMessage("");

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const stockSheetName = workbook.SheetNames.find(
        (name) => name.trim().toLowerCase() === "stock",
      );

      if (!stockSheetName) {
        throw new Error("Aucun onglet Stock trouvé.");
      }

      const worksheet = workbook.Sheets[stockSheetName];
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        range: 1,
        defval: "",
        blankrows: false,
      });

      const parsedRows = rawRows
        .map((row) => {
          const values = Array.isArray(row) ? row : [];
          const si = normalizeNumber(values[8] as string | number | null | undefined);
          const e = normalizeNumber(values[9] as string | number | null | undefined);
          const s = normalizeNumber(values[10] as string | number | null | undefined);
          const sfFromFile = normalizeNumber(values[11] as string | number | null | undefined);
          const inventaire = normalizeNumber(values[12] as string | number | null | undefined);
          const seuilAlerte = normalizeNumber(values[13] as string | number | null | undefined);
          const prix = normalizeNumber(values[14] as string | number | null | undefined);
          const qte = normalizeNumber(values[15] as string | number | null | undefined);
          const prixFinalFromFile = normalizeNumber(values[17] as string | number | null | undefined);

          return {
            categorie: normalizeText(String(values[0] ?? "")),
            ref_mag: normalizeText(String(values[1] ?? "")),
            designation: normalizeText(String(values[2] ?? "")),
            ref_fournisseur: normalizeText(String(values[3] ?? "")),
            fournisseur: normalizeText(String(values[4] ?? "")),
            info: normalizeText(String(values[5] ?? "")),
            zone: normalizeText(String(values[6] ?? "")),
            demandeur: normalizeText(String(values[7] ?? "")),
            si,
            e,
            s,
            sf: sfFromFile ?? (si ?? 0) + (e ?? 0) - (s ?? 0),
            inventaire,
            seuil_alerte: seuilAlerte,
            prix,
            qte_souhaite: qte,
            date_demande: excelDateToISO(values[16]),
            prix_final: prixFinalFromFile ?? (prix ?? 0) * (qte ?? 0),
          };
        })
        .filter((row) => {
          return Object.values(row).some((value) => {
            if (value === null || value === undefined) return false;
            if (typeof value === "number") return true;
            return String(value).trim() !== "";
          });
        })
        .filter((row) => row.ref_mag || row.designation);

      if (!parsedRows.length) {
        throw new Error("Aucune ligne exploitable trouvée dans l'onglet Stock.");
      }

      const refMags = parsedRows
        .map((row) => row.ref_mag)
        .filter(Boolean) as string[];
      const existingMap = new Map<string, string>();
      if (refMags.length) {
        const { data: existingRows, error: existingError } = await supabase
          .from("products")
          .select("id, ref_mag")
          .in("ref_mag", refMags);
        if (existingError) throw existingError;
        (existingRows || []).forEach(
          (item: { id: string; ref_mag: string | null }) => {
            if (item.ref_mag) existingMap.set(item.ref_mag, item.id);
          },
        );
      }

      const updates = parsedRows
        .filter((row) => row.ref_mag && existingMap.has(row.ref_mag))
        .map((row) => ({
          id: existingMap.get(row.ref_mag as string) as string,
          ...row,
        }));
      const inserts = parsedRows.filter(
        (row) => !(row.ref_mag && existingMap.has(row.ref_mag)),
      );

      if (updates.length) {
        const updateResults = await Promise.all(
          updates.map((row) =>
            supabase.from("products").update(row).eq("id", row.id),
          ),
        );
        const failedUpdate = updateResults.find((result) => result.error);
        if (failedUpdate?.error) throw failedUpdate.error;
      }

      if (inserts.length) {
        const { error: insertError } = await supabase
          .from("products")
          .insert(inserts);
        if (insertError) throw insertError;
      }

      await syncProductsWithMovementsByRefMag(refMags);
      await loadProducts();
      setImportMessage(`Import terminé : ${parsedRows.length} ligne(s) traitée(s).`);
    } catch (error) {
      console.error(error);
      setImportMessage(
        error instanceof Error ? error.message : "Import impossible.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = sortedProducts.map((product) => ([
        product.categorie ?? "",
        product.ref_mag ?? "",
        product.designation ?? "",
        product.ref_fournisseur ?? "",
        product.fournisseur ?? "",
        product.info ?? "",
        product.zone ?? "",
        product.demandeur ?? "",
        product.si ?? "",
        product.e ?? "",
        product.s ?? "",
        product.sf ?? "",
        product.inventaire ?? "",
        product.seuil_alerte ?? "",
        product.prix ?? "",
        product.qte_souhaite ?? "",
        product.prix_final ?? "",
      ]));
      const worksheet = XLSX.utils.aoa_to_sheet([
        excelHeaders,
        ...rows,
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock");
      XLSX.writeFile(
        workbook,
        `export-stock-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (error) {
      console.error(error);
      openNotice(
        "Export impossible",
        "Export Excel impossible. Vérifie que le package xlsx est installé.",
      );
    } finally {
      setExporting(false);
    }
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

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (!sortEnabled || !sortColumn) return list;
    list.sort((a, b) => {
      const valueA = getSortableValue(a, sortColumn);
      const valueB = getSortableValue(b, sortColumn);
      const result = compareValues(valueA, valueB);
      return sortDirection === "asc" ? result : -result;
    });
    return list;
  }, [filteredProducts, sortEnabled, sortColumn, sortDirection]);

  const autoColumnWidths = useMemo(() => {
    const pxPerChar = 8;
    const extraPadding = 26;
    function getColumnText(product: Product, column: ColumnKey) {
      switch (column) {
        case "action":
          return getActionLabel(product);
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
      for (const product of sortedProducts) {
        const value = String(getColumnText(product, column.key) || "");
        if (value.length > longest) longest = value.length;
      }
      const estimated = Math.ceil(longest * pxPerChar + extraPadding);
      widths[column.key] = Math.min(column.baseWidth, Math.max(estimated, 58));
    }
    widths.action = 110;
    return widths;
  }, [sortedProducts]);

  const currentTheme = themes[theme];

  function toggleColumn(column: ColumnKey) {
    setCollapsedColumns((prev) => ({ ...prev, [column]: !prev[column] }));
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

  const computedTableMinWidth = columns.reduce(
    (total, column) =>
      total +
      (collapsedColumns[column.key] ? 34 : autoColumnWidths[column.key]),
    0,
  );

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
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleDeleteAllProducts}
              disabled={deletingAll || loading || products.length === 0}
              style={{
                background: currentTheme.danger,
                color: "#fff",
                border: "none",
                padding: "11px 16px",
                borderRadius: 12,
                fontWeight: 800,
                cursor:
                  deletingAll || loading || products.length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  deletingAll || loading || products.length === 0 ? 0.65 : 1,
                boxShadow: `0 10px 30px ${currentTheme.shadow}`,
              }}
            >
              {deletingAll ? "Suppression..." : "Supprimer tous les articles"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 12,
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
                cursor: "pointer",
              }}
            >
              Page d’accueil
            </Link>

            <button
              onClick={openImportModal}
              style={topButtonStyle(currentTheme)}
            >
              Importé
            </button>

            <button
              onClick={handleExport}
              style={topButtonStyle(currentTheme)}
              disabled={exporting}
            >
              {exporting ? "Export Excel..." : "Exporter"}
            </button>

            <button
              onClick={handleSortToggle}
              style={{
                ...topButtonStyle(currentTheme),
                background: sortEnabled
                  ? currentTheme.accent
                  : currentTheme.cardSoft,
                color: sortEnabled ? "#fff" : currentTheme.text,
                border: sortEnabled
                  ? "none"
                  : `1px solid ${currentTheme.border}`,
                fontWeight: 800,
              }}
            >
              Trier {sortEnabled ? "ON" : "OFF"}
            </button>

            <button
              onClick={() => setShowFilters((prev) => !prev)}
              style={topButtonStyle(currentTheme)}
            >
              {showFilters ? "Masquer filtres" : "Filtres"}
            </button>

            <button
              onClick={toggleAllColumns}
              style={{
                ...topButtonStyle(currentTheme),
                background: allColumnsCollapsed
                  ? currentTheme.accent
                  : currentTheme.cardSoft,
                color: allColumnsCollapsed ? "#fff" : currentTheme.text,
                border: allColumnsCollapsed
                  ? "none"
                  : `1px solid ${currentTheme.border}`,
                fontWeight: 800,
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
                  onClick={() => handleSortHeaderClick(column.key)}
                  onDoubleClick={() => toggleColumn(column.key)}
                  title={
                    sortEnabled && column.key !== "action"
                      ? "Clic simple pour trier • Double-clic pour rétrécir / rétablir"
                      : "Double-clic pour rétrécir / rétablir"
                  }
                  style={{
                    ...thStyle(currentTheme),
                    ...getColumnStyle(column.key),
                    color: collapsedColumns[column.key]
                      ? getCollapsedHeaderColor()
                      : currentTheme.text,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {column.label}
                  {getSortIndicator(column.key)}
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
            ) : sortedProducts.length === 0 ? (
              <tr>
                <td style={tdStyle(currentTheme)} colSpan={19}>
                  Aucune donnée trouvée
                </td>
              </tr>
            ) : (
              sortedProducts.map((product) => (
                <tr
                  key={product.id}
                  onClick={() => openEditModal(product)}
                  style={{ cursor: "pointer" }}
                >
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("action"),
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(product);
                      }}
                      style={getActionButtonStyle(product)}
                    >
                      {getActionLabel(product)}
                    </button>
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("categorie"),
                    }}
                  >
                    {product.categorie || "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("ref_mag"),
                    }}
                  >
                    {product.ref_mag || "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("designation"),
                      fontWeight: 700,
                    }}
                  >
                    {product.designation || "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("ref_fournisseur"),
                    }}
                  >
                    {product.ref_fournisseur || "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("fournisseur"),
                    }}
                  >
                    {product.fournisseur || "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("info"),
                    }}
                  >
                    {product.info || "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("zone"),
                    }}
                  >
                    {product.zone || "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("demandeur"),
                    }}
                  >
                    {product.demandeur || "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("si"),
                    }}
                  >
                    {formatNumber(product.si)}
                  </td>
                  <td
                    style={{ ...tdStyle(currentTheme), ...getColumnStyle("e") }}
                  >
                    {formatNumber(product.e)}
                  </td>
                  <td
                    style={{ ...tdStyle(currentTheme), ...getColumnStyle("s") }}
                  >
                    {formatNumber(product.s)}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("sf"),
                    }}
                  >
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
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("inventaire"),
                    }}
                  >
                    {getInventaireDisplay(product)}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("seuil_alerte"),
                    }}
                  >
                    {formatNumber(product.seuil_alerte)}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("prix"),
                    }}
                  >
                    {formatPrice(product.prix)}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("qte_souhaite"),
                    }}
                  >
                    {formatNumber(product.qte_souhaite)}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("date_demande"),
                    }}
                  >
                    {formatDate(product.date_demande)}
                  </td>
                  <td
                    style={{
                      ...tdStyle(currentTheme),
                      ...getColumnStyle("prix_final"),
                    }}
                  >
                    {formatPrice(product.prix_final)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showImportModal && (
        <div
          onClick={() => !importing && setShowImportModal(false)}
          style={overlayStyle(currentTheme)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={modalStyle(currentTheme, 760)}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>
                  Import Excel
                </div>
                <div style={{ color: currentTheme.textSoft, fontSize: 14 }}>
                  Import professionnel du catalogue stock avec contrôle des
                  en-têtes avant intégration.
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                style={secondaryButtonStyle(currentTheme)}
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 18,
              }}
            >
              <div style={panelStyle(currentTheme)}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                  Contexte d’import
                </div>
                <div
                  style={{
                    color: currentTheme.textSoft,
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  Le fichier Excel doit reprendre les mêmes colonnes que le
                  tableau stock. Lors de l’import, les lignes existantes sont
                  mises à jour par <b>REF_MAG</b> quand il existe déjà, sinon
                  elles sont ajoutées comme nouveaux articles.
                </div>
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={badgeStyle(currentTheme)}>
                    Format accepté : .xlsx / .xls
                  </span>
                  <span style={badgeStyle(currentTheme)}>
                    Référence clé : REF_MAG
                  </span>
                </div>

                <div style={{ marginTop: 18, fontWeight: 800, fontSize: 14 }}>
                  En-têtes attendus
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {excelHeaders.map((header) => (
                    <div
                      key={header}
                      style={{
                        background: currentTheme.cardSoft,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: 12,
                        padding: "10px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {header}
                    </div>
                  ))}
                </div>
              </div>

              <div style={panelStyle(currentTheme)}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                  Fichier à importer
                </div>
                <div
                  style={{
                    color: currentTheme.textSoft,
                    fontSize: 14,
                    lineHeight: 1.7,
                    marginBottom: 14,
                  }}
                >
                  Sélectionne ton fichier Excel depuis le PC. L’import contrôle
                  automatiquement la structure avant d’écrire dans la base.
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFileChange}
                  style={{ display: "none" }}
                />

                <button
                  ref={importPrimaryButtonRef}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  style={{
                    ...primaryButtonStyle(currentTheme),
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  {importing
                    ? "Import en cours..."
                    : "Choisir un fichier Excel"}
                </button>

                <div
                  style={{
                    marginTop: 12,
                    minHeight: 22,
                    fontSize: 13,
                    color: selectedFileName
                      ? currentTheme.text
                      : currentTheme.textSoft,
                  }}
                >
                  {selectedFileName
                    ? `Fichier sélectionné : ${selectedFileName}`
                    : "Aucun fichier sélectionné"}
                </div>

                {importMessage ? (
                  <div
                    style={{
                      marginTop: 16,
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: importMessage.includes("succès")
                        ? "rgba(22,163,74,0.12)"
                        : "rgba(220,38,38,0.12)",
                      border: `1px solid ${importMessage.includes("succès") ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`,
                      color: currentTheme.text,
                      lineHeight: 1.6,
                      fontSize: 13,
                    }}
                  >
                    {importMessage}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSortModal && (
        <div onClick={closeSortModal} style={overlayStyle(currentTheme)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={modalStyle(currentTheme, 540)}
          >
            <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>
              Tri intelligent activé
            </div>
            <div
              style={{
                color: currentTheme.textSoft,
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Tu peux maintenant faire un clic simple sur n’importe quel en-tête
              du tableau pour trier les données en ordre croissant, puis
              décroissant au clic suivant. Le curseur reste en mode main pour
              garder une navigation claire et fluide.
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 18,
                padding: "12px 14px",
                borderRadius: 14,
                background: currentTheme.cardSoft,
                border: `1px solid ${currentTheme.border}`,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={skipSortReminderChecked}
                onChange={(e) => setSkipSortReminderChecked(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, color: currentTheme.text }}>
                ne plus me faire rappeler
              </span>
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 20,
              }}
            >
              <button
                ref={sortOkButtonRef}
                onClick={closeSortModal}
                style={primaryButtonStyle(currentTheme)}
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoticeModal && (
        <div
          onClick={() => setShowNoticeModal(false)}
          style={overlayStyle(currentTheme)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={modalStyle(currentTheme, 500)}
          >
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              {noticeTitle}
            </div>
            <div
              style={{
                color: currentTheme.textSoft,
                lineHeight: 1.7,
                fontSize: 14,
                whiteSpace: "pre-line",
              }}
            >
              {noticeMessage}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 22,
              }}
            >
              <button
                ref={noticeOkButtonRef}
                onClick={() => void handleNoticeOk()}
                style={primaryButtonStyle(currentTheme)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteAuthModalOpen && (
        <div
          onClick={() => setDeleteAuthModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDeleteAuthModalOpen(false);
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
              background:
                theme === "whiteBlue"
                  ? "rgba(255,255,255,0.72)"
                  : currentTheme.card,
              backdropFilter: "blur(18px)",
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 26,
              padding: 26,
              boxShadow: `0 20px 50px ${currentTheme.shadow}`,
            }}
          >
            <div
              style={{
                color: currentTheme.textSoft,
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
              Code confidentiel
            </div>
            <div
              style={{
                fontSize: 14,
                color: currentTheme.textSoft,
                marginBottom: 18,
                lineHeight: 1.6,
              }}
            >
              Entre le code confidentiel pour confirmer la suppression de tous
              les articles.
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
                ref={deleteCodeInputRef}
                type={showDeleteCode ? "text" : "password"}
                value={deleteCodeInput}
                onChange={(e) => setDeleteCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") validateDeleteCodeAccess();
                }}
                placeholder="Saisir le code"
                style={authInputStyle(currentTheme, theme === "whiteBlue")}
              />
              <button
                onClick={() => {
                  setShowDeleteCode((prev) => !prev);
                  window.setTimeout(
                    () => deleteCodeInputRef.current?.focus(),
                    0,
                  );
                }}
                style={authIconButtonStyle(currentTheme, theme === "whiteBlue")}
                title={showDeleteCode ? "Masquer le code" : "Afficher le code"}
              >
                {showDeleteCode ? "🙈" : "👁️"}
              </button>
            </div>
            <button
              onClick={handleForgotCodeRequest}
              disabled={requestingForgotCode}
              style={{
                background: "transparent",
                border: "none",
                color: currentTheme.textSoft,
                padding: 0,
                marginBottom: 20,
                cursor: requestingForgotCode ? "not-allowed" : "pointer",
                textDecoration: "underline",
                fontSize: 13,
                opacity: requestingForgotCode ? 0.7 : 1,
              }}
            >
              {requestingForgotCode ? "Envoi..." : "Code oublié"}
            </button>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setDeleteAuthModalOpen(false)}
                style={secondaryButtonStyle(currentTheme)}
              >
                Annuler
              </button>
              <button
                onClick={validateDeleteCodeAccess}
                style={primaryButtonStyle(currentTheme)}
              >
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
              background:
                theme === "whiteBlue"
                  ? "rgba(255,255,255,0.72)"
                  : currentTheme.card,
              backdropFilter: "blur(18px)",
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 24,
              padding: 24,
              boxShadow: `0 20px 50px ${currentTheme.shadow}`,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
              Demande de validation
            </div>
            <div
              style={{
                fontSize: 14,
                color: currentTheme.textSoft,
                lineHeight: 1.6,
                marginBottom: 18,
              }}
            >
              {requestStatusText ||
                "Une demande de validation sera envoyée pour autoriser la suppression totale des articles."}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                ref={forgotOkButtonRef}
                onClick={() => setForgotModalOpen(false)}
                style={primaryButtonStyle(currentTheme)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div
          onClick={() => !saving && !deleting && setEditingProduct(null)}
          style={overlayStyle(currentTheme)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={modalStyle(currentTheme, 1100)}
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
                style={secondaryButtonStyle(currentTheme)}
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
                inputRef={editFirstInputRef}
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
                  background: currentTheme.danger,
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
                  style={secondaryButtonStyle(currentTheme)}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || deleting}
                  style={primaryButtonStyle(currentTheme)}
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
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  theme: { cardSoft: string; border: string; text: string; textSoft: string };
  type?: string;
  readOnly?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: theme.textSoft }}>{label}</span>
      <input
        ref={inputRef}
        type={type}
        value={value}
        readOnly={readOnly}
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

function tdStyle(theme: { border: string; text: string }): React.CSSProperties {
  return {
    padding: "12px",
    fontSize: 13,
    color: theme.text,
    borderBottom: `1px solid ${theme.border}`,
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  };
}

function topButtonStyle(theme: Theme): React.CSSProperties {
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

function authInputStyle(theme: Theme, glass = false): React.CSSProperties {
  return {
    width: "100%",
    background: glass ? "rgba(255,255,255,0.72)" : theme.cardSoft,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: "14px 16px",
    borderRadius: 14,
    outline: "none",
    fontSize: 15,
  };
}

function authIconButtonStyle(theme: Theme, glass = false): React.CSSProperties {
  return {
    background: glass ? "rgba(255,255,255,0.72)" : theme.cardSoft,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    width: 48,
    height: 48,
    borderRadius: 14,
    cursor: "pointer",
    fontSize: 18,
  };
}

function overlayStyle(theme: Theme): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    background: theme.overlay,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 999,
  };
}

function modalStyle(theme: Theme, maxWidth: number): React.CSSProperties {
  return {
    width: "100%",
    maxWidth,
    maxHeight: "90vh",
    overflowY: "auto",
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 24,
    padding: 22,
    boxShadow: `0 20px 60px ${theme.shadow}`,
  };
}

function panelStyle(theme: Theme): React.CSSProperties {
  return {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 18,
    padding: 18,
    boxShadow: `0 10px 30px ${theme.shadow}`,
  };
}

function badgeStyle(theme: Theme): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: 999,
    background: theme.cardSoft,
    border: `1px solid ${theme.border}`,
    fontSize: 12,
    fontWeight: 800,
  };
}

function primaryButtonStyle(theme: Theme): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: theme.accent,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "12px 18px",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function secondaryButtonStyle(theme: Theme): React.CSSProperties {
  return {
    background: theme.cardSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "12px 18px",
    fontWeight: 800,
    cursor: "pointer",
  };
}
