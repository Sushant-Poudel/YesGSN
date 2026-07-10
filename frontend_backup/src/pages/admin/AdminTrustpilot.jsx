import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Star, CheckCircle, AlertCircle, Trash2, ExternalLink, Settings2, Download } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

function getApi() {
  const token = localStorage.getItem('admin_token');
  return axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` } });
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? 'text-green-500 fill-green-500' : 'text-white/20'}`} />
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'Never';
  try {
    return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

export default function AdminTrustpilot() {
  const [config, setConfig] = useState({ domain: '', last_sync: null, trustpilot_reviews_count: 0 });
  const [reviews, setReviews] = useState([]);
  const [domainInput, setDomainInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const fetchData = useCallback(async () => {
    const api = getApi();
    try {
      const [configRes, reviewsRes] = await Promise.all([
        api.get('/api/reviews/trustpilot-config'),
        api.get('/api/reviews/trustpilot-reviews')
      ]);
      setConfig(configRes.data);
      setDomainInput(configRes.data.domain || '');
      setReviews(reviewsRes.data);
    } catch (err) {
      toast.error('Failed to load Trustpilot data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    if (!config.domain) {
      toast.error('Please configure your Trustpilot domain first');
      setShowSettings(true);
      return;
    }
    setIsSyncing(true);
    try {
      const res = await getApi().post('/api/reviews/sync-trustpilot');
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!domainInput.trim()) {
      toast.error('Domain cannot be empty');
      return;
    }
    setIsSavingDomain(true);
    try {
      await getApi().put('/api/reviews/trustpilot-config', { domain: domainInput.trim() });
      toast.success('Trustpilot domain updated');
      setConfig(prev => ({ ...prev, domain: domainInput.trim() }));
      setShowSettings(false);
    } catch (err) {
      toast.error('Failed to save domain');
    } finally {
      setIsSavingDomain(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${reviews.length} synced Trustpilot reviews? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const res = await getApi().delete('/api/reviews/trustpilot-reviews');
      toast.success(res.data.message);
      setReviews([]);
      setConfig(prev => ({ ...prev, trustpilot_reviews_count: 0, last_sync: null }));
    } catch (err) {
      toast.error('Failed to delete reviews');
    } finally {
      setIsDeleting(false);
    }
  };

  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rev => rev.rating === r).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(rev => rev.rating === r).length / reviews.length) * 100) : 0
  }));

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (isLoading) {
    return (
      <AdminLayout title="Trustpilot Reviews">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 text-white/40 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Trustpilot Reviews">
      <div className="space-y-6" data-testid="admin-trustpilot">

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00b67a]/20 flex items-center justify-center">
              <Star className="h-5 w-5 text-[#00b67a]" />
            </div>
            <div>
              <p className="text-white/60 text-sm">
                {config.domain ? (
                  <a href={`https://www.trustpilot.com/review/${config.domain}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#00b67a] transition-colors inline-flex items-center gap-1">
                    {config.domain} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : 'No domain configured'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="border-white/10 text-white/60 hover:text-white"
              data-testid="trustpilot-settings-btn"
            >
              <Settings2 className="h-4 w-4 mr-1.5" />
              Settings
            </Button>
            {reviews.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                data-testid="trustpilot-delete-all-btn"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Clear All
              </Button>
            )}
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-[#00b67a] hover:bg-[#00a06a] text-white"
              data-testid="trustpilot-sync-btn"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync from Trustpilot'}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5" data-testid="trustpilot-settings-panel">
            <h3 className="text-white text-sm font-semibold mb-3">Trustpilot Domain</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-white/50 text-xs">Your business domain on Trustpilot</Label>
                <Input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="e.g. gameshopnepal.com"
                  className="bg-black/50 border-white/15 text-white"
                  data-testid="trustpilot-domain-input"
                />
              </div>
              <Button
                onClick={handleSaveDomain}
                disabled={isSavingDomain}
                className="bg-white/10 hover:bg-white/15 text-white"
                data-testid="trustpilot-save-domain-btn"
              >
                {isSavingDomain ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-white/30 text-xs mt-2">
              This is the domain as it appears on trustpilot.com/review/YOUR-DOMAIN
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Synced Reviews</p>
            <p className="text-2xl font-bold text-white" data-testid="trustpilot-review-count">{reviews.length}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Average Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-white">{avgRating}</p>
              <StarRating rating={Math.round(parseFloat(avgRating))} />
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Last Sync</p>
            <p className="text-sm text-white/80" data-testid="trustpilot-last-sync">{formatDateTime(config.last_sync)}</p>
          </div>
        </div>

        {/* Rating Distribution */}
        {reviews.length > 0 && (
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <h3 className="text-white text-sm font-semibold mb-4">Rating Distribution</h3>
            <div className="space-y-2">
              {ratingDist.map(({ rating, count, pct }) => (
                <div key={rating} className="flex items-center gap-3">
                  <span className="text-white/60 text-sm w-12 text-right">{rating} star</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00b67a] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-white/40 text-xs w-16 text-right">{count} ({pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-xl">
            <Download className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-white/60 text-lg font-medium mb-2">No Trustpilot reviews synced</h3>
            <p className="text-white/30 text-sm mb-6 max-w-md mx-auto">
              Configure your Trustpilot domain above, then click "Sync from Trustpilot" to import your reviews.
            </p>
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-[#00b67a] hover:bg-[#00a06a] text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="trustpilot-reviews-list">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-sm font-semibold">Synced Reviews ({reviews.length})</h3>
            </div>
            <div className="grid gap-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white/[0.03] border border-white/8 rounded-xl p-4 hover:border-white/15 transition-colors" data-testid={`trustpilot-review-${review.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#00b67a]/20 flex items-center justify-center text-[#00b67a] text-sm font-bold flex-shrink-0">
                          {review.reviewer_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{review.reviewer_name}</p>
                          <StarRating rating={review.rating} />
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-white/60 text-sm leading-relaxed mt-2 pl-11">{review.comment}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-white/30 text-xs">{formatDate(review.review_date)}</span>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#00b67a]/70 bg-[#00b67a]/10 px-1.5 py-0.5 rounded">
                          <CheckCircle className="h-2.5 w-2.5" /> Trustpilot
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
