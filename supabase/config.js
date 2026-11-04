// =========================================================
// CONFIGURAÇÃO DO SUPABASE
// =========================================================
// Este arquivo é compartilhado pela página pública e pelo admin.
// Mantenha aqui somente a chave publishable/anon do projeto.

const SUPABASE_URL = 'https://ynrryvkeicgumwlztkxt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ONNugoL6AEat-aGqf9aqKg_XwaToWXQ';

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
