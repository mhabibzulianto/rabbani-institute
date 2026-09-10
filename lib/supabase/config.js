function cleanEnvValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

export function getSupabaseEnv() {
  return {
    url: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}
