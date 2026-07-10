import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Star, GripVertical, Users } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminResellerPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '1 Month',
    discount_percent: '',
    features: '',
    is_popular: false,
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.get(`${API_URL}/reseller-plans/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(res.data);
    } catch (error) {
      toast.error('Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('admin_token');
    const planData = {
      ...formData,
      price: parseFloat(formData.price),
      discount_percent: formData.discount_percent ? parseFloat(formData.discount_percent) : 0,
      features: formData.features.split('\n').filter(f => f.trim()),
      sort_order: parseInt(formData.sort_order) || 0
    };

    try {
      if (editingPlan) {
        await axios.put(`${API_URL}/reseller-plans/${editingPlan.id}`, planData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Plan updated successfully');
      } else {
        await axios.post(`${API_URL}/reseller-plans`, planData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Plan created successfully');
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save plan');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      duration: plan.duration,
      discount_percent: plan.discount_percent ? plan.discount_percent.toString() : '',
      features: plan.features.join('\n'),
      is_popular: plan.is_popular,
      is_active: plan.is_active,
      sort_order: plan.sort_order
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      await axios.delete(`${API_URL}/reseller-plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Plan deleted successfully');
      fetchPlans();
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: '',
      duration: '1 Month',
      discount_percent: '',
      features: '',
      is_popular: false,
      is_active: true,
      sort_order: 0
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-reseller-plans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-gold-500" />
              Membership Plans
            </h1>
            <p className="text-white/60 text-sm mt-1">Manage membership pricing and benefits</p>
          </div>
          <Button onClick={openCreateDialog} className="bg-gold-500 hover:bg-gold-600 text-black">
            <Plus className="w-4 h-4 mr-2" />
            Add Plan
          </Button>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-white/10">
            <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No membership plans yet</p>
            <Button onClick={openCreateDialog} className="mt-4 bg-gold-500 hover:bg-gold-600 text-black">
              Create Your First Plan
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative bg-card rounded-xl border p-6 ${
                  plan.is_active 
                    ? plan.is_popular ? 'border-gold-500' : 'border-white/10'
                    : 'border-red-500/30 opacity-60'
                }`}
              >
                {/* Status Badges */}
                <div className="absolute top-3 right-3 flex gap-2">
                  {plan.is_popular && (
                    <span className="px-2 py-1 bg-gold-500 text-black text-xs font-bold rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> Popular
                    </span>
                  )}
                  {!plan.is_active && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Plan Info */}
                <div className="mb-4">
                  <p className="text-white/40 text-xs mb-1">Order: {plan.sort_order}</p>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-gold-500">Rs {plan.price.toLocaleString()}</span>
                    <span className="text-white/40">/{plan.duration}</span>
                  </div>
                  {plan.discount_percent > 0 && (
                    <p className="text-green-500 text-sm mt-1">{plan.discount_percent}% discount</p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6 max-h-40 overflow-y-auto">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                      <span className="text-white/70 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(plan)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-white/20"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(plan.id)}
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Plan Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Starter, Pro, Enterprise"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Price (Rs)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="1000"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Duration</Label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    placeholder="1 Month"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Discount % (optional)</Label>
                  <Input
                    type="number"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({...formData, discount_percent: e.target.value})}
                    placeholder="0"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Sort Order</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: e.target.value})}
                    placeholder="0"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Features (one per line)</Label>
                <Textarea
                  value={formData.features}
                  onChange={(e) => setFormData({...formData, features: e.target.value})}
                  placeholder="Priority support&#10;Bulk order discounts&#10;Early access to new products"
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[120px]"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_popular}
                    onCheckedChange={(checked) => setFormData({...formData, is_popular: checked})}
                  />
                  <Label className="text-white">Mark as Popular</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label className="text-white">Active</Label>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-zinc-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
