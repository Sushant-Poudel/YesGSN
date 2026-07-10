import { ReviewCardSkeleton } from '@/components/LoadingSkeletons';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="h-12 w-64 bg-white/5 rounded mx-auto animate-pulse mb-4" />
          <div className="h-5 w-96 bg-white/5 rounded mx-auto animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6,7,8,9].map(i => <ReviewCardSkeleton key={i} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}
