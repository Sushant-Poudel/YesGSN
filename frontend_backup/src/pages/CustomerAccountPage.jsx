import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, User, LogOut, ShoppingBag, Calendar, DollarSign, Edit, Save, X, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Coins, FileText, RefreshCw, AlertTriangle, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { creditsAPI } from '@/lib/api';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CustomerAccountPage() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [complaintOrderId, setComplaintOrderId] = useState(null);
  const [complaintForm, setComplaintForm] = useState({ whatsapp: '', email: '', reason: '' });
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintSuccess, setComplaintSuccess] = useState(false);

  const getStatusConfig = (status) => {
    const normalizedStatus = (status || '').toLowerCase();
    const configs = {
      pending: { label: 'Pending', icon: Clock, bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-500', borderColor: 'border-yellow-500/30' },
      confirmed: { label: 'Confirmed', icon: CheckCircle, bgColor: 'bg-blue-500/20', textColor: 'text-blue-500', borderColor: 'border-blue-500/30' },
      completed: { label: 'Completed', icon: CheckCircle, bgColor: 'bg-green-500/20', textColor: 'text-green-500', borderColor: 'border-green-500/30' },
      processing: { label: 'Processing', icon: Clock, bgColor: 'bg-blue-500/20', textColor: 'text-blue-500', borderColor: 'border-blue-500/30' },
      cancelled: { label: 'Cancelled', icon: XCircle, bgColor: 'bg-red-500/20', textColor: 'text-red-500', borderColor: 'border-red-500/30' },
      delivered: { label: 'Delivered', icon: CheckCircle, bgColor: 'bg-green-500/20', textColor: 'text-green-500', borderColor: 'border-green-500/30' },
    };
    return configs[normalizedStatus] || configs.pending;
  };

  const toggleOrderExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleComplaintSubmit = async () => {
    if (!complaintForm.whatsapp.trim()) {
      toast.error('WhatsApp number is required');
      return;
    }
    if (!complaintForm.reason.trim() || complaintForm.reason.trim().split(/\s+/).length < 20) {
      toast.error('Reason must be at least 20 words');
      return;
    }
    setComplaintSubmitting(true);
    try {
      const token = localStorage.getItem('customer_token');
      await axios.post(`${API_URL}/orders/${complaintOrderId}/complaint`, complaintForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComplaintSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit complaint');
    } finally {
      setComplaintSubmitting(false);
    }
  };

  const closeComplaintModal = () => {
    setComplaintOrderId(null);
    setComplaintForm({ whatsapp: '', email: '', reason: '' });
    setComplaintSuccess(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const customerInfo = localStorage.getItem('customer_info');

    if (!token || !customerInfo) {
      navigate('/');
      toast.error('Please login to access your account');
      return;
    }

    try {
      setCustomer(JSON.parse(customerInfo));
      fetchData(token);
    } catch (e) {
      navigate('/');
    }
  }, [navigate]);

  const handleAuthError = () => {
    // Clear stored credentials and redirect to login
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    toast.error('Your session has expired. Please login again.');
    navigate('/');
  };

  const fetchData = async (token) => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch stats first (lighter call)
      const statsRes = await axios.get(`${API_URL}/customer/stats`, { headers });
      setStats(statsRes.data);
      
      // Then fetch orders
      setOrdersLoading(true);
      const ordersRes = await axios.get(`${API_URL}/customer/orders`, { headers });
      setOrders(ordersRes.data || []);
      
      // Fetch credit balance
      const customerInfo = JSON.parse(localStorage.getItem('customer_info') || '{}');
      if (customerInfo.email) {
        try {
          const creditRes = await creditsAPI.getBalance(customerInfo.email);
          setCreditBalance(creditRes.data.credit_balance || 0);
        } catch (e) {
          console.log('Could not fetch credit balance');
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Check if it's an authentication error (401 Unauthorized)
      if (error.response?.status === 401) {
        handleAuthError();
        return;
      }
      toast.error('Failed to load some account data. Please refresh.');
    } finally {
      setLoading(false);
      setOrdersLoading(false);
    }
  };

  const refreshOrders = async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      handleAuthError();
      return;
    }
    
    setOrdersLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const ordersRes = await axios.get(`${API_URL}/customer/orders`, { headers });
      setOrders(ordersRes.data || []);
      toast.success('Orders refreshed');
    } catch (error) {
      // Check if it's an authentication error (401 Unauthorized)
      if (error.response?.status === 401) {
        handleAuthError();
        return;
      }
      toast.error('Failed to refresh orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || ''
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({ name: '', phone: '' });
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('customer_token');
      if (!token) {
        handleAuthError();
        return;
      }
      const response = await axios.put(
        `${API_URL}/auth/customer/profile`,
        null,
        {
          params: {
            name: editForm.name.trim(),
            phone: editForm.phone.trim() || null
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setCustomer(response.data);
      localStorage.setItem('customer_info', JSON.stringify(response.data));
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      // Check if it's an authentication error (401 Unauthorized)
      if (error.response?.status === 401) {
        handleAuthError();
        return;
      }
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading || !customer) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pt-14 md:pt-24 pb-20 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl lg:text-4xl font-bold text-white uppercase">
              My Account
            </h1>
            <p className="text-white/60 mt-2">Welcome back, {customer.name}!</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="border-white/20 text-white hover:bg-white/5"
            data-testid="logout-button"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards - Removed Wishlist */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Total Orders</p>
                    <p className="text-3xl font-bold text-gold-500">{stats.total_orders}</p>
                  </div>
                  <ShoppingBag className="h-10 w-10 text-gold-500/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Total Spent</p>
                    <p className="text-3xl font-bold text-gold-500">Rs {stats.total_spent?.toLocaleString() || 0}</p>
                  </div>
                  <DollarSign className="h-10 w-10 text-gold-500/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-green-500/20 bg-green-500/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Store Credits</p>
                    <p className="text-3xl font-bold text-green-500">Rs {creditBalance.toLocaleString()}</p>
                  </div>
                  <Coins className="h-10 w-10 text-green-500/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Member Since</p>
                    <p className="text-lg font-bold text-gold-500">{stats.member_since}</p>
                  </div>
                  <Calendar className="h-10 w-10 text-gold-500/40" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-card border border-white/10">
            <TabsTrigger value="orders" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
              <Package className="mr-2 h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {/* Refresh Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshOrders}
                disabled={ordersLoading}
                className="border-white/20 text-white hover:bg-white/5"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {ordersLoading && orders.length === 0 ? (
              <Card className="bg-card border-white/10">
                <CardContent className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500 mx-auto mb-4"></div>
                  <p className="text-white/60">Loading orders...</p>
                </CardContent>
              </Card>
            ) : orders.length === 0 ? (
              <Card className="bg-card border-white/10">
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No orders yet</p>
                  <Button 
                    onClick={() => navigate('/')} 
                    className="mt-4 bg-gold-500 hover:bg-gold-600 text-black"
                  >
                    Start Shopping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                const isExpanded = expandedOrderId === order.id;
                
                return (
                  <Card key={order.id} className="bg-card border-white/10 hover:border-gold-500/50 transition-colors overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer"
                      onClick={() => toggleOrderExpand(order.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            Order #{order.takeapp_order_number || order.id?.slice(0, 8)}
                          </CardTitle>
                          <CardDescription className="text-white/60">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </CardDescription>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-2xl font-bold text-gold-500">
                              Rs {order.total_amount?.toLocaleString() || 0}
                            </p>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold mt-2 ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label.toUpperCase()}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-white/40" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-white/40" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-white/80">{order.items_text}</p>
                      
                      {/* Invoice Link - Always Visible */}
                      <div className="mt-4 flex items-center gap-3">
                        <Link to={`/invoice/${order.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gold-500/50 text-gold-500 hover:bg-gold-500 hover:text-black"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            View Invoice
                          </Button>
                        </Link>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          onClick={(e) => { e.stopPropagation(); setComplaintOrderId(order.id); }}
                          data-testid={`raise-complaint-btn-${order.id}`}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Raise Complaint
                        </Button>
                        
                        {order.payment_url && order.status === 'pending' && (
                          <Button 
                            onClick={() => window.open(order.payment_url, '_blank')}
                            size="sm"
                            className="bg-gold-500 hover:bg-gold-600 text-black"
                          >
                            Complete Payment
                          </Button>
                        )}
                      </div>
                      
                      {/* Expanded Status History */}
                      {isExpanded && (
                        <div className="mt-6 pt-4 border-t border-white/10">
                          <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Order Timeline</h4>
                          
                          {/* Status Progress */}
                          <div className="flex items-center justify-between mb-6">
                            {['pending', 'confirmed', 'completed'].map((step, idx) => {
                              const stepConfig = getStatusConfig(step);
                              const StepIcon = stepConfig.icon;
                              const normalizedOrderStatus = (order.status || '').toLowerCase();
                              const currentStepIndex = ['pending', 'confirmed', 'completed'].indexOf(normalizedOrderStatus);
                              const isActive = idx <= currentStepIndex && normalizedOrderStatus !== 'cancelled';
                              const isCancelled = normalizedOrderStatus === 'cancelled';
                              
                              return (
                                <div key={step} className="flex-1 flex flex-col items-center relative">
                                  {idx > 0 && (
                                    <div className={`absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2 ${
                                      isActive && idx <= currentStepIndex ? 'bg-gold-500' : 'bg-white/10'
                                    }`} style={{ left: '-50%' }} />
                                  )}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                                    isCancelled ? 'bg-red-500/20 border border-red-500/30' :
                                    isActive ? 'bg-gold-500 text-black' : 'bg-white/10 text-white/40'
                                  }`}>
                                    {isCancelled && idx === currentStepIndex ? (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <StepIcon className="h-4 w-4" />
                                    )}
                                  </div>
                                  <span className={`text-xs mt-2 capitalize ${
                                    isActive && !isCancelled ? 'text-gold-500' : 'text-white/40'
                                  }`}>
                                    {step}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Status History List */}
                          {order.status_history && order.status_history.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-white/60 text-xs uppercase tracking-wider">History</h5>
                              {order.status_history.map((history, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-sm bg-black/30 rounded-lg p-3">
                                  <div className="w-2 h-2 rounded-full bg-gold-500 mt-1.5 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-medium">
                                        {history.old_status} → {history.new_status}
                                      </span>
                                    </div>
                                    <p className="text-white/40 text-xs mt-1">
                                      {new Date(history.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                    {history.note && (
                                      <p className="text-white/60 text-xs mt-1 italic">"{history.note}"</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Profile Information</CardTitle>
                    <CardDescription className="text-white/60">
                      {isEditing ? 'Update your account details' : 'Your account details'}
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={handleEditProfile}
                      variant="outline"
                      className="border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black"
                      data-testid="edit-profile-button"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" className="text-white">Name *</Label>
                      <Input
                        id="edit-name"
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="bg-black border-white/20 text-white"
                        placeholder="Your name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-phone" className="text-white">Phone</Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="bg-black border-white/20 text-white"
                        placeholder="+977 9800000000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60">Email (Cannot be changed)</Label>
                      <Input
                        type="email"
                        value={customer.email}
                        disabled
                        className="bg-black/50 border-white/10 text-white/60 cursor-not-allowed"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex-1 bg-gold-500 hover:bg-gold-600 text-black"
                      >
                        {saving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        variant="outline"
                        className="flex-1 border-white/20 text-white hover:bg-white/5"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-white/60 text-sm">Name</label>
                      <p className="text-white text-lg">{customer.name}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">Email</label>
                      <p className="text-white text-lg">{customer.email}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">Phone</label>
                      <p className="text-white text-lg">{customer.phone || customer.whatsapp_number || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">Member Since</label>
                      <p className="text-white text-lg">
                        {new Date(customer.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Complaint Modal */}
      {complaintOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeComplaintModal}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()} data-testid="complaint-modal">
            {complaintSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-white text-lg font-semibold">Complaint Submitted</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Your complaint has been raised. Please note that your issue with the order might take up to a week to be resolved. If it takes longer, you will be compensated with extended subscription or other rewards.
                </p>
                <Button onClick={closeComplaintModal} className="bg-white/10 hover:bg-white/15 text-white mt-4" data-testid="complaint-close-btn">
                  Close
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Raise Complaint
                  </h3>
                  <button onClick={closeComplaintModal} className="text-white/40 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/70 text-sm">WhatsApp Number <span className="text-red-400">*</span></Label>
                    <Input
                      value={complaintForm.whatsapp}
                      onChange={(e) => setComplaintForm(f => ({ ...f, whatsapp: e.target.value }))}
                      placeholder="e.g. 9841234567"
                      className="bg-black/50 border-white/15 text-white mt-1"
                      data-testid="complaint-whatsapp-input"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Email Address <span className="text-white/30">(optional)</span></Label>
                    <Input
                      value={complaintForm.email}
                      onChange={(e) => setComplaintForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="bg-black/50 border-white/15 text-white mt-1"
                      data-testid="complaint-email-input"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Reason for Complaint <span className="text-red-400">*</span></Label>
                    <textarea
                      value={complaintForm.reason}
                      onChange={(e) => setComplaintForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder="Please describe your issue in detail (minimum 20 words)..."
                      rows={4}
                      className="w-full bg-black/50 border border-white/15 text-white rounded-md px-3 py-2 mt-1 text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
                      data-testid="complaint-reason-input"
                    />
                    <p className="text-white/30 text-xs mt-1">
                      {complaintForm.reason.trim().split(/\s+/).filter(Boolean).length}/20 words minimum
                    </p>
                  </div>
                  <Button
                    onClick={handleComplaintSubmit}
                    disabled={complaintSubmitting}
                    className="w-full bg-red-500/80 hover:bg-red-500 text-white"
                    data-testid="complaint-submit-btn"
                  >
                    {complaintSubmitting ? 'Submitting...' : 'Submit Complaint'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
