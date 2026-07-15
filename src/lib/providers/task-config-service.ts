import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import type { ProviderTaskConfig } from "@/types/database";
import type { TaskConfigInput } from "./keys-schema";

export async function listTaskConfig(supabase: SupabaseClient): Promise<ProviderTaskConfig[]> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data, error } = await supabase
    .from("provider_task_config")
    .select("restaurant_id, task, provider, model")
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  return data as ProviderTaskConfig[];
}

export async function setTaskConfig(supabase: SupabaseClient, input: TaskConfigInput): Promise<ProviderTaskConfig> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data, error } = await supabase
    .from("provider_task_config")
    .upsert(
      { restaurant_id: restaurantId, task: input.task, provider: input.provider, model: input.model },
      { onConflict: "restaurant_id,task" }
    )
    .select("restaurant_id, task, provider, model")
    .single();
  if (error) throw error;
  return data as ProviderTaskConfig;
}
