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

/** Releases de um produto (ou de todos, se omitido), mais recente primeiro. */
export async function getChangelogList(product?: Product): Promise<ChangelogEntry[]> {
  const entries = await getCollection(
    'changelog',
    product ? (entry) => entry.data.product === product : undefined,
  );
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
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

