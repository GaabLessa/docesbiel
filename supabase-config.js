// Cole aqui a URL do projeto e a chave PUBLICÁVEL do Supabase.
// A chave publicável pode estar no navegador quando as tabelas usam RLS.
// Nunca coloque aqui a chave secreta (secret/service_role).
const SUPABASE_URL = "https://yzftwsujwjryebwexsjd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__fQ2NndqT4sHT2IkwRuLqA__JYm_E_F";

const hasSupabaseSettings =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

window.supabaseClient = hasSupabaseSettings
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
