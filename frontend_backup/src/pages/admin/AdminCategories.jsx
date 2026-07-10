import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { categoriesAPI } from '@/lib/api';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleOpenDialog = (category = null) => {
    if (category) { setEditingCategory(category); setCategoryName(category.name); }
    else { setEditingCategory(null); setCategoryName(''); }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) { toast.error('Category name is required'); return; }
    try {
      if (editingCategory) { await categoriesAPI.update(editingCategory.id, { name: categoryName }); toast.success('Category updated!'); }
      else { await categoriesAPI.create({ name: categoryName }); toast.success('Category created!'); }
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error) { toast.error(error.response?.data?.detail || 'Error saving category'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try { await categoriesAPI.delete(id); toast.success('Category deleted!'); fetchCategories(); } catch (error) { toast.error('Error deleting category'); }
  };

  return (
    <AdminLayout title="Categories">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-categories">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-white/60 text-sm lg:text-base">Manage product categories</p>
          <Button onClick={() => handleOpenDialog()} className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto" data-testid="add-category-btn"><Plus className="h-4 w-4 mr-2" />Add Category</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {isLoading ? [1, 2, 3].map((i) => <div key={i} className="h-20 skeleton rounded-lg"></div>) : categories.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-card border border-white/10 rounded-lg">
              <p className="text-white/40 mb-4">No categories yet</p>
              <Button onClick={() => handleOpenDialog()} variant="outline" className="border-gold-500 text-gold-500"><Plus className="h-4 w-4 mr-2" />Create Your First Category</Button>
            </div>
          ) : categories.map((category) => (
            <div key={category.id} className="bg-card border border-white/10 rounded-lg p-4 hover:border-gold-500/30 transition-all flex items-center justify-between" data-testid={`category-card-${category.id}`}>
              <div><h3 className="font-heading font-semibold text-white text-lg">{category.name}</h3><p className="text-white/40 text-xs">slug: {category.slug}</p></div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(category)} className="text-white/60 hover:text-gold-500 p-2" data-testid={`edit-category-${category.id}`}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)} className="text-white/60 hover:text-red-500 p-2" data-testid={`delete-category-${category.id}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-md sm:mx-auto">
            <DialogHeader><DialogTitle className="font-heading text-xl uppercase">{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
              <div className="space-y-2"><Label>Category Name</Label><Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="bg-black border-white/20" placeholder="e.g. Gaming, OTT Subscriptions, Software" required data-testid="category-name-input" /></div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto" data-testid="save-category-btn">{editingCategory ? 'Update' : 'Create'} Category</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
