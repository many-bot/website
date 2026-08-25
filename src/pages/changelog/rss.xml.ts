import type { APIRoute } from 'astro';
import { getChangelogList, PRODUCT_LABELS } from '../../lib/changelog';

const SITE = 'https://manybot.org';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const entries = await getChangelogList();

  const items = entries
    .map((entry) => {
      const url = `${SITE}/changelog/${entry.data.product}/${entry.data.version}/`;
      const title = `[${PRODUCT_LABELS[entry.data.product]}] v${entry.data.version}`;
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
    <title>ManyBot - Changelog</title>
    <link>${SITE}/changelog/</link>
    <description>Releases e novidades do ManyBot, ManyPlug e do site.</description>
    <language>pt-BR</language>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

