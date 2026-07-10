'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import {
  Package, FolderOpen, Star, ShoppingCart, Users, TrendingUp, TrendingDown,
  Eye, ArrowRight, Clock, CheckCircle, AlertCircle, Plus, ExternalLink,
  Zap, Award, RefreshCw
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { productsAPI, categoriesAPI, ordersAPI, analyticsAPI } from '@/lib/api';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const API_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`;

const formatCurrency = (amount) => {
  const val = Math.round(amount || 0);
  if (val >= 100000) return `Rs ${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `Rs ${(val / 1000).toFixed(1)}K`;
  return `Rs ${val.toLocaleString()}`;
};

const formatChange = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? { value: '+100%', positive: true } : { value: '0%', positive: true };
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${change > 0 ? '+' : ''}${change.toFixed(0)}%`,
    positive: change >= 0
  };
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const STATUS_COLORS = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  Confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Completed: 'bg-green-500/15 text-green-400 border-green-500/25',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',
};

const TOP_PRODUCT_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({ products: 0, categories: 0 });
  const [loading, setLoading] = useState(true);
  const [chartTab, setChartTab] = useState('sales');
  const [topRange, setTopRange] = useState('30');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [overviewRes, chartRes, ordersRes, productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/overview`, { headers }),
        analyticsAPI.getRevenueChart(7),
        ordersAPI.getAll(parseInt(topRange)),
        productsAPI.getAll(null, false),
        categoriesAPI.getAll(),
      ]);

      setOverview(overviewRes.data);

      const raw = chartRes.data || [];
      setChartData(raw.map(d => ({
        ...d,
        day: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
      })));

      const orders = ordersRes.data.orders || ordersRes.data || [];
      const sorted = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAllOrders(sorted);
      setRecentOrders(sorted.slice(0, 5));

      setInventoryStats({
        products: productsRes.data?.length || 0,
        categories: categoriesRes.data?.length || 0,
      });
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [topRange]);

  // Compute top products from orders
  const topProducts = useMemo(() => {
    const map = {};
    allOrders.forEach(order => {
      const items = order.items || [];
      items.forEach(item => {
        const name = item.product_name || item.name || 'Unknown';
        if (!map[name]) map[name] = { name, revenue: 0, orders: 0 };
        map[name].revenue += (item.price || 0) * (item.quantity || 1);
        map[name].orders += 1;
      });
      // fallback: use items_text if no items array
      if (items.length === 0 && order.items_text) {
        const name = order.items_text.split(',')[0].trim();
        if (!map[name]) map[name] = { name, revenue: 0, orders: 0 };
        map[name].revenue += order.total_amount || 0;
        map[name].orders += 1;
      }
    });
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [allOrders]);

  const pendingCount = useMemo(
    () => allOrders.filter(o => o.status === 'pending').length,
    [allOrders]
  );

  const revenueChange = overview ? formatChange(overview.month.revenue, overview.lastMonth.revenue) : null;
  const ordersChange = overview ? formatChange(overview.month.orders, overview.lastMonth.orders) : null;

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  const maxRevenue = topProducts[0]?.revenue || 1;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {getGreeting()}, Sushant 👋
            </h1>
            <p className="text-white/50 text-sm mt-1">Here's your store at a glance</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/panelgsnadminbackend/products/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Product
            </Link>
            <Link href="/panelgsnadminbackend/orders"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors">
              <ShoppingCart className="h-3.5 w-3.5" /> Orders
            </Link>
            <button
              onClick={fetchAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <a href="https://gameshopnepal.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> Store
            </a>
          </div>
        </div>

        {/* Pending Alert */}
        {pendingCount > 0 && (
          <Link href="/panelgsnadminbackend/orders"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-yellow-500/8 border border-yellow-500/20 hover:bg-yellow-500/12 transition-colors">
            <div className="p-2 rounded-lg bg-yellow-500/15">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <span className="text-yellow-300 text-sm font-medium">
              {pendingCount} pending order{pendingCount > 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} attention
            </span>
            <ArrowRight className="h-4 w-4 text-yellow-400 ml-auto" />
          </Link>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ShoppingCart className="h-4 w-4 text-blue-400" />
                </div>
              </div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Today's Orders</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{overview?.today?.orders || 0}</p>
              <p className="text-xs text-white/30 mt-1">{formatCurrency(overview?.today?.revenue)} revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
                {revenueChange && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${revenueChange.positive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                    {revenueChange.value}
                  </span>
                )}
              </div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Monthly Sales</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{formatCurrency(overview?.month?.revenue)}</p>
              <p className="text-xs text-white/30 mt-1">vs last month</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Eye className="h-4 w-4 text-purple-400" />
                </div>
              </div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Today's Visitors</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{overview?.visits?.today || 0}</p>
              <p className="text-xs text-white/30 mt-1">{overview?.visits?.month || 0} this month</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Zap className="h-4 w-4 text-green-400" />
                </div>
                {ordersChange && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ordersChange.positive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                    {ordersChange.value}
                  </span>
                )}
              </div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Monthly Orders</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{overview?.month?.orders || 0}</p>
              <p className="text-xs text-white/30 mt-1">vs last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Period Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-4">
              <p className="text-white/50 text-xs font-medium">This Week</p>
              <p className="text-xl font-bold text-white mt-0.5">{overview?.week?.orders || 0} <span className="text-sm font-normal text-white/40">orders</span></p>
              <p className="text-sm text-amber-400 font-medium">{formatCurrency(overview?.week?.revenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-4">
              <p className="text-white/50 text-xs font-medium">This Month</p>
              <p className="text-xl font-bold text-white mt-0.5">{overview?.month?.orders || 0} <span className="text-sm font-normal text-white/40">orders</span></p>
              <p className="text-sm text-amber-400 font-medium">{formatCurrency(overview?.month?.revenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-4">
              <p className="text-white/50 text-xs font-medium">All Time</p>
              <p className="text-xl font-bold text-white mt-0.5">{overview?.total?.orders || 0} <span className="text-sm font-normal text-white/40">orders</span></p>
              <p className="text-sm text-amber-400 font-medium">{formatCurrency(overview?.total?.revenue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts + Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Chart */}
          <Card className="bg-zinc-900/80 border-zinc-800/80 lg:col-span-2">
            <CardContent className="p-4 sm:p-5">
              <Tabs value={chartTab} onValueChange={setChartTab}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold text-base">Last 7 Days</h2>
                  <TabsList className="bg-zinc-800 border border-zinc-700/50">
                    <TabsTrigger value="sales" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Sales</TabsTrigger>
                    <TabsTrigger value="orders" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Orders</TabsTrigger>
                    <TabsTrigger value="views" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Views</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="sales" className="mt-0">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#fff' }} formatter={(v) => [`Rs ${Math.round(v).toLocaleString()}`, 'Revenue']} />
                        <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#gradSales)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                <TabsContent value="orders" className="mt-0">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#fff' }} formatter={(v) => [v, 'Orders']} />
                        <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                <TabsContent value="views" className="mt-0">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#fff' }} formatter={(v) => [v, 'Visitors']} />
                        <Area type="monotone" dataKey="visits" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradViews)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-base">Recent Orders</h2>
                <Link href="/panelgsnadminbackend/orders" className="text-amber-400 text-xs font-medium hover:text-amber-300 flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <div className="py-8 text-center">
                  <ShoppingCart className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No recent orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <Link key={order.id} href="/panelgsnadminbackend/orders"
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{order.customer_name || 'Guest'}</p>
                        <p className="text-white/40 text-xs mt-0.5">#{order.takeapp_order_number || order.id?.slice(0, 8)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-amber-400 text-sm font-semibold">Rs {Math.round(order.total_amount || 0).toLocaleString()}</span>
                        <Badge className={`${STATUS_COLORS[order.status] || STATUS_COLORS.pending} border text-[10px] px-1.5 py-0`}>
                          {order.status === 'pending' ? 'Pending' : order.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* TOP PRODUCTS + Order Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Top Products — takes 2 cols */}
          <Card className="bg-zinc-900/80 border-zinc-800/80 lg:col-span-2">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  <h2 className="text-white font-semibold text-base">Top Products</h2>
                </div>
                <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                  {[['7', '7d'], ['30', '30d'], ['90', '90d']].map(([val, label]) => (
                    <button key={val} onClick={() => setTopRange(val)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${topRange === val ? 'bg-amber-500 text-black' : 'text-white/50 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {topProducts.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No order data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((product, idx) => (
                    <div key={product.name} className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === 0 ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-white/60'}`}>
                        {idx + 1}
                      </div>
                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-white text-sm font-medium truncate pr-2">{product.name}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-white/40 text-xs">{product.orders} orders</span>
                            <span className="text-amber-400 text-sm font-semibold">{formatCurrency(product.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(product.revenue / maxRevenue) * 100}%`,
                              backgroundColor: TOP_PRODUCT_COLORS[idx]
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Status Breakdown */}
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-4 sm:p-5">
              <h2 className="text-white font-semibold text-base mb-5">Order Status</h2>
              {(() => {
                const total = allOrders.length || 1;
                const statuses = [
                  { label: 'Completed', count: allOrders.filter(o => o.status === 'Completed' || o.status === 'completed').length, color: '#10b981' },
                  { label: 'Pending', count: allOrders.filter(o => o.status === 'pending').length, color: '#f59e0b' },
                  { label: 'Confirmed', count: allOrders.filter(o => o.status === 'Confirmed' || o.status === 'confirmed').length, color: '#3b82f6' },
                  { label: 'Cancelled', count: allOrders.filter(o => o.status === 'cancelled').length, color: '#ef4444' },
                ];
                return (
                  <div className="space-y-4">
                    {statuses.map(s => (
                      <div key={s.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-white/70 text-sm">{s.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 text-xs">{((s.count / total) * 100).toFixed(0)}%</span>
                            <span className="text-white text-sm font-semibold w-6 text-right">{s.count}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <span className="text-white/40 text-xs">Total ({topRange}d)</span>
                      <span className="text-white font-bold">{allOrders.length}</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/panelgsnadminbackend/products" className="group">
            <Card className="bg-zinc-900/80 border-zinc-800/80 group-hover:border-amber-500/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Products</p>
                  <p className="text-xl font-bold text-white">{inventoryStats.products}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/panelgsnadminbackend/categories" className="group">
            <Card className="bg-zinc-900/80 border-zinc-800/80 group-hover:border-amber-500/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10">
                  <FolderOpen className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Categories</p>
                  <p className="text-xl font-bold text-white">{inventoryStats.categories}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/panelgsnadminbackend/customers" className="group">
            <Card className="bg-zinc-900/80 border-zinc-800/80 group-hover:border-amber-500/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-green-500/10">
                  <Users className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Total Visitors</p>
                  <p className="text-xl font-bold text-white">{overview?.visits?.total || 0}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/panelgsnadminbackend/analytics" className="group">
            <Card className="bg-zinc-900/80 border-zinc-800/80 group-hover:border-amber-500/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Conversion</p>
                  <p className="text-xl font-bold text-white">
                    {overview?.visits?.total ? ((overview.total.orders / overview.visits.total) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

      </div>
    </AdminLayout>
  );
}