import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// petit code secret pour sécuriser
const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function POST(req: Request) {
  try {
    const { id, action, secret } = await req.json();

    // sécurité admin
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let updateData: any = {};

    if (action === "approve") {
      updateData = {
        status: "approved",
        validated_at: new Date().toISOString(),
      };
    }

    if (action === "refuse") {
      updateData = {
        status: "refused",
        refused_at: new Date().toISOString(),
      };
    }

    const { error } = await supabase
      .from("access_requests")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}