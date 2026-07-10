'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Send, Loader2, Bot, User, Minimize2 } from 'lucide-react';
import { productsAPI } from '@/lib/api';

const PAGEGRID_API_KEY = 'sk-pgrid-d1c6f03e7f8ee17375d3f58961c1cef870a72d8a64b21c54405dc9ab700905ee';
const PAGEGRID_BASE_URL = 'https://api.pagegrid.in/v1/messages';

function buildSystemPrompt(products) {
  const productList = products.map(p => {
    const plans = p.variations?.map(v =>
      `    - ${v.name}: Rs. ${v.price}${v.original_price ? ` (was Rs. ${v.original_price})` : ''}`
    ).join('\n') || '';
    const desc = p.description?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
    return `• ${p.name} → gameshopnepal.com/product/${p.slug}\n  Plans:\n${plans}\n  About: ${desc}`;
  }).join('\n\n');

  return `You are GSN Assistant — the friendly AI helper for GameShop Nepal (gameshopnepal.com), Nepal's most trusted digital subscription store founded in 2021 and based in Butwal.

ABOUT GAMESHOP NEPAL:
- Sells digital subscriptions: Netflix, Spotify, YouTube Premium, ChatGPT Plus, PUBG UC, games and more
- Trusted since 2021 with 4.7/5 customer rating (170+ reviews)
- Payment: eSewa, Khalti, Bank Transfer, IME Pay
- Delivery: Via WhatsApp after payment screenshot upload — usually within minutes
- Support: support@gameshopnepal.com | WhatsApp: +977 9743488871
- All prices in Nepali Rupees (Rs.)
- Indian paid accounts used for streaming services (Netflix, Prime Video etc.)

HOW ORDERING WORKS:
1. Select product and plan on website
2. Fill in name and email
3. Choose payment method (eSewa/Khalti/Bank Transfer)
4. Upload payment screenshot
5. Click Proceed → connected to WhatsApp instantly
6. Receive subscription access within minutes via WhatsApp

ALL PRODUCTS & PRICES:
${productList}

IMPORTANT RULES:
- Always respond in the same language the customer uses (English or Nepali/Roman Nepali)
- Be friendly, helpful and concise
- If asked about a product, mention the price and plans clearly
- Always encourage customers to order — mention how easy and fast the process is
- If unsure about something, direct them to WhatsApp support: +977 9743488871
- Never make up prices or features not listed above
- For orders, direct them to the product page on gameshopnepal.com`;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Namaste! 🙏 I\'m GSN Assistant. I can help you find the right subscription, check prices, or answer any questions about GameShop Nepal. What can I help you with today? / के मलाई तपाईंलाई सहयोग गर्न सक्छु?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productsAPI.getAll();
        setProducts(res.data || []);
      } catch (e) {
        console.error('ChatWidget: failed to load products');
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(products);
      const conversationHistory = messages
        .concat({ role: 'user', content: userMessage })
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(PAGEGRID_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': PAGEGRID_API_KEY,
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1024,
          system: systemPrompt,
          messages: conversationHistory,
        }),
      });

      const data = await response.json();
      const reply = data?.content?.[0]?.text || 'Sorry, I could not get a response. Please try again or contact us on WhatsApp: +977 9743488871';

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (!isOpen) setHasUnread(true);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please contact us on WhatsApp: +977 9743488871 or email support@gameshopnepal.com'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    'What is the Netflix price?',
    'How do I order?',
    'Do you have ChatGPT Plus?',
    'Payment methods?',
  ];

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-20 right-4 z-50 w-[340px] sm:w-[380px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col transition-all duration-300 ${isMinimized ? 'h-14' : 'h-[520px]'}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-amber-600/5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">GSN Assistant</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-green-400 text-xs">Online</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMinimized(!isMinimized)} className="text-white/40 hover:text-white p-1 transition-colors">
                <Minimize2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white p-1 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3 h-3 text-black" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-black rounded-br-sm'
                        : 'bg-white/10 text-white rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3 h-3 text-black" />
                    </div>
                    <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions */}
              {messages.length === 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(q); setTimeout(() => sendMessage(), 100); }}
                      className="text-xs bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-white/70 hover:text-amber-400 rounded-full px-3 py-1 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-white/10">
                <div className="flex gap-2 items-end bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-amber-500/50 transition-colors">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    rows={1}
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 resize-none focus:outline-none max-h-24 overflow-y-auto"
                    style={{ lineHeight: '1.5' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="w-7 h-7 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 text-black animate-spin" /> : <Send className="w-3.5 h-3.5 text-black" />}
                  </button>
                </div>
                <p className="text-center text-white/20 text-[10px] mt-1.5">Powered by GSN AI • gameshopnepal.com</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setHasUnread(false); }}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 bg-amber-500 hover:bg-amber-600 rounded-full shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 md:bottom-6"
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <MessageCircle className="w-6 h-6 text-black" />
        {hasUnread && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>
    </>
  );
}
