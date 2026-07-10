import { ProductGridSkeleton } from '@/components/LoadingSkeletons';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-10 w-48 bg-white/5 rounded animate-pulse mb-6" />
        <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse mb-8" />
        <div className="flex gap-2 mb-8 overflow-hidden">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-9 w-24 bg-white/5 rounded-full animate-pulse" />
          ))}
        </div>
        <ProductGridSkeleton count={12} />
      </main>
      <Footer />
    </div>
  );
}
