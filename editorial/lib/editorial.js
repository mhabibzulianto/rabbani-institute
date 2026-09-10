import { createSupabaseServerClient } from "@/lib/supabase/server";

function isMissingSchemaError(error) {
  const message = error?.message || "";
  return (
    error?.code === "42P01"
    || /does not exist/i.test(message)
    || /Could not find .*schema cache/i.test(message)
  );
}

export async function touchEditorialMembership(userId) {
  if (!userId) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("account_app_memberships")
    .upsert(
      {
        user_id: userId,
        app_slug: "editorial",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,app_slug" },
    );

  if (error && !isMissingSchemaError(error)) {
    console.error(error);
  }
}
