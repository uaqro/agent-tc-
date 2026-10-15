/**
 * Configuración pública del front. Aquí NO van secretos: la URL y la llave publicable de
 * Supabase están pensadas para usarse en el navegador. Las llaves del LLM viven solo en el
 * backend.
 */
export const CONFIG = {
  // URL del backend (FastAPI). En local: http://127.0.0.1:8000
  API_BASE_URL: "http://127.0.0.1:8000",
  SUPABASE_URL: "https://klfkeranmbofvyxubvnm.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_gAnD2BrLdJEPohY7uGFTKQ_zEebvh8G",
};
