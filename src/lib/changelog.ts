import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type ChangelogEntry = CollectionEntry<'changelog'>;

export const PRODUCTS = ['manybot', 'manyplug', 'website'] as const;
export type Product = (typeof PRODUCTS)[number];

export const PRODUCT_LABELS: Record<Product, string> = {
  manybot: 'ManyBot',
  manyplug: 'ManyPlug',
  website: 'Website',
};

export const CHANGELOG_TABS = ['all', ...PRODUCTS, 'plugins'] as const;
export type ChangelogTab = (typeof CHANGELOG_TABS)[number];

export const tabPath = (tab: ChangelogTab): string => (tab === 'all' ? '/changelog/' : `/changelog/${tab}/`);

export const tabRss = (tab: ChangelogTab): string | null =>
  tab === 'plugins' ? null : tab === 'all' ? '/changelog/rss.xml' : `/changelog/${tab}/rss.xml`;

/** Compara duas versões semver (major.minor.patch), maior primeiro. */
function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Releases de um produto (ou de todos, se omitido), mais recente primeiro. */
export async function getChangelogList(product?: Product): Promise<ChangelogEntry[]> {
  const entries = await getCollection(
    'changelog',
    product ? (entry) => entry.data.product === product : undefined,
  );
  return entries.sort((a, b) => {
    const dateDiff = b.data.date.getTime() - a.data.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    // Datas iguais: desempata pela versão (semver), maior primeiro.
    return compareVersionsDesc(a.data.version, b.data.version);
  });
}

/** Uma release de um produto pela versão, com a anterior/próxima do mesmo produto pra navegação. */
export async function getChangelogEntry(
  product: Product,
  version: string,
): Promise<{ entry: ChangelogEntry; prev: ChangelogEntry | null; next: ChangelogEntry | null } | undefined> {
  const list = await getChangelogList(product);
  const index = list.findIndex((entry) => entry.data.version === version);
  if (index === -1) return undefined;

  return {
    entry: list[index],
    // lista é mais recente -> mais antiga, então "prev" (release anterior) vem depois no array
    prev: list[index + 1] ?? null,
    next: list[index - 1] ?? null,
  };
}

