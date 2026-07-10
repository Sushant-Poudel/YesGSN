import { useEffect, useState } from 'react';
import { Save, Settings, Percent, DollarSign } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { settingsAPI } from '@/lib/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    service_charge: 0,
    tax_percentage: 0,
    tax_label: 'Tax'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsAPI.get();
        setSettings({
          service_charge: res.data.service_charge || 0,
          tax_percentage: res.data.tax_percentage || 0,
          tax_label: res.data.tax_label || 'Tax'
        });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.update({
        service_charge: parseFloat(settings.service_charge) || 0,
        tax_percentage: parseFloat(settings.tax_percentage) || 0,
        tax_label: settings.tax_label
      });
      toast.success('Settings saved!');
    } catch (error) {
      toast.error('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Preview calculation
  const previewSubtotal = 500;
  const previewServiceCharge = parseFloat(settings.service_charge) || 0;
  const previewTax = previewSubtotal * ((parseFloat(settings.tax_percentage) || 0) / 100);
  const previewTotal = previewSubtotal + previewServiceCharge + previewTax;

  return (
    <AdminLayout title="Pricing Settings">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-settings">
        <p className="text-white/60 text-sm lg:text-base">Configure service charge and tax settings for orders</p>

        {isLoading ? (
          <div className="h-64 skeleton rounded-lg"></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Form */}
            <div className="bg-card border border-white/10 rounded-lg p-4 lg:p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-gold-500" />
                <h2 className="font-heading text-lg font-semibold text-white uppercase">Order Pricing</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gold-500" />
                    Service Charge (Fixed Amount)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">Rs</span>
                    <Input
                      type="number"
                      value={settings.service_charge}
                      onChange={(e) => setSettings({ ...settings, service_charge: e.target.value })}
                      className="bg-black border-white/20 pl-10"
                      placeholder="0"
                      data-testid="service-charge-input"
                    />
                  </div>
                  <p className="text-white/40 text-xs">Fixed amount added to every order</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-gold-500" />
                    Tax Percentage
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={settings.tax_percentage}
                      onChange={(e) => setSettings({ ...settings, tax_percentage: e.target.value })}
                      className="bg-black border-white/20 pr-10"
                      placeholder="0"
                      step="0.1"
                      data-testid="tax-percentage-input"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">%</span>
                  </div>
                  <p className="text-white/40 text-xs">Percentage of subtotal added as tax</p>
                </div>

                <div className="space-y-2">
                  <Label>Tax Label</Label>
                  <Input
                    value={settings.tax_label}
                    onChange={(e) => setSettings({ ...settings, tax_label: e.target.value })}
                    className="bg-black border-white/20"
                    placeholder="Tax"
                    data-testid="tax-label-input"
                  />
                  <p className="text-white/40 text-xs">Label shown on invoice (e.g., "VAT", "GST", "Tax")</p>
                </div>
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full bg-gold-500 hover:bg-gold-600 text-black">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>

            {/* Preview */}
            <div className="bg-card border border-white/10 rounded-lg p-4 lg:p-6">
              <h3 className="font-heading text-lg font-semibold text-white uppercase mb-4">Preview</h3>
              <p className="text-white/40 text-sm mb-4">How pricing will appear on orders (example with Rs 500 subtotal)</p>
              
              <div className="bg-black/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Subtotal</span>
                  <span className="text-white font-medium">Rs {previewSubtotal.toFixed(2)}</span>
                </div>
                
                {previewServiceCharge > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Service Charge</span>
                    <span className="text-white font-medium">Rs {previewServiceCharge.toFixed(2)}</span>
                  </div>
                )}
                
                {parseFloat(settings.tax_percentage) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{settings.tax_label || 'Tax'} ({settings.tax_percentage}%)</span>
                    <span className="text-white font-medium">Rs {previewTax.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-gold-500 font-bold text-lg">Rs {previewTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
