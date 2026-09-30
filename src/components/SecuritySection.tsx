import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Key, 
  Clock, 
  AlertOctagon, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileCode,
  Terminal,
  Cpu
} from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const [plainSecret, setPlainSecret] = useState<string>('P@ssw0rd_Fara_1403!#');
  const [encryptedSecret, setEncryptedSecret] = useState<string>(
    'AQAAANCMnd8BFdERjHoAwE/Cl+sBAAAAoP1Z7l21i0...[DPAPI_CIPHER_LOCALMACHINE]...mK39x=='
  );
  const [isEncrypted, setIsEncrypted] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  const handleEncryptSim = () => {
    // Simulated DPAPI Base64 transformation
    const b64 = btoa('DPAPI::' + plainSecret + '::SALT_MAHAK_1403');
    setEncryptedSecret('AQAAANCMnd8BFdERjHoAwE/' + b64.substring(0, 32) + '==');
    setIsEncrypted(true);
  };

  const handleDecryptSim = () => {
    setIsEncrypted(false);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dpapiCSharpCode = `using System;
using System.Security.Cryptography;
using System.Text;

namespace Mahak.Service.Security
{
    public static class DpapiSecretProtector
    {
        private static readonly byte[] OptionalEntropy = 
            Encoding.UTF8.GetBytes("MahakFaraEntropy_V1_2026");

        public static string Protect(string plainSecret)
        {
            if (string.IsNullOrEmpty(plainSecret)) return string.Empty;
            byte[] plainBytes = Encoding.UTF8.GetBytes(plainSecret);
            
            // Protect using Windows LocalMachine scope
            byte[] cipherBytes = ProtectedData.Protect(
                plainBytes,
                OptionalEntropy,
                DataProtectionScope.LocalMachine);

            return Convert.ToBase64String(cipherBytes);
        }

        public static string Unprotect(string cipherSecret)
        {
            if (string.IsNullOrEmpty(cipherSecret)) return string.Empty;
            byte[] cipherBytes = Convert.FromBase64String(cipherSecret);
            
            byte[] plainBytes = ProtectedData.Unprotect(
                cipherBytes,
                OptionalEntropy,
                DataProtectionScope.LocalMachine);

            return Encoding.UTF8.GetString(plainBytes);
        }
    }
}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-emerald-400">HARDENED ENTERPRISE SECURITY</span>
        </div>
        <h2 className="text-xl font-bold text-slate-100 mt-1">
          حفاظت از اطلاعات حساس با Windows DPAPI و استانداردهای شاپرک
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          عدم ذخیره رمزهای وب‌سرویس و کلیدهای ارتباطی به صورت Plaintext در فایل‌های پیکربندی
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive DPAPI Tool */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              ابزار شبیه‌ساز رمزنگاری DPAPI (ابزار پیکربندی)
            </h3>
            <span className="text-xs font-mono bg-slate-950 text-blue-300 px-2 py-0.5 rounded border border-slate-800">
              Scope: LocalMachine
            </span>
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1 font-semibold">
              مقدار حساس خام (ClientSecret یا Password فارا):
            </label>
            <input
              type="text"
              value={plainSecret}
              onChange={(e) => setPlainSecret(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 text-left focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleEncryptSim}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>رمزنگاری با ProtectedData.Protect</span>
            </button>
            <button
              onClick={handleDecryptSim}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-700"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>رمزگشایی</span>
            </button>
          </div>

          <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">مقدار رمزنگاری‌شده در appsettings.json:</span>
              <span className="text-[10px] text-emerald-400 font-mono">Base64 DPAPI</span>
            </div>
            <p className="font-mono text-xs text-blue-400 break-all bg-slate-900 p-2 rounded-lg border border-slate-800/80">
              {isEncrypted ? encryptedSecret : plainSecret}
            </p>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed bg-blue-950/20 p-3 rounded-xl border border-blue-900/30">
            <strong>نکته امنیتی:</strong> کلید رمزنگاری در پایگاه داده امن سیستم‌عامل ویندوز ذخیره شده و صرفاً بر روی همان سخت‌افزار/سرور قابل بازگشایی است.
          </div>
        </div>

        {/* Right: C# Code Implementation */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-100 text-sm">پیاده‌سازی C# در mahak.service</span>
            </div>
            <button
              onClick={() => handleCopyCode(dpapiCSharpCode)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'کپی شد' : 'کپی کد'}</span>
            </button>
          </div>

          <div className="flex-1 mt-3 bg-slate-950 rounded-xl p-3 border border-slate-800 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-200 leading-relaxed">
              <code>{dpapiCSharpCode}</code>
            </pre>
          </div>
        </div>

      </div>

    </div>
  );
};
