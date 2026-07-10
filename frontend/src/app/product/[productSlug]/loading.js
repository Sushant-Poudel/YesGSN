import { DetailSkeleton } from '@/components/LoadingSkeletons';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <DetailSkeleton />
      </main>
      <Footer />
    </div>
  );
}
