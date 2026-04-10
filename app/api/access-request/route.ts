import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const page = typeof body.page === "string" ? body.page.trim() : "";

    if (!page) {
      return Response.json(
        { ok: false, message: "Page manquante." },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL manquante");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
    }

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("access_requests")
      .insert({
        page,
        status: "pending",
      })
      .select("id")
      .single();

    if (requestError || !requestRow) {
      console.error("SUPABASE INSERT ERROR =", requestError);
      return Response.json(
        { ok: false, message: "Impossible de créer la demande." },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      requestId: requestRow.id,
      message: "Demande créée.",
    });
  } catch (error: any) {
    console.error("POST ACCESS REQUEST ERROR =", error);

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
