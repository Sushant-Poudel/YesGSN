'use client';
import { useEffect, useState } from 'react';
import { Star, ChevronLeft, ChevronRight, MessageSquarePlus, Pencil, Send, CheckCircle, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO, { SEOConfigs } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { reviewsAPI } from '@/lib/api';

function RatingBar({ label, count, total, isActive, onClick }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 text-sm rounded-lg px-2 py-1 transition-colors ${isActive ? 'bg-amber-500/10' : 'hover:bg-white/5'}`}>
      <span className={`w-7 text-right font-medium ${isActive ? 'text-amber-400' : 'text-white/60'}`}>{label}</span>
      <Star className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-amber-400 fill-amber-400' : 'text-amber-500 fill-amber-500'}`} />
      <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-amber-400' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-8 text-right ${isActive ? 'text-amber-400 font-semibold' : 'text-white/40'}`}>{count}</span>
    </button>
  );
}

function StarDisplay({ rating, size = 'md' }) {
  const s = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`${s} ${n <= rating ? 'text-amber-500 fill-amber-500' : 'text-white/10'}`} />
      ))}
    </div>
  );
}

export default function ReviewsPage({ initialReviewData = null }) {
  const [data, setData] = useState({ reviews: [], total: 0, pages: 1, avg_rating: 0, distribution: {} });
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState(null);
  const [isLoading, setIsLoading] = useState(!initialReviewData);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (initialReviewData) {
      setData(initialReviewData);
      setIsLoading(false);
    }
    fetchReviews();
    // Check if logged in
    const token = localStorage.getItem('customer_token');
    const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchMyReview();
    }
    if (adminToken) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }).then(r => r.json()).then(data => {
        if (data && data.email) setIsAdmin(true);
      }).catch(() => {});
    }

    // Check if redirected here to write a review
    if (window.location.hash === '#write-review') {
      setTimeout(() => openNewForm(), 500);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [page, activeFilter]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await reviewsAPI.getPublic(page, activeFilter);
      setData(res.data);
    } catch (e) {}
    finally { setIsLoading(false); }
  };

  const fetchMyReview = async () => {
    try {
      const res = await reviewsAPI.getMyReview();
      setMyReview(res.data.review);
      setCanReview(res.data.can_review);
      if (res.data.review) {
        setFormRating(res.data.review.rating);
        setFormComment(res.data.review.comment);
      }
    } catch (e) {}
  };

  const handleSubmit = async () => {
    if (!formComment.trim()) { toast.error('Please write a comment'); return; }
    setIsSubmitting(true);
    try {
      if (isLoggedIn) {
        // Logged in customer review
        if (isEditing && myReview) {
          await reviewsAPI.updateCustomerReview({ rating: formRating, comment: formComment });
          toast.success('Review updated! It will appear after admin approval.');
        } else {
          await reviewsAPI.submitCustomerReview({ rating: formRating, comment: formComment });
          toast.success('Review submitted! It will appear after admin approval.');
        }
        fetchMyReview();
      } else {
        // Public review — anyone can post
        if (!formName.trim()) { toast.error('Please enter your name'); setIsSubmitting(false); return; }
        await fetch('/api/reviews/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewer_name: formName.trim(),
            rating: formRating,
            comment: formComment.trim(),
            reviewer_email: formEmail.trim() || null,
          })
        }).then(r => r.json());
        toast.success('Review submitted! It will appear after admin approval. Thank you! 🙏');
      }
      setShowForm(false);
      setIsEditing(false);
      setFormComment('');
      setFormName('');
      setFormEmail('');
      fetchReviews();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminReply = async (reviewId) => {
    if (!replyText.trim()) { toast.error('Reply cannot be empty'); return; }
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reply: replyText.trim() })
      });
      toast.success('Reply posted!');
      setReplyingTo(null);
      setReplyText('');
      fetchReviews();
    } catch (e) {
      toast.error('Failed to post reply');
    }
  };

  const handleFilterClick = (star) => { setActiveFilter(prev => prev === star ? null : star); setPage(1); };
  const openEditForm = () => { setIsEditing(true); setFormRating(myReview.rating); setFormComment(myReview.comment); setShowForm(true); };
  const openNewForm = () => { setIsEditing(false); setFormRating(5); setFormComment(''); setFormName(''); setFormEmail(''); setShowForm(true); };
  const formatDate = (d) => { if (!d) return ''; return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); };

  const { reviews, total, pages, avg_rating, distribution } = data;
  const totalAllReviews = Object.values(distribution).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-black">
      <SEO {...SEOConfigs.reviews} />
      <Navbar />

      <div className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">Customer Reviews</h1>
            <p className="text-white/50 mt-3 text-sm sm:text-base">Real reviews from real customers in Nepal</p>
          </div>

          {/* Stats Card */}
          <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
              <div className="text-center sm:text-left flex-shrink-0">
                <div className="text-6xl sm:text-7xl font-extrabold text-white leading-none">{avg_rating > 0 ? avg_rating.toFixed(1) : '0.0'}</div>
                <div className="flex items-center justify-center sm:justify-start gap-0.5 mt-2">
                  {[1,2,3,4,5].map(n => <Star key={n} className={`h-5 w-5 ${n <= Math.round(avg_rating) ? 'text-amber-500 fill-amber-500' : 'text-white/15'}`} />)}
                </div>
                <div className="text-white/40 text-sm mt-1">{totalAllReviews} reviews</div>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                {[5,4,3,2,1].map(star => (
                  <RatingBar key={star} label={star} count={distribution[star] || 0} total={totalAllReviews} isActive={activeFilter === star} onClick={() => handleFilterClick(star)} />
                ))}
              </div>
            </div>
          </div>

          {/* Write Review + Filter bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            <div>
              <Button
                id="write-review"
                onClick={openNewForm}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 w-full sm:w-auto"
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Write a Review
              </Button>
              <p className="text-white/30 text-xs mt-1.5 pl-1">Anyone can review. All reviews are approved by our team.</p>
            </div>
            {activeFilter && (
              <button onClick={() => setActiveFilter(null)} className="text-amber-500 text-sm hover:underline">
                Clear {activeFilter}★ filter
              </button>
            )}
          </div>

          {/* My Review (if logged in) */}
          {isLoggedIn && myReview && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-400 text-sm font-semibold">Your Review</span>
                <Button size="sm" variant="ghost" onClick={openEditForm} className="text-white/50 hover:text-white h-7 px-2">
                  <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                </Button>
              </div>
              <StarDisplay rating={myReview.rating} />
              <p className="text-white/70 text-sm mt-2">"{myReview.comment}"</p>
              {myReview.status === 'pending' && <span className="text-xs text-amber-400/70 mt-2 block">⏳ Pending approval</span>}
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-900/50 rounded-xl animate-pulse" />)}
              </div>
            ) : reviews.length > 0 ? (
              reviews.map(review => (
                <div key={review.id} className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-5 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <StarDisplay rating={review.rating} />
                    <span className="text-white/25 text-xs flex-shrink-0">{formatDate(review.review_date)}</span>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed mt-2.5 mb-3">"{review.comment}"</p>
                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-500 text-xs font-bold">{review.reviewer_name?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{review.reviewer_name}</span>
                        {(review.is_verified_buyer || review.is_customer_review) && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-400 border border-green-500/25">
                            ✅ Verified Buyer
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => { setReplyingTo(review.id); setReplyText(review.admin_reply || ''); }}
                        className="text-xs text-amber-500/70 hover:text-amber-400 transition-colors"
                      >
                        {review.admin_reply ? '✏️ Edit Reply' : '💬 Reply'}
                      </button>
                    )}
                  </div>

                  {/* Admin Reply */}
                  {review.admin_reply && (
                    <div className="mt-3 ml-4 pl-4 border-l-2 border-amber-500/30">
                      <p className="text-xs text-amber-400/80 font-semibold mb-1">GameShop Nepal · Response</p>
                      <p className="text-white/60 text-sm">{review.admin_reply}</p>
                    </div>
                  )}

                  {/* Admin Reply Input */}
                  {isAdmin && replyingTo === review.id && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Write your response as GameShop Nepal..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm min-h-[80px] resize-none"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)} className="text-white/50">Cancel</Button>
                        <Button size="sm" onClick={() => handleAdminReply(review.id)} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                          <Send className="h-3.5 w-3.5 mr-1.5" />Post Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="p-5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-4">
                  <Star className="h-8 w-8 text-white/25" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-white/80 mb-2">{activeFilter ? `No ${activeFilter}-star reviews yet` : 'No reviews yet'}</h3>
                <p className="text-white/40 text-sm">
                  {activeFilter
                    ? <button onClick={() => setActiveFilter(null)} className="text-amber-500 hover:underline">Clear filter</button>
                    : 'Be the first to share your experience!'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="border-white/15 text-white/70 hover:bg-white/5 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-white/50 text-sm">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="border-white/15 text-white/70 hover:bg-white/5 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Review Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100%-32px)] sm:max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{isEditing ? 'Edit Your Review' : 'Write a Review'}</DialogTitle>
            <p className="text-white/40 text-sm">Your review will appear after admin approval</p>
          </DialogHeader>
          <div className="space-y-4 pt-2">

            {/* Name + Email — only for non-logged-in users */}
            {!isLoggedIn && (
              <>
                <div>
                  <label className="text-white/60 text-sm mb-1.5 block">Your Name <span className="text-red-400">*</span></label>
                  <Input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Sushant Poudel"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-1.5 block">
                    Email <span className="text-white/30 text-xs">(optional — used to verify if you're a buyer)</span>
                  </label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  
                </div>
              </>
            )}

            {/* Star Rating */}
            <div>
              <label className="text-white/60 text-sm mb-2 block">Your Rating</label>
              <div className="flex items-center gap-1.5">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setFormRating(s)} className="p-1 transition-transform hover:scale-110">
                    <Star className={`h-7 w-7 transition-colors ${s <= formRating ? 'text-amber-500 fill-amber-500' : 'text-white/20'}`} />
                  </button>
                ))}
                <span className="text-white/50 text-sm ml-2">{['','Terrible','Poor','Average','Good','Excellent'][formRating]}</span>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-white/60 text-sm mb-2 block">Your Experience</label>
              <Textarea
                value={formComment}
                onChange={e => setFormComment(e.target.value)}
                placeholder="Tell us about your experience with GameShop Nepal..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[120px] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1 text-white/60">Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !formComment.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : isEditing ? 'Update Review' : 'Submit Review'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}