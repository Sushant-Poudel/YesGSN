import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Ticket, Percent, DollarSign, BarChart3, TrendingUp, Calendar, Award } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { promoCodesAPI } from '@/lib/api';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyCode = { code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_uses: '', max_uses_per_user: '', is_active: true };

function PromoAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await axios.get(`${API_URL}/promo-codes/analytics`, { headers: { Authorization: `Bearer ${token}` } });
        setAnalytics(res.data);
      } catch (e) {
        console.error('Failed to load promo analytics', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 skeleton rounded-lg" />)}</div>;
  if (!analytics) return null;

  return (
    <div className="space-y-4" data-testid="promo-analytics">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/80 border-zinc-800/80" data-testid="promo-stat-most-used">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-blue-500/10"><Award className="h-3.5 w-3.5 text-blue-400" /></div>
              <p className="text-white/50 text-xs font-medium">Most Used</p>
            </div>
            {analytics.most_used ? (
              <>
                <p className="text-lg font-bold text-amber-400 font-mono">{analytics.most_used.code}</p>
                <p className="text-white/40 text-xs">{analytics.most_used.uses} uses</p>
              </>
            ) : (
              <p className="text-white/30 text-sm">No usage yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/80 border-zinc-800/80" data-testid="promo-stat-most-discount">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-green-500/10"><TrendingUp className="h-3.5 w-3.5 text-green-400" /></div>
              <p className="text-white/50 text-xs font-medium">Most Discounted</p>
            </div>
            {analytics.most_discounted ? (
              <>
                <p className="text-lg font-bold text-amber-400 font-mono">{analytics.most_discounted.code}</p>
                <p className="text-white/40 text-xs">Rs {Math.round(analytics.most_discounted.total_discount).toLocaleString()} total</p>
              </>
            ) : (
              <p className="text-white/30 text-sm">No discounts yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/80 border-zinc-800/80" data-testid="promo-stat-today">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-amber-500/10"><Calendar className="h-3.5 w-3.5 text-amber-400" /></div>
              <p className="text-white/50 text-xs font-medium">Today</p>
            </div>
            <p className="text-lg font-bold text-white">{analytics.today.count} <span className="text-sm font-normal text-white/40">uses</span></p>
            <p className="text-amber-400 text-xs font-medium">Rs {Math.round(analytics.today.discount).toLocaleString()} saved</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/80 border-zinc-800/80" data-testid="promo-stat-month">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-purple-500/10"><BarChart3 className="h-3.5 w-3.5 text-purple-400" /></div>
              <p className="text-white/50 text-xs font-medium">This Month</p>
            </div>
            <p className="text-lg font-bold text-white">{analytics.month.count} <span className="text-sm font-normal text-white/40">uses</span></p>
            <p className="text-amber-400 text-xs font-medium">Rs {Math.round(analytics.month.discount).toLocaleString()} saved</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Code Breakdown Table */}
      {analytics.per_code?.length > 0 && (
        <Card className="bg-zinc-900/80 border-zinc-800/80">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold text-sm mb-3">Usage Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-white/50 text-xs font-medium py-2 pr-4">Code</th>
                    <th className="text-center text-white/50 text-xs font-medium py-2 px-3">Uses</th>
                    <th className="text-center text-white/50 text-xs font-medium py-2 px-3">Discount</th>
                    <th className="text-right text-white/50 text-xs font-medium py-2 pl-3">Total Given</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.per_code.map((c) => (
                    <tr key={c.code} className="border-b border-zinc-800/50">
                      <td className="py-2.5 pr-4">
                        <span className="font-mono font-bold text-amber-400">{c.code}</span>
                        {!c.is_active && <Badge variant="outline" className="ml-2 text-[10px] text-red-400 border-red-500/30 px-1 py-0">Off</Badge>}
                      </td>
                      <td className="text-center py-2.5 px-3 text-white">{c.uses}</td>
                      <td className="text-center py-2.5 px-3 text-white/60">
                        {c.discount_type === 'percentage' ? `${c.discount_value}%` : `Rs ${c.discount_value}`}
                      </td>
                      <td className="text-right py-2.5 pl-3 text-green-400 font-medium">Rs {Math.round(c.total_discount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-700">
                    <td className="py-2.5 pr-4 text-white font-medium">Total</td>
                    <td className="text-center py-2.5 px-3 text-white font-bold">{analytics.total.count}</td>
                    <td></td>
                    <td className="text-right py-2.5 pl-3 text-green-400 font-bold">Rs {Math.round(analytics.total.discount).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [formData, setFormData] = useState(emptyCode);

  const fetchCodes = async () => {
    try {
      const res = await promoCodesAPI.getAll();
      setCodes(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleOpenDialog = (code = null) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        code: code.code,
        discount_type: code.discount_type,
        discount_value: code.discount_value,
        min_order_amount: code.min_order_amount || '',
        max_uses: code.max_uses || '',
        max_uses_per_user: code.max_uses_per_customer || code.max_uses_per_user || '',
        is_active: code.is_active
      });
    } else {
      setEditingCode(null);
      setFormData(emptyCode);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.discount_value) {
      toast.error('Code and discount value are required');
      return;
    }
    try {
      const submitData = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        max_uses_per_customer: formData.max_uses_per_user ? parseInt(formData.max_uses_per_user) : null
      };
      
      if (editingCode) {
        await promoCodesAPI.update(editingCode.id, submitData);
        toast.success('Promo code updated!');
      } else {
        await promoCodesAPI.create(submitData);
        toast.success('Promo code created!');
      }
      setIsDialogOpen(false);
      fetchCodes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving promo code');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await promoCodesAPI.delete(id);
      toast.success('Promo code deleted!');
      fetchCodes();
    } catch (error) {
      toast.error('Error deleting promo code');
    }
  };

  return (
    <AdminLayout title="Promo Codes">
      <div className="space-y-6" data-testid="admin-promo-codes">

        {/* Analytics Section */}
        <PromoAnalytics />

        {/* Codes Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-white/60 text-sm lg:text-base">Manage discount codes for customers</p>
            <Button onClick={() => handleOpenDialog()} className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto" data-testid="add-promo-code-btn">
              <Plus className="h-4 w-4 mr-2" />Add Promo Code
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {isLoading ? (
              [1, 2, 3].map((i) => <div key={i} className="h-28 skeleton rounded-lg"></div>)
            ) : codes.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-card border border-white/10 rounded-lg">
                <Ticket className="h-12 w-12 mx-auto text-white/20 mb-4" />
                <p className="text-white/40 mb-4">No promo codes yet</p>
                <Button onClick={() => handleOpenDialog()} variant="outline" className="border-gold-500 text-gold-500">
                  <Plus className="h-4 w-4 mr-2" />Create Your First Promo Code
                </Button>
              </div>
            ) : (
              codes.map((code) => (
                <div key={code.id} className={`bg-card border rounded-lg p-4 hover:border-gold-500/30 transition-all ${code.is_active ? 'border-white/10' : 'border-red-500/30 opacity-60'}`} data-testid={`promo-code-${code.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-bold text-gold-500 text-lg tracking-wider">{code.code}</h3>
                        {!code.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {code.discount_type === 'percentage' ? (
                          <Percent className="h-4 w-4 text-green-400" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-green-400" />
                        )}
                        <span className="text-green-400 font-semibold">
                          {code.discount_type === 'percentage' ? `${code.discount_value}% OFF` : `Rs ${code.discount_value} OFF`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(code)} className="text-white/60 hover:text-gold-500 p-2">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(code.id)} className="text-white/60 hover:text-red-500 p-2">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-white/40 space-y-1">
                    {code.min_order_amount > 0 && <p>Min order: Rs {code.min_order_amount}</p>}
                    {code.max_uses && <p>Total uses: {code.used_count || 0} / {code.max_uses}</p>}
                    {(code.max_uses_per_customer || code.max_uses_per_user) && <p>Per user: {code.max_uses_per_customer || code.max_uses_per_user}x</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-md sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">
                {editingCode ? 'Edit Promo Code' : 'Add Promo Code'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Promo Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="bg-black border-white/20 uppercase font-mono"
                  placeholder="e.g. SAVE20"
                  required
                  data-testid="promo-code-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                    <SelectTrigger className="bg-black border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (Rs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="bg-black border-white/20"
                    placeholder={formData.discount_type === 'percentage' ? '10' : '100'}
                    required
                    data-testid="promo-discount-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Order Amount</Label>
                  <Input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    className="bg-black border-white/20"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses (Total)</Label>
                  <Input
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    className="bg-black border-white/20"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Uses Per User</Label>
                <Input
                  type="number"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData({ ...formData, max_uses_per_user: e.target.value })}
                  className="bg-black border-white/20"
                  placeholder="Unlimited (e.g., 1 = one-time use per user)"
                />
                <p className="text-xs text-white/40">Limit how many times each logged-in user can use this code</p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto" data-testid="save-promo-code-btn">
                  {editingCode ? 'Update' : 'Create'} Code
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
