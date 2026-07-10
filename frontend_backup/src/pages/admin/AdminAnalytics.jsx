import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Package, Clock, TrendingUp, ShoppingCart, Users, DollarSign, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import AdminLayout from '@/components/AdminLayout';
import { analyticsAPI } from '@/lib/api';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar
} from 'recharts';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUICK_RANGES = [
  { label: 'Today', key: 'today' },
  { label: '7 Days', key: '7' },
  { label: '30 Days', key: '30' },
  { label: '90 Days', key: '90' },
];

export default function AdminAnalytics() {
  const [revenueChart, setRevenueChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState('30');
  const [todayStats, setTodayStats] = useState(null);
  const [peakHoursData, setPeakHoursData] = useState(null);
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };

      const peakHoursRes = await axios.get(`${API_URL}/analytics/peak-hours?days=30`, { headers });
      setPeakHoursData(peakHoursRes.data);

      if (activeRange === 'today') {
        const [todayRes, topRes] = await Promise.all([
          axios.get(`${API_URL}/analytics/today-hourly`, { headers }),
          analyticsAPI.getTopProducts(10),
        ]);
        setTodayStats(todayRes.data);
        setRevenueChart(todayRes.data.hourly || []);
        setTopProducts(topRes.data);
      } else {
        const days = activeRange === 'custom'
          ? Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)) + 1
          : parseInt(activeRange);

        const [chartRes, topRes] = await Promise.all([
          analyticsAPI.getRevenueChart(days),
          analyticsAPI.getTopProducts(10),
        ]);

        setRevenueChart((chartRes.data || []).map(item => ({
          ...item,
          orders: item.orders || 0,
          visits: item.visits || 0,
          avgOrderValue: item.orders > 0 ? Math.round(item.revenue / item.orders) : 0
        })));
        setTopProducts(topRes.data);
        setTodayStats(null);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [activeRange, dateRange.from, dateRange.to]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleQuickSelect = (key) => {
    setActiveRange(key);
    if (key !== 'today' && key !== 'custom') {
      setDateRange({ from: subDays(new Date(), parseInt(key)), to: new Date() });
    }
  };

  const handleDateSelect = (range) => {
    if (range?.from) {
      setDateRange({ from: range.from, to: range.to || range.from });
      setActiveRange('custom');
    }
  };

  const formatCurrency = (amount) => {
    const rounded = Math.round(amount || 0);
    if (rounded >= 100000) return `Rs ${(rounded / 100000).toFixed(1)}L`;
    if (rounded >= 1000) return `Rs ${(rounded / 1000).toFixed(1)}K`;
    return `Rs ${rounded.toLocaleString()}`;
  };

  const isToday = activeRange === 'today';
  const xAxisKey = isToday ? 'label' : 'date';
  const xAxisFormatter = isToday ? (val) => val : (val) => format(new Date(val), 'MMM d');
  const tooltipLabelFormatter = isToday
    ? (val) => `Today at ${val}`
    : (val) => format(new Date(val), 'EEE, MMM d, yyyy');

  const chartTooltipStyle = {
    contentStyle: { backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' },
    labelStyle: { color: '#fff', fontWeight: 'bold' },
  };

  if (loading && revenueChart.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {isToday ? "Today's hourly breakdown" : `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`}
            </p>
          </div>

          {/* Quick Select + Calendar */}
          <div className="flex items-center gap-2" data-testid="analytics-controls">
            {QUICK_RANGES.map((r) => (
              <Button
                key={r.key}
                size="sm"
                variant={activeRange === r.key ? 'default' : 'outline'}
                onClick={() => handleQuickSelect(r.key)}
                className={activeRange === r.key
                  ? 'bg-amber-500 text-black hover:bg-amber-600'
                  : 'bg-zinc-800 border-zinc-700 text-white/60 hover:bg-zinc-700 hover:text-white'
                }
                data-testid={`range-${r.key}`}
              >
                {r.key === 'today' && <Clock className="w-3 h-3 mr-1" />}
                {r.label}
              </Button>
            ))}

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant={activeRange === 'custom' ? 'default' : 'outline'}
                  className={activeRange === 'custom'
                    ? 'bg-amber-500 text-black hover:bg-amber-600'
                    : 'bg-zinc-800 border-zinc-700 text-white/60 hover:bg-zinc-700 hover:text-white'
                  }
                  data-testid="range-custom"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  Custom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="end">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                  className="bg-zinc-900 text-white"
                />
                <div className="p-3 border-t border-zinc-700 flex justify-end">
                  <Button size="sm" className="bg-amber-500 text-black hover:bg-amber-600" onClick={() => setIsCalendarOpen(false)}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500" />}
          </div>
        </div>

        {/* Today Summary Cards */}
        {isToday && todayStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Today's Revenue", value: formatCurrency(todayStats.totals.revenue), icon: DollarSign, color: 'amber' },
              { label: "Today's Orders", value: todayStats.totals.orders, icon: ShoppingCart, color: 'blue' },
              { label: "Today's Visits", value: todayStats.totals.visits, icon: Eye, color: 'purple' },
              { label: "Avg Order", value: todayStats.totals.orders > 0 ? formatCurrency(todayStats.totals.revenue / todayStats.totals.orders) : 'Rs 0', icon: TrendingUp, color: 'green' },
            ].map((s, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${s.color}-500/10`}>
                    <s.icon className={`w-4 h-4 text-${s.color}-500`} />
                  </div>
                  <div>
                    <p className="text-xs text-white/40">{s.label}</p>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">{isToday ? 'Hourly Revenue' : 'Revenue'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey={xAxisKey} stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={xAxisFormatter} interval={isToday ? 2 : 'preserveStartEnd'} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `Rs ${v}`} />
                  <Tooltip {...chartTooltipStyle} formatter={(v) => [`Rs ${Math.round(v).toLocaleString()}`, 'Revenue']} labelFormatter={tooltipLabelFormatter} />
                  <Area type="monotone" dataKey="revenue" stroke="#F5A623" strokeWidth={2} fill="url(#gRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Visits */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">{isToday ? 'Hourly Visits' : 'Website Visits'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="gVis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey={xAxisKey} stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={xAxisFormatter} interval={isToday ? 2 : 'preserveStartEnd'} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip {...chartTooltipStyle} formatter={(v) => [v, 'Visitors']} labelFormatter={tooltipLabelFormatter} />
                  <Area type="monotone" dataKey="visits" stroke="#8B5CF6" strokeWidth={2} fill="url(#gVis)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">{isToday ? 'Hourly Orders' : 'Orders'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey={xAxisKey} stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={xAxisFormatter} interval={isToday ? 2 : 'preserveStartEnd'} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...chartTooltipStyle} formatter={(v) => [v, 'Orders']} labelFormatter={tooltipLabelFormatter} />
                  <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Avg Order Value */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">Average Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey={xAxisKey} stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={xAxisFormatter} interval={isToday ? 2 : 'preserveStartEnd'} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs ${v}`} />
                  <Tooltip {...chartTooltipStyle} formatter={(v) => [`Rs ${Math.round(v).toLocaleString()}`, 'Avg Order Value']} labelFormatter={tooltipLabelFormatter} />
                  <Line type="monotone" dataKey={isToday ? 'revenue' : 'avgOrderValue'} stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" /> Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="py-10 text-center">
                <Package className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No sales data yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-white/40 text-xs font-medium py-2.5 px-2">#</th>
                      <th className="text-left text-white/40 text-xs font-medium py-2.5 px-2">Product</th>
                      <th className="text-center text-white/40 text-xs font-medium py-2.5 px-2">Qty Sold</th>
                      <th className="text-right text-white/40 text-xs font-medium py-2.5 px-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, idx) => (
                      <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2.5 px-2">
                          <span className={`font-bold text-sm ${idx < 3 ? 'text-amber-500' : 'text-white/30'}`}>{idx + 1}</span>
                        </td>
                        <td className="py-2.5 px-2">
                          <p className="text-white text-sm font-medium truncate max-w-[200px]">{product.name}</p>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="bg-zinc-800 text-white/60 px-2.5 py-0.5 rounded-full text-xs">{product.quantity}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className="text-green-400 text-sm font-semibold">{formatCurrency(product.revenue)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        {peakHoursData && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" /> Peak Hours (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={peakHoursData.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="hour" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    {...chartTooltipStyle}
                    formatter={(v) => [v, 'Orders']}
                    labelFormatter={(v) => `${v}`}
                  />
                  <Bar dataKey="orders" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {peakHoursData.insights && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800">
                  {peakHoursData.insights.periodBreakdown && Object.entries(peakHoursData.insights.periodBreakdown).map(([period, count]) => (
                    <div key={period} className="text-center">
                      <p className="text-xs text-white/40 capitalize">{period}</p>
                      <p className="text-lg font-bold text-white">{count}</p>
                      <p className="text-xs text-white/25">orders</p>
                    </div>
                  ))}
                </div>
              )}

              {peakHoursData.insights?.peakHour && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-white/40">Peak ordering time: <span className="text-amber-400 font-medium">{peakHoursData.insights.peakHour}</span></p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
