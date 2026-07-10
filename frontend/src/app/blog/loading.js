import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-14 md:pt-24 pb-20 md:pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-10 w-32 bg-white/5 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="h-48 bg-white/5 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
