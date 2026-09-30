# سند شماره ۸: راهنمای نصب و استقرار ویندوز سرویس (Deployment & Operations Guide)
## راهنمای گام‌به‌گام نصب، راه‌اندازی، پیکربندی امن و مانیتورینگ `mahak.service`

---

### مشخصات سند (Document Control)
| مشخصه | مقدار |
| :--- | :--- |
| **نام سند** | راهنمای استقرار و عملیات (Deployment & Operations Guide) |
| **سیستم‌عامل هدف** | Windows 10 / 11 (64-bit), Windows Server 2016/2019/2022 |
| **پیش‌نیاز دات‌نت** | .NET 8.0 / 9.0 Runtime (یا استقرار Self-Contained) |
| **نسخه سند** | 1.0.0 |
| **وضعیت** | نهایی و مصوب (Approved) |

---

## ۱. پیش‌نیازهای سخت‌افزاری و نرم‌افزاری (Prerequisites)

1. **سیستم‌عامل**: Windows 10 Enterprise / Pro (Build 1809+) یا Windows Server 2016 به بالا.
2. **پلتفرم اجرایی**: .NET 8.0 Desktop/Hosting Runtime (در صورتی که برنامه به صورت Self-Contained پابلیش نشده باشد).
3. **دسترسی شبکه**:
   - دسترسی خروجی (Outbound) به دامنه سرورهای فارا: `https://fara.shoma.gov.ir` روی پورت `443 (HTTPS)`.
   - دسترسی لوکال پورت `5143` جهت ارتباط صندوق محک با سرویس.

---

## ۲. گام‌های نصب و استقرار (Step-by-Step Installation)

### گام ۱: ساخت بسته اجرایی (Publish)
پروژه را به صورت Self-Contained جهت اجرا بدون نیاز به پیش‌نصب دستی رانتایم کامپایل کنید:

```powershell
dotnet publish src/Mahak.Service.Host/Mahak.Service.Host.csproj `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    -o C:\Mahak\Services\MahakFaraService
```

---

### گام ۲: رمزنگاری امن اطلاعات با ابزار `mahak.config.exe`
قبل از راه‌اندازی سرویس، اطلاعات محرمانه پذیرنده را با DPAPI رمزنگاری کنید:

```cmd
cd C:\Mahak\Services\MahakFaraService
mahak.config.exe --encrypt "MySuperSecretPassword1403!"
```
*خروجی رمزنگاری‌شده تولیدی را در فایل `appsettings.json` در کلید `EncryptedClientSecret` قرار دهید.*

---

### گام ۳: ثبت و ایجاد ویندوز سرویس (با PowerShell)
با اجرای PowerShell در حالت **Run as Administrator** فرامین زیر را اجرا نمایید:

```powershell
# ۱. ایجاد سرویس جدید در سیستم‌عامل
New-Service -Name "MahakFaraIntegrationService" `
            -DisplayName "Mahak Fara / Shoma Integration Service" `
            -Description "سرویس یکپارچه‌سازی سامانه شبکه ملی اعتبار و کالابرگ الکترونیک فارا/شما" `
            -BinaryPathName "C:\Mahak\Services\MahakFaraService\Mahak.Service.Host.exe" `
            -StartupType Automatic

# ۲. تنظیم بازیابی خودکار در صورت بروز خطای غیرمنتظره (Auto Recovery)
sc.exe failure "MahakFaraIntegrationService" reset= 86400 actions= restart/60000/restart/60000/restart/60000

# ۳. استارت کردن سرویس
Start-Service -Name "MahakFaraIntegrationService"
```

---

## ۳. بررسی صحت عملکرد و پایش سلامت (Verification & Health Check)

### ۱. استعلام وضعیت سرویس با CLI
```powershell
Get-Service -Name "MahakFaraIntegrationService"
```

### ۲. بررسی سلامت API محلی (Health Check)
یک درخواست HTTP به اندپوینت سلامت ارسال کنید:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5143/health"
```
**پاسخ مورد انتظار:**
```json
{
  "status": "HEALTHY",
  "timestamp": "2026-09-30T12:30:00Z"
}
```

### ۳. بررسی لاگ‌ها در Windows Event Viewer
- باز کردن `eventvwr.msc`
- رجوع به مسیر: `Windows Logs -> Application`
- جستجوی رویدادهایی با منبع `MahakFaraService`.

---

## ۴. دستورالعمل حذف کامل سرویس (Uninstallation)

در صورت نیاز به حذف سرویس از روی سرور:

```powershell
# توقف سرویس
Stop-Service -Name "MahakFaraIntegrationService"

# حذف از ویندوز
sc.exe delete "MahakFaraIntegrationService"
```
