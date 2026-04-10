import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT (clé serveur)
);

const ALLOWED_PAGES = ["/donnees", "/regularisation", "/sortie"];

export async function POST(req: Request) {
  try {
    const { page } = await req.json();

    // sécurité : vérifier page autorisée
    if (!ALLOWED_PAGES.includes(page)) {
      return NextResponse.json({ error: "page non autorisée" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("access_requests")
      .insert([
        {
          page,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}