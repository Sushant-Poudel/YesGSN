import { Link } from 'react-router-dom';
import { Package, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function BundleDealsSection({ bundles }) {
  if (!bundles || bundles.length === 0) return null;

  return (
    <section className="py-8 lg:py-12 bg-gradient-to-r from-gold-500/5 via-gold-500/10 to-gold-500/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 lg:mb-8">
          <div className="inline-flex items-center gap-2 bg-gold-500/20 rounded-full px-4 py-1.5 mb-3">
            <Package className="h-4 w-4 text-gold-500" />
            <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider">Bundle & Save</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white uppercase tracking-tight">
            Combo <span className="text-gold-500">Deals</span>
          </h2>
          <p className="text-white/60 mt-2 text-sm lg:text-base">Get more for less with our exclusive bundle offers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="group bg-card border border-white/10 rounded-xl overflow-hidden hover:border-gold-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/10"
            >
              {/* Discount Badge */}
              {bundle.discount_percentage > 0 && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="bg-red-500 text-white font-bold px-2 py-1">
                    <Percent className="h-3 w-3 mr-1" />
                    {bundle.discount_percentage}% OFF
                  </Badge>
                </div>
              )}

              {/* Bundle Image or Product Grid */}
              <div className="relative aspect-[16/10] bg-black/50 overflow-hidden">
                {bundle.image_url ? (
                  <img
                    src={bundle.image_url}
                    alt={bundle.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : bundle.populated_products?.length > 0 ? (
                  <div className="w-full h-full p-4 flex items-center justify-center gap-2">
                    {bundle.populated_products.slice(0, 3).map((pp, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={pp.product?.image_url}
                          alt={pp.product?.name}
                          className="w-16 h-16 lg:w-20 lg:h-20 object-cover rounded-lg border-2 border-white/20"
                        />
                        {idx < bundle.populated_products.length - 1 && (
                          <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-gold-500 font-bold text-xl">+</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-white/20" />
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </div>

              {/* Bundle Info */}
              <div className="p-4 lg:p-5">
                <h3 className="font-heading text-lg lg:text-xl font-bold text-white uppercase tracking-tight group-hover:text-gold-500 transition-colors">
                  {bundle.name}
                </h3>
                
                {bundle.description && (
                  <p className="text-white/60 text-sm mt-1 line-clamp-2">{bundle.description}</p>
                )}

                {/* Products List */}
                {bundle.populated_products?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {bundle.populated_products.map((pp, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/50">
                        <span className="w-1.5 h-1.5 bg-gold-500 rounded-full" />
                        <span className="truncate">{pp.product?.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pricing */}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="text-white/40 line-through text-sm">Rs {bundle.original_price?.toLocaleString()}</span>
                    <div className="text-gold-500 font-bold text-xl lg:text-2xl">
                      Rs {bundle.bundle_price?.toLocaleString()}
                    </div>
                  </div>
                  <Link to={`/bundle/${bundle.slug || bundle.id}`}>
                    <Button className="bg-gold-500 hover:bg-gold-600 text-black font-semibold text-sm">
                      Get Deal
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
