"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AccessRequest = {
  id: string;
  page: string;
  status: string;
  created_at: string;
  validated_at: string | null;
};

export default function AdminPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("ADMIN DATA =", data);
    console.log("ADMIN ERROR =", error);

    setRequests((data as AccessRequest[]) || []);
    setLoading(false);
  }

  async function approveRequest(id: string) {
    const { error } = await supabase
      .from("access_requests")
      .update({
        status: "approved",
        validated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadRequests();
  }

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
        Validation des accès
      </h1>

      {loading ? (
        <div>Chargement...</div>
      ) : requests.length === 0 ? (
        <div>Aucune demande en attente.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {requests.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 14,
                padding: 16,
                background: "#fff",
              }}
            >
<div><b>Page :</b> {item.page}</div>
<div><b>Statut :</b> {item.status}</div>
<div><b>Date :</b> {new Date(item.created_at).toLocaleString()}</div>

{String(item.status || "").trim().toLowerCase() !== "approved" && (
  <button
    onClick={() => approveRequest(item.id)}
    style={{
      marginTop: 12,
      background: "#2563eb",
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "10px 14px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    Valider
  </button>
)}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}