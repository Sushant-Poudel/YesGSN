'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="relative">
            <h1 className="text-[120px] sm:text-[160px] font-bold text-amber-500 leading-none select-none opacity-20">404</h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">😵</span>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider">Wrong Place!</h2>
            <p className="text-white/50 text-sm sm:text-base max-w-sm mx-auto">Oops! This page doesn't exist or has been moved. Let's get you back on track.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/" className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase tracking-wider px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105">🏠 Go to Homepage</Link>
            <Link href="/products" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold uppercase tracking-wider px-8 py-4 rounded-xl transition-all duration-300">🛍️ Browse Products</Link>
          </div>
          <p className="text-white/30 text-xs pt-4">Need help? <a href="https://wa.me/9779743488871" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">Contact us on WhatsApp</a></p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
