import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

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
    if (!resendApiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY manquante." }, { status: 500 });
    }

    const body = await request.json();
    const demandeur = String(body?.demandeur || "").trim();
    const sortieDate = String(body?.sortieDate || "").trim();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!demandeur) {
      return NextResponse.json({ error: "Demandeur manquant." }, { status: 400 });
    }

    if (!sortieDate) {
      return NextResponse.json({ error: "Date de sortie manquante." }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Aucun article à signer." }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    const { data: adminEmailRow, error: adminEmailError } = await supabase
      .from("app_data")
      .select("value")
      .eq("type", "email")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (adminEmailError) {
      return NextResponse.json({ error: adminEmailError.message }, { status: 500 });
    }

    const adminEmail = String(adminEmailRow?.value || "").trim();
    if (!adminEmail) {
      return NextResponse.json({ error: "Aucun email admin trouvé dans app_data." }, { status: 400 });
    }

    const token = crypto.randomBytes(24).toString("hex");

    const { error: insertError } = await supabase.from("signature_requests").insert({
      token,
      demandeur,
      sortie_date: sortieDate,
      items_json: items,
      status: "pending",
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const signatureUrl = `${appUrl}/signature?token=${encodeURIComponent(token)}`;
    const resend = new Resend(resendApiKey);

    const rowsHtml = items
      .map(
        (item: any) => `
          <tr>
            <td style="padding:8px;border:1px solid #dbe4f0;">${String(item?.ref_mag || "-")}</td>
            <td style="padding:8px;border:1px solid #dbe4f0;">${String(item?.designation || "-")}</td>
            <td style="padding:8px;border:1px solid #dbe4f0;">${String(item?.fournisseur || "-")}</td>
            <td style="padding:8px;border:1px solid #dbe4f0;text-align:center;">${String(item?.quantity || "0")}</td>
          </tr>`
      )
      .join("");

const resendResponse = await resend.emails.send({
  from: fromEmail,
  to: adminEmail,
  subject: `Signature demandée - Bon de sortie - ${demandeur}`,
  html: `
    <div style="font-family:Arial,sans-serif;background:#f7f9fc;padding:24px;color:#0f172a;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f0;border-radius:18px;padding:24px;">
        <h2 style="margin:0 0 16px;">Bon de sortie à signer</h2>
        <p style="margin:0 0 12px;">Demandeur : <strong>${demandeur}</strong></p>
        <p style="margin:0 0 18px;">Date de sortie : <strong>${sortieDate}</strong></p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 18px;">
          <thead>
            <tr style="background:#eff6ff;">
              <th style="padding:8px;border:1px solid #dbe4f0;text-align:left;">Réf.</th>
              <th style="padding:8px;border:1px solid #dbe4f0;text-align:left;">Désignation</th>
              <th style="padding:8px;border:1px solid #dbe4f0;text-align:left;">Fournisseur</th>
              <th style="padding:8px;border:1px solid #dbe4f0;text-align:center;">Qté</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <p style="margin:0 0 18px;">Ouvre ce lien sur ton téléphone pour signer :</p>
        <p style="margin:0 0 18px;"><a href="${signatureUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">Signer sur le téléphone</a></p>
        <p style="word-break:break-all;color:#475569;">${signatureUrl}</p>
      </div>
    </div>
  `,
});

console.log("RESEND RESPONSE:", resendResponse);

if ((resendResponse as any)?.error) {
  return NextResponse.json(
    { error: (resendResponse as any).error.message || "Erreur envoi mail Resend." },
    { status: 500 }
  );
}

    return NextResponse.json({ ok: true, token, adminEmail });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message || "Erreur serveur." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ error: "Token manquant." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("signature_requests")
      .select("token, demandeur, sortie_date, status, signature_data_url, signed_at")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message || "Erreur serveur." }, { status: 500 });
  }
}
