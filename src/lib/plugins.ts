const API = 'https://api.manybot.org';

export interface PluginListItem {
  key: string;
  name: string;
  version?: string;
  description?: string;
  category?: string;
  author: { name?: string };
}

export interface PluginDetail {
  key: string;
  name: string;
  author: { name?: string; email?: string; website?: string };
  description?: string;
  version?: string;
  category?: string;
  license?: string;
  service?: boolean;
  dependencies?: Record<string, string>;
  readme?: string;
  repos?: Record<string, { master?: string } | string>;
  synced_at?: string;
}

let cachedList: PluginListItem[] | null = null;

/** Lista resumida (mesmos campos usados na grade de /plugins/). */
export async function getPluginList(): Promise<PluginListItem[]> {
  if (cachedList) return cachedList;
  const res = await fetch(`${API}/plugins`);
  if (!res.ok) throw new Error(`Falha ao buscar lista de plugins: HTTP ${res.status}`);
  cachedList = await res.json();
  return cachedList!;
}

/** Detalhe completo (readme, license, repos, dependencies etc.) de 1 plugin. */
export async function getPluginDetail(key: string): Promise<PluginDetail | null> {
  const res = await fetch(`${API}/plugins/${key}`);
  if (!res.ok) {
    console.warn(`[plugins] pulando ${key}: HTTP ${res.status} em /plugins/${key}`);
    return null;
  }
  return res.json();
}

/**
 * Detalhe completo de todos os plugins do registry, pra getStaticPaths.
 * Plugins que falharem a busca individual são pulados (com aviso no log)
 * em vez de derrubar o build inteiro.
 */
export async function getAllPluginDetails(): Promise<PluginDetail[]> {
  const list = await getPluginList();
  const details = await Promise.all(list.map((p) => getPluginDetail(p.key)));
  return details.filter((p): p is PluginDetail => p !== null);
}

