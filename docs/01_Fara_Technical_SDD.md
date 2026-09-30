# سند جامع طراحی نرم‌افزار (Technical Software Design Document - SDD)
## یکپارچه‌سازی سرویس ویندوزی `mahak.service` با سامانه شبکه ملی اعتبار (فارا / شما - کالابرگ الکترونیک)

---

### مشخصات سند (Document Control)
| مشخصه | مقدار |
| :--- | :--- |
| **نام پروژه** | یکپارچه‌سازی سامانه اعتباری و کالابرگ فارا/شما (`mahak.service`) |
| **نسخه سند** | 1.0.0 |
| **وضعیت سند** | نهایی و مصوب (Approved) |
| **مخاطبان** | معماران نرم‌افزار، توسعه‌دهندگان دات‌نت، مدیران فنی، تیم تضمین کیفیت (QA) |
| **زبان سند** | فارسی فنی (همراه با اصطلاحات تخصصی انگلیسی) |
| **تکنولوژی هدف** | .NET 8 / .NET 9 Worker Service (Windows Service) |

---

## ۱. مقدمه و هدف (Introduction & Scope)

### ۱.۱. هدف سند (Purpose)
این سند، معماری فنی و جزئیات پیاده‌سازی سرویس پس‌زمینه ویندوز تحت عنوان **`mahak.service`** را تشریح می‌کند. این سرویس به عنوان لایه میان‌افزار (Middleware) و واسط ارتباطی امن میان نرم‌افزار فروشگاهی/صندوق محک و وب‌سرویس‌های **سامانه شبکه ملی اعتبار ایرانیان (فارا / شما)** جهت پردازش تراکنش‌های مبتنی بر طرح کالابرگ الکترونیکی، اعتبارات رفاهی و یارانه‌ای عمل می‌کند.

### ۱.۲. دامنه کاربرد (Scope)
سرویس `mahak.service` مسئولیت‌های زیر را بر عهده دارد:
1. **مدیریت چرخه عمر تراکنش‌های اعتباری ۳ مرحله‌ای (3-Step Stateful Lifecycle)**: ثبت سفارش اقلام (`ItemOrder`)، استعلام تخصیص اعتبار و سهم خریدار/یارانه (`PurchaseInquiry`) و تایید نهایی سفارش پس از اخذ تراکنش بانکی (`ConfirmOrder`).
2. **پشتیبانی از فرایند خرید بدون کارت (OTP/Cardless)**: ایجاد جلسه خرید با شماره ملی/موبایل و دریافت رمز یکبار مصرف.
3. **مدیریت پیشرفته توکن احراز هویت JWT**: کشینگ درون‌حافظه‌ای توکن ۲۴ ساعته با مکانیزم تجدید خودکار پیشگیرانه (Proactive Refresh) و جلوگیری از درخواست توکن به ازای هر تراکنش.
4. **حفاظت از اطلاعات حساس و محرمانگی**: استفاده از **Windows DPAPI** برای رمزنگاری امن کلیدها، کلمات عبور و متغیرهای محرمانه سازمانی.
5. **رسیدگی به تراکنش‌های ناموفق و انصراف**: اجرای عملیات لغو (`Cancel`) و برگشت تراکنش (`Reverse`) با رعایت سازگاری داده‌ها (Data Consistency).
6. **مغایرت‌گیری و مدیریت زمان Cut-off**: مدیریت بازه‌های زمانی قطعی/تسویه روزانه (ساعت ۰۰:۰۰ و ۰۱:۰۰ بامداد) و اجرای سرویس‌های تسویه و تطبیق تراکنش‌ها (Reconciliation Jobs).
7. **پایداری، قابلیت اطمینان و لاگینگ**: نگهداری تاریخچه جامع تراکنش‌ها شامل `orderTrace`، `RRN`، `STAN`، `TerminalId` و لاگینگ ساختاریافته (Structured Logging).

---

## ۲. نمای کلی اکوسیستم و معماری سیستم (System Architecture Overview)

