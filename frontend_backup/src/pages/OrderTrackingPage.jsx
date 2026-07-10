import { useState } from 'react';
import { Search, Package, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { orderTrackingAPI } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pending Payment' },
  processing: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Processing' },
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Cancelled' },
  delivered: { icon: Truck, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Delivered' },
};

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await orderTrackingAPI.track(orderId.trim());
      setOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Order not found. Please check your order ID.');
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = order ? statusConfig[order.status]?.icon || Clock : Clock;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="pt-14 md:pt-24 pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Track Your Order</h1>
            <p className="text-gray-400">Enter your Take.app order number to check the status</p>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <form onSubmit={handleTrack} className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Enter Order Number (e.g., ORD-12345)"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                  data-testid="order-id-input"
                />
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                  data-testid="track-order-btn"
                >
                  {loading ? 'Tracking...' : <><Search className="w-4 h-4 mr-2" /> Track</>}
                </Button>
              </form>

              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400" data-testid="error-message">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {order && (
            <div className="mt-8 space-y-6" data-testid="order-details">
              {/* Order Status Card */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <div className={`p-3 rounded-full ${statusConfig[order.status]?.bg || 'bg-zinc-800'}`}>
                      <StatusIcon className={`w-6 h-6 ${statusConfig[order.status]?.color || 'text-gray-400'}`} />
                    </div>
                    <div>
                      <span className="block text-lg">{statusConfig[order.status]?.label || order.status}</span>
                      <span className="block text-sm text-gray-400 font-normal">Order #{order.order_number || order.id?.slice(0, 8)}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Items</p>
                      <p className="text-white">{order.items_text}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Amount</p>
                      <p className="text-amber-500 font-semibold">Rs {order.total_amount}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Order Date</p>
                      <p className="text-white">{new Date(order.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Delivery</p>
                      <p className="text-green-400">{order.estimated_delivery}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Timeline */}
              {order.status_history && order.status_history.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Order Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order.status_history.map((entry, idx) => (
                        <div key={entry.id || idx} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${idx === order.status_history.length - 1 ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                            {idx < order.status_history.length - 1 && (
                              <div className="w-0.5 h-full bg-zinc-700 mt-1" />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className="text-white font-medium capitalize">{entry.new_status}</p>
                            {entry.note && <p className="text-gray-400 text-sm">{entry.note}</p>}
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(entry.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Help Section */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <p className="text-gray-400 text-sm text-center">
                    Need help with your order? Contact us on{' '}
                    <a href="https://wa.me/9779743488871" className="text-amber-500 hover:underline" target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
