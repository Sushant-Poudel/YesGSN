'use client';
import { useState, useEffect } from 'react';
import { Shield, Ban, Trash2, Plus, RefreshCw, Mail, Wifi } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const BASE = `${process.env.NEXT_PUBLIC_BACKEND_URL || ''}/api`;

export default function AdminBlocklist() {
  const [blocklist, setBlocklist] = useState({ ips: [], emails: [] });
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('token') || '') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${BASE}/blocklist`, { headers });
      setBlocklist(r.data);
    } catch { toast.error('Failed to load blocklist'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const blockIp = async () => {
    if (!newIp.trim()) return;
    try {
      await axios.post(`${BASE}/blocklist/ip`, { ip: newIp.trim() }, { headers });
      toast.success(`✅ IP ${newIp} blocked`);
      setNewIp('');
      fetch();
    } catch { toast.error('Failed to block IP'); }
  };

  const unblockIp = async (ip) => {
    try {
      await axios.delete(`${BASE}/blocklist/ip`, { data: { ip }, headers });
      toast.success(`IP ${ip} unblocked`);
      fetch();
    } catch { toast.error('Failed to unblock IP'); }
  };

  const blockEmail = async () => {
    if (!newEmail.trim()) return;
    try {
      await axios.post(`${BASE}/blocklist/email`, { email: newEmail.trim() }, { headers });
      toast.success(`✅ Email ${newEmail} blocked`);
      setNewEmail('');
      fetch();
    } catch { toast.error('Failed to block email'); }
  };

  const unblockEmail = async (email) => {
    try {
      await axios.delete(`${BASE}/blocklist/email`, { data: { email }, headers });
      toast.success(`Email ${email} unblocked`);
      fetch();
    } catch { toast.error('Failed to unblock email'); }
  };

  const restore = async () => {
    try {
      const r = await axios.post(`${BASE}/blocklist/restore`, {}, { headers });
      toast.success(`Restored ${r.data.restored_ips} IPs + ${r.data.restored_emails} emails from DB`);
    } catch { toast.error('Failed to restore'); }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-400" /> IP & Email Blocklist
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Block fraudulent IPs and emails from placing orders</p>
          </div>
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300" onClick={restore}>
            <RefreshCw className="w-4 h-4 mr-1" /> Restore from DB
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Wifi className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-red-400 text-xs font-medium">Blocked IPs</p>
                <p className="text-2xl font-bold text-white">{blocklist.ips.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Mail className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-orange-400 text-xs font-medium">Blocked Emails</p>
                <p className="text-2xl font-bold text-white">{blocklist.emails.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Block IP */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Wifi className="w-4 h-4 text-red-400" /> Block IP Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                placeholder="e.g. 192.168.1.1"
                value={newIp}
                onChange={e => setNewIp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && blockIp()}
              />
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={blockIp}>
                <Ban className="w-4 h-4 mr-1" /> Block
              </Button>
            </div>
            {blocklist.ips.length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-2">No IPs blocked</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {blocklist.ips.map(ip => (
                  <div key={ip} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                    <span className="text-white font-mono text-sm">{ip}</span>
                    <button onClick={() => unblockIp(ip)} className="text-zinc-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Block Email */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-400" /> Block Email Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                placeholder="e.g. fraud@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && blockEmail()}
              />
              <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={blockEmail}>
                <Ban className="w-4 h-4 mr-1" /> Block
              </Button>
            </div>
            {blocklist.emails.length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-2">No emails blocked</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {blocklist.emails.map(email => (
                  <div key={email} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                    <span className="text-white text-sm">{email}</span>
                    <button onClick={() => unblockEmail(email)} className="text-zinc-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-zinc-500 text-xs space-y-1">
            <p>⚠️ Blocklist resets on server restart — click "Restore from DB" after any restart to reload saved blocks.</p>
            <p>⚡ Rate limit: max 3 orders per IP per 10 minutes (automatic, no setup needed)</p>
            <p>🚫 Rs 0/Rs 1 orders are automatically rejected regardless of IP</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
