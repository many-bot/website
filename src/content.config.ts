import { defineCollection, z } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
  // docs/ -> gerenciado pelo Starlight (sidebar, i18n fallback, busca, etc.)
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),

  // blog/<locale>/*.md -> mesma ideia de fallback dos docs, mas coleção própria
  // porque o layout do post é diferente (não usa o shell de docs).
  blog: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      excerpt: z.string().optional(),
      image: z.string().optional(),
    }),
  }),

  // changelog/*.md -> um arquivo por release (nome do arquivo = slug/versão).
  // Só PT por enquanto (sem subpasta de locale), igual os docs.
  // changelog/<produto>/*.md -> um arquivo por release. A subpasta é só
  // organização; quem manda no produto é o campo `product` do frontmatter.
  changelog: defineCollection({
    loader: glob({
      pattern: '**/*.md',
      base: './src/content/changelog',
      // id padrão do glob passa o caminho por um slugger que remove pontos
      // (ex: "5.6.0.md" viraria "560") — usamos produto+versão do
      // frontmatter como id pra não perder os pontos e garantir unicidade
      // entre produtos (ex: manybot 5.6.0 e manyplug 5.6.0 não colidem).
      generateId: ({ data }) => `${data.product}/${data.version}`,
    }),
    schema: z.object({
      product: z.enum(['manybot', 'many', 'manyplug', 'website']),
      version: z.string(),
      date: z.coerce.date(),
      excerpt: z.string().optional(),
      breaking: z.boolean().optional(),
    }),
  }),
};

