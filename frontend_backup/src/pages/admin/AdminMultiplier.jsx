import { useEffect, useState } from 'react';
import { Zap, Save, Plus, Trash2, Calendar, Clock, Edit2, X } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const APPLIES_TO_OPTIONS = [
  { id: 'daily_reward', label: 'Daily Rewards' },
  { id: 'cashback', label: 'Order Cashback' },
  { id: 'referral', label: 'Referral Bonuses' }
];

export default function AdminMultiplier() {
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    multiplier: 2,
    start_time: '',
    end_time: '',
    applies_to: ['daily_reward', 'cashback', 'referral'],
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const [eventsRes, activeRes] = await Promise.all([
        axios.get(`${API}/multiplier/events`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/multiplier/active`)
      ]);
      setEvents(eventsRes.data || []);
      setActiveEvent(activeRes.data?.is_active ? activeRes.data : null);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        multiplier: event.multiplier,
        start_time: event.start_time.slice(0, 16),
        end_time: event.end_time.slice(0, 16),
        applies_to: event.applies_to || ['daily_reward', 'cashback', 'referral'],
        is_active: event.is_active
      });
    } else {
      setEditingEvent(null);
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setFormData({
        name: '',
        multiplier: 2,
        start_time: now.toISOString().slice(0, 16),
        end_time: nextWeek.toISOString().slice(0, 16),
        applies_to: ['daily_reward', 'cashback', 'referral'],
        is_active: true
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.start_time || !formData.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.multiplier < 1) {
      toast.error('Multiplier must be at least 1');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const payload = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString()
      };

      if (editingEvent) {
        await axios.put(`${API}/multiplier/events/${editingEvent.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Event updated!');
      } else {
        await axios.post(`${API}/multiplier/events`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Event created!');
      }

      setShowDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save event');
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      await axios.delete(`${API}/multiplier/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Event deleted!');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const toggleAppliesTo = (id) => {
    const current = formData.applies_to || [];
    if (current.includes(id)) {
      setFormData({ ...formData, applies_to: current.filter(x => x !== id) });
    } else {
      setFormData({ ...formData, applies_to: [...current, id] });
    }
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    if (!event.is_active) return { label: 'Disabled', color: 'bg-gray-500' };
    if (now < start) return { label: 'Scheduled', color: 'bg-blue-500' };
    if (now > end) return { label: 'Ended', color: 'bg-gray-500' };
    return { label: 'Active', color: 'bg-green-500' };
  };

  if (isLoading) {
    return (
      <AdminLayout title="Multiplier Events">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Multiplier Events">
      <div className="space-y-6" data-testid="admin-multiplier">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500" /> Points Multiplier Events
            </h1>
            <p className="text-white/60 text-sm mt-1">Create special events with bonus credit multipliers</p>
          </div>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-gold-500 hover:bg-gold-600 text-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Active Event Banner */}
        {activeEvent && (
          <Card className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                    <Zap className="h-6 w-6 text-black" />
                  </div>
                  <div>
                    <p className="text-amber-500 font-bold text-lg">{activeEvent.name}</p>
                    <p className="text-white/60 text-sm">Currently Active</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-amber-500">{activeEvent.multiplier}x</p>
                  <p className="text-white/40 text-xs">Multiplier</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold-500" /> All Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40">No multiplier events created yet</p>
                <p className="text-white/30 text-sm mt-1">Create your first event to boost customer engagement!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const status = getEventStatus(event);
                  return (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                          <span className="text-amber-500 font-bold text-lg">{event.multiplier}x</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold">{event.name}</p>
                            <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-white/40 text-xs mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex gap-1 mt-2">
                            {event.applies_to?.map(type => (
                              <Badge key={type} variant="outline" className="text-xs border-white/20 text-white/60">
                                {type.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(event)}
                          className="text-white/60 hover:text-white"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(event.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-6">
            <h3 className="text-amber-500 font-semibold mb-2">How Multiplier Events Work</h3>
            <ul className="text-white/60 text-sm space-y-1">
              <li>• Create events with custom multipliers (e.g., 2x, 3x) for special occasions</li>
              <li>• Set specific start and end times for each event</li>
              <li>• Choose which rewards the multiplier applies to (daily rewards, cashback, referrals)</li>
              <li>• When active, all selected reward types are multiplied</li>
              <li>• Users see the active multiplier on the Daily Rewards page</li>
              <li>• Multiple events can overlap - highest multiplier is used</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              {editingEvent ? 'Edit Event' : 'Create Multiplier Event'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-white">Event Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekend Double Points"
                className="bg-black border-white/20 mt-1"
              />
            </div>

            <div>
              <Label className="text-white">Multiplier *</Label>
              <Input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={formData.multiplier}
                onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 2 })}
                className="bg-black border-white/20 mt-1"
              />
              <p className="text-white/40 text-xs mt-1">All rewards will be multiplied by this value</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="bg-black border-white/20 mt-1"
                />
              </div>
              <div>
                <Label className="text-white">End Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="bg-black border-white/20 mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-white mb-3 block">Applies To</Label>
              <div className="space-y-2">
                {APPLIES_TO_OPTIONS.map(option => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={formData.applies_to?.includes(option.id)}
                      onCheckedChange={() => toggleAppliesTo(option.id)}
                    />
                    <label htmlFor={option.id} className="text-sm text-white/80 cursor-pointer">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <Label className="text-white">Enable Event</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-gold-500 hover:bg-gold-600 text-black"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingEvent ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
