"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
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

const EXCEL_HEADERS = [
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
  "LIEU",
] as const;

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
  lieu: string | null;
};

type MovementInsert = Omit<Movement, "id">;

type ExcelPreviewRow = {
  excelLine: number;
  values: string[];
  movement: MovementInsert;
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
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [previewRows, setPreviewRows] = useState<ExcelPreviewRow[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingFileName, setPendingFileName] = useState("");

  const [codes, setCodes] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [showDeleteCode, setShowDeleteCode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    .select("id, type, value")
    .eq("type", "code");

  if (error) {
    console.log("LOAD CODES ERROR =", error);
    return;
  }

  const rows = (data as AppDataRow[]) || [];
  setCodes(rows.map((row) => (row.value || "").trim()).filter(Boolean));
}

  async function loadData() {
    setLoading(true);

    const { data, error } = await supabase.from("movements").select("*");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setData((data as Movement[]) || []);
    setLoading(false);
  }

  async function syncProductsWithMovements() {
    const { data: productsRows, error: productsError } = await supabase
      .from("products")
      .select("id, ref_mag, si");

    if (productsError) throw productsError;

    const { data: movementRows, error: movementsError } = await supabase
      .from("movements")
      .select("ref_mag, entrees, sorties");

    if (movementsError) throw movementsError;

    const totals = new Map<string, { entrees: number; sorties: number }>();

    ((movementRows || []) as Array<{
      ref_mag: string | null;
      entrees: number | null;
      sorties: number | null;
    }>).forEach((row) => {
      const refMag = String(row.ref_mag || "").trim();
      if (!refMag) return;

      const current = totals.get(refMag) || { entrees: 0, sorties: 0 };
      current.entrees += Number(row.entrees || 0);
      current.sorties += Number(row.sorties || 0);
      totals.set(refMag, current);
    });

    const updates = ((productsRows || []) as Array<{
      id: string;
      ref_mag: string | null;
      si: number | null;
    }>).map((product) => {
      const refMag = String(product.ref_mag || "").trim();
      const current = totals.get(refMag) || { entrees: 0, sorties: 0 };
      const si = Number(product.si || 0);

      return supabase
        .from("products")
        .update({
          e: current.entrees,
          s: current.sorties,
          sf: si + current.entrees - current.sorties,
        })
        .eq("id", product.id);
    });

    if (!updates.length) return;

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
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

      const { error } = await supabase.from("movements").delete().not("id", "is", null);

      if (error) {
        console.error(error);
        setDeleteError("Impossible de supprimer l'historique.");
        return;
      }

      await syncProductsWithMovements();
      setData([]);
      setDeleteModalOpen(false);
      setDeleteCode("");
      setShowDeleteCode(false);
      setDeleteError("");
      setActionMessage("Historique supprimé. Les colonnes Entrées / Sorties ont été resynchronisées par REF_MAG.");
    } catch (error) {
      console.error(error);
      setDeleteError("Impossible de supprimer l'historique.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      setActionMessage("");
      setImporting(true);

      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", raw: false });
      const firstSheetName = workbook.SheetNames?.[0];

      if (!firstSheetName) {
        setActionMessage("Aucune feuille trouvée dans le fichier Excel.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const sheetRef = worksheet["!ref"];

      if (!sheetRef) {
        setActionMessage("La feuille Excel est vide.");
        return;
      }

      const decodedRange = XLSX.utils.decode_range(sheetRef);
      const startRow = 1;
      const startCol = 2;
      const endCol = 14;
      const maxRow = decodedRange.e.r;
      const rawRows: string[][] = [];

      for (let rowIndex = startRow; rowIndex <= maxRow; rowIndex += 1) {
        const rowValues: string[] = [];

        for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          const cell = worksheet[cellAddress];
          const cellValue = cell?.w ?? cell?.v ?? "";
          rowValues.push(cellValue == null ? "" : String(cellValue).trim());
        }

        rawRows.push(rowValues);
      }

      const preparedRows: ExcelPreviewRow[] = rawRows
        .map((row, index) => {
          const values = Array.from({ length: EXCEL_HEADERS.length }, (_, cellIndex) => {
            const value = row[cellIndex] ?? "";
            return value == null ? "" : String(value);
          });

          if (values.every((value) => value === "")) {
            return null;
          }

          return {
            excelLine: index + 2,
            values,
            movement: mapExcelValuesToMovement(values),
          };
        })
        .filter((row): row is ExcelPreviewRow => row !== null);

      if (preparedRows.length === 0) {
        setActionMessage("Aucune donnée trouvée entre C2 et O jusqu’à la dernière ligne utilisée.");
        return;
      }

      setPendingFileName(file.name);
      setPreviewRows(preparedRows);
      setPreviewOpen(true);
      setActionMessage(`${preparedRows.length} ligne(s) détectée(s) dans ${file.name}.`);
    } catch (error) {
      console.error("IMPORT EXCEL ERROR:", error);
      setActionMessage(getReadableErrorMessage(error));
    } finally {
      setImporting(false);
    }
  }

  async function confirmImport() {
    if (previewRows.length === 0) {
      setActionMessage("Aucune ligne à importer.");
      return;
    }

    try {
      setImporting(true);
      setActionMessage("");

      const payload = previewRows.map((row) => row.movement);
      const { error } = await supabase.from("movements").insert(payload);

      if (error) {
        console.error("SUPABASE IMPORT ERROR:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setActionMessage(getReadableSupabaseMessage(error));
        return;
      }

      await syncProductsWithMovements();
      setData([]);
      setPreviewOpen(false);
      setPendingFileName("");
      setPreviewRows([]);
      setActionMessage(`${payload.length} mouvement(s) importé(s). La page a été vidée après l'import.`);
    } catch (error) {
      console.error("IMPORT VALIDATION ERROR:", error);
      setActionMessage(getReadableErrorMessage(error));
    } finally {
      setImporting(false);
    }
  }

  async function handleExportFile() {
    try {
      setExporting(true);
      setActionMessage("");

      const XLSX = await import("xlsx");
      const rows = data.map((item) => [
        item.categorie ?? "",
        item.ref_mag ?? "",
        item.designation ?? "",
        item.ref_fournisseur ?? "",
        item.fournisseur ?? "",
        item.info ?? "",
        item.zone ?? "",
        item.demandeur ?? "",
        item.sorties ?? "",
        item.intervenant ?? "",
        item.entrees ?? "",
        item.date ?? "",
        item.lieu ?? "",
      ]);

      const sheet = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.sheet_add_aoa(sheet, rows, { origin: "C2" });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Mouvements");
      XLSX.writeFile(workbook, "mouvements_export.xlsx");

      const shouldDelete = window.confirm(
        "Export terminé. Veux-tu supprimer tous les mouvements de cette page ?"
      );

      if (!shouldDelete) {
        setActionMessage("Export Excel généré de C2 à O.");
        return;
      }

      const { error } = await supabase.from("movements").delete().not("id", "is", null);

      if (error) {
        console.error(error);
        setActionMessage("Export terminé, mais impossible de supprimer les mouvements.");
        return;
      }

      await syncProductsWithMovements();
      setData([]);
      setPreviewOpen(false);
      setPendingFileName("");
      setPreviewRows([]);
      setActionMessage("Export Excel généré puis tous les mouvements ont été supprimés. La page est maintenant vide.");
    } catch (error) {
      console.error("EXPORT EXCEL ERROR:", error);
      setActionMessage(getReadableErrorMessage(error));
    } finally {
      setExporting(false);
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImportFile}
        style={{ display: "none" }}
      />

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


          <button
            onClick={handleExportFile}
            disabled={importing || exporting || loading}
            style={{
              background: currentTheme.cardSoft,
              color: currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
              padding: "11px 16px",
              borderRadius: 12,
              fontWeight: 800,
              cursor: importing || exporting || loading ? "not-allowed" : "pointer",
              opacity: importing || exporting || loading ? 0.7 : 1,
              boxShadow: `0 10px 30px ${currentTheme.shadow}`,
            }}
          >
            {exporting ? "Export en cours..." : "Exporter"}
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

      {actionMessage ? (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 14,
            background: currentTheme.card,
            border: `1px solid ${currentTheme.border}`,
            color: currentTheme.text,
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: "pre-wrap",
            flexShrink: 0,
          }}
        >
          {actionMessage}
        </div>
      ) : null}

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
            minWidth: 1500,
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
              {EXCEL_HEADERS.map((col) => (
                <th key={col} style={thStyle(currentTheme)}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} style={tdStyle(currentTheme)}>
                  Chargement...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={13} style={tdStyle(currentTheme)}>
                  Aucun mouvement enregistré
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle(currentTheme)}>{item.categorie || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.ref_mag || "-"}</td>
                  <td style={{ ...tdStyle(currentTheme), fontWeight: 700 }}>{item.designation || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.ref_fournisseur || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.fournisseur || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.info || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.zone || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.demandeur || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.sorties ?? "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.intervenant || "-"}</td>
                  <td style={tdStyle(currentTheme)}>{item.entrees ?? "-"}</td>
                  <td style={tdStyle(currentTheme)}>{formatMovementDate(item.date)}</td>
                  <td style={tdStyle(currentTheme)}>{item.lieu || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {previewOpen && (
        <div
          onClick={() => !importing && setPreviewOpen(false)}
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
              width: "min(95vw, 1400px)",
              maxHeight: "85vh",
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 24,
              padding: 22,
              boxShadow: `0 20px 50px ${currentTheme.shadow}`,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Aperçu avant import</div>
              <div style={{ fontSize: 14, color: currentTheme.textSoft, lineHeight: 1.6 }}>
                Fichier : <strong>{pendingFileName}</strong>
                <br />
                Zone lue : <strong>C2 à O</strong> jusqu&apos;à la dernière ligne remplie.
                <br />
                Les colonnes sont gardées <strong>dans le même ordre que le fichier Excel</strong>, sans tri et sans filtre.
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                background: currentTheme.cardSoft,
                border: `1px solid ${currentTheme.border}`,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {previewRows.length} ligne(s) prêtes à être importées.
            </div>

            <div
              style={{
                overflow: "auto",
                border: `1px solid ${currentTheme.border}`,
                borderRadius: 18,
                background: currentTheme.cardSoft,
                flex: 1,
              }}
            >
              <table style={{ width: "100%", minWidth: 1600, borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, background: currentTheme.header, zIndex: 1 }}>
                  <tr>
                    <th style={thStyle(currentTheme)}>LIGNE EXCEL</th>
                    {EXCEL_HEADERS.map((col) => (
                      <th key={`preview-${col}`} style={thStyle(currentTheme)}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={`preview-row-${row.excelLine}`}>
                      <td style={tdStyle(currentTheme)}>{row.excelLine}</td>
                      {row.values.map((value, index) => (
                        <td key={`preview-row-${row.excelLine}-${index}`} style={tdStyle(currentTheme)}>
                          {value === "" ? "-" : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => setPreviewOpen(false)}
                disabled={importing}
                style={{
                  background: currentTheme.cardSoft,
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.text,
                  padding: "12px 16px",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: importing ? "not-allowed" : "pointer",
                  opacity: importing ? 0.6 : 1,
                }}
              >
                Annuler
              </button>

              <button
                onClick={confirmImport}
                disabled={importing}
                style={{
                  background: currentTheme.accent,
                  color: "#fff",
                  border: "none",
                  padding: "12px 16px",
                  borderRadius: 12,
                  fontWeight: 800,
                  cursor: importing ? "not-allowed" : "pointer",
                  opacity: importing ? 0.6 : 1,
                }}
              >
                {importing ? "Import en cours..." : "Valider l’import"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Supprimer l&apos;historique</div>

            <div
              style={{
                fontSize: 14,
                color: currentTheme.textSoft,
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              Entre le code confidentiel enregistré dans la page Données pour valider la suppression complète de tous les mouvements.
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

function formatMovementDate(value: string | null | undefined) {
  if (!value) return "-";

  const raw = String(value).trim();
  if (!raw) return "-";

  const directMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (directMatch) {
    const day = directMatch[1].padStart(2, "0");
    const month = directMatch[2].padStart(2, "0");
    const year = directMatch[3].slice(-2);
    return `${day}/${month}/${year}`;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1].slice(-2)}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = String(parsed.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  return raw;
}

function mapExcelValuesToMovement(values: string[]): MovementInsert {
  return {
    categorie: normalizeText(values[0]),
    ref_mag: normalizeText(values[1]),
    designation: normalizeText(values[2]),
    ref_fournisseur: normalizeText(values[3]),
    fournisseur: normalizeText(values[4]),
    info: normalizeText(values[5]),
    zone: normalizeText(values[6]),
    demandeur: normalizeText(values[7]),
    sorties: normalizeNumber(values[8]),
    intervenant: normalizeText(values[9]),
    entrees: normalizeNumber(values[10]),
    date: normalizeDate(values[11]),
    lieu: normalizeLieu(values[12]),
  };
}

function normalizeText(value: string | null | undefined) {
  if (value == null) return null;
  const cleaned = String(value);
  return cleaned === "" ? null : cleaned;
}

function normalizeLieu(value: string | null | undefined) {
  if (value == null) return "";
  return String(value);
}

function normalizeNumber(value: string | null | undefined) {
  if (value == null || value === "") return null;
  const cleaned = String(value).replace(/\s/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: string | null | undefined) {
  if (value == null || value === "") return null;
  return String(value);
}

function getReadableSupabaseMessage(error: {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}) {
  const parts = [
    error.message ? `Erreur Supabase : ${error.message}` : "Erreur Supabase pendant l'import.",
    error.details ? `Détail : ${error.details}` : "",
    error.hint ? `Astuce : ${error.hint}` : "",
    error.code ? `Code : ${error.code}` : "",
  ].filter(Boolean);

  if (error.code === "23502" && `${error.message || ""} ${error.details || ""}`.toLowerCase().includes("lieu")) {
    return "La colonne Lieu est obligatoire dans la base. Le fichier importé laisse au moins une valeur vide dans Lieu, ou la base refuse encore les valeurs vides. Vérifie que la colonne 'lieu' a bien une valeur par défaut ''.";
  }

  return parts.join("\n");
}

function getReadableErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `Erreur : ${error.message}`;
  }

  try {
    return `Erreur : ${JSON.stringify(error)}`;
  } catch {
    return "Une erreur inconnue est survenue.";
  }
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
