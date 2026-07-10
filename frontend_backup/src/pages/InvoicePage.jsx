import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Download, CheckCircle, Clock, Package, CreditCard, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ordersAPI } from '@/lib/api';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

export default function InvoicePage() {
  const { orderId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await ordersAPI.getInvoice(orderId);
      setInvoice(res.data);
    } catch (err) {
      console.error('Error:', err);
      setError('Invoice not found');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Invoice Not Found</h1>
          <p className="text-muted-foreground mb-6">The invoice you're looking for doesn't exist.</p>
          <Link to="/">
            <Button variant="outline">Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const order = invoice.order;
  const subtotal = order.subtotal || order.total || order.total_amount || 0;
  const serviceCharge = order.service_charge || 0;
  const tax = order.tax || 0;
  const creditsUsed = order.credits_used || 0;
  const total = order.total || order.total_amount || 0;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-500';
      case 'confirmed': return 'text-primary';
      case 'pending': return 'text-yellow-500';
      case 'cancelled': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      case 'confirmed': return <CreditCard className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-black py-8 print:py-0">
      {/* Header Actions - Hidden on Print */}
      <div className="max-w-4xl mx-auto px-4 mb-6 print:hidden">
        <div className="flex justify-between items-center">
          <Link to="/">
            <Button variant="ghost" className="text-white hover:text-primary">
              ← Back to Home
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" className="bg-secondary border-white/10">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handlePrint} className="bg-primary text-black hover:bg-primary/90">
              Print Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Container */}
      <div className="max-w-4xl mx-auto bg-card border border-white/10 print:border-0 print:shadow-none rounded-lg overflow-hidden" id="invoice">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10 px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              <img src={LOGO_URL} alt="GameShop Nepal" className="h-12 mb-3" />
              <h1 className="text-3xl font-heading font-bold text-white mb-1">INVOICE</h1>
              <p className="text-muted-foreground">Digital Products Marketplace</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border ${order.status === 'Completed' ? 'border-green-500/50' : 'border-primary/50'} mb-3`}>
                {getStatusIcon(order.status)}
                <span className={`font-semibold ${getStatusColor(order.status)}`}>
                  {order.status || 'Pending'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Invoice #</p>
              <p className="text-lg font-bold text-white font-mono">{order.id?.substring(0, 12).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Company & Customer Info */}
        <div className="grid md:grid-cols-2 gap-8 px-8 py-8 bg-black/20">
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">From</h3>
            <div className="text-white">
              <p className="font-bold text-lg mb-1">GameShop Nepal</p>
              <p className="text-muted-foreground text-sm">Kathmandu, Nepal</p>
              <p className="text-muted-foreground text-sm">support@gameshopnepal.com</p>
              <p className="text-muted-foreground text-sm">+977 9743488871</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Bill To</h3>
            <div className="text-white">
              <p className="font-bold text-lg mb-1">{order.customer_name || 'Customer'}</p>
              <p className="text-muted-foreground text-sm">{order.customer_email || 'N/A'}</p>
              <p className="text-muted-foreground text-sm">{order.customer_phone || 'N/A'}</p>
              <p className="text-muted-foreground text-sm mt-3">
                <span className="text-white font-semibold">Date:</span> {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-8 py-6">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Order Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Item</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Qty</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-semibold text-white">{item.name}</p>
                      {item.variation && (
                        <p className="text-sm text-muted-foreground">{item.variation}</p>
                      )}
                    </td>
                    <td className="text-center py-4 px-4 text-white">{item.quantity}</td>
                    <td className="text-right py-4 px-4 text-white">Rs {Math.round(item.price || 0).toLocaleString()}</td>
                    <td className="text-right py-4 px-4 font-semibold text-white">Rs {Math.round((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="px-8 py-6 bg-black/20 border-t border-white/10">
          <div className="max-w-md ml-auto">
            <div className="space-y-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>Rs {Math.round(subtotal).toLocaleString()}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Charge</span>
                  <span>Rs {Math.round(serviceCharge).toLocaleString()}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>Rs {Math.round(tax).toLocaleString()}</span>
                </div>
              )}
              {creditsUsed > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>Store Credits Used</span>
                  <span>- Rs {Math.round(creditsUsed).toLocaleString()}</span>
                </div>
              )}
              <div className="h-px bg-white/10 my-3"></div>
              <div className="flex justify-between items-center">
                <span className="text-xl font-heading font-bold text-white">Total Amount</span>
                <span className="text-2xl font-heading font-bold text-primary">Rs {Math.round(total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Screenshot Section */}
        {order.payment_screenshot && (
          <div className="px-8 py-6 border-t border-white/10">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Image className="h-4 w-4" />
              Payment Proof
            </h3>
            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-shrink-0">
                  <img 
                    src={order.payment_screenshot} 
                    alt="Payment Screenshot" 
                    className="max-w-[300px] max-h-[400px] rounded-lg border border-white/20 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden items-center justify-center w-[200px] h-[150px] bg-white/5 rounded-lg border border-white/10">
                    <p className="text-muted-foreground text-sm">Image unavailable</p>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium mb-2">Payment Method</p>
                  <p className="text-muted-foreground text-sm mb-4">{order.payment_method || 'Bank Transfer / eSewa / Khalti'}</p>
                  
                  {order.payment_date && (
                    <>
                      <p className="text-white font-medium mb-2">Payment Date</p>
                      <p className="text-muted-foreground text-sm">
                        {new Date(order.payment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Info if no screenshot */}
        {!order.payment_screenshot && order.payment_method && (
          <div className="px-8 py-6 border-t border-white/10">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Payment Information</h3>
            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
              <p className="text-white"><span className="text-muted-foreground">Method:</span> {order.payment_method}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-6 bg-gradient-to-b from-transparent to-black/20 border-t border-white/5">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Thank you for your business!</p>
            <p className="text-xs text-muted-foreground">
              For any queries, contact us at <span className="text-primary">support@gameshopnepal.com</span>
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              This is a computer-generated invoice. No signature required.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
