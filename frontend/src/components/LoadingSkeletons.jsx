export function ProductCardSkeleton() {
  return (
    <div className="depth-card overflow-hidden">
      <div className="aspect-square w-full skeleton-shimmer rounded-t-2xl" />
      <div className="p-3 sm:p-3.5 space-y-2.5">
        <div className="h-4 w-3/4 rounded-lg skeleton-shimmer" />
        <div className="h-5 w-1/3 rounded-lg skeleton-shimmer" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="glass-depth rounded-xl p-5 min-w-[280px] lg:min-w-[360px]">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-24 rounded-md skeleton-shimmer" />
          <div className="h-3 w-16 rounded-md skeleton-shimmer" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 w-full rounded-md skeleton-shimmer" />
        <div className="h-3 w-4/5 rounded-md skeleton-shimmer" />
      </div>
      <div className="h-3 w-20 rounded-md skeleton-shimmer" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center bg-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="h-14 w-3/4 mx-auto rounded-xl skeleton-shimmer" />
        <div className="h-5 w-2/3 mx-auto rounded-lg skeleton-shimmer" />
        <div className="h-12 w-48 mx-auto rounded-full skeleton-shimmer" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-black pt-24 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="h-10 w-64 mx-auto rounded-xl skeleton-shimmer" />
          <div className="h-4 w-96 mx-auto rounded-lg skeleton-shimmer" />
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-black pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl skeleton-shimmer" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded-lg skeleton-shimmer" />
            <div className="h-5 w-1/2 rounded-lg skeleton-shimmer" />
            <div className="space-y-2 mt-6">
              <div className="h-4 w-full rounded-md skeleton-shimmer" />
              <div className="h-4 w-5/6 rounded-md skeleton-shimmer" />
              <div className="h-4 w-4/6 rounded-md skeleton-shimmer" />
            </div>
            <div className="h-12 w-full rounded-xl skeleton-shimmer mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
