// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://manybot.org',

  // IMPORTANTE: Astro não deixa usar `i18n` no top-level junto com `locales`
  // do Starlight (são dois sistemas de i18n que colidem). Como o Starlight
  // cuida do i18n de /docs/, as páginas "normais" (home, colabore etc.)
  // usam roteamento por pasta simples: src/pages/ (pt) e src/pages/en/ (en) —
  // sem fallback automático nessas (só nos docs, que é onde isso importa).

  integrations: [
    starlight({
      logo: {
        src: './public/assets/manybot-docs-con.svg',
        alt: 'ManyBot Docs',
        replacesTitle: true,
      },

      title: 'manybot docs',

      favicon: './public/assets/favicon-white.svg',
      // Starlight tem o PRÓPRIO sistema de i18n (independente do i18n acima,
      // que é só pras páginas fora de /docs/). Mesma ideia: pt como root.
      defaultLocale: 'root',
      locales: {
        root: { label: 'Português', lang: 'pt-BR' },
        en: { label: 'English', lang: 'en' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/many-bot/manybot' },
      ],
      sidebar: [
        {
          label: 'Introdução',
          translations: { en: 'Introduction' },
          items: [
            { slug: 'docs' },
            { slug: 'docs/getting-started' },
            { slug: 'docs/config' },
          ],
        },
        {
          label: 'Bot oficial',
          translations: { en: 'Official bot' },
          items: [
            { slug: 'docs/official-bot-about' },
          ],
        },
        {
          label: 'Plugins',
          translations: { en: 'Plugins' },
          items: [
            { slug: 'docs/about-plugins' },
            { slug: 'docs/manyplug-cli' },
            { slug: 'docs/how-to-make-a-plugin' },
            { slug: 'docs/best-practices' },
          ],
        },
        {
          label: 'API',
          translations: { en: 'API' },
          items: [{ autogenerate: { directory: 'docs/api' } }],
        },
        {
          label: 'Legal',
          translations: { en: 'Legal' },
          items: [{ slug: 'docs/terms-and-privacy' }],
        },
      ],
      // busca já vem com Pagefind embutido por padrão — não precisa configurar nada
      customCss: ['./src/styles/starlight-overrides.css'],
    }),
  ],
});
