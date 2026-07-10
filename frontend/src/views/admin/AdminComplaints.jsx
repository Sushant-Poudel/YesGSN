'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const BASE = `${API_URL}/api`;

const STATUS_CONFIG = {
  Pending:     { color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30',  icon: Clock,        label: 'Pending'     },
  'In Progress': { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30',    icon: RefreshCw,    label: 'In Progress' },
  Resolved:    { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',  icon: CheckCircle,  label: 'Resolved'    },
  Dismissed:   { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',      icon: XCircle,      label: 'Dismissed'   },
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [note, setNote] = useState({});

  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('admin_token') || localStorage.getItem('token') || '')
    : '';

  const headers = { Authorization: `Bearer ${token}` };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${BASE}/complaints`, { headers });
      setComplaints(r.data || []);
    } catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const updateStatus = async (id, status) => {
    setUpdating(id + status);
    try {
      await axios.put(`${BASE}/complaints/${id}/status`, { status, note: note[id] || '' }, { headers });
      toast.success(`Complaint marked as ${status}`);
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, admin_note: note[id] || c.admin_note } : c));
    } catch { toast.error('Failed to update complaint'); }
    finally { setUpdating(null); }
  };

  const filtered = complaints.filter(c => {
    const matchStatus = filterStatus === 'All' || c.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || c.customer_name?.toLowerCase().includes(q) || c.order_id?.includes(q) || c.reason?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    All: complaints.length,
    Pending: complaints.filter(c => c.status === 'Pending').length,
    'In Progress': complaints.filter(c => c.status === 'In Progress').length,
    Resolved: complaints.filter(c => c.status === 'Resolved').length,
    Dismissed: complaints.filter(c => c.status === 'Dismissed').length,
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-400" /> Complaints
            </h1>
            <p className="text-zinc-400 text-sm mt-1">{complaints.length} total complaints</p>
          </div>
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300" onClick={fetchComplaints}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(counts).map(([s, n]) => {
            const cfg = s === 'All' ? { color: 'text-white', bg: 'bg-white/5 border-white/10' } : STATUS_CONFIG[s];
            const Icon = s === 'All' ? AlertTriangle : cfg.icon;
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`p-4 rounded-xl border text-left transition-all ${cfg.bg} ${filterStatus === s ? 'ring-2 ring-white/20' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  <span className={`text-xs font-medium ${cfg.color}`}>{s}</span>
                </div>
                <p className="text-2xl font-bold text-white">{n}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
            placeholder="Search by customer name, order ID, or complaint text..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Complaints List */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No complaints found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.Pending;
              const Icon = cfg.icon;
              const isOpen = expanded === c.id;
              return (
                <Card key={c.id} className="bg-zinc-900 border-zinc-800">
                  {/* Header row */}
                  <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : c.id)}>
                    <div className={`p-2 rounded-lg border flex-shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm">{c.customer_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>{c.status}</span>
                      </div>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        Order #{c.order_id?.slice(0,8).toUpperCase()} • {c.items_text?.slice(0,50)} • Rs {c.total_amount}
                      </p>
                      <p className="text-zinc-400 text-xs mt-1 line-clamp-1">{c.reason}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-zinc-500 text-xs">{formatDate(c.created_at)}</p>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500 mt-1 ml-auto" /> : <ChevronDown className="w-4 h-4 text-zinc-500 mt-1 ml-auto" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-zinc-800 p-4 space-y-4">
                      {/* Contact */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          <p className="text-zinc-500 text-xs mb-1">WhatsApp</p>
                          <a href={"https://wa.me/" + (c.whatsapp||'').replace(/[^0-9]/g,'')} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">{c.whatsapp}</a>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          <p className="text-zinc-500 text-xs mb-1">Email</p>
                          <a href={"mailto:" + c.customer_email} className="text-amber-400 hover:underline text-xs">{c.customer_email || '—'}</a>
                        </div>
                      </div>

                      {/* Full complaint */}
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-zinc-500 text-xs mb-2">Full Complaint</p>
                        <p className="text-white text-sm leading-relaxed">{c.reason}</p>
                      </div>

                      {/* Admin note */}
                      <div>
                        <label className="text-zinc-400 text-xs mb-1.5 block">Admin Note (sent to customer in email)</label>
                        <textarea
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500 resize-none"
                          rows={2}
                          placeholder="Optional note to customer..."
                          value={note[c.id] ?? c.admin_note ?? ''}
                          onChange={e => setNote(prev => ({ ...prev, [c.id]: e.target.value }))}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={c.status === 'Resolved' || updating === c.id + 'Resolved'}
                          onClick={() => updateStatus(c.id, 'Resolved')}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          {updating === c.id + 'Resolved' ? 'Updating...' : 'Mark Resolved'}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={c.status === 'Dismissed' || updating === c.id + 'Dismissed'}
                          onClick={() => updateStatus(c.id, 'Dismissed')}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          {updating === c.id + 'Dismissed' ? 'Updating...' : 'Dismiss'}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={c.status === 'In Progress' || updating === c.id + 'In Progress'}
                          onClick={() => updateStatus(c.id, 'In Progress')}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          {updating === c.id + 'In Progress' ? 'Updating...' : 'Mark In Progress'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zinc-700 text-zinc-300"
                          disabled={c.status === 'Pending' || updating === c.id + 'Pending'}
                          onClick={() => updateStatus(c.id, 'Pending')}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Reset to Pending
                        </Button>
                      </div>

                      {c.admin_note && (
                        <p className="text-zinc-500 text-xs">Last note: {c.admin_note}</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
