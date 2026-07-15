import { createAdminClient } from "@/lib/supabase/admin";
import type { ProviderId, ProviderTask } from "@/types/database";
import type { Usage } from "./types";

/**
 * Records a provider call for the Settings usage dashboard (docs/05).
 * provider_usage has no owner-facing insert policy — only server code
 * writes it, right after a provider call completes (success or failure
 * doesn't matter here; callers should call this once they have a Usage
 * value, which only exists after a successful call).
 */
export async function recordUsage(
  restaurantId: string,
  provider: ProviderId,
  model: string,
  task: ProviderTask,
  usage: Usage
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("provider_usage").insert({
    restaurant_id: restaurantId,
    provider,
    model,
    task,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    image_count: usage.imageCount,
    est_cost_usd: usage.estCostUsd,
  });
}
