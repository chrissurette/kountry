import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCustomStyles, createCustomStyle } from "@/lib/menu/custom-styles-service";
import { createCustomStyleSchema } from "@/lib/menu/custom-styles-schema";

export async function GET() {
  const supabase = await createClient();
  try {
    const styles = await listCustomStyles(supabase);
    return NextResponse.json({ styles });
  } catch {
    return NextResponse.json({ error: "Failed to list saved styles." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createCustomStyleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const style = await createCustomStyle(supabase, parsed.data);
    return NextResponse.json({ style });
  } catch {
    return NextResponse.json({ error: "Failed to save style." }, { status: 500 });
  }
}
