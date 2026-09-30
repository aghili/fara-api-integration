import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Shield, 
  CreditCard, 
  Key, 
  Smartphone, 
  ArrowRight, 
  Database, 
  Server, 
  Cpu, 
  RefreshCw,
  Lock,
  Unlock,
  Copy
} from 'lucide-react';

export const InteractiveSimulator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isCardless, setIsCardless] = useState<boolean>(false);
  const [nationalCode, setNationalCode] = useState<string>('0012345678');
  const [mobileNumber, setMobileNumber] = useState<string>('09123456789');
  const [otpCode, setOtpCode] = useState<string>('749201');
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'روغن مایع آفتابگردان (کالابرگی)', barcode: '6260123456789', price: 650000, quantity: 2, subsidized: true },
    { id: 2, name: 'برنج ایرانی درجه یک (کالابرگی)', barcode: '6260987654321', price: 1100000, quantity: 1, subsidized: true },
    { id: 3, name: 'پنیر سفید پگاه (کالابرگی)', barcode: '6260555544443', price: 450000, quantity: 2, subsidized: true }
  ]);

  const [orderTrace, setOrderTrace] = useState<string>('');
  const [inquiryResult, setInquiryResult] = useState<{
    totalAmount: number;
    subsidizedAmount: number;
    cashAmount: number;
    reserveId: string;
  } | null>(null);

  const [confirmResult, setConfirmResult] = useState<{
    rrn: string;
    stan: string;
    confirmRef: string;
    timestamp: string;
  } | null>(null);

  const [logs, setLogs] = useState<Array<{ time: string; source: string; message: string; level: 'info' | 'success' | 'warn' | 'error' }>>([
    { time: new Date().toLocaleTimeString(), source: 'System', message: 'سرویس mahak.service آماده پردازش تراکنش‌های فارا است.', level: 'info' }
  ]);

  const addLog = (source: string, message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [
      { time: new Date().toLocaleTimeString('fa-IR'), source, message, level },
      ...prev.slice(0, 49)
    ]);
  };

  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Step 1: ItemOrder
  const handleItemOrder = () => {
    const generatedTrace = 'TRC-' + Math.floor(10000000 + Math.random() * 90000000);
    setOrderTrace(generatedTrace);
    setCurrentStep(1);
    addLog('FaraClient', `ارسال اقلام سبد خرید (${cartItems.length} قلم کالا) به /api/v1/orders/items`, 'info');
    addLog('mahak.service', `پاسخ فارا دریافت شد: orderTrace = ${generatedTrace} | وضعیت محلی: ItemOrderCreated`, 'success');
  };

  // Step 2: PurchaseInquiry
  const handlePurchaseInquiry = () => {
    const subAmount = Math.floor(totalCartPrice * 0.7); // 70% subsidized
    const cashAmount = totalCartPrice - subAmount;
    const resId = 'RES-' + Math.floor(100000 + Math.random() * 900000);

    setInquiryResult({
      totalAmount: totalCartPrice,
      subsidizedAmount: subAmount,
      cashAmount: cashAmount,
      reserveId: resId
    });
    setCurrentStep(2);

    addLog('FaraClient', `استعلام اعتبار با ${isCardless ? 'رمز یکبار مصرف (OTP)' : 'کارت بانکی سرپرست'} برای orderTrace=${orderTrace}`, 'info');
    addLog('FaraClient', `اعتبار اختصاص‌یافته: ${subAmount.toLocaleString('fa-IR')} ریال | مانده نقدی مشتری: ${cashAmount.toLocaleString('fa-IR')} ریال`, 'success');
    addLog('mahak.service', `وضعیت محلی به InquiryReserved تغییر یافت. دستور ارسال به کارتخوان شاپرک جهت سهم نقدی صادر شد.`, 'warn');
  };

  // Step 3: ConfirmOrder
  const handleConfirmOrder = () => {
    const rrn = '90' + Math.floor(1000000000 + Math.random() * 9000000000);
    const stan = '' + Math.floor(100000 + Math.random() * 900000);
    const confirmRef = 'CNF-' + Math.floor(1000000 + Math.random() * 9000000);

    setConfirmResult({
      rrn,
      stan,
      confirmRef,
      timestamp: new Date().toISOString()
    });
    setCurrentStep(3);

    addLog('POS.Bank', `تراکنش سهم نقدی در شاپرک موفق بود: RRN=${rrn}, STAN=${stan}`, 'info');
    addLog('FaraClient', `ارسال تاییدیه نهایی به /api/v1/orders/confirm همراه با RRN=${rrn}`, 'info');
    addLog('mahak.service', `سفارش با موفقیت قطعی شد! ConfirmRef=${confirmRef} | فاکتور نهایی صادر شد.`, 'success');
  };

  // Cancel Order
  const handleCancelOrder = () => {
    setCurrentStep(0);
    setInquiryResult(null);
    setConfirmResult(null);
    setOrderTrace('');
    addLog('FaraClient', `درخواست انصراف و آزادسازی اعتبار مسدود شده ارسال شد (/api/v1/orders/cancel)`, 'warn');
    addLog('mahak.service', `تراکنش محلی به وضعیت CancelledByUser تغییر یافت و اعتبار مشتری آزاد شد.`, 'error');
  };

  // Reset
  const handleReset = () => {
    setCurrentStep(0);
    setInquiryResult(null);
    setConfirmResult(null);
    setOrderTrace('');
    addLog('mahak.service', `شبیه‌ساز به حالت اولیه بازگردانی شد.`, 'info');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-blue-400">STATEFUL TRANSACTION SIMULATOR</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            شبیه‌ساز چرخه عمر ۳ مرحله‌ای تراکنش‌های کالابرگ و اعتبارات رفاهی
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            آزمایش زنده گام‌های ItemOrder ← PurchaseInquiry ← ConfirmOrder و تراکنش بدون کارت (OTP)
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>ریست چرخه</span>
        </button>
      </div>

      {/* 3-Step Visual Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Step 1 Box */}
        <div className={`p-4 rounded-2xl border transition-all ${
          currentStep >= 1
            ? 'bg-blue-950/40 border-blue-500/80 shadow-lg shadow-blue-500/10'
            : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-900 text-blue-300">
              گام اول (Step 1)
            </span>
            {currentStep >= 1 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <span className="w-5 h-5 rounded-full border border-slate-700 text-slate-500 flex items-center justify-center text-xs">1</span>
            )}
          </div>
          <h3 className="font-bold text-sm text-slate-100">ثبت اقلام سبد (ItemOrder)</h3>
          <p className="text-xs text-slate-400 mt-1">
            ارسال کدهای GTIN، قیمت‌ها و اخذ <code className="text-blue-300">orderTrace</code>
          </p>
          {orderTrace && (
            <div className="mt-3 p-2 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-blue-400">
              orderTrace: {orderTrace}
            </div>
          )}
        </div>

        {/* Step 2 Box */}
        <div className={`p-4 rounded-2xl border transition-all ${
          currentStep >= 2
            ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-500/10'
            : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-900 text-indigo-300">
              گام دوم (Step 2)
            </span>
            {currentStep >= 2 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <span className="w-5 h-5 rounded-full border border-slate-700 text-slate-500 flex items-center justify-center text-xs">2</span>
            )}
          </div>
          <h3 className="font-bold text-sm text-slate-100">استعلام و تسهیم اعتبار (Inquiry)</h3>
          <p className="text-xs text-slate-400 mt-1">
            محاسبه سهم یارانه، مانده نقدی و رزرو موقت اعتبار
          </p>
          {inquiryResult && (
            <div className="mt-3 p-2 bg-slate-950 rounded-lg border border-slate-800 text-[11px] space-y-1">
              <div className="flex justify-between text-emerald-400">
                <span>سهم یارانه:</span>
                <span className="font-mono">{inquiryResult.subsidizedAmount.toLocaleString('fa-IR')} ریال</span>
              </div>
              <div className="flex justify-between text-amber-400 font-semibold">
                <span>سهم نقدی مشتری:</span>
                <span className="font-mono">{inquiryResult.cashAmount.toLocaleString('fa-IR')} ریال</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 3 Box */}
        <div className={`p-4 rounded-2xl border transition-all ${
          currentStep >= 3
            ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
            : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-300">
              گام سوم (Step 3)
            </span>
            {currentStep >= 3 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <span className="w-5 h-5 rounded-full border border-slate-700 text-slate-500 flex items-center justify-center text-xs">3</span>
            )}
          </div>
          <h3 className="font-bold text-sm text-slate-100">تایید نهایی سفارش (ConfirmOrder)</h3>
          <p className="text-xs text-slate-400 mt-1">
            ارسال RRN و STAN بانکی و ثبت قطعی تراکنش
          </p>
          {confirmResult && (
            <div className="mt-3 p-2 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400 space-y-0.5">
              <div>RRN: {confirmResult.rrn}</div>
              <div>STAN: {confirmResult.stan}</div>
              <div className="text-[10px] text-slate-400">Ref: {confirmResult.confirmRef}</div>
            </div>
          )}
        </div>

      </div>

      {/* Interactive Control Console & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Console: POS Controls */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              کنسول عملیات صندوق محک (POS Terminal)
            </h3>

            {/* Toggle Card / OTP */}
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setIsCardless(false)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  !isCardless ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                با کارت فیزیکی
              </button>
              <button
                onClick={() => setIsCardless(true)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  isCardless ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                بدون کارت (OTP)
              </button>
            </div>
          </div>

          {/* Cart Items Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-300">اقلام انتخابی خریدار (کالابرگ):</span>
              <span className="text-xs font-mono text-blue-400">مجموع: {totalCartPrice.toLocaleString('fa-IR')} ریال</span>
            </div>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-800/80 text-slate-300">
                  <tr>
                    <th className="p-2">نام کالا</th>
                    <th className="p-2">تعداد</th>
                    <th className="p-2">قیمت واحد</th>
                    <th className="p-2">مبلغ کل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {cartItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2 font-mono">{item.quantity}</td>
                      <td className="p-2 font-mono">{item.price.toLocaleString('fa-IR')}</td>
                      <td className="p-2 font-mono text-slate-100">{(item.price * item.quantity).toLocaleString('fa-IR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* OTP / National Code Inputs if Cardless */}
          {isCardless && (
            <div className="p-3 bg-indigo-950/30 border border-indigo-800/50 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold">
                <Smartphone className="w-4 h-4" />
                <span>اطلاعات سرپرست خانوار جهت صدور پیامک رمز یکبار مصرف (OTP):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">کد ملی سرپرست</label>
                  <input
                    type="text"
                    value={nationalCode}
                    onChange={(e) => setNationalCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 text-left"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">شماره همراه سرپرست</label>
                  <input
                    type="text"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 text-left"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">رمز یکبار مصرف (OTP)</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-400 text-left"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons based on current step */}
          <div className="pt-2 flex flex-wrap gap-3">
            {currentStep === 0 && (
              <button
                onClick={handleItemOrder}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                <span>گام ۱: ارسال سبد کالا (ItemOrder)</span>
              </button>
            )}

            {currentStep === 1 && (
              <div className="flex w-full gap-2">
                <button
                  onClick={handlePurchaseInquiry}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>گام ۲: استعلام اعتبار یارانه (PurchaseInquiry)</span>
                </button>
                <button
                  onClick={handleCancelOrder}
                  className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold transition"
                >
                  انصراف و لغو (Cancel)
                </button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex w-full gap-2">
                <button
                  onClick={handleConfirmOrder}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>گام ۳: دریافت سهم نقدی و تایید نهایی (ConfirmOrder)</span>
                </button>
                <button
                  onClick={handleCancelOrder}
                  className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold transition"
                >
                  انصراف و برگشت اعتبار
                </button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="w-full p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>تراکنش با موفقیت به پایان رسید و در پایگاه داده محلی ذخیره شد.</span>
                </div>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium"
                >
                  تراکنش جدید
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Console: Live Structured Logs */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              رویدادهای زنده سرویس (Live Serilog Stream)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Sink: Console/DB</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-xs leading-relaxed font-mono ${
                  log.level === 'success'
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                    : log.level === 'warn'
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                    : log.level === 'error'
                    ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                    : 'bg-slate-950 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800/40">
                  <span>[{log.source}]</span>
                  <span>{log.time}</span>
                </div>
                <div className="mt-1 text-right text-xs" dir="rtl">
                  {log.message}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
