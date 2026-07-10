'use client';
import { useEffect, useState } from 'react';
import { Save, Bell, Clock } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { notificationBarAPI } from '@/lib/api';

export default function AdminNotificationBar() {
  const [notification, setNotification] = useState({ text: '', link: '', is_active: true, bg_color: '#F5A623', text_color: '#000000' });
  const [openTime, setOpenTime] = useState({ is_active: true, open_from: '10AM', open_to: '10PM' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await notificationBarAPI.get();
        if (res.data) setNotification(res.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    fetch('/api/open-time')
      .then(r => r.json())
      .then(d => { if (d) setOpenTime(d); })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await notificationBarAPI.update(notification);
      toast.success('Notification bar saved!');
    } catch (error) {
      toast.error('Error saving notification bar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOpenTime = async () => {
    setIsSavingTime(true);
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
      await fetch('/api/open-time', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(openTime)
      });
      toast.success('Open time saved!');
    } catch {
      toast.error('Error saving open time');
    } finally {
      setIsSavingTime(false);
    }
  };

  return (
    <AdminLayout title="Notification Bar">
      <div className="space-y-6" data-testid="admin-notification-bar">
        <p className="text-white/60 text-sm">Configure the notification bar and open time displayed on the website</p>

        {isLoading ? <div className="h-64 skeleton rounded-lg"></div> : (
          <div className="bg-card border border-white/10 rounded-lg p-6 space-y-6">

            {/* Notification Bar Section */}
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gold-500" />
              <h2 className="font-heading text-lg font-semibold text-white uppercase">Notification Bar</h2>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={notification.is_active} onCheckedChange={(checked) => setNotification({ ...notification, is_active: checked })} />
              <Label>Show Notification Bar</Label>
            </div>

            <div className="space-y-2">
              <Label>Message Text</Label>
              <Input value={notification.text} onChange={(e) => setNotification({ ...notification, text: e.target.value })} className="bg-black border-white/20" placeholder="e.g. 🎉 Special Offer! 20% off all products" />
            </div>

            <div className="space-y-2">
              <Label>Link URL (optional)</Label>
              <Input value={notification.link || ''} onChange={(e) => setNotification({ ...notification, link: e.target.value })} className="bg-black border-white/20" placeholder="https://..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={notification.bg_color || '#F5A623'} onChange={(e) => setNotification({ ...notification, bg_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={notification.bg_color || '#F5A623'} onChange={(e) => setNotification({ ...notification, bg_color: e.target.value })} className="bg-black border-white/20 flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={notification.text_color || '#000000'} onChange={(e) => setNotification({ ...notification, text_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={notification.text_color || '#000000'} onChange={(e) => setNotification({ ...notification, text_color: e.target.value })} className="bg-black border-white/20 flex-1" />
                </div>
              </div>
            </div>

            {notification.text && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="py-2 px-4 text-center text-sm font-medium rounded" style={{ backgroundColor: notification.bg_color, color: notification.text_color }}>
                  {notification.text}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />{isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 pt-6 space-y-6">

              {/* Open Time Section */}
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-green-400" />
                <h2 className="font-heading text-lg font-semibold text-white uppercase">Open Time</h2>
              </div>

              <p className="text-white/40 text-sm">Shown on the homepage trust bar — e.g. "Open today From 10AM to 10PM"</p>

              <div className="flex items-center gap-2">
                <Switch checked={openTime.is_active} onCheckedChange={(checked) => setOpenTime({ ...openTime, is_active: checked })} />
                <Label>Show Open Time on Homepage</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Open From</Label>
                  <Input value={openTime.open_from} onChange={(e) => setOpenTime({ ...openTime, open_from: e.target.value })} className="bg-black border-white/20" placeholder="e.g. 10AM" />
                </div>
                <div className="space-y-2">
                  <Label>Open To</Label>
                  <Input value={openTime.open_to} onChange={(e) => setOpenTime({ ...openTime, open_to: e.target.value })} className="bg-black border-white/20" placeholder="e.g. 10PM" />
                </div>
              </div>

              {openTime.is_active && (
                <div className="bg-white/5 rounded-lg px-4 py-3 text-sm text-white/60">
                  Preview: <span className="text-green-400 font-semibold">🟢 Open today</span> From <strong className="text-white">{openTime.open_from}</strong> to <strong className="text-white">{openTime.open_to}</strong>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveOpenTime} disabled={isSavingTime} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />{isSavingTime ? 'Saving...' : 'Save Open Time'}
                </Button>
              </div>

            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