### ۲.۱. توپولوژی و اجزای تعاملی
سرویس `mahak.service` به عنوان یک Windows Service در محیط محلی صندوق یا سرور فروشگاه اجرا شده و از یک سو با نرم‌افزار صندوق فروشگاهی (POS/Client UI) و از سوی دیگر از طریق کانال امن HTTPS با سرورهای سامانه فارا/شما و شبکه پرداخت (شاپرک/PSP) در ارتباط است.

```
+-----------------------------------------------------------------------+
|                       فروشگاه / سرور محلی محک                        |
|                                                                       |
|  +---------------------+         IPC / HTTP API (REST)                |
|  |   صندوق فروشگاهی   | <=======================> +----------------+ |
|  |  (Mahak POS Client) |                           |  mahak.service | |
|  +---------------------+                           | (Win Service)  | |
|            |                                       +-------+--------+ |
|            | (پرداخت بانکی / کارتخوان POS)                |        | |
|            v                                               |        | |
|  +---------------------+                                   |        | |
|  |     دستگاه POS      |                                   |        | |
|  |   بانکی (شاپرک)     |                                   |        | |
|  +---------------------+                                   |        | |
|                                                            |        | |
|  +---------------------+        +--------------------+     |        | |
|  |   Local Database    | <====> |   DPAPI Protected  |     |        | |
|  |  (SQLite / MSSQL)   |        |    Configuration   |     |        | |
|  +---------------------+        +--------------------+     |        | |
+------------------------------------------------------------+--------+-+
                                                             |
                                            HTTPS (TLS 1.2+) | JWT Bearer
                                                             v
                                        +-------------------------------+
                                        |    سامانه شبکه ملی اعتبار     |
                                        |         (فارا / شما)          |
                                        +-------------------------------+
```

### ۲.۲. مؤلفه‌های داخلی `mahak.service`
سرویس بر پایه معماری ماژولار و لایه‌ای (Clean / Layered Architecture) در دات‌نت طراحی شده است:

1. **Host & Runtime Layer (`Mahak.Service.Host`)**: پیاده‌سازی شده با `IHostedService` و `BackgroundService` سازگار با Windows Service Lifecycle.
2. **API / Endpoint Layer (`Mahak.Service.Api`)**: هاست کردن یک Minimal API سبک محلی (مانند Kestrel روی پورت اختصاصی محلی، مثلاً `localhost:5143`) جهت دریافت فرامین از صندوق محک.
3. **Core Workflow & Orchestration Layer (`Mahak.Service.Core`)**:
   - `OrderWorkflowManager`: مدیریت ماشین حالت ۳ مرحله‌ای سفارش‌ها.
   - `OtpWorkflowManager`: مدیریت فرایند خرید بدون کارت.
   - `ReconciliationEngine`: موتور پایش مغایرت‌ها و کارهای زمان‌بندی‌شده (Background Jobs).
4. **Integration Client Layer (`Mahak.Service.FaraClient`)**:
   - `FaraHttpClient`: ارتباط با اندپوینت‌های فارا با استفاده از `IHttpClientFactory` و سیاست‌های انعطاف‌پذیری `Polly`.
   - `TokenManager`: مدیریت توکن JWT، کش هوشمند و تمدید خودکار.
5. **Security & Cryptography Layer (`Mahak.Service.Security`)**:
   - `DpapiDataProtector`: رمزنگاری و رمزگشایی اعتبارسنجی‌ها با `DataProtectionScope.LocalMachine` یا `CurrentUser`.
6. **Data & Persistence Layer (`Mahak.Service.Data`)**:
   - لایه دسترسی به داده (Dapper یا EF Core) جهت ثبت و استعلام `OrderTransactions`، `AuditLogs`، `ReconciliationBatch`.
7. **Background Schedulers (`Mahak.Service.Jobs`)**:
   - مدیریت وظایف دوره‌ای (Sync/Recon Job، Token Health Check، Stuck Order Sweeper).

---

## ۳. نیازمندی‌های تابعی و جریان‌های کسب‌وکار (Functional Workflows)

