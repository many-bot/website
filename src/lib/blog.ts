import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export interface BlogListItem {
  slug: string;
  post: CollectionEntry<'blog'>;
  isFallback: boolean;
}

/**
 * Lista de posts pro idioma pedido. Em pt é 1:1 com a collection.
 * Em en, cada post pt sem tradução aparece com isFallback=true e o
 * conteúdo pt (mesma lógica de fallback que o Starlight já faz sozinho
 * em /docs/, replicada aqui à mão porque o blog não é gerenciado pelo
 * Starlight).
 */
export async function getBlogList(locale: 'pt' | 'en'): Promise<BlogListItem[]> {
  const ptPosts = await getCollection('blog', (e) => e.id.startsWith('pt/'));

  if (locale === 'pt') {
    return ptPosts
      .map((post) => ({ slug: post.id.replace('pt/', ''), post, isFallback: false }))
      .sort((a, b) => b.post.data.date.getTime() - a.post.data.date.getTime());
  }

  const enPosts = await getCollection('blog', (e) => e.id.startsWith('en/'));
  return ptPosts
    .map((ptPost) => {
      const slug = ptPost.id.replace('pt/', '');
      const translated = enPosts.find((p) => p.id === `en/${slug}`);
      return { slug, post: translated ?? ptPost, isFallback: !translated };
    })
    .sort((a, b) => b.post.data.date.getTime() - a.post.data.date.getTime());
}

/** Post único por slug, com o mesmo fallback pt→en acima. */
export async function getBlogPost(locale: 'pt' | 'en', slug: string): Promise<BlogListItem | undefined> {
  const list = await getBlogList(locale);
  return list.find((item) => item.slug === slug);
}
