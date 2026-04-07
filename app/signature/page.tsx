"use client";


import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

type RequestPayload = {
  demandeur: string;
  sortie_date: string;
  status: string;
  signature_data_url?: string | null;
};



export default function SignaturePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestData, setRequestData] = useState<RequestPayload | null>(null);
  const [message, setMessage] = useState<string>("");
  const [done, setDone] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasStrokeRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage("Lien invalide.");
      return;
    }

    const load = async () => {
      try {
        const response = await fetch(`/api/signature-request?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error || "Impossible de charger la demande.");
        }

        setRequestData(json);
        if (json.status === "signed") {
          setDone(true);
          setMessage("Cette signature a déjà été enregistrée.");
        }
      } catch (error: any) {
        console.error(error);
        setMessage(error?.message || "Impossible de charger la demande.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  function prepareCanvas() {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const ratio = typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 1, 1) : 1;
    const rect = wrapper.getBoundingClientRect();
    const cssWidth = Math.max(280, Math.floor(rect.width));
    const cssHeight = Math.max(320, Math.floor(rect.height));

    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
  }

  useEffect(() => {
    if (loading || done) return;
    prepareCanvas();
    const onResize = () => prepareCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [loading, done]);

  function getCtx() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return null;
    return { canvas, ctx };
  }

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handleStart(event: React.PointerEvent<HTMLCanvasElement>) {
    const payload = getCtx();
    const point = getPoint(event);
    if (!payload || !point) return;
    payload.canvas.setPointerCapture?.(event.pointerId);
    payload.ctx.beginPath();
    payload.ctx.moveTo(point.x, point.y);
    setIsDrawing(true);
    hasStrokeRef.current = true;
  }

  function handleMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const payload = getCtx();
    const point = getPoint(event);
    if (!payload || !point) return;
    payload.ctx.lineTo(point.x, point.y);
    payload.ctx.stroke();
  }

  function handleEnd(event?: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    try {
      if (event) canvasRef.current?.releasePointerCapture?.(event.pointerId);
    } catch {}
    setIsDrawing(false);
  }

  function clearPad() {
    const payload = getCtx();
    if (!payload) return;
    const { canvas, ctx } = payload;
    const cssWidth = Number.parseFloat(canvas.style.width || "0") || canvas.width;
    const cssHeight = Number.parseFloat(canvas.style.height || "0") || canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    hasStrokeRef.current = false;
  }

  function rotateToLandscape(sourceDataUrl: string) {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponible"));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Impossible de préparer la signature"));
      img.src = sourceDataUrl;
    });
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokeRef.current) {
      alert("Ajoute d'abord une signature.");
      return;
    }

    try {
      setSaving(true);
      const raw = canvas.toDataURL("image/png");
      const rotated = await rotateToLandscape(raw);

      const response = await fetch("/api/signature-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signatureDataUrl: rotated }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || "Impossible d'enregistrer la signature.");
      }

      setDone(true);
      setMessage("Signature enregistrée. Tu peux revenir au PDF sur ton ordinateur.");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Impossible d'enregistrer la signature.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#ffffff", padding: 12, display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 1080, width: "100%", margin: "0 auto", display: "grid", gap: 12, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#111827" }}>Signature demandeur</div>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>
              Signe sur tout l'écran en tenant le téléphone normalement. La signature sera pivotée automatiquement pour le PDF.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={clearPad} style={ghostBtn}>Effacer</button>
            <button onClick={handleSave} disabled={saving || done || loading} style={primaryBtn}>
              {saving ? "Enregistrement..." : "Valider la signature"}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
          {loading ? "Chargement..." : message || `Demandeur : ${requestData?.demandeur || "-"} • Date de sortie : ${requestData?.sortie_date || "-"}`}
        </div>

        {!done && !loading && (
          <div
            ref={wrapperRef}
            style={{
              width: "100%",
              flex: 1,
              minHeight: "72vh",
              background: "#ffffff",
              border: "2px solid #d1d5db",
              borderRadius: 22,
              overflow: "hidden",
              touchAction: "none",
            }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handleStart}
              onPointerMove={handleMove}
              onPointerUp={handleEnd}
              onPointerLeave={handleEnd}
              onPointerCancel={handleEnd}
              style={{ width: "100%", height: "100%", display: "block", background: "#ffffff", touchAction: "none" }}
            />
          </div>
        )}
      </div>
    </main>
  );
}

const ghostBtn: React.CSSProperties = {
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: "11px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  borderRadius: 12,
  padding: "11px 16px",
  fontWeight: 900,
  cursor: "pointer",
};
