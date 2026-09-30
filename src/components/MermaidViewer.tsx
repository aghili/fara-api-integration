import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Layers, GitFork, ArrowRightLeft, RefreshCw, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#2563eb',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#3b82f6',
    lineColor: '#60a5fa',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    fontFamily: 'Vazirmatn, sans-serif'
  }
});

interface DiagramTab {
  id: string;
  title: string;
  category: string;
  code: string;
  description: string;
}

const DIAGRAMS: DiagramTab[] = [
  {
    id: 'seq-standard',
    title: 'توالی تراکنش ۳ مرحله‌ای استاندارد',
    category: 'Sequence',
    description: 'جریان تعامل میان کاربر، صندوق محک، سرویس ویندوزی mahak.service، وب‌سرویس فارا و پایانه شاپرک',
    code: `sequenceDiagram
    autonumber
    actor Cashier as اپراتور / صندوق محک
    participant WinService as mahak.service (ویندوز سرویس)
    participant FaraAPI as سامانه فارا / شما
    participant PosBank as پایانه کارتخوان شاپرک

    Note over Cashier,FaraAPI: گام ۱: ثبت سبد کالا (ItemOrder)
    Cashier->>WinService: ارسال اقلام سبد کالا (GTIN, فی, تعداد)
    WinService->>WinService: ثبت سفارش با وضعیت ItemOrderCreated
    WinService->>FaraAPI: POST /api/v1/orders/items (Bearer JWT)
    FaraAPI-->>WinService: تولید و بازگشت orderTrace
    WinService-->>Cashier: دریافت orderTrace و آماده‌سازی گام ۲

    Note over Cashier,FaraAPI: گام ۲: استعلام اعتبار و تسهیم (PurchaseInquiry)
    Cashier->>WinService: درخواست استعلام با شماره کارت یا OTP
    WinService->>FaraAPI: POST /api/v1/orders/inquiry (orderTrace, Card/OTP)
    FaraAPI-->>WinService: کسر موقت اعتبار + اعلام سهم نقدی و یارانه
    WinService->>WinService: به‌روزرسانی وضعیت به InquiryReserved
    WinService-->>Cashier: اعلام سهم یارانه و سهم نقدی خریدار

    Note over Cashier,PosBank: پرداخت سهم نقدی در پایانه شاپرک
    Cashier->>PosBank: ارسال سهم نقدی به کارتخوان بانکی
    PosBank-->>Cashier: تراکنش موفق شاپرک (دریافت RRN و STAN)

    Note over Cashier,FaraAPI: گام ۳: تایید نهایی سفارش (ConfirmOrder)
    Cashier->>WinService: تایید نهایی همراه با RRN و STAN
    WinService->>FaraAPI: POST /api/v1/orders/confirm (orderTrace, RRN, STAN)
    FaraAPI-->>WinService: صدور ConfirmReference و قطعی‌سازی تسویه
    WinService->>WinService: تغییر وضعیت به Confirmed و لاگ کامل
    WinService-->>Cashier: فاکتور نهایی صادر و چاپ گردید`
  },
  {
    id: 'seq-otp',
    title: 'توالی خرید بدون کارت (Cardless OTP)',
    category: 'Sequence',
    description: 'جریان استعلام با رمز یکبار مصرف پیامک‌شده به سرپرست خانوار',
    code: `sequenceDiagram
    autonumber
    actor Customer as سرپرست خانوار
    actor Cashier as صندوقدار محک
    participant WinService as mahak.service
    participant FaraAPI as سامانه فارا / شما

    Cashier->>WinService: درخواست ایجاد جلسه بدون کارت (کد ملی + شماره موبایل)
    WinService->>FaraAPI: POST /api/v1/otp/generate (NationalCode, Mobile)
    FaraAPI-->>Customer: ارسال پیامک رمز یکبار مصرف (SMS OTP)
    FaraAPI-->>WinService: sessionId معتبر (انقضا: ۱۲۰ ثانیه)
    Customer->>Cashier: ارائه رمز یکبار مصرف پیامک‌شده
    Cashier->>WinService: استعلام خرید با OTP و orderTrace
    WinService->>FaraAPI: POST /api/v1/orders/inquiry-otp (sessionId, OTP, orderTrace)
    FaraAPI-->>WinService: تایید اعتبار و تسهیم سهم یارانه
    WinService-->>Cashier: پاسخ موفق و ادامه مسیر طبق گام ۳ (ConfirmOrder)`
  },
  {
    id: 'state-machine',
    title: 'ماشین حالت کامل تراکنش‌ها (State Transition)',
    category: 'State',
    description: 'تمام وضعیت‌ها و گذارهای ممکن از ثبت اولیه تا تایید قطعی، انصراف یا برگشت',
    code: `stateDiagram-v2
    [*] --> None
    None --> ItemOrderCreated: ثبت اقلام (ItemOrder)
    
    ItemOrderCreated --> InquiryReserved: استعلام موفق اعتبار (PurchaseInquiry)
    ItemOrderCreated --> CancelledByUser: انصراف قبل از استعلام
    
    InquiryReserved --> Confirmed: تراکنش شاپرک موفق + ConfirmOrder
    InquiryReserved --> CancelledByUser: انصراف خریدار / عدم موجودی کارت (CancelOrder)
    InquiryReserved --> ExpiredTimeout: گذشت زمان انقضای رزرو اعتبار (Sweeper Job)
    
    Confirmed --> Reversed: خطای چاپگر / اصلاح حساب (ReverseOrder)
    Confirmed --> [*]: پایان تراکنش موفق
    
    CancelledByUser --> [*]: آزادسازی اعتبار در فارا
    Reversed --> [*]: برگشت کامل وجه و اعتبار
    ExpiredTimeout --> [*]`
  },
  {
    id: 'seq-token',
    title: 'مدیریت توکن JWT و SemaphoreSlim',
    category: 'Token',
    description: 'جریان کنترل همزمانی، کشینگ درون‌حافظه‌ای و تجدید خودکار در مواجهه با خطای ۴۰۱',
    code: `sequenceDiagram
    autonumber
    participant ThreadA as درخواست ۱ (Thread A)
    participant ThreadB as درخواست ۲ (Thread B)
    participant TokenMgr as TokenManager (MemoryCache)
    participant Lock as SemaphoreSlim(1,1)
    participant FaraAuth as /api/v1/auth/login

    ThreadA->>TokenMgr: GetValidTokenAsync()
    TokenMgr->>TokenMgr: بررسی کش (کلید خالی است)
    ThreadA->>Lock: WaitAsync() [قفل اخذ شد]
    
    ThreadB->>TokenMgr: GetValidTokenAsync()
    ThreadB->>Lock: WaitAsync() [در انتظار قفل...]
    
    ThreadA->>FaraAuth: ارسال ClientId + ClientSecret
    FaraAuth-->>ThreadA: بازگشت JWT Token (اعتبار ۲۴ ساعت)
    ThreadA->>TokenMgr: ذخیره در IMemoryCache (۲۳ ساعت و ۴۵ دقیقه)
    ThreadA->>Lock: Release() [قفل آزاد شد]
    
    Lock-->>ThreadB: قفل به Thread B واگذار شد
    ThreadB->>TokenMgr: Double-Check Cache (توکن موجود است!)
    ThreadB->>Lock: Release() [بدون فراخوانی مجدد Login]`
  }
];

