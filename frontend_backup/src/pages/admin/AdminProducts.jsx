import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, Image, GripVertical, Check, Webhook, CheckCircle, Send } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { productsAPI, categoriesAPI } from '@/lib/api';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AVAILABLE_TAGS = ['Popular', 'Sale', 'New', 'Limited', 'Hot', 'Best Seller', 'Flash Sale'];
const emptyProduct = { name: '', slug: '', description: '', image_url: '', category_id: '', variations: [], tags: [], custom_fields: [], sort_order: 0, is_active: true, is_sold_out: false, stock_quantity: null, flash_sale_end: '', flash_sale_label: '', whatsapp_only: false, whatsapp_message: '', discord_webhooks: [] };
const emptyVariation = { id: '', name: '', price: '', original_price: '', cost_price: '', stock: '0' };
const emptyCustomField = { id: '', label: '', placeholder: '', required: false };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [newVariation, setNewVariation] = useState(emptyVariation);
  const [newCustomField, setNewCustomField] = useState(emptyCustomField);
  const [editingVariationId, setEditingVariationId] = useState(null);
  const [editingVariationData, setEditingVariationData] = useState(emptyVariation);
  const [newWebhook, setNewWebhook] = useState('');
  const [webhookExpanded, setWebhookExpanded] = useState(false);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([productsAPI.getAllAdmin(), categoriesAPI.getAll()]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) { console.error('Error:', error); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenDialog = (product = null) => {
    if (product) { setEditingProduct(product); setFormData({ name: product.name, slug: product.slug || '', description: product.description, image_url: product.image_url, category_id: product.category_id, variations: product.variations || [], tags: product.tags || [], custom_fields: product.custom_fields || [], sort_order: product.sort_order || 0, is_active: product.is_active, is_sold_out: product.is_sold_out, stock_quantity: product.stock_quantity, flash_sale_end: product.flash_sale_end || '', flash_sale_label: product.flash_sale_label || '', whatsapp_only: product.whatsapp_only || false, whatsapp_message: product.whatsapp_message || '', discord_webhooks: product.discord_webhooks || [] }); }
    else { setEditingProduct(null); setFormData(emptyProduct); }
    setNewVariation(emptyVariation);
    setIsDialogOpen(true);
  };

  const handleAddVariation = () => {
    if (!newVariation.name || !newVariation.price) { toast.error('Variation name and price are required'); return; }
    const variation = { ...newVariation, id: `var-${Date.now()}`, price: parseFloat(newVariation.price), original_price: newVariation.original_price ? parseFloat(newVariation.original_price) : null, cost_price: newVariation.cost_price ? parseFloat(newVariation.cost_price) : null, stock: parseInt(newVariation.stock) || 0 };
    setFormData({ ...formData, variations: [...formData.variations, variation] });
    setNewVariation(emptyVariation);
  };

  const handleRemoveVariation = (varId) => { setFormData({ ...formData, variations: formData.variations.filter(v => v.id !== varId) }); };
  
  const handleEditVariation = (variation) => {
    setEditingVariationId(variation.id);
    setEditingVariationData({ ...variation, price: String(variation.price), original_price: variation.original_price ? String(variation.original_price) : '', cost_price: variation.cost_price ? String(variation.cost_price) : '', stock: String(variation.stock ?? 0) });
  };
  
  const handleSaveVariation = () => {
    if (!editingVariationData.name || !editingVariationData.price) { toast.error('Variation name and price are required'); return; }
    const updatedVariations = formData.variations.map(v => 
      v.id === editingVariationId 
        ? { ...editingVariationData, price: parseFloat(editingVariationData.price), original_price: editingVariationData.original_price ? parseFloat(editingVariationData.original_price) : null, cost_price: editingVariationData.cost_price ? parseFloat(editingVariationData.cost_price) : null, stock: parseInt(editingVariationData.stock) || 0 }
        : v
    );
    setFormData({ ...formData, variations: updatedVariations });
    setEditingVariationId(null);
    setEditingVariationData(emptyVariation);
  };
  
  const handleCancelEditVariation = () => {
    setEditingVariationId(null);
    setEditingVariationData(emptyVariation);
  };
  
  const handleMoveVariation = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.variations.length) return;
    const newVariations = [...formData.variations];
    [newVariations[index], newVariations[newIndex]] = [newVariations[newIndex], newVariations[index]];
    setFormData({ ...formData, variations: newVariations });
  };
  
  const handleToggleTag = (tag) => { setFormData({ ...formData, tags: formData.tags.includes(tag) ? formData.tags.filter(t => t !== tag) : [...formData.tags, tag] }); };

  const handleAddCustomField = () => {
    if (!newCustomField.label) { toast.error('Field label is required'); return; }
    const field = { ...newCustomField, id: `field-${Date.now()}` };
    setFormData({ ...formData, custom_fields: [...formData.custom_fields, field] });
    setNewCustomField(emptyCustomField);
  };

  const handleRemoveCustomField = (fieldId) => { setFormData({ ...formData, custom_fields: formData.custom_fields.filter(f => f.id !== fieldId) }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image_url) { toast.error('Please provide an image URL'); return; }
    if (!formData.category_id) { toast.error('Please select a category'); return; }
    if (formData.variations.length === 0) { toast.error('Add at least one variation'); return; }
    try {
      if (editingProduct) { await productsAPI.update(editingProduct.id, formData); toast.success('Product updated!'); }
      else { await productsAPI.create(formData); toast.success('Product created!'); }
      setIsDialogOpen(false);
      fetchData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Error saving product'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try { await productsAPI.delete(id); toast.success('Product deleted!'); fetchData(); } catch (error) { toast.error('Error deleting product'); }
  };

  const handleMoveProduct = async (index, direction) => {
    const newProducts = [...products];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= products.length) return;
    [newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]];
    setProducts(newProducts);
    try { await productsAPI.reorder(newProducts.map(p => p.id)); } catch (error) { toast.error('Failed to reorder'); fetchData(); }
  };

  const getCategoryName = (categoryId) => categories.find(c => c.id === categoryId)?.name || categoryId;

  return (
    <AdminLayout title="Products">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-products">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-white/60 text-sm lg:text-base">Manage your product catalog. Drag to reorder.</p>
          <Button onClick={() => handleOpenDialog()} className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto" data-testid="add-product-btn"><Plus className="h-4 w-4 mr-2" />Add Product</Button>
        </div>

        {!isLoading && categories.length === 0 && <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400 text-sm">Please create categories first before adding products.</div>}

        <div className="space-y-2">
          {isLoading ? <div className="text-center py-8 text-white/40">Loading...</div> : products.length === 0 ? (
            <div className="text-center py-12 bg-card border border-white/10 rounded-lg"><Image className="h-12 w-12 mx-auto text-white/20 mb-4" /><p className="text-white/40">No products yet</p></div>
          ) : products.map((product, index) => (
            <div key={product.id} className="bg-card border border-white/10 rounded-lg p-4 flex items-center gap-4" data-testid={`product-row-${product.id}`}>
              <div className="flex flex-col gap-1">
                <button onClick={() => handleMoveProduct(index, 'up')} disabled={index === 0} className="p-1 text-white/40 hover:text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => handleMoveProduct(index, 'down')} disabled={index === products.length - 1} className="p-1 text-white/40 hover:text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown className="h-4 w-4" /></button>
              </div>
              <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><h3 className="text-white font-medium truncate">{product.name}</h3>{product.tags?.map(tag => <Badge key={tag} variant="outline" className="text-[10px] border-gold-500/50 text-gold-500">{tag}</Badge>)}</div>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  <span className="text-white/60">{getCategoryName(product.category_id)}</span><span className="text-white/40">•</span><span className="text-white/40">{product.variations?.length || 0} variations</span>
                  {product.is_sold_out ? <span className="text-red-400 text-xs">Sold Out</span> : product.is_active ? <span className="text-green-400 text-xs">Active</span> : <span className="text-yellow-400 text-xs">Inactive</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(product)} className="text-white/60 hover:text-gold-500 p-2"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="text-white/60 hover:text-red-500 p-2"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto sm:mx-auto">
            <DialogHeader><DialogTitle className="font-heading text-xl uppercase">{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
              <div className="space-y-2">
                <Label>Product Image URL</Label>
                <Input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="bg-black border-white/20 flex-1" placeholder="https://example.com/image.png" />
                {formData.image_url && <div className="mt-2 flex items-center gap-3"><img src={formData.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-lg" onError={(e) => e.target.style.display = 'none'} /><span className="text-white/40 text-xs">Image preview</span></div>}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Product Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-black border-white/20" placeholder="e.g. Netflix Premium" required /></div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category_id || undefined} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger className="bg-black border-white/20"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Custom URL Slug</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} className="bg-black border-white/20" placeholder="e.g. netflix-premium-1-month" />
                  <p className="text-white/40 text-xs">URL: /product/{formData.slug || '(auto-generated)'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input type="number" value={formData.stock_quantity ?? ''} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value === '' ? null : parseInt(e.target.value) })} className="bg-black border-white/20" placeholder="Leave empty for unlimited" min="0" />
                  <p className="text-white/40 text-xs">Shows "Only X left!" when stock ≤ 5</p>
                </div>
              </div>
              
              {/* Flash Sale Section */}
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-3">
                <Label className="text-red-400 font-semibold flex items-center gap-2">⚡ Flash Sale Settings</Label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Flash Sale Ends At</Label>
                    <Input type="datetime-local" value={formData.flash_sale_end ? formData.flash_sale_end.slice(0, 16) : ''} onChange={(e) => setFormData({ ...formData, flash_sale_end: e.target.value ? new Date(e.target.value).toISOString() : '' })} className="bg-black border-white/20" />
                    <p className="text-white/40 text-xs">Leave empty to disable flash sale</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Flash Sale Label</Label>
                    <Input value={formData.flash_sale_label} onChange={(e) => setFormData({ ...formData, flash_sale_label: e.target.value })} className="bg-black border-white/20" placeholder="e.g. FLASH SALE - 50% OFF" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">{AVAILABLE_TAGS.map(tag => <button key={tag} type="button" onClick={() => handleToggleTag(tag)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${formData.tags.includes(tag) ? 'bg-gold-500 text-black' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{tag}</button>)}</div>
              </div>

              <div className="space-y-2"><Label>Description (HTML supported)</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-black border-white/20 min-h-[100px]" placeholder="<p>Product description...</p>" /></div>

              <div className="space-y-3">
                <Label>Pricing Variations</Label>
                {formData.variations.length > 0 && (
                  <div className="space-y-2">
                    {formData.variations.map((v, index) => (
                      <div key={v.id} className="flex items-center gap-2 bg-black p-2 rounded-lg text-sm">
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button type="button" onClick={() => handleMoveVariation(index, 'up')} disabled={index === 0} className="p-0.5 text-white/40 hover:text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp className="h-3 w-3" /></button>
                          <button type="button" onClick={() => handleMoveVariation(index, 'down')} disabled={index === formData.variations.length - 1} className="p-0.5 text-white/40 hover:text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown className="h-3 w-3" /></button>
                        </div>
                        
                        {editingVariationId === v.id ? (
                          /* Edit mode */
                          <>
                            <Input value={editingVariationData.name} onChange={(e) => setEditingVariationData({ ...editingVariationData, name: e.target.value })} placeholder="Name" className="bg-black/50 border-gold-500/50 h-8 text-sm flex-1" />
                            <Input type="number" value={editingVariationData.price} onChange={(e) => setEditingVariationData({ ...editingVariationData, price: e.target.value })} placeholder="Price" className="bg-black/50 border-gold-500/50 h-8 text-sm w-20" />
                            <Input type="number" value={editingVariationData.original_price} onChange={(e) => setEditingVariationData({ ...editingVariationData, original_price: e.target.value })} placeholder="Orig." className="bg-black/50 border-gold-500/50 h-8 text-sm w-20 hidden sm:block" />
                            <Input type="number" value={editingVariationData.cost_price} onChange={(e) => setEditingVariationData({ ...editingVariationData, cost_price: e.target.value })} placeholder="Cost" className="bg-black/50 border-green-500/50 h-8 text-sm w-20 hidden sm:block" title="Cost Price (Admin Only)" />
                            <Input type="number" value={editingVariationData.stock} onChange={(e) => setEditingVariationData({ ...editingVariationData, stock: e.target.value })} placeholder="Stock" className="bg-black/50 border-blue-500/50 h-8 text-sm w-16 hidden sm:block" title="Stock (0 = Unlimited)" min="0" />
                            <Button type="button" variant="ghost" size="sm" onClick={handleSaveVariation} className="text-green-400 hover:text-green-300 p-1"><Check className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="sm" onClick={handleCancelEditVariation} className="text-white/40 hover:text-white p-1"><X className="h-4 w-4" /></Button>
                          </>
                        ) : (
                          /* View mode */
                          <>
                            <span className="flex-1 text-white truncate">{v.name}</span>
                            <span className="text-gold-500">Rs {v.price}</span>
                            {v.original_price && <span className="text-white/40 line-through hidden sm:inline">Rs {v.original_price}</span>}
                            {v.cost_price && <span className="text-green-400 hidden sm:inline text-xs">(Cost: Rs {v.cost_price})</span>}
                            <span className={`text-xs hidden sm:inline px-1.5 py-0.5 rounded ${v.stock === 0 ? 'bg-blue-500/20 text-blue-400' : v.stock <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                              {v.stock === 0 ? '∞' : v.stock} {v.stock !== 0 && 'left'}
                            </span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleEditVariation(v)} className="text-white/40 hover:text-gold-500 p-1"><Pencil className="h-3 w-3" /></Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveVariation(v.id)} className="text-red-400 hover:text-red-300 p-1"><X className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
                  <Input value={newVariation.name} onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })} placeholder="Plan name" className="bg-black border-white/20 col-span-2 lg:col-span-1" />
                  <Input type="number" value={newVariation.price} onChange={(e) => setNewVariation({ ...newVariation, price: e.target.value })} placeholder="Price" className="bg-black border-white/20" />
                  <Input type="number" value={newVariation.original_price} onChange={(e) => setNewVariation({ ...newVariation, original_price: e.target.value })} placeholder="Original" className="bg-black border-white/20 hidden lg:block" />
                  <Input type="number" value={newVariation.cost_price} onChange={(e) => setNewVariation({ ...newVariation, cost_price: e.target.value })} placeholder="Cost Price" className="bg-black border-green-500/30 hidden lg:block" title="Cost Price (Admin Only - for profit calculation)" />
                  <Input type="number" value={newVariation.stock} onChange={(e) => setNewVariation({ ...newVariation, stock: e.target.value })} placeholder="Stock (0=∞)" className="bg-black border-blue-500/30 hidden lg:block" title="Stock quantity (0 = Unlimited)" min="0" />
                  <Button type="button" onClick={handleAddVariation} variant="outline" className="border-gold-500 text-gold-500 col-span-2 lg:col-span-1">Add</Button>
                </div>
                <p className="text-white/40 text-xs">Stock: Set to 0 for unlimited quantity</p>
              </div>

              <div className="space-y-3">
                <Label>Custom Order Form Fields</Label>
                <p className="text-white/40 text-xs">Add custom fields that customers fill when ordering (e.g., User ID, Server ID)</p>
                {formData.custom_fields.length > 0 && <div className="space-y-2">{formData.custom_fields.map((f) => <div key={f.id} className="flex items-center gap-2 bg-black p-2 rounded-lg text-sm"><span className="flex-1 text-white truncate">{f.label}</span>{f.required && <span className="text-gold-500 text-xs">Required</span>}<span className="text-white/40 text-xs hidden sm:inline">{f.placeholder || 'No placeholder'}</span><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveCustomField(f.id)} className="text-red-400 hover:text-red-300 p-1"><X className="h-4 w-4" /></Button></div>)}</div>}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                  <Input value={newCustomField.label} onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })} placeholder="Field label (e.g., User ID)" className="bg-black border-white/20 lg:col-span-1" />
                  <Input value={newCustomField.placeholder} onChange={(e) => setNewCustomField({ ...newCustomField, placeholder: e.target.value })} placeholder="Placeholder text" className="bg-black border-white/20 lg:col-span-1" />
                  <div className="flex items-center gap-2"><Switch checked={newCustomField.required} onCheckedChange={(checked) => setNewCustomField({ ...newCustomField, required: checked })} /><span className="text-white/60 text-xs">Required</span></div>
                  <Button type="button" onClick={handleAddCustomField} variant="outline" className="border-gold-500 text-gold-500">Add Field</Button>
                </div>
              </div>

              {/* WhatsApp Only Section */}
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 space-y-4">
                <Label className="text-green-400 font-semibold flex items-center gap-2">💬 WhatsApp Contact Option</Label>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.whatsapp_only} 
                    onCheckedChange={(checked) => setFormData({ ...formData, whatsapp_only: checked })} 
                  />
                  <Label className="text-sm">Show "Message on WhatsApp" instead of order buttons</Label>
                </div>
                {formData.whatsapp_only && (
                  <div className="space-y-2">
                    <Label className="text-sm">Custom WhatsApp Message (Optional)</Label>
                    <Textarea
                      value={formData.whatsapp_message}
                      onChange={(e) => setFormData({ ...formData, whatsapp_message: e.target.value })}
                      className="bg-black border-white/20"
                      placeholder="Hi, I'm interested in {product_name}. Can you provide more details?"
                      rows={3}
                    />
                    <p className="text-xs text-white/40">Use {'{'}product_name{'}'} as placeholder. Leave empty for default message.</p>
                  </div>
                )}
              </div>

              {/* Discord Webhook Section - Collapsible */}
              <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setWebhookExpanded(!webhookExpanded)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#5865F2]/5 transition-colors"
                >
                  <Label className="text-[#5865F2] font-semibold flex items-center gap-2 cursor-pointer">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Discord Webhooks
                  </Label>
                  <div className="flex items-center gap-2">
                    {formData.discord_webhooks?.length > 0 ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {formData.discord_webhooks.length} Active
                      </Badge>
                    ) : (
                      <Badge className="bg-white/10 text-white/50 border-white/20">Not Set</Badge>
                    )}
                    {webhookExpanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
                  </div>
                </button>

                {webhookExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={newWebhook}
                        onChange={(e) => setNewWebhook(e.target.value)}
                        className="bg-black border-white/20 flex-1 text-sm"
                        placeholder="https://discord.com/api/webhooks/..."
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (newWebhook.trim() && newWebhook.includes('discord.com/api/webhooks/')) {
                            setFormData({ ...formData, discord_webhooks: [...formData.discord_webhooks, newWebhook.trim()] });
                            setNewWebhook('');
                            toast.success('Webhook added');
                          } else {
                            toast.error('Please enter a valid Discord webhook URL');
                          }
                        }}
                        className="bg-[#5865F2] hover:bg-[#4752C4]"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {formData.discord_webhooks?.length > 0 && (
                      <div className="space-y-2">
                        {formData.discord_webhooks.map((webhook, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-black/40 p-2.5 rounded-lg border border-[#5865F2]/20">
                            <CheckCircle className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                            <span className="text-xs text-white/70 flex-1 truncate font-mono">
                              ...{webhook.split('/').slice(-2).join('/')}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('admin_token');
                                  const res = await axios.post(`${API_URL}/webhooks/test`, { webhook_url: webhook }, { headers: { Authorization: `Bearer ${token}` }});
                                  if (res.data.success) {
                                    toast.success('Test message sent to Discord!');
                                  } else {
                                    toast.error(res.data.message || 'Test failed');
                                  }
                                } catch (err) {
                                  toast.error('Failed to test webhook');
                                }
                              }}
                              className="h-7 px-2 text-[#5865F2] hover:text-white hover:bg-[#5865F2]/20"
                            >
                              <Send className="h-3 w-3 mr-1" />Test
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const updated = formData.discord_webhooks.filter((_, i) => i !== idx);
                                setFormData({ ...formData, discord_webhooks: updated });
                                toast.success('Webhook removed');
                              }}
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /><Label className="text-sm">Active</Label></div>
                <div className="flex items-center gap-2"><Switch checked={formData.is_sold_out} onCheckedChange={(checked) => setFormData({ ...formData, is_sold_out: checked })} /><Label className="text-sm">Sold Out</Label></div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto">{editingProduct ? 'Update' : 'Create'} Product</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
