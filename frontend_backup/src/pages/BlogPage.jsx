import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO, { SEOConfigs } from '@/components/SEO';
import { blogAPI } from '@/lib/api';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await blogAPI.getAll();
        setPosts(res.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <SEO {...SEOConfigs.blog} />
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="font-heading text-4xl font-bold text-white uppercase tracking-tight mb-3">Blog & <span className="text-gold-500">Guides</span></h1>
            <p className="text-white/60">Helpful tips, tutorials, and updates</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 skeleton rounded-lg"></div>)}</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-card border border-white/10 rounded-lg">
              <FileText className="h-16 w-16 mx-auto text-white/20 mb-4" />
              <p className="text-white/40 text-lg">No blog posts yet</p>
              <p className="text-white/30 text-sm mt-2">Check back soon for helpful guides!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="block bg-card border border-white/10 rounded-lg p-5 hover:border-gold-500/50 transition-all duration-300 group">
                  <div className="flex gap-4">
                    {post.image_url && <img src={post.image_url} alt={post.title} className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-heading text-xl font-semibold text-white group-hover:text-gold-500 transition-colors">{post.title}</h2>
                      <p className="text-white/60 text-sm mt-2 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center gap-2 mt-3 text-gold-500 text-sm">Read more <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
