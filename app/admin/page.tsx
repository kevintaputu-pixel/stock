"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Request = {
  id: string;
  page: string;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const [requests, setRequests] = useState<Request[]>([]);

  async function loadRequests() {
    const { data } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    setRequests(data || []);
  }

  async function approve(id: string) {
    await supabase
      .from("access_requests")
      .update({
        status: "approved",
        validated_at: new Date().toISOString(),
      })
      .eq("id", id);

    loadRequests();
  }

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Validation des accès</h1>

      {requests.map((r) => (
        <div
          key={r.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 10,
            borderRadius: 10,
          }}
        >
          <div><b>Page :</b> {r.page}</div>
          <div><b>Status :</b> {r.status}</div>

          {r.status === "pending" && (
            <button onClick={() => approve(r.id)}>
              ✅ Valider
            </button>
          )}
        </div>
      ))}
    </div>
  );
}