### ۳.۱. چرخه عمر تراکنش‌های اعتباری ۳ مرحله‌ای (3-Step Stateful Lifecycle)

سامانه فارا نیازمند اجرای تراکنش در ۳ گام متوالی و مقید به وضعیت (Stateful) است:

```
[گام ۱: ثبت اقلام سبد]
       ItemOrder
           │
           ▼
[گام ۲: استعلام اعتبار و سهم یارانه]
    PurchaseInquiry ──(کسر از اعتبار در سامانه فارا)
           │
           ├────────────────────────────┐
           ▼                            ▼
[تراکنش موفق شاپرک/نقدی]    [انصراف کاربر / خطای شاپرک]
           │                            │
           ▼                            ▼
[گام ۳: تایید نهایی]                 [لغو سفارش]
      ConfirmOrder                  Cancel / Reverse
```

#### گام اول: ثبت سفارش اقلام (`ItemOrder`)
- **هدف**: ارسال بارکدها، شناسه‌ها، مقدار، قیمت واحد و مبلغ کل کالاهای سبد خرید به سامانه فارا.
- **اطلاعات ارسالی**: لیست کالاها بر اساس کدهای استاندارد کالا (GTIN/کد ملی کالا)، قیمت کل و اطلاعات پایانه/پذیرنده.
- **خروجی فارا**: تولید شناسه پیگیری سفارش (`orderTrace`).
- **عملیات داخلی**: ایجاد رکورد تراکنش در وضعیت `ItemOrderCreated` همراه با `orderTrace` و زمان ثبت.

#### گام دوم: استعلام خرید و تسهیم سهم اعتباری (`PurchaseInquiry`)
- **هدف**: بررسی میزان اعتبار موجود در کارت یا حساب سرپرست خانوار و تفکیک مبالغ قابل پرداخت از طریق:
  1. سهم یارانه/اعتبار حمایتی (Subsidized Credit).
  2. سهم نقدی خریدار (Customer Cash/Card Share).
- **اطلاعات ارسالی**: `orderTrace`، شماره کارت (یا شناسه OTP)، مبلغ کل و اطلاعات ترمینال.
- **خروجی فارا**: مبالغ تایید شده اعتباری، مبلغ مانده نقدی و وضعیت رزرو موقت اعتبار.
- **تغییر وضعیت محلی**: تغییر وضعیت به `InquiryReserved`؛ در این لحظه سهم نقدی به صندوقدار اعلام می‌شود تا از طریق کارتخوان شاپرک دریافت گردد.

#### گام سوم: تایید نهایی سفارش (`ConfirmOrder`)
- **هدف**: اعلام وصول موفقیت‌آمیز سهم نقدی از شاپرک و نهایی‌سازی کسر اعتبار در سامانه فارا.
- **اطلاعات ارسالی**: `orderTrace`، `RRN` (شماره مرجع بانکی)، `STAN` (شماره پیگیری تراکنش بانکی)، تاریخ و زمان تراکنش بانکی و مبلغ وصولی.
- **خروجی فارا**: تایید قطعی تراکنش و صدور شماره پیگیری تسویه نهایی (`ConfirmReference`).
- **تغییر وضعیت محلی**: تغییر وضعیت به `Confirmed` و صدور فاکتور نهایی با درج تفکیک سهم کالابرگ و نقدی.

---

### ۳.۲. جریان تراکنش‌های بدون کارت (Cardless / OTP Flow)
در مواردی که سرپرست خانوار کارت فیزیکی بانکی همراه ندارد:
1. **درخواست ایجاد جلسه OTP (`GenerateOtp`)**: ارسال کد ملی سرپرست خانوار و شماره تلفن همراه متصل به سامانه شما.
2. **ارسال پیامک از سوی فارا/شما**: رمز یکبار مصرف مستقیم برای سرپرست خانوار پیامک می‌شود.
3. **استعلام با OTP (`PurchaseInquiryWithOtp`)**: صندوقدار رمز ارسالی را در سیستم درج کرده و به عنوان کلید تایید در متد `PurchaseInquiry` ارسال می‌نماید.
4. **تداوم فرایند**: ادامه مسیر مطابق گام سوم استاندارد (`ConfirmOrder`) طی می‌شود.

