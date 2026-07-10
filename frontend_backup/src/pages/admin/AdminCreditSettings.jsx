import { useEffect, useState } from 'react';
import { Coins, Save, Percent, Tag, Package } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { creditsAPI, categoriesAPI, productsAPI } from '@/lib/api';

export default function AdminCreditSettings() {
  const [settings, setSettings] = useState({
    cashback_percentage: 5,
    is_enabled: true,
    eligible_categories: [],
    eligible_products: [],
    min_order_amount: 0,
    usable_categories: [],
    usable_products: [],
    max_credit_per_order: 0,
    max_credit_percentage: 0,
    free_customer_credit_cap: 0
  });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, categoriesRes, productsRes] = await Promise.all([
          creditsAPI.getSettings(),
          categoriesAPI.getAll(),
          productsAPI.getAll(null, false)
        ]);
        setSettings(settingsRes.data);
        setCategories(categoriesRes.data || []);
        setProducts(productsRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await creditsAPI.updateSettings(settings);
      toast.success('Credit settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (categoryId, field) => {
    const currentList = settings[field] || [];
    const newList = currentList.includes(categoryId)
      ? currentList.filter(id => id !== categoryId)
      : [...currentList, categoryId];
    setSettings({ ...settings, [field]: newList });
  };

  const toggleProduct = (productId, field) => {
    const currentList = settings[field] || [];
    const newList = currentList.includes(productId)
      ? currentList.filter(id => id !== productId)
      : [...currentList, productId];
    setSettings({ ...settings, [field]: newList });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Credit Settings">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Credit Settings">
      <div className="space-y-6" data-testid="admin-credit-settings">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Coins className="h-6 w-6 text-amber-500" /> Store Credit Settings
            </h1>
            <p className="text-white/60 text-sm mt-1">Configure cashback and credit system</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gold-500 hover:bg-gold-600 text-black"
            data-testid="save-credit-settings-btn"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {/* Main Settings */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Enable Credit System</Label>
                <p className="text-white/40 text-sm">Allow customers to earn and use store credits</p>
              </div>
              <Switch
                checked={settings.is_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
                data-testid="credit-enabled-switch"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <Percent className="h-4 w-4" /> Cashback Percentage
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settings.cashback_percentage}
                  onChange={(e) => setSettings({ ...settings, cashback_percentage: parseFloat(e.target.value) || 0 })}
                  className="bg-black border-white/20"
                  data-testid="cashback-percentage-input"
                />
                <p className="text-white/40 text-xs">Customers earn this % back as credits on purchases</p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Minimum Order Amount (Rs)</Label>
                <Input
                  type="number"
                  min="0"
                  value={settings.min_order_amount}
                  onChange={(e) => setSettings({ ...settings, min_order_amount: parseFloat(e.target.value) || 0 })}
                  className="bg-black border-white/20"
                  data-testid="min-order-amount-input"
                />
                <p className="text-white/40 text-xs">Minimum order value to earn credits</p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Max Credit Per Order (Rs)</Label>
                <Input
                  type="number"
                  min="0"
                  value={settings.max_credit_per_order || 0}
                  onChange={(e) => setSettings({ ...settings, max_credit_per_order: parseFloat(e.target.value) || 0 })}
                  className="bg-black border-white/20"
                  data-testid="max-credit-per-order-input"
                />
                <p className="text-white/40 text-xs">Max credits usable per order (0 = unlimited)</p>
              </div>

              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <Percent className="h-4 w-4 text-amber-500" /> Max Credit % of Order
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.max_credit_percentage || 0}
                  onChange={(e) => setSettings({ ...settings, max_credit_percentage: parseFloat(e.target.value) || 0 })}
                  className="bg-black border-white/20"
                  data-testid="max-credit-percentage-input"
                />
                <p className="text-white/40 text-xs">Max % of order total payable via credits (0 = no limit)</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-white">Free Customer Credit Cap (Rs)</Label>
              <Input
                type="number"
                min="0"
                value={settings.free_customer_credit_cap || 0}
                onChange={(e) => setSettings({ ...settings, free_customer_credit_cap: parseFloat(e.target.value) || 0 })}
                className="bg-black border-white/20 max-w-xs"
                data-testid="free-customer-credit-cap-input"
              />
              <p className="text-white/40 text-xs">Max credits a customer who hasn't ordered yet can accumulate via daily rewards (0 = no limit)</p>
            </div>
          </CardContent>
        </Card>

        {/* Earn Credits - Categories */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Tag className="h-5 w-5 text-green-500" /> Earn Credits - Eligible Categories
            </CardTitle>
            <p className="text-white/40 text-sm">Select which categories earn cashback (empty = all)</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id, 'eligible_categories')}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    settings.eligible_categories?.includes(cat.id)
                      ? 'bg-green-500 text-black'
                      : 'bg-zinc-800 text-white/60 hover:bg-zinc-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-white/40">No categories found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Use Credits - Categories */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" /> Use Credits - Eligible Categories
            </CardTitle>
            <p className="text-white/40 text-sm">Select where credits can be used (empty = all)</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id, 'usable_categories')}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    settings.usable_categories?.includes(cat.id)
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-800 text-white/60 hover:bg-zinc-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-white/40">No categories found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-6">
            <h3 className="text-amber-500 font-semibold mb-2">How Credits Work</h3>
            <ul className="text-white/60 text-sm space-y-1">
              <li>• Customers earn {settings.cashback_percentage}% cashback as credits when order is completed</li>
              <li>• Credits are awarded after admin marks order as "Completed"</li>
              <li>• Credits are only earned from products in eligible categories (if specified)</li>
              <li>• Credits can only be used on products in usable categories (if specified)</li>
              <li>• {settings.max_credit_per_order > 0 ? `Maximum ${settings.max_credit_per_order} credits can be used per order` : 'No limit on credits per order'}</li>
              <li>• {settings.max_credit_percentage > 0 ? `Credits can cover up to ${settings.max_credit_percentage}% of order total` : 'No percentage limit on credit usage'}</li>
              <li>• {settings.free_customer_credit_cap > 0 ? `Customers who haven't ordered are capped at Rs ${settings.free_customer_credit_cap} from daily rewards` : 'No cap on daily reward credits for free customers'}</li>
              <li>• Empty category selection means all categories are eligible</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
