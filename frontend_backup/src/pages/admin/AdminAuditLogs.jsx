import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Clock, 
  User, 
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  LogIn,
  Package,
  ShoppingCart,
  Settings,
  UserPlus,
  Trash2,
  Edit,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/components/AdminLayout';
import axios from 'axios';
import { format, formatDistanceToNow } from 'date-fns';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Action type icons and colors
const actionConfig = {
  LOGIN: { icon: LogIn, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Login' },
  LOGOUT: { icon: LogIn, color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Logout' },
  CREATE_PRODUCT: { icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Created Product' },
  UPDATE_PRODUCT: { icon: Edit, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Updated Product' },
  DELETE_PRODUCT: { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Deleted Product' },
  UPDATE_ORDER_STATUS: { icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Updated Order' },
  CREATE_STAFF: { icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Created Staff' },
  UPDATE_STAFF: { icon: Edit, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Updated Staff' },
  DELETE_STAFF: { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Deleted Staff' },
  UPDATE_SETTINGS: { icon: Settings, color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Updated Settings' },
  DEFAULT: { icon: Activity, color: 'text-white', bg: 'bg-white/10', label: 'Action' }
};

const getActionConfig = (action) => actionConfig[action] || actionConfig.DEFAULT;

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [actionFilter, setActionFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter options
  const [actions, setActions] = useState([]);
  const [actors, setActors] = useState([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const params = new URLSearchParams({ page, limit: 30 });
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter);
      if (actorFilter && actorFilter !== 'all') params.append('actor_id', actorFilter);
      
      const response = await axios.get(`${API_URL}/audit-logs?${params}`, { headers });
      setLogs(response.data.logs);
      setTotalPages(response.data.pages);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, actorFilter]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/audit-logs/stats`, { headers });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  };

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [actionsRes, actorsRes] = await Promise.all([
        axios.get(`${API_URL}/audit-logs/actions`, { headers }),
        axios.get(`${API_URL}/audit-logs/actors`, { headers })
      ]);
      
      setActions(actionsRes.data.actions);
      setActors(actorsRes.data.actors);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
    fetchFilters();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(query) ||
      log.actor?.name?.toLowerCase().includes(query) ||
      log.resource_name?.toLowerCase().includes(query) ||
      log.resource_type?.toLowerCase().includes(query)
    );
  });

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return {
        relative: formatDistanceToNow(date, { addSuffix: true }),
        full: format(date, 'MMM d, yyyy h:mm a')
      };
    } catch {
      return { relative: 'Unknown', full: '' };
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-500" />
              Audit Logs
            </h1>
            <p className="text-gray-400 text-sm mt-1">Track all admin and staff activities</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => { fetchLogs(); fetchStats(); }}
            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Activity className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Today</p>
                    <p className="text-xl font-bold text-white">{stats.today}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">This Week</p>
                    <p className="text-xl font-bold text-white">{stats.week}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Logs</p>
                    <p className="text-xl font-bold text-white">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <User className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Active Admins</p>
                    <p className="text-xl font-bold text-white">{stats.top_actors?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px] bg-zinc-800 border-zinc-700 text-white">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(action => (
                    <SelectItem key={action} value={action}>
                      {getActionConfig(action).label || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actorFilter} onValueChange={(v) => { setActorFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px] bg-zinc-800 border-zinc-700 text-white">
                  <User className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">All Users</SelectItem>
                  {actors.map(actor => (
                    <SelectItem key={actor.id} value={actor.id}>
                      {actor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">Activity Log</CardTitle>
              <span className="text-gray-400 text-sm">{total} total entries</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No audit logs found</p>
                <p className="text-gray-500 text-sm">Activities will appear here as they happen</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {filteredLogs.map((log) => {
                  const config = getActionConfig(log.action);
                  const IconComponent = config.icon;
                  const time = formatTimestamp(log.timestamp);
                  
                  return (
                    <div key={log.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg ${config.bg} flex-shrink-0`}>
                          <IconComponent className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white">{log.actor?.name || 'Unknown'}</span>
                            <span className={`text-sm ${config.color}`}>{config.label}</span>
                            {log.resource_name && (
                              <>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-300 truncate">{log.resource_name}</span>
                              </>
                            )}
                          </div>
                          
                          {/* Details */}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {log.action === 'UPDATE_ORDER_STATUS' && log.details.old_status && (
                                <span className="text-xs bg-zinc-800 text-gray-300 px-2 py-1 rounded">
                                  {log.details.old_status} → {log.details.new_status}
                                </span>
                              )}
                              {log.details.method && (
                                <span className="text-xs bg-zinc-800 text-gray-300 px-2 py-1 rounded">
                                  Method: {log.details.method}
                                </span>
                              )}
                              {log.details.category && (
                                <span className="text-xs bg-zinc-800 text-gray-300 px-2 py-1 rounded">
                                  Category: {log.details.category}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span title={time.full}>{time.relative}</span>
                            {log.ip_address && (
                              <>
                                <span>•</span>
                                <span>IP: {log.ip_address.split(',')[0]}</span>
                              </>
                            )}
                            {log.actor?.role && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{log.actor.role.replace('_', ' ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-zinc-800">
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
