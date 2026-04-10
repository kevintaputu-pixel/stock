"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [requests, setRequests] = useState<any[]>([]);

  async function load() {
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

    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Validation des accès</h1>

      {requests.map((r) => (
        <div key={r.id} style={{ marginBottom: 10 }}>
          <div>{r.page}</div>
          <div>{r.status}</div>

          {r.status === "pending" && (
            <button onClick={() => approve(r.id)}>
              Valider
            </button>
          )}
        </div>
      ))}
    </div>
  );
}