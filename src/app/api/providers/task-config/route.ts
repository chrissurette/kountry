import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listTaskConfig, setTaskConfig } from "@/lib/providers/task-config-service";
import { taskConfigSchema } from "@/lib/providers/keys-schema";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

export async function GET() {
  const supabase = await createClient();
  try {
    const taskConfig = await listTaskConfig(supabase);
    return NextResponse.json({ taskConfig });
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: "Failed to load task config." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = taskConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const config = await setTaskConfig(supabase, parsed.data);
    return NextResponse.json({ config });
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: "Failed to save task config." }, { status: 500 });
  }
}
