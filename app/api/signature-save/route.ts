import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://stock-riseup.vercel.app").replace(/\/$/, "");

function getAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Variables Supabase manquantes côté serveur.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body?.token || "").trim();
    const signatureDataUrl = String(body?.signatureDataUrl || "").trim();

    if (!token) {
      return NextResponse.json({ error: "Token manquant." }, { status: 400 });
    }

    if (!signatureDataUrl.startsWith("data:image/png;base64,")) {
      return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data: existing, error: fetchError } = await supabase
      .from("signature_requests")
      .select("status")
      .eq("token", token)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("signature_requests")
      .update({
        status: "signed",
        signature_data_url: signatureDataUrl,
        signed_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      redirectUrl: `${appUrl}/signature/merci`,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message || "Erreur serveur." }, { status: 500 });
  }
}
