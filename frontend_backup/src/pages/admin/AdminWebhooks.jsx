import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import axios from 'axios';
import { toast } from 'sonner';
import { Globe, Link2, Send, RotateCcw, Save, Package, ChevronDown, ChevronRight, Copy, Zap, FileText } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return { Authorization: `Bearer ${token}` };
};

const PLACEHOLDER_TAGS = [
  { key: '{order_number}', desc: 'Order number' },
  { key: '{customer_name}', desc: "Customer's name" },
  { key: '{customer_phone}', desc: "Customer's phone" },
  { key: '{customer_email}', desc: "Customer's email" },
  { key: '{total_amount}', desc: 'Order total' },
  { key: '{items}', desc: 'Ordered items' },
  { key: '{payment_method}', desc: 'Payment method' },
  { key: '{status}', desc: 'Current status' },
  { key: '{old_status}', desc: 'Previous status' },
  { key: '{new_status}', desc: 'New status' },
];

export default function AdminWebhooks() {
  const [productWebhooks, setProductWebhooks] = useState([]);
  const [globalWebhooks, setGlobalWebhooks] = useState({ order_webhook: '', payment_webhook: '', complaint_webhook: '' });
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [expandedTemplate, setExpandedTemplate] = useState(null);
  const [testingUrl, setTestingUrl] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const [prodRes, globalRes, templRes] = await Promise.all([
        axios.get(`${API_URL}/admin/webhooks/products`, { headers }),
        axios.get(`${API_URL}/admin/webhooks/global`, { headers }),
        axios.get(`${API_URL}/admin/webhooks/templates`, { headers }),
      ]);
      setProductWebhooks(prodRes.data);
      setGlobalWebhooks({
        order_webhook: globalRes.data.order_webhook || globalRes.data.env_order_webhook || '',
        payment_webhook: globalRes.data.payment_webhook || '',
        complaint_webhook: globalRes.data.complaint_webhook || '',
      });
      setTemplates(templRes.data.templates || {});
    } catch (err) {
      toast.error('Failed to load webhook settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveGlobalWebhooks = async () => {
    setSaving(s => ({ ...s, global: true }));
    try {
      await axios.put(`${API_URL}/admin/webhooks/global`, globalWebhooks, { headers: getHeaders() });
      toast.success('Global webhooks saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(s => ({ ...s, global: false })); }
  };

  const testWebhook = async (url) => {
    if (!url) return toast.error('No URL to test');
    setTestingUrl(url);
    try {
      const res = await axios.post(`${API_URL}/admin/webhooks/test`, { webhook_url: url }, { headers: getHeaders() });
      if (res.data.success !== false) toast.success('Test notification sent!');
      else toast.error(res.data.message || 'Test failed');
    } catch { toast.error('Failed to send test'); }
    finally { setTestingUrl(''); }
  };

  const saveTemplates = async () => {
    setSaving(s => ({ ...s, templates: true }));
    try {
      const payload = {};
      for (const [key, val] of Object.entries(templates)) {
        payload[key] = { title: val.title, content: val.content };
      }
      await axios.put(`${API_URL}/admin/webhooks/templates`, { templates: payload }, { headers: getHeaders() });
      toast.success('Message templates saved');
    } catch { toast.error('Failed to save templates'); }
    finally { setSaving(s => ({ ...s, templates: false })); }
  };

  const resetTemplates = async () => {
    if (!window.confirm('Reset all templates to defaults?')) return;
    try {
      const res = await axios.post(`${API_URL}/admin/webhooks/templates/reset`, {}, { headers: getHeaders() });
      setTemplates(res.data.templates || {});
      toast.success('Templates reset to defaults');
    } catch { toast.error('Failed to reset'); }
  };

  const updateTemplate = (key, field, value) => {
    setTemplates(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const insertPlaceholder = (templateKey, placeholder) => {
    const textarea = document.getElementById(`template-${templateKey}`);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = templates[templateKey]?.content || '';
    const newVal = current.substring(0, start) + placeholder + current.substring(end);
    updateTemplate(templateKey, 'content', newVal);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
    }, 0);
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Copied to clipboard');
  };

  const updateProductWebhook = async (productId, webhooks) => {
    try {
      await axios.put(`${API_URL}/admin/webhooks/products/${productId}`, { discord_webhooks: webhooks }, { headers: getHeaders() });
      toast.success('Product webhooks updated');
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  const removeProductWebhook = async (productId, indexToRemove) => {
    const product = productWebhooks.find(p => p.id === productId);
    if (!product) return;
    const newWebhooks = product.discord_webhooks.filter((_, i) => i !== indexToRemove);
    await updateProductWebhook(productId, newWebhooks);
  };

  if (loading) {
    return (
      <AdminLayout title="Webhooks">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Webhooks">
      <div className="space-y-6 max-w-4xl" data-testid="admin-webhooks-page">

        {/* Global Webhooks */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6" data-testid="global-webhooks-section">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Globe className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Global Webhooks</h2>
              <p className="text-sm text-white/50">Discord webhooks for order logs and payment screenshots</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Order Confirmation Webhook</label>
              <p className="text-xs text-white/40 mb-2">Receives notifications when orders are confirmed/paid</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={globalWebhooks.order_webhook}
                  onChange={e => setGlobalWebhooks(s => ({ ...s, order_webhook: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                  data-testid="order-webhook-input"
                />
                <button
                  onClick={() => testWebhook(globalWebhooks.order_webhook)}
                  disabled={testingUrl === globalWebhooks.order_webhook || !globalWebhooks.order_webhook}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  title="Send test notification"
                  data-testid="test-order-webhook"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Payment Screenshot Webhook</label>
              <p className="text-xs text-white/40 mb-2">Receives payment screenshot uploads from customers</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={globalWebhooks.payment_webhook}
                  onChange={e => setGlobalWebhooks(s => ({ ...s, payment_webhook: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                  data-testid="payment-webhook-input"
                />
                <button
                  onClick={() => testWebhook(globalWebhooks.payment_webhook)}
                  disabled={testingUrl === globalWebhooks.payment_webhook || !globalWebhooks.payment_webhook}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  title="Send test notification"
                  data-testid="test-payment-webhook"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Complaint Webhook</label>
              <p className="text-xs text-white/40 mb-2">Receives customer complaint notifications with order details</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={globalWebhooks.complaint_webhook}
                  onChange={e => setGlobalWebhooks(s => ({ ...s, complaint_webhook: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                  data-testid="complaint-webhook-input"
                />
                <button
                  onClick={() => testWebhook(globalWebhooks.complaint_webhook)}
                  disabled={testingUrl === globalWebhooks.complaint_webhook || !globalWebhooks.complaint_webhook}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  title="Send test notification"
                  data-testid="test-complaint-webhook"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={saveGlobalWebhooks}
              disabled={saving.global}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
              data-testid="save-global-webhooks"
            >
              <Save className="w-4 h-4" />
              {saving.global ? 'Saving...' : 'Save Webhooks'}
            </button>
          </div>
        </div>

        {/* Product Webhooks */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6" data-testid="product-webhooks-section">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Product Webhooks</h2>
              <p className="text-sm text-white/50">Products with Discord webhooks connected</p>
            </div>
          </div>

          {productWebhooks.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No products have webhooks configured</p>
              <p className="text-xs mt-1">Add webhook URLs to products in the Products section</p>
            </div>
          ) : (
            <div className="space-y-3">
              {productWebhooks.map(product => (
                <div key={product.id} className="bg-white/5 border border-white/5 rounded-lg p-4" data-testid={`product-webhook-${product.id}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {product.image_url && (
                      <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-white">{product.name}</h3>
                      <span className="text-xs text-white/40">{product.discord_webhooks?.length || 0} webhook{product.discord_webhooks?.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(product.discord_webhooks || []).map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-white/60 bg-black/30 rounded px-2 py-1.5 truncate">{url}</code>
                        <button onClick={() => copyUrl(url)} className="p-1.5 text-white/40 hover:text-white/70 transition-colors" title="Copy">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => testWebhook(url)} disabled={testingUrl === url} className="p-1.5 text-white/40 hover:text-blue-400 transition-colors disabled:opacity-30" title="Test">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeProductWebhook(product.id, idx)} className="p-1.5 text-white/40 hover:text-red-400 transition-colors" title="Remove">
                          <span className="text-xs font-bold">&times;</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Templates */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6" data-testid="webhook-templates-section">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Message Templates</h2>
                <p className="text-sm text-white/50">Customize webhook notification messages</p>
              </div>
            </div>
            <button
              onClick={resetTemplates}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              data-testid="reset-templates-btn"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Defaults
            </button>
          </div>

          {/* Placeholder tags reference */}
          <div className="mb-5 p-3 bg-black/20 rounded-lg border border-white/5">
            <p className="text-xs font-medium text-white/50 mb-2">Available placeholders (click to copy):</p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDER_TAGS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { navigator.clipboard.writeText(p.key); toast.success(`Copied ${p.key}`); }}
                  className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-amber-400/80 hover:bg-amber-500/10 transition-colors"
                  title={p.desc}
                >
                  {p.key}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(templates).map(([key, tpl]) => (
              <div key={key} className="bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedTemplate(expandedTemplate === key ? null : key)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                  data-testid={`template-toggle-${key}`}
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-500/70" />
                    <div>
                      <p className="text-sm font-medium text-white">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <p className="text-xs text-white/40">{tpl.description}</p>
                    </div>
                  </div>
                  {expandedTemplate === key ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                </button>

                {expandedTemplate === key && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1">Embed Title</label>
                      <input
                        type="text"
                        value={tpl.title || ''}
                        onChange={e => updateTemplate(key, 'title', e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        data-testid={`template-title-${key}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-white/50">Message Content</label>
                        <div className="flex gap-1">
                          {PLACEHOLDER_TAGS.slice(0, 5).map(p => (
                            <button
                              key={p.key}
                              onClick={() => insertPlaceholder(key, p.key)}
                              className="px-1.5 py-0.5 text-[10px] bg-amber-500/10 text-amber-400/70 rounded hover:bg-amber-500/20 transition-colors"
                              title={`Insert ${p.key}`}
                            >
                              {p.key.replace(/[{}]/g, '')}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        id={`template-${key}`}
                        value={tpl.content || ''}
                        onChange={e => updateTemplate(key, 'content', e.target.value)}
                        rows={6}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50 resize-y"
                        data-testid={`template-content-${key}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={saveTemplates}
            disabled={saving.templates}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
            data-testid="save-templates-btn"
          >
            <Save className="w-4 h-4" />
            {saving.templates ? 'Saving...' : 'Save Templates'}
          </button>
        </div>

      </div>
    </AdminLayout>
  );
}
