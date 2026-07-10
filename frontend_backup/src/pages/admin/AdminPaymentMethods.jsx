import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, QrCode, Phone, FileText, X } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { paymentMethodsAPI, uploadAPI } from '@/lib/api';

const emptyMethod = { 
  name: '', 
  image_url: '', 
  qr_code_url: '',
  qr_codes: [], // Multiple QR codes support
  merchant_name: '',
  phone_number: '',
  instructions: '',
  is_active: true, 
  sort_order: 0 
};

export default function AdminPaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState(emptyMethod);
  const [isUploading, setIsUploading] = useState({ logo: false, qr: false, qrIndex: -1 });

  const fetchMethods = async () => {
    try { 
      const res = await paymentMethodsAPI.getAllAdmin(); 
      setMethods(res.data); 
    } catch (error) { 
      console.error('Error:', error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { fetchMethods(); }, []);

  const handleOpenDialog = (method = null) => {
    if (method) { 
      setEditingMethod(method); 
      // Migrate old single QR to array if needed
      let qrCodes = method.qr_codes || [];
      if (qrCodes.length === 0 && method.qr_code_url) {
        qrCodes = [{ url: method.qr_code_url, label: 'QR Code 1' }];
      }
      setFormData({ 
        name: method.name, 
        image_url: method.image_url || '', 
        qr_code_url: method.qr_code_url || '',
        qr_codes: qrCodes,
        merchant_name: method.merchant_name || '',
        phone_number: method.phone_number || '',
        instructions: method.instructions || '',
        is_active: method.is_active, 
        sort_order: method.sort_order 
      }); 
    } else { 
      setEditingMethod(null); 
      setFormData(emptyMethod); 
    }
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const uploadKey = field === 'image_url' ? 'logo' : 'qr';
    setIsUploading(prev => ({ ...prev, [uploadKey]: true }));
    
    try {
      const res = await uploadAPI.uploadImage(file);
      const fullUrl = `${process.env.REACT_APP_BACKEND_URL}${res.data.url}`;
      setFormData(prev => ({ ...prev, [field]: fullUrl }));
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  // Handle QR code upload for multiple QR codes
  const handleQRUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(prev => ({ ...prev, qr: true, qrIndex: index }));
    
    try {
      const res = await uploadAPI.uploadImage(file);
      const fullUrl = `${process.env.REACT_APP_BACKEND_URL}${res.data.url}`;
      
      setFormData(prev => {
        const newQrCodes = [...prev.qr_codes];
        newQrCodes[index] = { ...newQrCodes[index], url: fullUrl };
        return { ...prev, qr_codes: newQrCodes };
      });
      toast.success('QR Code uploaded!');
    } catch (error) {
      toast.error('Failed to upload QR code');
    } finally {
      setIsUploading(prev => ({ ...prev, qr: false, qrIndex: -1 }));
    }
  };

  // Add new QR code slot
  const addQRCode = () => {
    setFormData(prev => ({
      ...prev,
      qr_codes: [...prev.qr_codes, { url: '', label: `QR Code ${prev.qr_codes.length + 1}` }]
    }));
  };

  // Remove QR code
  const removeQRCode = (index) => {
    setFormData(prev => ({
      ...prev,
      qr_codes: prev.qr_codes.filter((_, i) => i !== index)
    }));
  };

  // Update QR code label
  const updateQRLabel = (index, label) => {
    setFormData(prev => {
      const newQrCodes = [...prev.qr_codes];
      newQrCodes[index] = { ...newQrCodes[index], label };
      return { ...prev, qr_codes: newQrCodes };
    });
  };

  // Update QR code URL manually
  const updateQRUrl = (index, url) => {
    setFormData(prev => {
      const newQrCodes = [...prev.qr_codes];
      newQrCodes[index] = { ...newQrCodes[index], url };
      return { ...prev, qr_codes: newQrCodes };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.image_url) { 
      toast.error('Name and logo are required'); 
      return; 
    }
    
    // Set first QR as qr_code_url for backward compatibility
    const submitData = {
      ...formData,
      qr_code_url: formData.qr_codes.length > 0 ? formData.qr_codes[0].url : formData.qr_code_url
    };
    
    try {
      if (editingMethod) { 
        await paymentMethodsAPI.update(editingMethod.id, submitData); 
        toast.success('Payment method updated!'); 
      } else { 
        await paymentMethodsAPI.create(submitData); 
        toast.success('Payment method created!'); 
      }
      setIsDialogOpen(false);
      fetchMethods();
    } catch (error) { 
      toast.error(error.response?.data?.detail || 'Error saving payment method'); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try { 
      await paymentMethodsAPI.delete(id); 
      toast.success('Payment method deleted!'); 
      fetchMethods(); 
    } catch (error) { 
      toast.error('Error deleting payment method'); 
    }
  };

  // Count total QR codes for a method
  const getQRCount = (method) => {
    if (method.qr_codes && method.qr_codes.length > 0) {
      return method.qr_codes.filter(qr => qr.url).length;
    }
    return method.qr_code_url ? 1 : 0;
  };

  return (
    <AdminLayout title="Payment Methods">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-payment-methods">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-white/60 text-sm lg:text-base">Manage payment methods for checkout (eSewa, Khalti, Bank, etc.)</p>
          <Button onClick={() => handleOpenDialog()} className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto" data-testid="add-payment-method-btn">
            <Plus className="h-4 w-4 mr-2" />Add Payment Method
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {isLoading ? [1, 2, 3].map((i) => <div key={i} className="h-32 skeleton rounded-lg"></div>) : methods.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-card border border-white/10 rounded-lg">
              <CreditCard className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/40">No payment methods yet</p>
              <p className="text-white/30 text-sm mt-2">Add eSewa, Khalti, Bank transfer, etc.</p>
            </div>
          ) : methods.map((method) => (
            <div 
              key={method.id} 
              className={`bg-card border rounded-lg p-4 hover:border-gold-500/30 transition-all ${method.is_active ? 'border-white/10' : 'border-red-500/30 opacity-60'}`} 
              data-testid={`payment-method-${method.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img 
                    src={method.image_url} 
                    alt={method.name} 
                    className="w-8 h-8 object-contain" 
                    onError={(e) => e.target.style.display = 'none'} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-white">{method.name}</h3>
                  {method.phone_number && (
                    <p className="text-white/40 text-xs flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" /> {method.phone_number}
                    </p>
                  )}
                  {getQRCount(method) > 0 && (
                    <p className="text-green-400 text-xs flex items-center gap-1 mt-1">
                      <QrCode className="h-3 w-3" /> {getQRCount(method)} QR code{getQRCount(method) > 1 ? 's' : ''} configured
                    </p>
                  )}
                  {!method.is_active && <span className="text-red-400 text-xs">Inactive</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(method)} className="text-white/60 hover:text-gold-500 p-2">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(method.id)} className="text-white/60 hover:text-red-500 p-2">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="bg-black border-white/20" 
                  placeholder="e.g. eSewa, Khalti, Bank Transfer" 
                  required 
                />
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Logo/Icon *</Label>
                <div className="flex gap-3 items-center">
                  <Input 
                    value={formData.image_url} 
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} 
                    className="bg-black border-white/20 flex-1" 
                    placeholder="https://... or upload" 
                  />
                  <label className="cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, 'image_url')} 
                      className="hidden" 
                    />
                    <Button type="button" variant="outline" className="border-gold-500 text-gold-500" disabled={isUploading.logo}>
                      {isUploading.logo ? 'Uploading...' : 'Upload'}
                    </Button>
                  </label>
                </div>
                {formData.image_url && (
                  <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg p-2">
                    <img src={formData.image_url} alt="Logo" className="h-10 w-auto" onError={(e) => e.target.style.display = 'none'} />
                    <span className="text-white/40 text-xs">Logo preview</span>
                  </div>
                )}
              </div>

              {/* Multiple QR Codes Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-gold-500" />
                    QR Codes
                  </Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addQRCode}
                    className="border-gold-500 text-gold-500 hover:bg-gold-500/10"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add QR
                  </Button>
                </div>
                
                {formData.qr_codes.length === 0 ? (
                  <div className="border border-dashed border-white/20 rounded-lg p-4 text-center">
                    <QrCode className="h-8 w-8 mx-auto text-white/20 mb-2" />
                    <p className="text-white/40 text-sm">No QR codes added yet</p>
                    <p className="text-white/30 text-xs mt-1">Click "Add QR" to add payment QR codes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.qr_codes.map((qr, index) => (
                      <div key={index} className="border border-white/10 rounded-lg p-3 bg-black/20">
                        <div className="flex items-center justify-between mb-2">
                          <Input
                            value={qr.label}
                            onChange={(e) => updateQRLabel(index, e.target.value)}
                            className="bg-black border-white/20 text-sm h-8 w-40"
                            placeholder="QR Label"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQRCode(index)}
                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1 h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex gap-2 items-center">
                          <Input 
                            value={qr.url} 
                            onChange={(e) => updateQRUrl(index, e.target.value)} 
                            className="bg-black border-white/20 flex-1 text-sm" 
                            placeholder="QR code URL or upload" 
                          />
                          <label className="cursor-pointer">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleQRUpload(e, index)} 
                              className="hidden" 
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              className="border-gold-500 text-gold-500" 
                              disabled={isUploading.qr && isUploading.qrIndex === index}
                            >
                              {isUploading.qr && isUploading.qrIndex === index ? '...' : 'Upload'}
                            </Button>
                          </label>
                        </div>
                        
                        {qr.url && (
                          <div className="mt-2 bg-white rounded-lg p-2 max-w-[100px]">
                            <img src={qr.url} alt={qr.label} className="w-full" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Merchant Name */}
              <div className="space-y-2">
                <Label>Merchant Name</Label>
                <Input 
                  value={formData.merchant_name} 
                  onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })} 
                  className="bg-black border-white/20" 
                  placeholder="e.g. Game Shop Nepal" 
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input 
                  value={formData.phone_number} 
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} 
                  className="bg-black border-white/20" 
                  placeholder="e.g. 9705070222" 
                />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gold-500" />
                  Payment Instructions
                </Label>
                <Textarea 
                  value={formData.instructions} 
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} 
                  className="bg-black border-white/20 min-h-[100px]" 
                  placeholder="e.g. Put your WhatsApp Number in remarks.
❌ Not: Netflix, Prime Video, Payment, etc.

⚠️ If instructions are not followed, you will be refunded only 50% of your payment after 12 hours." 
                />
                <p className="text-white/40 text-xs">This will be shown to customers during payment</p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <Switch 
                  checked={formData.is_active} 
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} 
                />
                <Label>Active (visible to customers)</Label>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto">
                  {editingMethod ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
