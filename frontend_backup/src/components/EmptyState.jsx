import { ShoppingCart, Search, Star, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const ICONS = {
  cart: ShoppingCart,
  search: Search,
  reviews: Star,
  orders: Package,
  default: FileText,
};

export default function EmptyState({ type = 'default', title, description, actionLabel, actionTo, className = '' }) {
  const Icon = ICONS[type] || ICONS.default;

  const defaults = {
    cart: { title: 'Your cart is empty', description: 'Explore our products and find something you love', actionLabel: 'Browse Products', actionTo: '/' },
    search: { title: 'No results found', description: 'Try a different search term or browse our categories' },
    reviews: { title: 'No reviews yet', description: 'Be the first to share your experience' },
    orders: { title: 'No orders yet', description: 'Start shopping to see your orders here', actionLabel: 'Start Shopping', actionTo: '/' },
    default: { title: 'Nothing here', description: 'There\'s nothing to show right now' },
  };

  const d = defaults[type] || defaults.default;

  return (
    <div className={`flex flex-col items-center justify-center py-16 sm:py-20 px-4 ${className}`} data-testid={`empty-state-${type}`}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-xl scale-150" />
        <div className="relative p-5 rounded-full bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08]">
          <Icon className="h-8 w-8 text-white/25" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="font-heading text-lg sm:text-xl font-semibold text-white/80 mb-2 text-center">
        {title || d.title}
      </h3>
      <p className="text-white/40 text-sm text-center max-w-xs mb-6">
        {description || d.description}
      </p>
      {(actionLabel || d.actionLabel) && (actionTo || d.actionTo) && (
        <Link to={actionTo || d.actionTo}>
          <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl px-6 transition-colors duration-200" data-testid={`empty-state-action-${type}`}>
            {actionLabel || d.actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
