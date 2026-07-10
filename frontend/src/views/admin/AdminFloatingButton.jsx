'use client';
import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

const ICONS = [
  { value: 'whatsapp',  label: 'WhatsApp',  color: '#22c55e' },
  { value: 'instagram', label: 'Instagram', color: '#e1306c' },
  { value: 'messenger', label: 'Messenger', color: '#0084ff' },
  { value: 'email',     label: 'Email',     color: '#f59e0b' },
];

export default function AdminFloatingButton() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/settings/floating-button`)
      .then(r => setConfig(r.data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
      await axios.put(`${API_URL}/api/settings/floating-button`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('✅ Floating button settings saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const pickIcon = (icon) => {
    const preset = ICONS.find(i => i.value === icon);
    setConfig(c => ({ ...c, icon, bg_color: preset ? preset.color : c.bg_color }));
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-6 max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Floating Button</h1>
          <p className="text-zinc-400 text-sm mt-1">The contact button fixed at the bottom-right of your website.</p>
        </div>

        {/* Live preview */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="relative h-20 bg-zinc-800 rounded-lg overflow-hidden">
              <div className="absolute bottom-3 right-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: config?.bg_color || '#22c55e', opacity: config?.enabled ? 1 : 0.3 }}>
                  <span className="text-white text-xl">
                    {config?.icon === 'whatsapp' ? '💬' : config?.icon === 'instagram' ? '📸' : config?.icon === 'messenger' ? '📘' : config?.icon === 'email' ? '📧' : config?.icon}
                  </span>
                </div>
              </div>
              {!config?.enabled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-zinc-500 text-xs">Button is hidden</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enable/Disable */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Show Button</p>
              <p className="text-zinc-500 text-xs">Toggle the floating button on/off site-wide</p>
            </div>
            <button onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
              className="text-zinc-400 hover:text-white">
              {config?.enabled
                ? <Eye className="w-8 h-8 text-green-400" />
                : <EyeOff className="w-8 h-8 text-zinc-500" />}
            </button>
          </CardContent>
        </Card>

        {/* Icon selector */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3"><CardTitle className="text-white text-sm">Icon / Platform</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {ICONS.map(i => (
                <button key={i.value} onClick={() => pickIcon(i.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${config?.icon === i.value ? 'border-amber-500/50 bg-amber-500/10' : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-base flex-shrink-0"
                    style={{ backgroundColor: i.color }}>
                    {i.value === 'whatsapp' ? '💬' : i.value === 'instagram' ? '📸' : i.value === 'messenger' ? '📘' : '📧'}
                  </div>
                  <span className="text-white text-sm font-medium">{i.label}</span>
                </button>
              ))}
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Custom icon (emoji or leave blank for above)</label>
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
                placeholder="e.g. 🎮 or leave blank"
                value={!ICONS.find(i => i.value === config?.icon) ? config?.icon || '' : ''}
                onChange={e => setConfig(c => ({ ...c, icon: e.target.value || 'whatsapp' }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* URL */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3"><CardTitle className="text-white text-sm">Button Link (URL)</CardTitle></CardHeader>
          <CardContent>
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
              placeholder="https://wa.me/9779743488871"
              value={config?.url || ''}
              onChange={e => setConfig(c => ({ ...c, url: e.target.value }))}
            />
            <p className="text-zinc-600 text-xs mt-1.5">WhatsApp: https://wa.me/977XXXXXXXXXX • Instagram: https://ig.me/m/username • Email: mailto:you@email.com</p>
          </CardContent>
        </Card>

        {/* Tooltip */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3"><CardTitle className="text-white text-sm">Tooltip Text (on hover)</CardTitle></CardHeader>
          <CardContent>
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
              placeholder="e.g. Chat with us on Instagram"
              value={config?.tooltip || ''}
              onChange={e => setConfig(c => ({ ...c, tooltip: e.target.value }))}
            />
            <p className="text-zinc-600 text-xs mt-1.5">Leave blank to hide tooltip</p>
          </CardContent>
        </Card>

        {/* Color */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3"><CardTitle className="text-white text-sm">Button Color</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            <input type="color" value={config?.bg_color || '#22c55e'}
              onChange={e => setConfig(c => ({ ...c, bg_color: e.target.value }))}
              className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent" />
            <input className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
              value={config?.bg_color || '#22c55e'}
              onChange={e => setConfig(c => ({ ...c, bg_color: e.target.value }))}
              placeholder="#22c55e" />
          </CardContent>
        </Card>

        {/* Save */}
        <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-5" onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
        </Button>
      </div>
    </AdminLayout>
  );
}
