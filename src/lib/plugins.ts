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

const RETRIES = 6;
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 4;

async function fetchJson<T>(path: string): Promise<T | null> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok) return (await res.json()) as T;
      console.warn(`[plugins] ${path} attempt ${attempt}: HTTP ${res.status} (${Date.now() - started}ms)`);
      if (res.status < 500) return null;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      const e = err as Error & { cause?: { code?: string; message?: string } };
      console.warn(
        `[plugins] ${path} attempt ${attempt}: ${e.name} ${e.message} | cause=${e.cause?.code ?? ''} ${e.cause?.message ?? ''} (${Date.now() - started}ms)`,
      );
      lastError = err;
    }
    if (attempt < RETRIES) await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  throw new Error(`Falha ao buscar ${path} após ${RETRIES} tentativas: ${lastError}`, { cause: lastError });
}

let listPromise: Promise<PluginListItem[]> | null = null;
let detailsPromise: Promise<PluginDetail[]> | null = null;

/** Lista resumida (mesmos campos usados na grade de /plugins/). */
export function getPluginList(): Promise<PluginListItem[]> {
  listPromise ??= fetchJson<PluginListItem[]>('/plugins').then((list) => {
    if (!list) throw new Error('Falha ao buscar lista de plugins');
    return list;
  });
  return listPromise;
}

/** Detalhe completo (readme, license, repos, dependencies etc.) de 1 plugin. */
export async function getPluginDetail(key: string): Promise<PluginDetail | null> {
  const detail = await fetchJson<PluginDetail>(`/plugins/${key}`);
  if (!detail) console.warn(`[plugins] pulando ${key}: não encontrado em /plugins/${key}`);
  return detail;
}

/**
 * Detalhe completo de todos os plugins do registry, pra getStaticPaths.
 * Memoizado: as rotas pt e en compartilham a mesma busca.
 */
export function getAllPluginDetails(): Promise<PluginDetail[]> {
  detailsPromise ??= getPluginList().then(async (list) => {
    const out: PluginDetail[] = [];
    for (let i = 0; i < list.length; i += CONCURRENCY) {
      const batch = await Promise.all(list.slice(i, i + CONCURRENCY).map((p) => getPluginDetail(p.key)));
      out.push(...batch.filter((p): p is PluginDetail => p !== null));
    }
    return out;
  });
  return detailsPromise;
}

