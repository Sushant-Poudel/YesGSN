import { getBlogPost } from '@/lib/server-api';
import BlogPostPageClient from '@/views/BlogPostPage';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: 'Blog Post Not Found' };
  return {
    title: `${post.title} | GameShop Nepal Blog`,
    description: post.excerpt || post.content?.replace(/<[^>]*>/g, '').slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.image_url ? [{ url: post.image_url }] : [],
      url: `https://gameshopnepal.com/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  return <BlogPostPageClient initialPost={post} slug={slug} />;
}
