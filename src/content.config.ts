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
};
