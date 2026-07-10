import { useEffect, useState } from 'react';
import { Save, FileText } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { pagesAPI } from '@/lib/api';

const pages = [
  { key: 'about', label: 'About Us' },
  { key: 'terms', label: 'Terms & Conditions' },
];

export default function AdminPages() {
  const [pagesData, setPagesData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const data = {};
        for (const page of pages) { const res = await pagesAPI.get(page.key); data[page.key] = res.data; }
        setPagesData(data);
      } catch (error) { console.error('Error:', error); } finally { setIsLoading(false); }
    };
    fetchPages();
  }, []);

  const handleSave = async (pageKey) => {
    setIsSaving(true);
    try {
      const pageData = pagesData[pageKey];
      await pagesAPI.update(pageKey, pageData.title, pageData.content);
      toast.success(`${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)} page saved!`);
    } catch (error) { toast.error('Error saving page'); } finally { setIsSaving(false); }
  };

  const updatePageData = (pageKey, field, value) => { setPagesData({ ...pagesData, [pageKey]: { ...pagesData[pageKey], [field]: value } }); };

  return (
    <AdminLayout title="Pages">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-pages">
        <p className="text-white/60 text-sm lg:text-base">Edit static pages content (HTML supported)</p>

        {isLoading ? <div className="text-center py-8 text-white/40">Loading...</div> : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-6">
            <TabsList className="bg-card border border-white/10 p-1 w-full grid grid-cols-2">{pages.map((page) => <TabsTrigger key={page.key} value={page.key} className="data-[state=active]:bg-gold-500 data-[state=active]:text-black text-xs sm:text-sm">{page.label}</TabsTrigger>)}</TabsList>
            {pages.map((page) => (
              <TabsContent key={page.key} value={page.key} className="bg-card border border-white/10 rounded-lg p-4 lg:p-6 space-y-4 lg:space-y-6">
                <div className="flex items-center gap-3 mb-4"><FileText className="h-5 w-5 text-gold-500" /><h2 className="font-heading text-lg lg:text-xl font-semibold text-white uppercase">{page.label}</h2></div>
                <div className="space-y-2"><Label>Page Title</Label><Input value={pagesData[page.key]?.title || ''} onChange={(e) => updatePageData(page.key, 'title', e.target.value)} className="bg-black border-white/20" /></div>
                <div className="space-y-2"><Label>Content (HTML)</Label><Textarea value={pagesData[page.key]?.content || ''} onChange={(e) => updatePageData(page.key, 'content', e.target.value)} className="bg-black border-white/20 min-h-[200px] lg:min-h-[300px] font-mono text-sm" placeholder="<h2>Section Title</h2><p>Content here...</p>" /></div>
                <div className="flex justify-end"><Button onClick={() => handleSave(page.key)} disabled={isSaving} className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto"><Save className="h-4 w-4 mr-2" />{isSaving ? 'Saving...' : 'Save Changes'}</Button></div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