export const MermaidViewer: React.FC = () => {
  const [selectedDiagram, setSelectedDiagram] = useState<DiagramTab>(DIAGRAMS[0]);
  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        const id = 'mermaid-svg-' + Math.floor(Math.random() * 10000);
        const { svg } = await mermaid.render(id, selectedDiagram.code);
        if (isMounted) {
          setRenderedSvg(svg);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [selectedDiagram]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono font-bold text-blue-400">STATE MACHINE & SEQUENCE DIAGRAMS</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            دیاگرام‌های تعاملی معماری، توالی و ماشین حالت
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            بررسی دقیق تعاملات ناهمگام (Async)، مدیریت خطای شاپرک و چرخه عمر توکن
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setZoom(prev => Math.max(0.6, prev - 0.15))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="بزرگ‌نمایی کمتر"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-300 px-2">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(1.8, prev + 0.15))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="بزرگ‌نمایی بیشتر"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="ریست زوم"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {DIAGRAMS.map((diag) => (
          <button
            key={diag.id}
            onClick={() => {
              setSelectedDiagram(diag);
              setZoom(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition border ${
              selectedDiagram.id === diag.id
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
            }`}
          >
            {diag.title}
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-300">
        <strong>توضیح فنی:</strong> {selectedDiagram.description}
      </div>

      {/* Mermaid Canvas */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-x-auto min-h-[480px] flex items-center justify-center">
        <div 
          ref={containerRef}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}
          className="w-full flex justify-center text-center [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: renderedSvg }}
        />
      </div>

    </div>
  );
};
