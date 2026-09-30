import React, { useEffect, useState } from 'react';
import { 
  Server, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Activity, 
  Terminal, 
  FileText, 
  CheckCircle2,
  Lock
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'docs' | 'simulator' | 'diagrams' | 'architecture';
  setActiveTab: (tab: 'docs' | 'simulator' | 'diagrams' | 'architecture') => void;
  selectedDocId: string;
  onSelectDoc: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  selectedDocId 
}) => {
  const [tehranTime, setTehranTime] = useState<string>('');
  const [cutOffStatus, setCutOffStatus] = useState<string>('عادی (Normal)');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Iran Standard Time (UTC+3:30)
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Tehran',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      const timeStr = new Intl.DateTimeFormat('fa-IR', options).format(now);
      setTehranTime(timeStr);

      const hours = now.getUTCHours() + 3.5;
      const normalizedHour = (hours % 24);
      if (normalizedHour >= 23.9 || normalizedHour <= 0.1) {
        setCutOffStatus('هشدار کات‌آف ۰۰:۰۰ (پایان روز مالی)');
      } else if (normalizedHour >= 0.9 && normalizedHour <= 1.1) {
        setCutOffStatus('هشدار کات‌آف ۰۱:۰۰ (تسویه شاپرک)');
      } else {
        setCutOffStatus('عملیات عادی (Normal)');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Service Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">mahak.service</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60 font-mono">v1.0.0</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                یکپارچه‌سازی سامانه شبکه ملی اعتبار (فارا / شما - کالابرگ)
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'docs'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>مستندات فنی (SDD)</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>شبیه‌ساز ۳ مرحله‌ای</span>
            </button>

            <button
              onClick={() => setActiveTab('diagrams')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'diagrams'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>دیاگرام‌ها و ماشین حالت</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>امنیت و DPAPI</span>
            </button>
          </nav>

          {/* Realtime Status Indicator & Time */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-left bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>زمان تهران:</span>
                <span className="font-mono text-slate-200 font-semibold">{tehranTime || '--:--:--'}</span>
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{cutOffStatus}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
