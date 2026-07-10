'use client';
import { useState, useEffect } from 'react';
import { MessageCircle, Instagram, Send, Mail, ToggleLeft, ToggleRight, Save, Loader2, Info } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

const CHANNEL_META = {
  whatsapp:  { icon: MessageCircle, color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',  label: 'WhatsApp',      fieldKey: 'number',   fieldLabel: 'Phone Number (with country code)',  hint: 'e.g. 9779743488871 — no +, no spaces' },
  messenger: { icon: Send,          color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30',    label: 'Messenger',     fieldKey: 'username', fieldLabel: 'Facebook Page Username',            hint: 'e.g. gameshopnepal' },
  instagram: { icon: Instagram,     color: 'text-pink-400',   bg: 'bg-pink-400/10 border-pink-400/30',    label: 'Instagram DM',  fieldKey: 'username', fieldLabel: 'Instagram Username',                hint: 'e.g. gameshopnepal.co' },
};

export default function AdminPaymentRedirect() {
  const [config, setConfig]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/settings/payment-redirect`)
      .then(r => setConfig(r.data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const toggleEnabled = (ch) => {
    setConfig(c => ({
      ...c,
      channels: { ...c.channels, [ch]: { ...c.channels[ch], enabled: !c.channels[ch].enabled } }
    }));
  };

  const setFieldValue = (ch, val) => {
    const key = CHANNEL_META[ch].fieldKey;
    setConfig(c => ({ ...c, channels: { ...c.channels, [ch]: { ...c.channels[ch], [key]: val } } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('token') || '';
      await axios.put(`${API_URL}/api/settings/payment-redirect`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('✅ Payment redirect settings saved!');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    </AdminLayout>
  );

  const enabledCount = Object.values(config?.channels || {}).filter(c => c.enabled).length;

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Redirect</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Enable the channels you want customers to choose from after clicking <strong className="text-white">I have Paid</strong>.
            Customers will see a picker with all enabled channels + Email (always available).
          </p>
        </div>

        {/* Info box */}
        <div className="flex gap-3 bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
          <Info className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-zinc-400 space-y-1">
            <p><strong className="text-white">Email</strong> is always shown as an option — no setup needed.</p>
            <p><strong className="text-white">WhatsApp</strong> sends a pre-filled message with order details.</p>
            <p><strong className="text-white">Messenger / Instagram</strong> copies the order ID to clipboard before redirecting.</p>
            <p className="text-zinc-500">Currently <strong className="text-white">{enabledCount}</strong> channel{enabledCount !== 1 ? 's' : ''} enabled.</p>
          </div>
        </div>

        {/* Channel cards */}
        {Object.entries(CHANNEL_META).map(([key, meta]) => {
          const ch = config?.channels?.[key] || {};
          const Icon = meta.icon;
          const isEnabled = ch.enabled;

          return (
            <Card key={key} className={`bg-zinc-900 border-zinc-800 transition-all ${!isEnabled ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${meta.bg}`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-white text-base">{meta.label}</CardTitle>
                      <p className="text-zinc-500 text-xs mt-0.5">{isEnabled ? '✓ Shown to customers' : 'Hidden from customers'}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleEnabled(key)} className="text-zinc-400 hover:text-white transition-colors">
                    {isEnabled
                      ? <ToggleRight className="w-8 h-8 text-green-400" />
                      : <ToggleLeft  className="w-8 h-8" />}
                  </button>
                </div>
              </CardHeader>
              {isEnabled && (
                <CardContent className="pt-0">
                  <label className="text-zinc-400 text-xs mb-1.5 block">{meta.fieldLabel}</label>
                  <input
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
                    value={ch[meta.fieldKey] || ''}
                    onChange={e => setFieldValue(key, e.target.value)}
                    placeholder={meta.hint}
                  />
                  <p className="text-zinc-600 text-xs mt-1">{meta.hint}</p>
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Email always-on card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/30">
                <Mail className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-white text-base">Email</CardTitle>
                <p className="text-zinc-500 text-xs mt-0.5">Always shown — uses email from order</p>
              </div>
              <ToggleRight className="w-8 h-8 text-green-400 ml-auto" />
            </div>
          </CardHeader>
        </Card>

        {/* Save */}
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-5"
          onClick={save}
          disabled={saving}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
        </Button>

      </div>
    </AdminLayout>
  );
}
