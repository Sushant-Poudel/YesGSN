import { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  FileText, 
  Users, 
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  History,
  Rocket,
  Tag,
  Calendar,
  Package,
  Sparkles,
  User,
  Palette
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AdminLayout from '@/components/AdminLayout';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TEMPLATE_ICONS = {
  new_product: Rocket,
  sale_announcement: Tag,
  weekly_update: Calendar,
  restock_alert: Package,
  custom: Sparkles,
  gift_card: Send
};

const DEFAULT_COLORS = {
  primary_color: '#F59E0B',      // Amber - main accent
  secondary_color: '#1F2937',    // Dark gray - headers
  text_color: '#374151',         // Gray - body text
  background_color: '#FFFFFF',   // White - email bg
  button_color: '#F59E0B',       // Amber - buttons
  button_text_color: '#000000',  // Black - button text
};

export default function AdminNewsletter() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState({});
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [singleEmail, setSingleEmail] = useState('');
  const [subscriberCounts, setSubscriberCounts] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [activeTab, setActiveTab] = useState('compose');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [templatesRes, countsRes, campaignsRes] = await Promise.all([
        axios.get(`${API_URL}/newsletter/templates`, { headers }),
        axios.get(`${API_URL}/newsletter/subscribers/count`, { headers }),
        axios.get(`${API_URL}/newsletter/campaigns`, { headers })
      ]);

      setTemplates(templatesRes.data);
      setSubscriberCounts(countsRes.data);
      setCampaigns(campaignsRes.data);
    } catch (error) {
      toast.error('Failed to load newsletter data');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    const initialVars = {};
    template.variables.forEach(v => {
      initialVars[v] = '';
    });
    setVariables(initialVars);
    setColors(DEFAULT_COLORS);
    setPreviewHtml('');
    setPreviewSubject('');
  };

  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleVariableChange = (key, value) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const handlePreview = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.post(`${API_URL}/newsletter/preview`, {
        template_id: selectedTemplate.id,
        variables,
        colors
      }, { headers: { Authorization: `Bearer ${token}` }});

      setPreviewSubject(res.data.subject);
      setPreviewHtml(res.data.html);
      setShowPreview(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate preview');
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.post(`${API_URL}/newsletter/send-test`, {
        template_id: selectedTemplate.id,
        variables,
        colors,
        test_email: testEmail
      }, { headers: { Authorization: `Bearer ${token}` }});

      if (res.data.sent > 0) {
        toast.success(`Test email sent to ${testEmail}`);
      } else {
        toast.error('Failed to send test email');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send test');
    } finally {
      setSending(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    // For single email, validate the email
    if (recipientFilter === 'single') {
      if (!singleEmail || !singleEmail.includes('@')) {
        toast.error('Please enter a valid email address');
        return;
      }
      if (!window.confirm(`Send email to ${singleEmail}?`)) {
        return;
      }
    } else {
      const recipientCount = subscriberCounts[recipientFilter] || 0;
      if (recipientCount === 0) {
        toast.error('No recipients in selected group');
        return;
      }
      if (!window.confirm(`Send newsletter to ${recipientCount} recipients?`)) {
        return;
      }
    }

    setSending(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.post(`${API_URL}/newsletter/send`, {
        template_id: selectedTemplate.id,
        variables,
        colors,
        recipient_filter: recipientFilter,
        single_email: recipientFilter === 'single' ? singleEmail : null
      }, { headers: { Authorization: `Bearer ${token}` }});

      toast.success(`Newsletter sent! ${res.data.sent} delivered, ${res.data.failed} failed`);
      setShowPreview(false);
      setSingleEmail('');
      fetchData();
      setActiveTab('history');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send newsletter');
    } finally {
      setSending(false);
    }
  };

  const getVariableLabel = (variable) => {
    const labels = {
      product_name: 'Product Name',
      product_description: 'Product Description',
      product_price: 'Price (Rs)',
      product_image: 'Product Image URL',
      product_link: 'Product Link',
      sale_name: 'Sale Name',
      discount_percent: 'Discount Percentage',
      sale_description: 'Sale Description',
      end_date: 'End Date',
      shop_link: 'Shop Link',
      greeting_text: 'Greeting Text',
      highlight_1: 'Highlight 1',
      highlight_2: 'Highlight 2',
      highlight_3: 'Highlight 3',
      featured_product: 'Featured Product',
      featured_price: 'Featured Price (Rs)',
      subject: 'Email Subject',
      heading: 'Heading',
      body_text: 'Body Text (HTML allowed)',
      button_text: 'Button Text',
      button_link: 'Button Link',
      recipient_name: 'Recipient Name',
      gift_amount: 'Gift Amount (Rs)',
      gift_code: 'Gift Code',
      message: 'Personal Message',
      sender_name: 'Sender Name',
      customer_name: 'Customer Name',
      redeem_code: 'Credentials / Redeem Code',
      instructions: 'How to Use Instructions',
      order_id: 'Order ID'
    };
    return labels[variable] || variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="h-6 w-6 text-amber-500" />
              Newsletter
            </h1>
            <p className="text-gray-400 text-sm mt-1">Send bulk emails to your customers</p>
          </div>
          
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{subscriberCounts.all || 0}</p>
              <p className="text-xs text-gray-400">Total Contacts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{subscriberCounts.subscribed || 0}</p>
              <p className="text-xs text-gray-400">Subscribed</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="compose" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <FileText className="h-4 w-4 mr-2" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Template Selection */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg">1. Choose Template</CardTitle>
                  <CardDescription>Select a preset template</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {templates.map((template) => {
                    const Icon = TEMPLATE_ICONS[template.id] || FileText;
                    const isSelected = selectedTemplate?.id === template.id;
                    
                    return (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-amber-500 bg-amber-500/10' 
                            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500/20' : 'bg-zinc-700'}`}>
                            <Icon className={`h-5 w-5 ${isSelected ? 'text-amber-500' : 'text-gray-400'}`} />
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${isSelected ? 'text-amber-500' : 'text-white'}`}>
                              {template.name}
                            </p>
                            <p className="text-gray-500 text-sm mt-1">{template.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Variable Input */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg">2. Fill Details</CardTitle>
                  <CardDescription>
                    {selectedTemplate ? `Configure ${selectedTemplate.name}` : 'Select a template first'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedTemplate ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {selectedTemplate.variables.map((variable) => (
                        <div key={variable} className="space-y-2">
                          <Label className="text-gray-300">{getVariableLabel(variable)}</Label>
                          {variable === 'body_text' || variable === 'product_description' || variable === 'sale_description' ? (
                            <Textarea
                              value={variables[variable] || ''}
                              onChange={(e) => handleVariableChange(variable, e.target.value)}
                              placeholder={`Enter ${getVariableLabel(variable).toLowerCase()}`}
                              className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                            />
                          ) : (
                            <Input
                              type={variable.includes('price') || variable.includes('percent') ? 'number' : 'text'}
                              value={variables[variable] || ''}
                              onChange={(e) => handleVariableChange(variable, e.target.value)}
                              placeholder={`Enter ${getVariableLabel(variable).toLowerCase()}`}
                              className="bg-zinc-800 border-zinc-700 text-white"
                            />
                          )}
                        </div>
                      ))}
                      
                      {/* Color Settings Toggle */}
                      <div className="pt-4 border-t border-zinc-700">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowColorSettings(!showColorSettings)}
                          className="w-full border-zinc-700 text-gray-300 hover:text-white"
                        >
                          <Palette className="h-4 w-4 mr-2" />
                          {showColorSettings ? 'Hide' : 'Show'} Color Settings
                        </Button>
                        
                        {showColorSettings && (
                          <div className="mt-4 space-y-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                            <p className="text-xs text-gray-400 mb-3">Customize email colors</p>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-gray-400 text-xs">Primary/Accent</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={colors.primary_color}
                                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                  />
                                  <Input
                                    value={colors.primary_color}
                                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 flex-1"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <Label className="text-gray-400 text-xs">Heading Color</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={colors.secondary_color}
                                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                  />
                                  <Input
                                    value={colors.secondary_color}
                                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 flex-1"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <Label className="text-gray-400 text-xs">Body Text</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={colors.text_color}
                                    onChange={(e) => handleColorChange('text_color', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                  />
                                  <Input
                                    value={colors.text_color}
                                    onChange={(e) => handleColorChange('text_color', e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 flex-1"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <Label className="text-gray-400 text-xs">Background</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={colors.background_color}
                                    onChange={(e) => handleColorChange('background_color', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                  />
                                  <Input
                                    value={colors.background_color}
                                    onChange={(e) => handleColorChange('background_color', e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 flex-1"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <Label className="text-gray-400 text-xs">Button Color</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={colors.button_color}
                                    onChange={(e) => handleColorChange('button_color', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                  />
                                  <Input
                                    value={colors.button_color}
                                    onChange={(e) => handleColorChange('button_color', e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 flex-1"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <Label className="text-gray-400 text-xs">Button Text</Label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={colors.button_text_color}
                                    onChange={(e) => handleColorChange('button_text_color', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                  />
                                  <Input
                                    value={colors.button_text_color}
                                    onChange={(e) => handleColorChange('button_text_color', e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 flex-1"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setColors(DEFAULT_COLORS)}
                              className="w-full mt-2 text-gray-400 hover:text-white text-xs"
                            >
                              Reset to Default Colors
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">Select a template to continue</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recipients & Send */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white text-lg">3. Send</CardTitle>
                  <CardDescription>Choose recipients and send</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-gray-300">Recipients</Label>
                    {[
                      { id: 'all', label: 'All Contacts', count: subscriberCounts.all, icon: Users },
                      { id: 'subscribed', label: 'Subscribed Only', count: subscriberCounts.subscribed, icon: Users },
                      { id: 'recent_buyers', label: 'Recent Buyers (30 days)', count: subscriberCounts.recent_buyers, icon: Users },
                      { id: 'single', label: 'Single Recipient', count: null, icon: User }
                    ].map((option) => (
                      <div
                        key={option.id}
                        onClick={() => setRecipientFilter(option.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          recipientFilter === option.id
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <option.icon className={`h-4 w-4 ${recipientFilter === option.id ? 'text-amber-500' : 'text-gray-400'}`} />
                          <span className={recipientFilter === option.id ? 'text-amber-500' : 'text-white'}>
                            {option.label}
                          </span>
                        </div>
                        {option.count !== null && <span className="text-gray-400 text-sm">{option.count}</span>}
                      </div>
                    ))}
                    
                    {/* Single Email Input */}
                    {recipientFilter === 'single' && (
                      <div className="mt-3 p-3 bg-zinc-800 rounded-lg border border-amber-500/30">
                        <Label className="text-amber-500 text-sm">Recipient Email</Label>
                        <Input
                          type="email"
                          value={singleEmail}
                          onChange={(e) => setSingleEmail(e.target.value)}
                          placeholder="customer@email.com"
                          className="bg-zinc-900 border-zinc-700 text-white mt-2"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-4 border-t border-zinc-700">
                    <Label className="text-gray-300">Send Test Email</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="test@email.com"
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      <Button
                        onClick={handleSendTest}
                        disabled={!selectedTemplate || sending}
                        variant="outline"
                        className="border-zinc-600"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={handlePreview}
                      disabled={!selectedTemplate}
                      variant="outline"
                      className="w-full border-zinc-600"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Email
                    </Button>
                    <Button
                      onClick={handleSendCampaign}
                      disabled={!selectedTemplate || sending}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send to {subscriberCounts[recipientFilter] || 0} Recipients
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Campaign History</CardTitle>
                <CardDescription>Past newsletter campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">No campaigns sent yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Date</th>
                          <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Subject</th>
                          <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Template</th>
                          <th className="text-center py-3 px-4 text-gray-400 text-sm font-medium">Recipients</th>
                          <th className="text-center py-3 px-4 text-gray-400 text-sm font-medium">Sent</th>
                          <th className="text-center py-3 px-4 text-gray-400 text-sm font-medium">Failed</th>
                          <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Sent By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((campaign) => (
                          <tr key={campaign.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                            <td className="py-3 px-4 text-gray-300 text-sm">
                              {new Date(campaign.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3 px-4 text-white font-medium max-w-[200px] truncate">
                              {campaign.subject}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-amber-500 text-sm">{campaign.template_id}</span>
                            </td>
                            <td className="py-3 px-4 text-center text-gray-300">
                              {campaign.total_recipients}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-green-500 flex items-center justify-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                {campaign.sent}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {campaign.failed > 0 ? (
                                <span className="text-red-500 flex items-center justify-center gap-1">
                                  <XCircle className="h-4 w-4" />
                                  {campaign.failed}
                                </span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-sm">
                              {campaign.sent_by}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Email Preview</DialogTitle>
            <DialogDescription>Subject: {previewSubject}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh] bg-white rounded-lg">
            <iframe
              srcDoc={previewHtml}
              title="Email Preview"
              className="w-full h-[600px] border-0"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button
              onClick={handleSendCampaign}
              disabled={sending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Campaign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
