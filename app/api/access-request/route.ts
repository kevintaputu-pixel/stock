import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

type AdminSettingsRow = {
  admin_email: string;
};

function getBaseUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  return new URL(request.url).origin.replace(/\/+$/, "");
}

async function getAdminValidationEmail() {
  const { data, error } = await supabaseAdmin
    .from("admin_settings")
    .select("admin_email")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<AdminSettingsRow>();

  if (error) {
    throw new Error("Impossible de lire l'e-mail admin.");
  }

  const adminEmail = data?.admin_email?.trim().toLowerCase();

  if (!adminEmail) {
    throw new Error("Aucun e-mail admin configuré dans admin_settings.");
  }

  return adminEmail;
}

export async function POST(request: Request) {
  try {
    console.log("POST ACCESS REQUEST START");

    const body = await request.json();
    const page = typeof body.page === "string" ? body.page : "";

    console.log("PAGE =", page);

    if (!page) {
      return Response.json(
        { ok: false, message: "Page manquante." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY manquante");
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL manquante");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
    }

    const adminEmail = await getAdminValidationEmail();

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("access_requests")
      .insert({
        page,
        status: "pending",
      })
      .select("id")
      .single();

    if (requestError || !requestRow) {
      console.error("SUPABASE INSERT ERROR:", requestError);
      return Response.json(
        { ok: false, message: "Impossible de créer la demande." },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const approveUrl = `${baseUrl}/api/access-request?id=${requestRow.id}&approve=1`;

    console.log("APPROVE URL =", approveUrl);

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: adminEmail,
      subject: `Demande d'accès : ${page}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Demande d'accès</h2>
          <p>Une demande d'accès a été faite pour la page <b>${page}</b>.</p>
          <p>ID de demande : <b>${requestRow.id}</b></p>
          <p>E-mail admin destinataire : <b>${adminEmail}</b></p>
          <p>
            <a href="${approveUrl}" style="display:inline-block;padding:12px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
              Valider l'accès
            </a>
          </p>
          <p style="margin-top:16px;font-size:12px;color:#666;">
            Lien direct : ${approveUrl}
          </p>
        </div>
      `,
    });

    console.log("RESEND RESULT =", JSON.stringify(result, null, 2));

    if (result?.error) {
      console.error("RESEND ERROR =", result.error);
      return Response.json(
        {
          ok: false,
          message: result.error.message || "Envoi email refusé",
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      requestId: requestRow.id,
      adminEmail,
      message: "Demande envoyée par e-mail.",
    });
  } catch (error: any) {
    console.error("API ERROR =", error);

    return Response.json(
      {
        ok: false,
        message: error.message || "Erreur serveur.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const approve = searchParams.get("approve");

    if (!id) {
      return Response.json(
        { ok: false, message: "ID manquant." },
        { status: 400 }
      );
    }

    if (approve === "1") {
      const { error } = await supabaseAdmin
        .from("access_requests")
        .update({
          status: "approved",
          validated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("SUPABASE APPROVE ERROR =", error);
        return new Response("Impossible de valider la demande.", {
          status: 500,
        });
      }

      return new Response(
        "<html><body style='font-family:Arial;padding:24px;'><h2>Accès validé ✅</h2><p>La demande a bien été approuvée.</p></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("access_requests")
      .select("status")
      .eq("id", id)
      .single();

    if (error || !data) {
      return Response.json(
        { ok: false, message: "Demande introuvable." },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, status: data.status });
  } catch (error) {
    console.error("GET ACCESS REQUEST ERROR =", error);

    return Response.json(
      { ok: false, message: "Erreur serveur." },
      { status: 500 }
    );
  }
}