---

### ۳.۳. مدیریت خطاهای حین تراکنش، لغو و اصلاح (Cancel & Reverse Operations)

#### ۱. عملیات انصراف قبل از پرداخت (`CancelOrder`)
- **سناریو**: پس از اجرای `PurchaseInquiry` و کسر موقت اعتبار، خریدار منصرف شده یا موجودی کارت بانکی او برای پرداخت سهم نقدی کافی نیست.
- **اکشن**: فراخوانی بلافاصله متد `CancelOrder` با پارامتر `orderTrace` جهت آزادسازی اعتبار مسدود شده خریدار در سامانه فارا.
- **وضعیت محلی**: تبدیل به `CancelledByUser`.

#### ۲. عملیات برگشت تراکنش (`ReverseOrder`)
- **سناریو**: خطای ارتباطی (Network Timeout) در حین `ConfirmOrder` یا خطای دستگاه چاپگر پس از تراکنش شاپرک.
- **اکشن**: ارسال درخواست `ReverseOrder` با ذکر `orderTrace`، `RRN` و دلیل بازگشت.
- **وضعیت محلی**: تبدیل به `Reversed`.

#### ۳. استعلام وضعیت تراکنش‌های بلاتکلیف (`StatusInquiry`)
- **سناریو**: قطع برق یا کرش ناگهانی سیستم حین پردازش گام ۳.
- **اکشن**: در زمان راه‌اندازی مجدد سرویس یا توسط Job دوره‌ای، تراکنش‌هایی که در وضعیت `InquiryReserved` بیش از ۲ دقیقه باقی مانده‌اند، استعلام شده و در صورت نیاز `Cancel` یا `Reverse` می‌شوند.

---

## ۴. طراحی مدیریت احراز هویت و توکن (Authentication & Token Management)

### ۴.۱. الزامات امنیتی توکن فارا
- وب‌سرویس فارا از پروتکل احراز هویت مبتنی بر **JSON Web Token (JWT)** استفاده می‌کند.
- مدت اعتبار هر توکن صادر شده **۲۴ ساعت (۸۶۴۰۰ ثانیه)** است.
- **ممنوعیت قطعی**: اکیداً نباید به ازای هر تراکنش درخواست لاگین (`/api/v1/auth/login`) ارسال شود؛ این کار منجر به Rate-Limit، انسداد IP و ایجاد تاخیر شدید در صندوق خواهد شد.

### ۴.۲. معماری کشینگ توکن (`TokenManager`)
- **مکانیزم کش**: استفاده از `IMemoryCache` با کلید یکتا و مدیریت همزمانی با `SemaphoreSlim(1, 1)` (جلوگیری از Thundering Herd Problem).
- **حاشیه ایمنی انقضا (Safety Buffer)**: توکن با مدت زمان ۲۳ ساعت و ۴۵ دقیقه کش می‌شود (۱۵ دقیقه قبل از انقضای واقعی تمدید می‌شود).
- **مکانیزم Retry بر روی ۴۰۱**: چنانچه سرور فارا خطای `401 Unauthorized` بازگرداند، کش به صورت خودکار ابطال (Evict) شده، توکن تازه دریافت می‌شود و درخواست اصلی دقیقاً ۱ بار مجدداً ارسال می‌گردد.

```
       [درخواست به API فارا]
                 │
                 ▼
     [آیا توکن معتبر در کش وجود دارد؟]
           /            \
       (بله)           (خیر / منقضی)
         │                │
         │                ▼
         │     [ورود به SemaphoreSlim(1,1)]
         │                │
         │                ▼
         │     [استعلام مجدد از کش (Double-Check)]
         │                │
         │        (اگر نبود) ──> [فراخوانی Login API]
         │                              │
         │                              ▼
         │                     [ذخیره در IMemoryCache]
         │                     (مدت: ۲۳ ساعت و ۴۵ دقیقه)
         │                              │
         │                     [خروج از Semaphore]
         │                              │
         └──────────────┬───────────────┘
                        ▼
            [افزودن Authorization Header]
                        │
                        ▼
            [ارسال درخواست HTTPS به فارا]
```

