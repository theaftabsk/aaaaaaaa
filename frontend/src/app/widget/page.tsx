'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  from: 'User' | 'Bot';
  text: string;
  createdAt: Date;
}

function WidgetInner() {
  const searchParams = useSearchParams();
  const widgetId = searchParams.get('id');
  
  const [socket, setSocket] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate or retrieve persistent customer ID
    let cid = localStorage.getItem('vexo_customer_id');
    if (!cid) {
      cid = 'cust_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('vexo_customer_id', cid);
    }
    setCustomerId(cid);

    const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}`);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('widget:join', cid);
    });

    newSocket.on('widget:message', (data: any) => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          from: 'Bot',
          text: data.text,
          createdAt: new Date(data.createdAt),
        },
      ]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !widgetId) return;

    const text = input.trim();
    setInput('');

    // Optimistically add to UI
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        from: 'User',
        text,
        createdAt: new Date(),
      },
    ]);
    setIsTyping(true);

    // Send to backend
    socket.emit('widget:incoming_message', {
      widgetId,
      customerId,
      text,
    });
  };

  if (!widgetId) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 text-slate-500 text-sm p-4 text-center">
        Invalid Widget ID. Please check your embed code.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 flex items-center gap-3 shadow-md z-10">
        <div className="relative">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20 shadow-sm">
            <Sparkles className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-emerald-600 rounded-full"></div>
        </div>
        <div>
          <h1 className="font-bold text-white text-sm">Vexo Live Chat</h1>
          <p className="text-emerald-100 text-xs font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Online
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-sm mt-8">
            <Bot className="w-10 h-10 mx-auto text-emerald-200 mb-2 opacity-50" />
            <p>Welcome! How can we help you today?</p>
          </div>
        )}
        
        {messages.map((msg) => {
          const isUser = msg.from === 'User';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              )}
              
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isUser
                    ? 'bg-emerald-500 text-white rounded-br-none shadow-sm shadow-emerald-500/10'
                    : 'bg-white text-slate-700 rounded-bl-none border border-slate-100 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                <div className={`text-[10px] mt-1 text-right ${isUser ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mr-2 flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100">
        <form onSubmit={sendMessage} className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 rounded-full pl-4 pr-12 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1.5 p-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-full transition-colors active:scale-95"
          >
            <Send className="w-4 h-4 translate-x-px translate-y-px" />
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">⚡ Powered by Vexo AI</span>
        </div>
      </div>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 text-sm p-4 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
        Loading Live Chat...
      </div>
    }>
      <WidgetInner />
    </Suspense>
  );
}
