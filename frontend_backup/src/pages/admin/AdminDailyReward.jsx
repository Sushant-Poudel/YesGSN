import { useEffect, useState } from 'react';
import { Gift, Save, Flame, Calendar, Coins, Plus, X } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDailyReward() {
  const [settings, setSettings] = useState({
    is_enabled: true,
    reward_amount: 10,
    streak_bonus_enabled: true,
    streak_milestones: { "7": 50, "30": 200 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newMilestoneDay, setNewMilestoneDay] = useState('');
  const [newMilestoneBonus, setNewMilestoneBonus] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/daily-reward/settings`);
        setSettings(res.data);
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      await axios.put(`${API}/daily-reward/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Daily reward settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const addMilestone = () => {
    const day = parseInt(newMilestoneDay);
    const bonus = parseFloat(newMilestoneBonus);
    
    if (!day || day <= 0) {
      toast.error('Please enter a valid day number');
      return;
    }
    if (!bonus || bonus <= 0) {
      toast.error('Please enter a valid bonus amount');
      return;
    }
    
    setSettings({
      ...settings,
      streak_milestones: {
        ...settings.streak_milestones,
        [day.toString()]: bonus
      }
    });
    setNewMilestoneDay('');
    setNewMilestoneBonus('');
    toast.success(`Milestone for day ${day} added!`);
  };

  const removeMilestone = (day) => {
    const newMilestones = { ...settings.streak_milestones };
    delete newMilestones[day];
    setSettings({ ...settings, streak_milestones: newMilestones });
  };

  const getMilestones = () => {
    return Object.entries(settings.streak_milestones || {})
      .map(([day, bonus]) => ({ day: parseInt(day), bonus }))
      .sort((a, b) => a.day - b.day);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Daily Rewards">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Daily Rewards">
      <div className="space-y-6" data-testid="admin-daily-reward">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Gift className="h-6 w-6 text-amber-500" /> Daily Reward Settings
            </h1>
            <p className="text-white/60 text-sm mt-1">Configure daily login rewards and streak bonuses</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gold-500 hover:bg-gold-600 text-black"
            data-testid="save-daily-reward-btn"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {/* Main Settings */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold-500" /> General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Enable Daily Rewards</Label>
                <p className="text-white/40 text-sm">Allow customers to claim daily login rewards</p>
              </div>
              <Switch
                checked={settings.is_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
                data-testid="daily-reward-enabled-switch"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Coins className="h-4 w-4" /> Daily Reward Amount (Rs)
              </Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={settings.reward_amount}
                onChange={(e) => setSettings({ ...settings, reward_amount: parseFloat(e.target.value) || 10 })}
                className="bg-black border-white/20 max-w-xs"
                data-testid="reward-amount-input"
              />
              <p className="text-white/40 text-xs">Credits awarded each day customer logs in and claims</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div>
                <Label className="text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" /> Enable Streak Bonuses
                </Label>
                <p className="text-white/40 text-sm">Award extra credits for consecutive day streaks</p>
              </div>
              <Switch
                checked={settings.streak_bonus_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, streak_bonus_enabled: checked })}
                data-testid="streak-bonus-enabled-switch"
              />
            </div>
          </CardContent>
        </Card>

        {/* Streak Milestones */}
        {settings.streak_bonus_enabled && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" /> Streak Milestones
              </CardTitle>
              <p className="text-white/40 text-sm">Configure bonus credits for reaching streak milestones</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Milestones */}
              <div className="space-y-2">
                {getMilestones().length === 0 ? (
                  <p className="text-white/40 text-center py-4">No milestones configured</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {getMilestones().map(({ day, bonus }) => (
                      <div 
                        key={day}
                        className="bg-black/50 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-white font-semibold">Day {day}</div>
                          <div className="text-gold-500 text-sm">+Rs {bonus} bonus</div>
                        </div>
                        <button
                          onClick={() => removeMilestone(day.toString())}
                          className="p-1 text-white/40 hover:text-red-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Milestone */}
              <div className="pt-4 border-t border-white/10">
                <Label className="text-white mb-3 block">Add New Milestone</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Day (e.g., 14)"
                      value={newMilestoneDay}
                      onChange={(e) => setNewMilestoneDay(e.target.value)}
                      className="bg-black border-white/20"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Bonus Amount (e.g., 100)"
                      value={newMilestoneBonus}
                      onChange={(e) => setNewMilestoneBonus(e.target.value)}
                      className="bg-black border-white/20"
                    />
                  </div>
                  <Button
                    onClick={addMilestone}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-6">
            <h3 className="text-amber-500 font-semibold mb-2">How Daily Rewards Work</h3>
            <ul className="text-white/60 text-sm space-y-1">
              <li>• Logged-in customers can claim Rs {settings.reward_amount} credits once per day</li>
              <li>• Rewards reset at 12:00 AM Nepal Time (UTC+5:45)</li>
              <li>• Claiming on consecutive days builds a streak</li>
              <li>• Missing a day resets the streak back to 0</li>
              <li>• Streak milestones award bonus credits on top of daily reward</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
