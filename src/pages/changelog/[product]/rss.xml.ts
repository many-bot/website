import type { APIRoute, GetStaticPaths } from 'astro';
import { getChangelogList, PRODUCTS, PRODUCT_LABELS, type Product } from '../../../lib/changelog';

const SITE = 'https://manybot.org';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const getStaticPaths: GetStaticPaths = () => PRODUCTS.map((product) => ({ params: { product } }));

export const GET: APIRoute = async ({ params }) => {
  const product = params.product as Product;
  const label = PRODUCT_LABELS[product];
  const entries = await getChangelogList(product);

  const items = entries
    .map((entry) => {
      const url = `${SITE}/changelog/${product}/${entry.data.version}/`;
      const title = `v${entry.data.version}`;
      const description = entry.data.excerpt ?? title;
      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${entry.data.date.toUTCString()}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ManyBot - Changelog · ${label}</title>
    <link>${SITE}/changelog/${product}/</link>
    <description>Releases do ${label}.</description>
    <language>pt-BR</language>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

