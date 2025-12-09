import { createClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'global_filter_config'

function getSupabase() {
  const url = import.meta?.env?.VITE_SUPABASE_URL
  const key = import.meta?.env?.VITE_SUPABASE_ANON_KEY
  if (url && key) return createClient(url, key)
  return null
}

async function loadGlobalConfig() {
  const sb = getSupabase()
  try {
    if (sb) {
      const { data, error } = await sb
        .from('filter_configs')
        .select('*')
        .eq('id', 'global')
        .single()
      if (error) throw error
      if (data && data.config) return data.config
    }
  } catch (_) {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_) {
    return null
  }
}

async function saveGlobalConfig(config) {
  const sb = getSupabase()
  let saved = false
  try {
    if (sb) {
      const { error } = await sb
        .from('filter_configs')
        .upsert({ id: 'global', config, updated_at: new Date().toISOString() })
      if (error) throw error
      saved = true
    }
  } catch (_) {}
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    saved = true
  } catch (_) {}
  return saved
}

export default { loadGlobalConfig, saveGlobalConfig }