---

## ۵. معماری حفاظت از اطلاعات با Windows DPAPI

### ۵.۱. چرایی استفاده از DPAPI
اطلاعات حساس شامل نام‌کاربری، کلمه‌عبور وب‌سرویس فارا، شناسه پذیرنده (`TerminalId`/`AcceptorCode`) و کلیدهای دسترسی نباید به صورت متن خام (Plaintext) در `appsettings.json` ذخیره شوند. 

### ۵.۲. نحوه پیاده‌سازی
سرویس `mahak.service` با استفاده از فضای نام `System.Security.Cryptography.ProtectedData` مقادیر حساس را رمزنگاری می‌کند:
- **دامنه رمزنگاری (Scope)**: `DataProtectionScope.LocalMachine` (قابل دسترسی برای اکانت‌های سرویس و ادمین‌های همان سیستم) یا `DataProtectionScope.CurrentUser` برای اکانت اختصاصی سرویس `NT SERVICE\mahak.service`.
- **ابزار پیکربندی اولیه**: ارائه یک ابزار خط فرمان ساده (`mahak.config.exe --encrypt`) که مقادیر ورودی را رمز کرده و در قالب فایل پیکربندی امن ذخیره می‌کند.

```csharp
public static class DpapiHelper
{
    private static readonly byte[] OptionalEntropy = Encoding.UTF8.GetBytes("MahakFaraEntropy_V1");

    public static string EncryptSecret(string plainText)
    {
        byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
        byte[] cipherBytes = ProtectedData.Protect(
            plainBytes, 
            OptionalEntropy, 
            DataProtectionScope.LocalMachine);
        return Convert.ToBase64String(cipherBytes);
    }

    public static string DecryptSecret(string cipherText)
    {
        byte[] cipherBytes = Convert.FromBase64String(cipherText);
        byte[] plainBytes = ProtectedData.Unprotect(
            cipherBytes, 
            OptionalEntropy, 
            DataProtectionScope.LocalMachine);
        return Encoding.UTF8.GetString(plainBytes);
    }
}
```

---

## ۶. مدل مغایرت‌گیری و مدیریت زمان‌های Cut-off (Reconciliation & Cut-off)

### ۶.۱. بازه‌های زمانی حساس شاپرک و فارا (Cut-off Times)
در شبکه پرداخت و بانکی کشور، دو زمان بحرانی تسویه و بستن حساب وجود دارد:
1. **ساعت ۰۰:۰۰ (نیمه‌شب)**: پایان روز تقویمی و شیفت تاریخ مالیاتی/فروشگاهی.
2. **ساعت ۰۱:۰۰ بامداد**: Cut-off تسویه سامانه شاپرک و پردازش صورت‌حساب‌های اعتباری فارا.

### ۶.۲. رفتار سرویس حین زمان Cut-off
- **قفل موقت تراکنش‌های باز (Graceful Drain)**: در بازه ۰۰:۰۰ تا ۰۰:۰۵ و ۰۱:۰۰ تا ۰۱:۰۵ بامداد، به درخواست‌های جدید `ItemOrder` پاسخ "در حال بستن شیفت روزانه / تسویه پایان روز" داده شده و تراکنش‌های در حال انجام سریعاً تکمیل یا لغو می‌شوند.
- **اجرای جاب مغایرت‌گیری شبانه (`NightlyReconciliationJob`)**:
  - در ساعت ۰۱:۳۰ بامداد، سرویس لیست کلیه تراکنش‌های تایید شده (`Confirmed`) روز گذشته را استخراج کرده و با اندپوینت مغایرت‌گیری وب‌سرویس فارا (`/api/v1/settlement/reconciliation`) تطبیق می‌دهد.
  - هرگونه اختلاف در مبالغ یا وضعیت‌ها در جدول `ReconciliationDiscrepancies` ثبت و آلارم تولید می‌گردد.

