import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Facebook, Instagram, MessageCircle, Globe } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { socialLinksAPI } from '@/lib/api';

const platforms = ['Facebook', 'Instagram', 'WhatsApp', 'TikTok', 'Discord', 'Twitter', 'YouTube', 'Telegram', 'Other'];
const emptyLink = { platform: '', url: '', icon: '' };

const getIcon = (platform) => {
  const p = platform?.toLowerCase();
  if (p?.includes('facebook')) return <Facebook className="h-5 w-5" />;
  if (p?.includes('instagram')) return <Instagram className="h-5 w-5" />;
  if (p?.includes('whatsapp')) return <MessageCircle className="h-5 w-5" />;
  return <Globe className="h-5 w-5" />;
};

export default function AdminSocialLinks() {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [formData, setFormData] = useState(emptyLink);

  const fetchLinks = async () => {
    try { const res = await socialLinksAPI.getAll(); setLinks(Array.isArray(res.data) ? res.data : []); } catch (error) { console.error('Error:', error); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchLinks(); }, []);

  const handleOpenDialog = (link = null) => {
    if (link) { setEditingLink(link); setFormData({ platform: link.platform, url: link.url, icon: link.icon || '' }); }
    else { setEditingLink(null); setFormData(emptyLink); }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.platform || !formData.url) { toast.error('Platform and URL are required'); return; }
    try {
      if (editingLink) { await socialLinksAPI.update(editingLink.id, formData); toast.success('Link updated!'); }
      else { await socialLinksAPI.create(formData); toast.success('Link created!'); }
      setIsDialogOpen(false);
      fetchLinks();
    } catch (error) { toast.error(error.response?.data?.detail || 'Error saving link'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try { await socialLinksAPI.delete(id); toast.success('Link deleted!'); fetchLinks(); } catch (error) { toast.error('Error deleting link'); }
  };

  return (
    <AdminLayout title="Social Links">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-social-links">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-white/60 text-sm lg:text-base">Manage social media links displayed in the footer</p>
          <Button onClick={() => handleOpenDialog()} className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto" data-testid="add-social-link-btn"><Plus className="h-4 w-4 mr-2" />Add Link</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {isLoading ? [1, 2, 3].map((i) => <div key={i} className="h-20 skeleton rounded-lg"></div>) : links.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-card border border-white/10 rounded-lg"><Globe className="h-12 w-12 mx-auto text-white/20 mb-4" /><p className="text-white/40">No social links yet</p></div>
          ) : links.map((link) => (
            <div key={link.id} className="bg-card border border-white/10 rounded-lg p-4 hover:border-gold-500/30 transition-all" data-testid={`social-link-${link.id}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-500/10 text-gold-500 rounded-lg">{getIcon(link.platform)}</div>
                <div className="flex-1 min-w-0"><h3 className="font-heading font-semibold text-white">{link.platform}</h3><p className="text-white/40 text-xs truncate">{link.url}</p></div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(link)} className="text-white/60 hover:text-gold-500 p-2"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(link.id)} className="text-white/60 hover:text-red-500 p-2"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-md sm:mx-auto">
            <DialogHeader><DialogTitle className="font-heading text-xl uppercase">{editingLink ? 'Edit Link' : 'Add Link'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={formData.platform || undefined} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                  <SelectTrigger className="bg-black border-white/20"><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>{platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>URL</Label><Input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="bg-black border-white/20" placeholder="https://..." required data-testid="social-link-url-input" /></div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto" data-testid="save-social-link-btn">{editingLink ? 'Update' : 'Create'} Link</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
