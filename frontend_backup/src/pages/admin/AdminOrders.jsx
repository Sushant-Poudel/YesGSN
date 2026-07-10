import { useEffect, useState } from 'react';
import { RefreshCw, Search, Package, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Mail, Phone, User, Calendar, FileText, Image, ExternalLink, Trash2, Square, CheckSquare, Filter, MessageCircle, Send, Copy, Download } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ordersAPI, orderTrackingAPI } from '@/lib/api';
import axios from 'axios';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'Confirmed', label: 'Confirmed', icon: CheckCircle, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'Completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [totalOrders, setTotalOrders] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  
  // Multi-select state
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Status update dialog
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = async (days = dateRange) => {
    setIsLoading(true);
    try {
      const response = await ordersAPI.getAll(parseInt(days));
      // Handle new response format with orders array and total
      const ordersData = response.data.orders || response.data;
      const total = response.data.total || ordersData.length;
      
      // Sort by date descending
      const sortedOrders = ordersData.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(sortedOrders);
      setFilteredOrders(sortedOrders);
      setTotalOrders(total);
    } catch (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [dateRange]);

  // Filter orders based on search and status
  useEffect(() => {
    let filtered = orders;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.customer_name?.toLowerCase().includes(search) ||
        order.customer_email?.toLowerCase().includes(search) ||
        order.customer_phone?.includes(search) ||
        order.id?.toLowerCase().includes(search) ||
        order.takeapp_order_number?.toString().includes(search) ||
        order.items_text?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders]);

  const openStatusDialog = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status || 'pending');
    setStatusNote('');
    setIsStatusDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;

    setIsUpdating(true);
    try {
      await orderTrackingAPI.updateStatus(selectedOrder.id, {
        status: newStatus,
        note: statusNote || null
      });
      
      toast.success(`Order status updated to ${newStatus}`);
      setIsStatusDialogOpen(false);
      
      // Refresh orders
      await fetchOrders();
    } catch (error) {
      toast.error('Failed to update order status');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    const Icon = statusConfig.icon;
    return (
      <Badge className={`${statusConfig.color} border flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      await ordersAPI.delete(orderId);
      toast.success('Order deleted successfully');
      
      // Refresh orders list
      await fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete order');
      console.error('Delete order error:', error);
    }
  };

  // Multi-select handlers
  const toggleSelectOrder = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedOrders);
    filteredOrders.forEach(order => newSelected.add(order.id));
    setSelectedOrders(newSelected);
  };

  const deselectAll = () => {
    setSelectedOrders(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }

    const selectedList = Array.from(selectedOrders);
    const confirmMsg = `Are you sure you want to delete ${selectedList.length} order(s)? This action cannot be undone.`;
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/orders/bulk-delete`,
        { order_ids: selectedList },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(response.data.message);
      setSelectedOrders(new Set());
      await fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete orders');
      console.error('Bulk delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const areAllFilteredSelected = filteredOrders.length > 0 && 
    filteredOrders.every(order => selectedOrders.has(order.id));


  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'Confirmed' || o.status === 'confirmed').length,
    completed: orders.filter(o => o.status === 'Completed' || o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const handleCompleteOrder = async (order) => {
    if (!window.confirm('Mark this order as completed? This will send an invoice email to the customer.')) return;
    try {
      await ordersAPI.complete(order.id);
      toast.success('Order marked as completed! Invoice email sent.');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to complete order');
      console.error(error);
    }
  };

  const handleSendWhatsApp = (order) => {
    const phone = order.customer_phone?.replace(/[^0-9]/g, '');
    if (!phone) {
      toast.error('No phone number available for this customer');
      return;
    }
    const orderNum = order.takeapp_order_number || order.id?.slice(0, 8);
    const items = order.items_text || order.items?.map(i => i.name).join(', ') || 'your items';
    const message = `Hi ${order.customer_name || 'there'}! Your order #${orderNum} (${items}) has been processed. Total: Rs ${Math.round(order.total_amount || 0).toLocaleString()}. Thank you for shopping with GameShop Nepal!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCopyOrderInfo = (order) => {
    const orderNum = order.takeapp_order_number || order.id?.slice(0, 8);
    const text = `Order #${orderNum}\nCustomer: ${order.customer_name || 'N/A'}\nEmail: ${order.customer_email || 'N/A'}\nPhone: ${order.customer_phone || 'N/A'}\nItems: ${order.items_text || 'N/A'}\nTotal: Rs ${Math.round(order.total_amount || 0).toLocaleString()}\nStatus: ${order.status}`;
    navigator.clipboard.writeText(text).then(() => toast.success('Order info copied!')).catch(() => toast.error('Failed to copy'));
  };

  const exportOrdersCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }
    const headers = ['Order ID', 'Customer', 'Item Name', 'Total', 'Status', 'Payment'];
    const rows = filteredOrders.map(order => {
      const orderNum = order.order_number || order.id?.slice(-6) || '';
      const customer = (order.customer_name || order.customer_email || 'N/A').replace(/,/g, ' ');
      const items = (order.items || []).map(i => (i.product_name || i.name || '')).join(' | ').replace(/,/g, ' ') || order.items_text?.replace(/,/g, ' ') || 'N/A';
      const total = `Rs ${Math.round(order.total_amount || 0)}`;
      const status = order.status || 'N/A';
      const payment = order.payment_method || 'N/A';
      return [orderNum, customer, items, total, status, payment].map(v => `"${v}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date().toISOString().slice(0, 10);
    a.download = `orders_${statusFilter !== 'all' ? statusFilter + '_' : ''}${now}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredOrders.length} orders`);
  };

  const getBackendUrl = () => {
    return process.env.REACT_APP_BACKEND_URL || '';
  };

  return (
    <AdminLayout title="Order Management">
      <div className="space-y-6" data-testid="admin-orders">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card border border-white/10 rounded-lg p-4">
            <p className="text-white/60 text-sm">Total Orders</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-white/40 mt-1">Last {dateRange} days ({totalOrders} total)</p>
          </div>
          <div className="bg-card border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-card border border-blue-500/20 rounded-lg p-4">
            <p className="text-blue-400 text-sm">Confirmed</p>
            <p className="text-2xl font-bold text-blue-400">{stats.confirmed}</p>
          </div>
          <div className="bg-card border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 text-sm">Completed</p>
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
          </div>
          <div className="bg-card border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">Cancelled</p>
            <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search by name, email, phone, or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-black border-white/20 text-white"
              data-testid="order-search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setSelectedOrders(new Set()); }}>
            <SelectTrigger className="w-full sm:w-48 bg-black border-white/20 text-white" data-testid="order-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(status => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-40 bg-black border-white/20 text-white" data-testid="order-date-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              {DATE_RANGE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => fetchOrders()} 
            variant="outline" 
            className="border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black"
            data-testid="refresh-orders-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={exportOrdersCSV}
            variant="outline"
            className="border-green-500/50 text-green-400 hover:bg-green-500/10"
            data-testid="export-orders-btn"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Bulk Actions Bar */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center gap-4 bg-card border border-white/10 rounded-lg p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={areAllFilteredSelected ? deselectAll : selectAllFiltered}
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="select-all-btn"
            >
              {areAllFilteredSelected ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Deselect All ({filteredOrders.length})
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Select All {statusFilter !== 'all' ? STATUS_OPTIONS.find(s => s.value === statusFilter)?.label : ''} ({filteredOrders.length})
                </>
              )}
            </Button>
            
            {selectedOrders.size > 0 && (
              <>
                <span className="text-white/60 text-sm">
                  {selectedOrders.size} order(s) selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600 text-white"
                  data-testid="bulk-delete-btn"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : `Delete Selected (${selectedOrders.size})`}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 skeleton rounded-lg"></div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-card border border-white/10 rounded-lg p-12 text-center">
            <Package className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className={`bg-card border rounded-lg overflow-hidden transition-colors ${
                  selectedOrders.has(order.id) 
                    ? 'border-gold-500/50 bg-gold-500/5' 
                    : 'border-white/10 hover:border-gold-500/30'
                }`}
                data-testid={`order-card-${order.id}`}
              >
                {/* Order Header */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div 
                        onClick={(e) => { e.stopPropagation(); toggleSelectOrder(order.id); }}
                        className="pt-1"
                      >
                        <Checkbox 
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleSelectOrder(order.id)}
                          className="border-white/40 data-[state=checked]:bg-gold-500 data-[state=checked]:border-gold-500"
                          data-testid={`order-checkbox-${order.id}`}
                        />
                      </div>
                      <div className="p-2 bg-gold-500/10 rounded-lg">
                        <Package className="h-6 w-6 text-gold-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading font-semibold text-white">
                            #{order.takeapp_order_number || order.id.slice(0, 8)}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-white font-medium">{order.customer_name || 'Unknown'}</p>
                        <p className="text-white/40 text-sm">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-gold-500 font-bold text-xl">
                          Rs {Math.round(order.total_amount || 0).toLocaleString()}
                        </p>
                        <p className="text-white/40 text-sm">{order.items?.length || 0} items</p>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex items-center gap-2">
                        {(order.status === 'pending' || order.status === 'Confirmed') && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteOrder(order);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            data-testid={`complete-order-btn-${order.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Complete</span>
                          </Button>
                        )}
                        {order.customer_phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendWhatsApp(order);
                            }}
                            className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                            data-testid={`whatsapp-btn-${order.id}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyOrderInfo(order);
                          }}
                          className="border-white/20 text-white/60 hover:bg-white/10"
                          data-testid={`copy-order-btn-${order.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openStatusDialog(order);
                        }}
                        className="bg-gold-500 hover:bg-gold-600 text-black"
                        data-testid={`update-status-btn-${order.id}`}
                      >
                        Update Status
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(order.id);
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                        data-testid={`delete-order-btn-${order.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {expandedOrderId === order.id ? (
                        <ChevronUp className="h-5 w-5 text-white/40" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-white/40" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOrderId === order.id && (
                  <div className="border-t border-white/10 p-4 bg-black/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Customer Info */}
                      <div className="space-y-3">
                        <h4 className="text-white font-semibold uppercase text-sm tracking-wider">Customer Details</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-white/80">
                            <User className="h-4 w-4 text-gold-500" />
                            {order.customer_name || 'Not provided'}
                          </div>
                          <div className="flex items-center gap-2 text-white/80">
                            <Mail className="h-4 w-4 text-gold-500" />
                            {order.customer_email || 'Not provided'}
                          </div>
                          <div className="flex items-center gap-2 text-white/80">
                            <Phone className="h-4 w-4 text-gold-500" />
                            {order.customer_phone || 'Not provided'}
                          </div>
                          <div className="flex items-center gap-2 text-white/80">
                            <Calendar className="h-4 w-4 text-gold-500" />
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-3">
                        <h4 className="text-white font-semibold uppercase text-sm tracking-wider">Order Items</h4>
                        <div className="bg-black/50 rounded-lg p-3">
                          <p className="text-white/80">{order.items_text || 'No items'}</p>
                          {order.remark && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <p className="text-white/40 text-sm">Note: {order.remark}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payment Screenshot Section */}
                    {order.payment_screenshot && (
                      <div className="mt-6">
                        <h4 className="text-white font-semibold uppercase text-sm tracking-wider mb-3 flex items-center gap-2">
                          <Image className="h-4 w-4 text-gold-500" />
                          Payment Screenshot
                        </h4>
                        <div className="bg-black/50 rounded-lg p-4">
                          <div className="flex items-start gap-4">
                            <a 
                              href={order.payment_screenshot.startsWith('http') ? order.payment_screenshot : `${getBackendUrl()}${order.payment_screenshot}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img 
                                src={order.payment_screenshot.startsWith('http') ? order.payment_screenshot : `${getBackendUrl()}${order.payment_screenshot}`}
                                alt="Payment Screenshot"
                                className="max-w-[200px] max-h-[200px] rounded-lg border border-white/20 hover:border-gold-500 transition-colors"
                              />
                            </a>
                            <div className="space-y-2">
                              <p className="text-white/60 text-sm">
                                <span className="text-white">Payment Method:</span> {order.payment_method || 'N/A'}
                              </p>
                              <p className="text-white/60 text-sm">
                                <span className="text-white">Uploaded:</span> {formatDate(order.payment_uploaded_at)}
                              </p>
                              <a 
                                href={order.payment_screenshot.startsWith('http') ? order.payment_screenshot : `${getBackendUrl()}${order.payment_screenshot}`}
                                download
                                className="inline-flex items-center gap-1 text-gold-500 hover:text-gold-400 text-sm"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Download Screenshot
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Invoice Link */}
                    {order.invoice_url && (
                      <div className="mt-4">
                        <a 
                          href={order.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-gold-500/10 text-gold-500 px-4 py-2 rounded-lg hover:bg-gold-500/20 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          View Invoice
                        </a>
                      </div>
                    )}

                    {/* Status History */}
                    {order.status_history && order.status_history.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-white font-semibold uppercase text-sm tracking-wider mb-3">Status History</h4>
                        <div className="space-y-2">
                          {order.status_history.map((history, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 rounded-full bg-gold-500"></div>
                              <span className="text-white/60">{formatDate(history.created_at)}</span>
                              <span className="text-white">
                                {history.old_status} → {history.new_status}
                              </span>
                              {history.note && (
                                <span className="text-white/40">({history.note})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Status Update Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Update Order Status</DialogTitle>
              <DialogDescription className="text-white/60">
                Order #{selectedOrder?.takeapp_order_number || selectedOrder?.id?.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-white">Current Status</Label>
                <div className="flex items-center gap-2">
                  {selectedOrder && getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-black border-white/20 text-white" data-testid="new-status-select">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10">
                    {STATUS_OPTIONS.map(status => {
                      const Icon = status.icon;
                      return (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {status.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Note (Optional)</Label>
                <Textarea
                  placeholder="Add a note about this status change..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="bg-black border-white/20 text-white min-h-[80px]"
                  data-testid="status-note-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsStatusDialogOpen(false)}
                className="border-white/20 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={isUpdating || newStatus === selectedOrder?.status}
                className="bg-gold-500 hover:bg-gold-600 text-black"
                data-testid="confirm-status-update-btn"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
