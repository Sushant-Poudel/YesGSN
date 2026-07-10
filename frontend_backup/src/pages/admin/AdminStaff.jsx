import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, User, Lock, Eye, EyeOff } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminStaff() {
  const [staffList, setStaffList] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    permissions: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [staffRes, permsRes] = await Promise.all([
        axios.get(`${API_URL}/admins`, { headers }),
        axios.get(`${API_URL}/permissions`, { headers })
      ]);
      
      setStaffList(staffRes.data.filter(admin => admin.role !== 'main_admin'));
      setPermissions(permsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load staff data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('Username and password are required');
      return;
    }
    
    if (formData.permissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      
      console.log('Creating staff with data:', formData);
      console.log('Token exists:', !!token);
      
      const response = await axios.post(`${API_URL}/admins`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Staff created:', response.data);
      toast.success('Staff member added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating staff:', error.response || error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add staff member';
      toast.error(errorMessage);
    }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      const updateData = {
        name: formData.name,
        email: formData.email,
        permissions: formData.permissions,
        is_active: formData.is_active
      };
      
      // Only include password if it's been changed
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await axios.put(`${API_URL}/admins/${selectedStaff._id || selectedStaff.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Staff member updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update staff member');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      await axios.delete(`${API_URL}/admins/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Staff member deleted successfully!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete staff member');
    }
  };

  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    setFormData({
      username: staff.username,
      password: '',
      name: staff.name || '',
      email: staff.email || '',
      permissions: staff.permissions || [],
      is_active: staff.is_active !== false
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      permissions: []
    });
    setSelectedStaff(null);
    setShowPassword(false);
  };

  const togglePermission = (permId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const groupPermissionsByCategory = () => {
    const grouped = {};
    permissions.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading staff...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white mb-2">Staff Management</h1>
            <p className="text-white/60">Manage staff members and their permissions</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-gold-500 hover:bg-gold-600 text-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>

        {/* Staff List */}
        <div className="grid gap-4">
          {staffList.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
              <User className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 mb-4">No staff members yet</p>
              <Button onClick={() => setShowAddModal(true)} variant="outline">
                Add Your First Staff Member
              </Button>
            </div>
          ) : (
            staffList.map((staff) => (
              <div key={staff._id || staff.id} className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gold-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{staff.name || staff.username}</h3>
                        <p className="text-sm text-white/60">@{staff.username}</p>
                      </div>
                      {!staff.is_active && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                    
                    {staff.email && (
                      <p className="text-sm text-white/60 mb-3">{staff.email}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {staff.permissions && staff.permissions.length > 0 ? (
                        staff.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="bg-gold-500/10 border-gold-500/30 text-gold-500">
                            {permissions.find(p => p.id === perm)?.name || perm}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="bg-white/5">No permissions</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(staff)}
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStaff(staff._id || staff.id)}
                      className="bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Staff Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-2xl bg-black border-white/20 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading text-gold-500">Add Staff Member</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Username *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="staffusername"
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-white">Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Enter password"
                      className="bg-white/5 border-white/10 text-white pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="staff@example.com"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white mb-3 block">Permissions *</Label>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {Object.entries(groupPermissionsByCategory()).map(([category, perms]) => (
                    <div key={category} className="mb-4 last:mb-0">
                      <h4 className="text-sm font-semibold text-gold-500 mb-2">{category}</h4>
                      <div className="space-y-2">
                        {perms.map((perm) => (
                          <div key={perm.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={formData.permissions.includes(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                              className="border-white/20"
                            />
                            <Label htmlFor={`perm-${perm.id}`} className="text-white text-sm cursor-pointer">
                              {perm.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black">
                  <Shield className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-2xl bg-black border-white/20 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading text-gold-500">Edit Staff Member</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleUpdateStaff} className="space-y-4">
              <div>
                <Label className="text-white">Username</Label>
                <Input
                  value={formData.username}
                  disabled
                  className="bg-white/5 border-white/10 text-white/50"
                />
                <p className="text-xs text-white/40 mt-1">Username cannot be changed</p>
              </div>
              
              <div>
                <Label className="text-white">New Password (leave blank to keep current)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Enter new password"
                    className="bg-white/5 border-white/10 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="staff@example.com"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active !== false}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  className="border-white/20"
                />
                <Label htmlFor="is_active" className="text-white cursor-pointer">
                  Account Active
                </Label>
              </div>

              <div>
                <Label className="text-white mb-3 block">Permissions</Label>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {Object.entries(groupPermissionsByCategory()).map(([category, perms]) => (
                    <div key={category} className="mb-4 last:mb-0">
                      <h4 className="text-sm font-semibold text-gold-500 mb-2">{category}</h4>
                      <div className="space-y-2">
                        {perms.map((perm) => (
                          <div key={perm.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`edit-perm-${perm.id}`}
                              checked={formData.permissions.includes(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                              className="border-white/20"
                            />
                            <Label htmlFor={`edit-perm-${perm.id}`} className="text-white text-sm cursor-pointer">
                              {perm.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black">
                  <Shield className="h-4 w-4 mr-2" />
                  Update Staff Member
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
