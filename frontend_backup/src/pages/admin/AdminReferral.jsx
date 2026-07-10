import { useEffect, useState } from 'react';
import { Users, Save, Gift, UserPlus, History } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminReferral() {
  const [settings, setSettings] = useState({
    is_enabled: true,
    referrer_reward: 50,
    referee_reward: 25,
    min_purchase_required: false,
    min_purchase_amount: 0
  });
  const [referrals, setReferrals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, referralsRes] = await Promise.all([
        axios.get(`${API}/referral/settings`),
        axios.get(`${API}/referrals/all`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
        }).catch(() => ({ data: [] }))
      ]);
      setSettings(settingsRes.data);
      setReferrals(referralsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      await axios.put(`${API}/referral/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Referral settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Referral Program">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Referral Program">
      <div className="space-y-6" data-testid="admin-referral">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-amber-500" /> Referral Program
            </h1>
            <p className="text-white/60 text-sm mt-1">Configure rewards for referring new customers</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gold-500 hover:bg-gold-600 text-black"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {/* Settings Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-gold-500" /> Referral Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Enable Referral Program</Label>
                <p className="text-white/40 text-sm">Allow customers to earn credits by inviting friends</p>
              </div>
              <Switch
                checked={settings.is_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-green-500" /> Referrer Reward (Rs)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.referrer_reward}
                  onChange={(e) => setSettings({ ...settings, referrer_reward: parseFloat(e.target.value) || 0 })}
                  className="bg-black border-white/20"
                />
                <p className="text-white/40 text-xs">Credits given to the person who refers</p>
              </div>

              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <Gift className="h-4 w-4 text-blue-500" /> New User Reward (Rs)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.referee_reward}
                  onChange={(e) => setSettings({ ...settings, referee_reward: parseFloat(e.target.value) || 0 })}
                  className="bg-black border-white/20"
                />
                <p className="text-white/40 text-xs">Credits given to new user who uses the code</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-white">Require First Purchase</Label>
                  <p className="text-white/40 text-sm">Referrer gets reward only after referee makes a purchase</p>
                </div>
                <Switch
                  checked={settings.min_purchase_required}
                  onCheckedChange={(checked) => setSettings({ ...settings, min_purchase_required: checked })}
                />
              </div>

              {settings.min_purchase_required && (
                <div className="space-y-2">
                  <Label className="text-white">Minimum Purchase Amount (Rs)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={settings.min_purchase_amount}
                    onChange={(e) => setSettings({ ...settings, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                    className="bg-black border-white/20 max-w-xs"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-6">
            <h3 className="text-amber-500 font-semibold mb-2">How Referral Program Works</h3>
            <ul className="text-white/60 text-sm space-y-1">
              <li>• Each customer gets a unique referral code they can share</li>
              <li>• New users enter the code during signup or in their account</li>
              <li>• New user receives Rs {settings.referee_reward} credits immediately</li>
              <li>• Referrer receives Rs {settings.referrer_reward} credits {settings.min_purchase_required ? 'after referee makes first purchase' : 'immediately'}</li>
              <li>• Referral codes can only be used once per new user</li>
              <li>• Active multiplier events will multiply these rewards!</li>
            </ul>
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="h-5 w-5 text-gold-500" /> Recent Referrals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {referrals.slice(0, 10).map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
                    <div>
                      <p className="text-white text-sm">{ref.referee_email}</p>
                      <p className="text-white/40 text-xs">Referred by: {ref.referrer_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-500 text-sm">+Rs {ref.referrer_reward + ref.referee_reward}</p>
                      <p className="text-white/40 text-xs">{new Date(ref.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