---

## ۷. نیازمندی‌های غیرکاربردی (Non-Functional Requirements - NFRs)

| شاخص | الزامات و استانداردها |
| :--- | :--- |
| **کارایی (Performance)** | زمان پاسخگویی لایه محلی میان‌افزار کمتر از **۵۰ میلی‌ثانیه** (به غیر از Latency اینترنت فارا). |
| **همزمانی (Concurrency)** | قابلیت پردازش موازی درخواست‌های چند صندوق به طور همزمان بدون مسدود شدن نخ‌ها (Pure Async/Await). |
| **پایداری (Reliability)** | پیاده‌سازی الگوهای **Retry**، **Timeout** و **Circuit Breaker** با استفاده از کتابخانه `Polly` روی فراخوانی‌های HTTP. |
| **ردیابی و رهگیری (Traceability)** | اختصاص یک `CorrelationId` یکتا به ازای هر درخواست از صندوق محک تا انتهای لاگ‌های داخلی و متدهای فارا. |
| **حسابرسی (Auditability)** | ثبت تمام تراکنش‌ها همراه با جزئیات کامل فنی (`orderTrace`, `RRN`, `STAN`, `RawRequest`, `RawResponse`) در دیتابیس محلی با ماسک کردن اطلاعات محرمانه کارت. |
| **مدیریت کرش و قطعی برق (Fault Tolerance)** | ذخیره وضعیت تراکنش قبل و بعد از هر فراخوانی خارجی (Persistent State Store) جهت امکان بازیابی پس از بالا آمدن ویندوز. |

---

## ۸. نقشه ساختار پروژه و پکیج‌های دات‌نت (Solution Structure)

```
Mahak.FaraIntegration/
├── src/
│   ├── Mahak.Service.Host/            # Windows Service Host, Program.cs, BackgroundService
│   ├── Mahak.Service.Core/            # State Machine, Interfaces, Domain Entities, Workflows
│   ├── Mahak.Service.FaraClient/      # HTTP Client, JWT TokenManager, Polly Policies, DTOs
│   ├── Mahak.Service.Data/            # SQLite/MSSQL Storage, Repositories, Migrations
│   ├── Mahak.Service.Security/        # Windows DPAPI implementation, Data Masking
│   └── Mahak.Service.Common/          # Constants, Enums, Exceptions, Result Pattern
└── tools/
    └── Mahak.Service.ConfigTool/      # CLI tool for initial setup and DPAPI encryption
```

---

## ۹. جمع‌بندی و گام‌های بعدی

این سند به عنوان مرجع اصلی معماری (Master Architecture Document) برای طراحی و پیاده‌سازی سرویس `mahak.service` تدوین شده است. در گام‌های بعدی اسناد تکمیلی به ترتیب زیر ارائه خواهند شد:

1. ✅ **سند ۱ (همین سند)**: سند جامع طراحی نرم‌افزار (Technical SDD)
2. ⏳ **سند ۲**: ماشین حالت تفصیلی و نمودارهای توالی (State Machine & Sequence Diagrams با Mermaid)
3. ⏳ **سند ۳**: مدل داده و ساختار جداول پایگاه داده محلی (Data Model & Database Schema)
4. ⏳ **سند ۴**: طراحی سیستم احراز هویت و مدیریت توکن (Authentication & Caching Strategy)
5. ⏳ **سند ۵**: استراتژی مدیریت خطاها و مغایرت‌گیری شبانه (Reconciliation & Error Handling)
6. ⏳ **سند ۶**: معماری ویندوز سرویس (`BackgroundService`، پیکربندی، لاگینگ و DPAPI)
7. ⏳ **سند ۷**: چک‌لیست امنیت و تطابق با الزامات شاپرک/فارا
8. ⏳ **سند ۸**: راهنمای نصب، راه‌اندازی و استقرار سرویس در ویندوز
