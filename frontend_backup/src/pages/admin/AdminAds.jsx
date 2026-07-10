import { useState, useEffect } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Image as ImageIcon,
  ExternalLink,
  Eye,
  MousePointer,
  BarChart3,
  Power,
  Loader2,
  X,
  Monitor,
  Smartphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminLayout from '@/components/AdminLayout';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Ad positions with recommended sizes
const AD_POSITIONS = [
  { 
    value: "home_banner", 
    label: "Homepage Banner", 
    description: "Large banner below reviews section",
    size: "1200 x 200",
    aspectRatio: "6:1"
  },
  { 
    value: "home_sidebar", 
    label: "Homepage Sidebar", 
    description: "Sidebar ad on homepage",
    size: "300 x 250",
    aspectRatio: "6:5"
  },
  { 
    value: "product_inline", 
    label: "Product Inline", 
    description: "Between product listings",
    size: "728 x 90",
    aspectRatio: "8:1"
  },
  { 
    value: "product_sidebar", 
    label: "Product Page Sidebar", 
    description: "Sidebar on product pages",
    size: "300 x 600",
    aspectRatio: "1:2"
  },
  { 
    value: "footer", 
    label: "Footer Banner", 
    description: "Banner above footer",
    size: "970 x 90",
    aspectRatio: "10:1"
  },
  { 
    value: "popup", 
    label: "Popup Ad", 
    description: "Popup advertisement (shows once)",
    size: "500 x 500",
    aspectRatio: "1:1"
  }
];

const getPositionInfo = (value) => AD_POSITIONS.find(p => p.value === value) || AD_POSITIONS[0];

