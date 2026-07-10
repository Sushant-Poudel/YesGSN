import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO, { getBlogSEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { blogAPI } from '@/lib/api';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await blogAPI.getOne(slug);
        setPost(res.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-3xl mx-auto px-4"><div className="h-8 w-48 skeleton rounded mb-4"></div><div className="h-12 w-full skeleton rounded mb-6"></div><div className="h-64 skeleton rounded"></div></div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-heading text-white mb-4">Post Not Found</h1>
          <Link to="/blog"><Button variant="outline" className="border-gold-500 text-gold-500">Back to Blog</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SEO {...getBlogSEO(post)} />
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/blog" className="inline-flex items-center text-white/60 hover:text-gold-500 mb-6 transition-colors"><ArrowLeft className="h-4 w-4 mr-2" />Back to Blog</Link>
          {post.image_url && <img src={post.image_url} alt={post.title} className="w-full h-64 object-cover rounded-lg mb-6" />}
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">{post.title}</h1>
          <p className="text-white/60 text-lg mb-8">{post.excerpt}</p>
          <div className="prose prose-invert prose-gold max-w-none rich-text-content" dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>
      </main>
      <Footer />
    </div>
  );
}
