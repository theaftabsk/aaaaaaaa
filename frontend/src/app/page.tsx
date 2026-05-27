import Link from 'next/link';
import { MessageSquare, Zap, Layers, BarChart, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/30">
            V
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Vexo</span>
        </div>
        <div>
          <Link href="/login" className="text-slate-600 font-medium hover:text-emerald-600 px-5 py-2.5 transition-colors">
            Login
          </Link>
          <Link href="/login" className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-2.5 rounded-full shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-24 pb-32 text-center max-w-4xl relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-300/20 blur-[120px] rounded-full -z-10"></div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">
          Next-Gen <span className="text-emerald-500">WhatsApp CRM</span> & Automations
        </h1>
        <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Scale your business with automated replies, visual flow builders, and a powerful team inbox. Connect your WhatsApp and supercharge your customer support.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/login" className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-full shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-0.5 active:scale-95 text-lg">
            Start for Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-24 border-t border-slate-100">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to grow</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Vexo provides a complete suite of tools to manage your WhatsApp interactions efficiently.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<MessageSquare className="w-6 h-6 text-emerald-500" />}
              title="Team Inbox"
              description="Collaborate with your team to handle customer queries from a single WhatsApp number."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-amber-500" />}
              title="Smart AI Replies"
              description="Use AI to automatically answer common questions instantly, 24/7."
            />
            <FeatureCard 
              icon={<Layers className="w-6 h-6 text-blue-500" />}
              title="Flow Builder"
              description="Visually design conversation flows and automated chatbots with zero code."
            />
            <FeatureCard 
              icon={<BarChart className="w-6 h-6 text-purple-500" />}
              title="Analytics & CRM"
              description="Track message performance, manage leads, and organize contacts seamlessly."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}