export default function AdminAds() {
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);
  const [editingAd, setEditingAd] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    position: 'home_banner',
    image_url: '',
    target_url: '',
    alt_text: '',
    is_active: true,
    start_date: '',
    end_date: '',
    priority: 0
  });

  const fetchAds = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/ads`, { headers });
      setAds(response.data);
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast.error('Failed to load ads');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/ads/stats`, { headers });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAds(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleOpenModal = (ad = null) => {
    if (ad) {
      setEditingAd(ad);
      setFormData({
        name: ad.name || '',
        position: ad.position || 'home_banner',
        image_url: ad.image_url || '',
        target_url: ad.target_url || '',
        alt_text: ad.alt_text || '',
        is_active: ad.is_active ?? true,
        start_date: ad.start_date ? ad.start_date.slice(0, 16) : '',
        end_date: ad.end_date ? ad.end_date.slice(0, 16) : '',
        priority: ad.priority || 0
      });
    } else {
      setEditingAd(null);
      setFormData({
        name: '',
        position: 'home_banner',
        image_url: '',
        target_url: '',
        alt_text: '',
        is_active: true,
        start_date: '',
        end_date: '',
        priority: 0
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.image_url || !formData.target_url) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const payload = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        priority: parseInt(formData.priority) || 0
      };

      if (editingAd) {
        await axios.put(`${API_URL}/ads/${editingAd.id}`, payload, { headers });
        toast.success('Ad updated successfully');
      } else {
        await axios.post(`${API_URL}/ads`, payload, { headers });
        toast.success('Ad created successfully');
      }

      setShowModal(false);
      fetchAds();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save ad');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ad) => {
    if (!window.confirm(`Are you sure you want to delete "${ad.name}"?`)) return;

    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/ads/${ad.id}`, { headers });
      toast.success('Ad deleted');
      fetchAds();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete ad');
    }
  };

  const handleToggleActive = async (ad) => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/ads/${ad.id}`, {
        ...ad,
        is_active: !ad.is_active
      }, { headers });
      fetchAds();
      toast.success(`Ad ${ad.is_active ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error('Failed to update ad');
    }
  };

  const handlePreview = (ad) => {
    setPreviewAd(ad);
    setShowPreview(true);
  };

  const handlePreviewFromForm = () => {
    if (!formData.image_url) {
      toast.error('Please enter an image URL first');
      return;
    }
    setPreviewAd({
      ...formData,
      id: 'preview'
    });
    setShowPreview(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  const selectedPositionInfo = getPositionInfo(formData.position);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-amber-500" />
              Ad Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">Manage banner ads and promotions</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus className="w-4 h-4 mr-2" />
            Create Ad
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Ads</p>
                    <p className="text-xl font-bold text-white">{stats.total_ads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Power className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Active</p>
                    <p className="text-xl font-bold text-white">{stats.active_ads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Eye className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Impressions</p>
                    <p className="text-xl font-bold text-white">{stats.total_impressions.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <MousePointer className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Clicks</p>
                    <p className="text-xl font-bold text-white">{stats.total_clicks.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">CTR</p>
                    <p className="text-xl font-bold text-white">{stats.overall_ctr}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ads Grid */}
        {ads.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12 text-center">
              <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No ads created yet</p>
              <p className="text-gray-500 text-sm">Click "Create Ad" to add your first advertisement</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad) => {
              const posInfo = getPositionInfo(ad.position);
              return (
                <Card key={ad.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                  {/* Ad Preview Image */}
                  <div className="relative aspect-video bg-zinc-800">
                    <img 
                      src={ad.image_url} 
                      alt={ad.alt_text || ad.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x200/1a1a1a/666?text=Image+Not+Found';
                      }}
                    />
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium bg-black/60 text-white`}>
                      {posInfo.size}
                    </div>
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                      ad.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {ad.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-white truncate">{ad.name}</h3>
                        <p className="text-xs text-gray-400">{posInfo.label}</p>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-400">
                          <Eye className="w-4 h-4" />
                          <span>{ad.impressions?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <MousePointer className="w-4 h-4" />
                          <span>{ad.clicks?.toLocaleString() || 0}</span>
                        </div>
                        <div className="text-amber-500 text-xs">
                          {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : 0}% CTR
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(ad)}
                          className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(ad)}
                          className={`${ad.is_active ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' : 'border-green-500/50 text-green-400 hover:bg-green-500/10'}`}
                        >
                          <Power className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenModal(ad)}
                          className="border-zinc-700 text-white hover:bg-zinc-800"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(ad)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAd ? 'Edit Ad' : 'Create New Ad'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-gray-300">Ad Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Holiday Sale Banner"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
              </div>
              
              {/* Position Selector with Size Info */}
              <div>
                <Label className="text-gray-300">Position *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AD_POSITIONS.map(pos => (
                    <button
                      key={pos.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, position: pos.value })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        formData.position === pos.value
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="font-medium text-white text-sm">{pos.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{pos.description}</div>
                      <div className="text-xs text-amber-500 mt-1 font-mono">{pos.size} px</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Selected Position Info */}
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Recommended Size</p>
                    <p className="text-lg font-mono text-amber-500">{selectedPositionInfo.size} px</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-300">Aspect Ratio</p>
                    <p className="text-lg font-mono text-white">{selectedPositionInfo.aspectRatio}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-gray-300">Image URL *</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
                {formData.image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-full h-32 object-contain bg-[#0a0a0a]"
                      onError={(e) => { 
                        e.target.style.display = 'none'; 
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden h-32 items-center justify-center text-gray-500 text-sm">
                      Failed to load image
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <Label className="text-gray-300">Target URL *</Label>
                <Input
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  placeholder="https://example.com/landing-page"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Alt Text (for accessibility)</Label>
                <Input
                  value={formData.alt_text}
                  onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                  placeholder="Description of the ad"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Start Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">End Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Priority</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    placeholder="0"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher number = shows first</p>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label className="text-gray-300">Active</Label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between gap-3">
              <Button 
                variant="outline" 
                onClick={handlePreviewFromForm} 
                className="border-zinc-700 text-white hover:bg-zinc-800"
                disabled={!formData.image_url}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Ad
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700 text-white hover:bg-zinc-800">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAd ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-[900px] bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-500" />
                Ad Preview
              </DialogTitle>
            </DialogHeader>
            
            {previewAd && (
              <div className="space-y-4 py-4">
                {/* Device Tabs */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-400">Preview:</span>
                  <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500 text-black text-sm font-medium">
                      <Monitor className="w-4 h-4" />
                      Desktop
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-gray-400 hover:text-white text-sm">
                      <Smartphone className="w-4 h-4" />
                      Mobile
                    </button>
                  </div>
                </div>
                
                {/* Position Info */}
                <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Position: <span className="text-white">{getPositionInfo(previewAd.position).label}</span></span>
                    <span className="text-gray-400">Size: <span className="text-amber-500 font-mono">{getPositionInfo(previewAd.position).size} px</span></span>
                  </div>
                </div>
                
                {/* Preview Container - Simulates website background */}
                <div className="bg-[#050505] rounded-xl p-6 border border-zinc-800">
                  <p className="text-xs text-gray-500 mb-3 text-center">↓ How your ad will appear on the website ↓</p>
                  
                  {/* Ad Display based on position */}
                  {previewAd.position === 'popup' ? (
                    <div className="relative bg-black/70 rounded-xl p-8 flex items-center justify-center min-h-[400px]">
                      <div className="relative max-w-md w-full">
                        <button className="absolute -top-8 right-0 text-white/70 hover:text-white">
                          <X className="w-6 h-6" />
                        </button>
                        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                          <img 
                            src={previewAd.image_url} 
                            alt={previewAd.alt_text || previewAd.name}
                            className="w-full h-auto"
                          />
                        </div>
                        <p className="text-center text-white/50 text-sm mt-3">Advertisement</p>
                      </div>
                    </div>
                  ) : previewAd.position === 'home_banner' || previewAd.position === 'footer' ? (
                    <div className="relative overflow-hidden rounded-xl">
                      <img 
                        src={previewAd.image_url} 
                        alt={previewAd.alt_text || previewAd.name}
                        className="w-full h-auto"
                        style={{ aspectRatio: previewAd.position === 'home_banner' ? '6/1' : '10/1' }}
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white/70">
                        Ad
                      </div>
                      <button className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1 rounded-full">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : previewAd.position === 'product_inline' ? (
                    <div className="relative overflow-hidden rounded-xl">
                      <img 
                        src={previewAd.image_url} 
                        alt={previewAd.alt_text || previewAd.name}
                        className="w-full h-auto"
                        style={{ aspectRatio: '8/1' }}
                      />
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white/50">
                        Sponsored
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex-1 bg-zinc-800/50 rounded-lg p-4 text-center text-gray-500 text-sm">
                        [Main Content Area]
                      </div>
                      <div className="w-[300px] flex-shrink-0">
                        <div className="relative overflow-hidden rounded-xl border border-white/10">
                          <img 
                            src={previewAd.image_url} 
                            alt={previewAd.alt_text || previewAd.name}
                            className="w-full h-auto"
                          />
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white/70">
                            Ad
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Ad Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-gray-400">Target URL</p>
                    <a href={previewAd.target_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block">
                      {previewAd.target_url}
                    </a>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-gray-400">Alt Text</p>
                    <p className="text-white">{previewAd.alt_text || 'Not set'}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button onClick={() => setShowPreview(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white">
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
