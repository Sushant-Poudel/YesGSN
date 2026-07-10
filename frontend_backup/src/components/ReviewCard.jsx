import { Star } from 'lucide-react';

export default function ReviewCard({ review }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div 
      className="review-card bg-zinc-900/60 border border-white/[0.06] rounded-xl p-4 lg:p-5 h-[140px] lg:h-[160px] flex flex-col" 
      data-testid={`review-card-${review.id}`}
    >
      <div className="flex items-center gap-0.5 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`h-3.5 w-3.5 ${star <= review.rating ? 'text-[#00b67a] fill-[#00b67a]' : 'text-white/10'}`} 
          />
        ))}
      </div>
      <p className="text-white/60 text-sm leading-relaxed line-clamp-2 flex-1">
        "{review.comment}"
      </p>
      <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-white/5">
        <span className="font-medium text-white text-sm truncate max-w-[140px]">
          {review.reviewer_name}
        </span>
        <span className="text-white/25 text-xs flex-shrink-0">
          {formatDate(review.review_date)}
        </span>
      </div>
    </div>
  );
}
