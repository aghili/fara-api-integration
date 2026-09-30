export interface DocumentItem {
  id: string;
  number: number;
  titleFa: string;
  titleEn: string;
  status: 'completed' | 'in_progress' | 'pending';
  summary: string;
  category: 'architecture' | 'diagrams' | 'database' | 'security' | 'devops';
  contentMarkdown: string;
  tags: string[];
}

export const DOCUMENTS_LIST: DocumentItem[] = [
  {
    id: 'sdd-fara',
    number: 1,
    titleFa: 'سند جامع طراحی نرم‌افزار (Technical SDD)',
    titleEn: 'Complete Technical Software Design Document',
    status: 'completed',
    category: 'architecture',
    summary: 'معماری کلان، چرخه حیات ۳ مرحله‌ای تراکنش‌های کالابرگ، ارتباط با شاپرک، انصراف، برگشت و مدیریت توکن در mahak.service',
    tags: ['.NET 8/9', 'Windows Service', 'Clean Architecture', 'Shoma / Fara', 'KalaBarg'],
    contentMarkdown: `# سند جامع طراحی نرم‌افزار (Technical Software Design Document - SDD)
## یکپارچه‌سازی سرویس ویندوزی \`mahak.service\` با سامانه شبکه ملی اعتبار (فارا / شما - کالابرگ الکترونیک)

---

### مشخصات سند (Document Control)
| مشخصه | مقدار |
| :--- | :--- |
| **نام پروژه** | یکپارچه‌سازی سامانه اعتباری و کالابرگ فارا/شما (\`mahak.service\`) |
| **نسخه سند** | 1.0.0 |
| **وضعیت سند** | نهایی و مصوب (Approved) |
| **مخاطبان** | معماران نرم‌افزار، توسعه‌دهندگان دات‌نت، مدیران فنی، تیم تضمین کیفیت (QA) |
| **تکنولوژی هدف** | .NET 8 / .NET 9 Worker Service (Windows Service) |

---

## ۱. مقدمه و هدف (Introduction & Scope)

### ۱.۱. هدف سند (Purpose)
این سند، معماری فنی و جزئیات پیاده‌سازی سرویس پس‌زمینه ویندوز تحت عنوان **\`mahak.service\`** را تشریح می‌کند. این سرویس به عنوان لایه میان‌افزار (Middleware) و واسط ارتباطی امن میان نرم‌افزار فروشگاهی/صندوق محک و وب‌سرویس‌های **سامانه شبکه ملی اعتبار ایرانیان (فارا / شما)** جهت پردازش تراکنش‌های مبتنی بر طرح کالابرگ الکترونیکی، اعتبارات رفاهی و یارانه‌ای عمل می‌کند.

### ۱.۲. دامنه کاربرد (Scope)
سرویس \`mahak.service\` مسئولیت‌های زیر را بر عهده دارد:
1. **مدیریت چرخه عمر تراکنش‌های اعتباری ۳ مرحله‌ای (3-Step Stateful Lifecycle)**: ثبت سفارش اقلام (\`ItemOrder\`)، استعلام تخصیص اعتبار و سهم خریدار/یارانه (\`PurchaseInquiry\`) و تایید نهایی سفارش پس از اخذ تراکنش بانکی (\`ConfirmOrder\`).
2. **پشتیبانی از فرایند خرید بدون کارت (OTP/Cardless)**: ایجاد جلسه خرید با شماره ملی/موبایل و دریافت رمز یکبار مصرف.
3. **مدیریت پیشرفته توکن احراز هویت JWT**: کشینگ درون‌حافظه‌ای توکن ۲۴ ساعته با مکانیزم تجدید خودکار پیشگیرانه (Proactive Refresh) و جلوگیری از درخواست توکن به ازای هر تراکنش.
4. **حفاظت از اطلاعات حساس و محرمانگی**: استفاده از **Windows DPAPI** برای رمزنگاری امن کلیدها، کلمات عبور و متغیرهای محرمانه سازمانی.
5. **رسیدگی به تراکنش‌های ناموفق و انصراف**: اجرای عملیات لغو (\`Cancel\`) و برگشت تراکنش (\`Reverse\`) با رعایت سازگاری داده‌ها (Data Consistency).
6. **مغایرت‌گیری و مدیریت زمان Cut-off**: مدیریت بازه‌های زمانی قطعی/تسویه روزانه (ساعت ۰۰:۰۰ و ۰۱:۰۰ بامداد) و اجرای سرویس‌های تسویه و تطبیق تراکنش‌ها (Reconciliation Jobs).
7. **پایداری، قابلیت اطمینان و لاگینگ**: نگهداری تاریخچه جامع تراکنش‌ها شامل \`orderTrace\`، \`RRN\`، \`STAN\`، \`TerminalId\` و لاگینگ ساختاریافته (Structured Logging).

---

## ۲. نمای کلی اکوسیستم و معماری سیستم (System Architecture Overview)

### ۲.۱. مؤلفه‌های داخلی \`mahak.service\`
سرویس بر پایه معماری ماژولار و لایه‌ای (Clean / Layered Architecture) در دات‌نت طراحی شده است:

1. **Host & Runtime Layer (\`Mahak.Service.Host\`)**: پیاده‌سازی شده با \`IHostedService\` و \`BackgroundService\` سازگار با Windows Service Lifecycle.
2. **API / Endpoint Layer (\`Mahak.Service.Api\`)**: هاست کردن یک Minimal API سبک محلی (پورت اختصاصی محلی \`localhost:5143\`) جهت دریافت فرامین از صندوق محک.
3. **Core Workflow & Orchestration Layer (\`Mahak.Service.Core\`)**:
   - \`OrderWorkflowManager\`: مدیریت ماشین حالت ۳ مرحله‌ای سفارش‌ها.
   - \`OtpWorkflowManager\`: مدیریت فرایند خرید بدون کارت.
   - \`ReconciliationEngine\`: موتور پایش مغایرت‌ها و کارهای زمان‌بندی‌شده (Background Jobs).
4. **Integration Client Layer (\`Mahak.Service.FaraClient\`)**:
   - \`FaraHttpClient\`: ارتباط با اندپوینت‌های فارا با استفاده از \`IHttpClientFactory\` و سیاست‌های انعطاف‌پذیری \`Polly\`.
   - \`TokenManager\`: مدیریت توکن JWT، کش هوشمند و تمدید خودکار.
5. **Security & Cryptography Layer (\`Mahak.Service.Security\`)**:
   - \`DpapiDataProtector\`: رمزنگاری و رمزگشایی اعتبارسنجی‌ها با \`DataProtectionScope.LocalMachine\`.
6. **Data & Persistence Layer (\`Mahak.Service.Data\`)**:
   - لایه دسترسی به داده (Dapper یا EF Core) جهت ثبت و استعلام \`OrderTransactions\`، \`AuditLogs\`، \`ReconciliationBatch\`.
7. **Background Schedulers (\`Mahak.Service.Jobs\`)**:
   - مدیریت وظایف دوره‌ای (Sync/Recon Job، Token Health Check، Stuck Order Sweeper).

---

## ۳. نیازمندی‌های تابعی و جریان‌های کسب‌وکار (Functional Workflows)

### ۳.۱. چرخه عمر تراکنش‌های اعتباری ۳ مرحله‌ای (3-Step Stateful Lifecycle)

#### گام اول: ثبت سفارش اقلام (\`ItemOrder\`)
- **هدف**: ارسال بارکدها، شناسه‌ها، مقدار، قیمت واحد و مبلغ کل کالاهای سبد خرید به سامانه فارا.
- **اطلاعات ارسالی**: لیست کالاها بر اساس کدهای استاندارد کالا (GTIN/کد ملی کالا)، قیمت کل و اطلاعات پایانه/پذیرنده.
- **خروجی فارا**: تولید شناسه پیگیری سفارش (\`orderTrace\`).
- **عملیات داخلی**: ایجاد رکورد تراکنش در وضعیت \`ItemOrderCreated\` همراه با \`orderTrace\` و زمان ثبت.

#### گام دوم: استعلام خرید و تسهیم سهم اعتباری (\`PurchaseInquiry\`)
- **هدف**: بررسی میزان اعتبار موجود در کارت یا حساب سرپرست خانوار و تفکیک مبالغ قابل پرداخت از طریق سهم یارانه (Subsidized Credit) و سهم نقدی خریدار (Customer Cash/Card Share).
- **اطلاعات ارسالی**: \`orderTrace\`، شماره کارت (یا شناسه OTP)، مبلغ کل و اطلاعات ترمینال.
- **خروجی فارا**: مبالغ تایید شده اعتباری، مبلغ مانده نقدی و وضعیت رزرو موقت اعتبار.
- **تغییر وضعیت محلی**: تغییر وضعیت به \`InquiryReserved\`؛ در این لحظه سهم نقدی به صندوقدار اعلام می‌شود تا از طریق کارتخوان شاپرک دریافت گردد.

#### گام سوم: تایید نهایی سفارش (\`ConfirmOrder\`)
- **هدف**: اعلام وصول موفقیت‌آمیز سهم نقدی از شاپرک و نهایی‌سازی کسر اعتبار در سامانه فارا.
- **اطلاعات ارسالی**: \`orderTrace\`، \`RRN\` (شماره مرجع بانکی)، \`STAN\` (شماره پیگیری تراکنش بانکی)، تاریخ و زمان تراکنش بانکی و مبلغ وصولی.
- **خروجی فارا**: تایید قطعی تراکنش و صدور شماره پیگیری تسویه نهایی (\`ConfirmReference\`).
- **تغییر وضعیت محلی**: تغییر وضعیت به \`Confirmed\` و صدور فاکتور نهایی با درج تفکیک سهم کالابرگ و نقدی.

---

## ۴. مدیریت احراز هویت و توکن (Authentication & Token Management)
- وب‌سرویس فارا از پروتکل **JWT** با مدت اعتبار **۲۴ ساعت (۸۶۴۰۰ ثانیه)** استفاده می‌کند.
- توکن‌ها با مدت زمان ۲۳ ساعت و ۴۵ دقیقه در \`IMemoryCache\` نگهداری می‌شوند.
- دسترسی همزمان با \`SemaphoreSlim(1, 1)\` ایمن‌سازی شده و از پدیده Thundering Herd جلوگیری می‌گردد.
- در صورت دریافت خطای 401، توکن باطل شده و درخواست اصلی مجدداً با توکن جدید ارسال می‌شود.

---

## ۵. امنیت با Windows DPAPI
- رمزنگاری اطلاعات حساس با الگوریتم TripleDES/AES مدیریت‌شده توسط ویندوز و گره‌خورده به کلید امنیتی سیستم‌عامل (\`DataProtectionScope.LocalMachine\`).
- امکان استخراج کلید خارج از سیستم وجود ندارد.

---

## ۶. مدل مغایرت‌گیری و زمان‌های Cut-off
- **ساعت ۰۰:۰۰ بامداد**: بستن تاریخ مالیاتی و آماده‌سازی دفاتر روزانه.
- **ساعت ۰۱:۰۰ بامداد**: زمان Cut-off شاپرک و تسویه حساب‌های اعتباری فارا.
- **ساعت ۰۱:۳۰ بامداد**: اجرای \`NightlyReconciliationJob\` و تطبیق لیست تراکنش‌های روزانه با سامانه فارا.`
  },
  {
    id: 'state-machine-mermaid',
    number: 2,
    titleFa: 'ماشین حالت تفصیلی و نمودارهای توالی (State Machine & Diagrams)',
    titleEn: 'Detailed State Machine + Sequence Diagrams (Mermaid)',
    status: 'completed',
    category: 'diagrams',
    summary: 'نمودارهای تعاملی توالی و گذار حالت‌های ۳ مرحله‌ای، بدون کارت (OTP)، انصراف، برگشت و بازیابی قطعی شبکه',
    tags: ['Mermaid', 'State Pattern', 'Sequence Diagrams', 'Stateful Flow'],
    contentMarkdown: `# سند شماره ۲: ماشین حالت تفصیلی و نمودارهای توالی (State Machine & Sequence Diagrams)
## یکپارچه‌سازی سرویس ویندوزی \`mahak.service\` با سامانه شبکه ملی اعتبار (فارا / شما - کالابرگ)

---

### ۱. ماشین حالت تراکنش‌ها (Transaction State Machine)

\`\`\`mermaid
stateDiagram-v2
    [*] --> None : شروع تراکنش جدید
    
    None --> ItemOrderCreated : فراخوانی موفق ItemOrder\\n(تخصیص orderTrace)
    None --> ItemOrderFailed : خطای اعتبارسنجی کالاها / شبکه
    
    ItemOrderCreated --> InquiryReserved : استعلام موفق اعتبار (PurchaseInquiry)\\n(رزرو موقت اعتبار فارا)
    ItemOrderCreated --> InquiryFailed : خطای عدم تطابق کد ملی یا شبکه
    ItemOrderCreated --> CancelledByUser : انصراف صندوقدار قبل از استعلام
    
    InquiryReserved --> Confirmed : تراکنش موفق شاپرک + فراخوانی موفق ConfirmOrder
    InquiryReserved --> CancelledByUser : انصراف مشتری / عدم موجودی سهم نقدی\\n(فراخوانی CancelOrder)
    InquiryReserved --> ExpiredTimeout : سپری شدن مهلت رزرو موقت اعتبار\\n(Sweeper Job بعد از ۱۲۰ ثانیه)
    InquiryReserved --> ConfirmationPending : شاپرک موفق اما ConfirmOrder تایم‌اوت شد\\n(ورود به صف استعلام وضعیت)
    
    ConfirmationPending --> Confirmed : استعلام وضعیت مثبت از فارا (StatusInquiry)
    ConfirmationPending --> Reversed : عدم تایید نهایی / اجرای ReverseOrder
    
    Confirmed --> Reversed : خطای چاپ فاکتور / خرابی کالا / اصلاح\\n(فراخوانی ReverseOrder)
    Confirmed --> [*] : پایان موفقیت‌آمیز تراکنش
    
    CancelledByUser --> [*] : اعتبار مسدودشده آزاد شد
    Reversed --> [*] : وجه و اعتبار مسترد شد
    ExpiredTimeout --> [*] : لغو خودکار در سرور فارا
    ItemOrderFailed --> [*]
    InquiryFailed --> [*]
\`\`\`

---

### ۲. نمودار توالی سناریوی استاندارد خرید اعتباری

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Cashier as صندوقدار محک (POS UI)
    participant Core as mahak.service (Core Orchestrator)
    participant FaraClient as FaraClient (HTTP Client)
    participant FaraAPI as سامانه فارا / شما
    participant PosBank as دستگاه کارتخوان شاپرک (POS)

    Note over Cashier,FaraAPI: ۱. ثبت سبد کالا
    Cashier->>Core: درخواست شروع تراکنش با لیست کالاها
    Core->>Core: اعتبارسنجی اولیه بارکدها و ایجاد رکورد محلی
    Core->>FaraClient: SendItemOrderAsync(items)
    FaraClient->>FaraAPI: POST /api/v1/orders/items (Bearer Token)
    FaraAPI-->>FaraClient: 200 OK { orderTrace: "TRC-984321" }
    FaraClient-->>Core: بازگشت orderTrace
    Core->>Core: تغییر وضعیت به ItemOrderCreated
    Core-->>Cashier: آماده‌سازی استعلام سهم کالابرگ

    Note over Cashier,FaraAPI: ۲. استعلام اعتبار با کارت بانکی
    Cashier->>Core: استعلام اعتبار (orderTrace, PanMasked/Track2)
    Core->>FaraClient: SendPurchaseInquiryAsync(...)
    FaraClient->>FaraAPI: POST /api/v1/orders/inquiry
    FaraAPI-->>FaraClient: 200 OK { subsidizedAmount: 850000, cashAmount: 350000, reserveId: "RES-102" }
    FaraClient-->>Core: مبالغ تسهیم‌شده
    Core->>Core: تغییر وضعیت به InquiryReserved
    Core-->>Cashier: نمایش سهم یارانه (۸۵,۰۰۰ تومان) و سهم نقدی (۳۵,۰۰۰ تومان)

    Note over Cashier,PosBank: ۳. پرداخت سهم نقدی از طریق شاپرک
    Cashier->>PosBank: ارسال مبلغ ۳۵,۰۰۰ تومان به کارتخوان
    PosBank-->>Cashier: تراکنش شاپرک موفق { RRN: "9048123019", STAN: "582103" }

    Note over Cashier,FaraAPI: ۴. تایید نهایی سفارش در فارا
    Cashier->>Core: تایید سفارش با RRN و STAN شاپرک
    Core->>FaraClient: SendConfirmOrderAsync(orderTrace, RRN, STAN)
    FaraClient->>FaraAPI: POST /api/v1/orders/confirm
    FaraAPI-->>FaraClient: 200 OK { confirmRef: "CNF-778210", status: "SUCCESS" }
    FaraClient-->>Core: تایید قطعی
    Core->>Core: تغییر وضعیت به Confirmed و ذخیره در دیتابیس
    Core-->>Cashier: صدور فاکتور و چاپ رسید تفکیکی
\`\`\``
  },
  {
    id: 'data-model-schema',
    number: 3,
    titleFa: 'مدل داده و ساختار جداول دیتابیس (Data Model & Schema)',
    titleEn: 'Data Model + Database Schema for mahak.service',
    status: 'completed',
    category: 'database',
    summary: 'طراحی جداول OrderTransactions, ItemDetails, AuditLogs, ReconciliationDiscrepancies با پشتیبانی از SQLite و MSSQL',
    tags: ['Dapper / EF Core', 'SQLite', 'MSSQL', 'Audit Trail', 'Traceability'],
    contentMarkdown: `# سند شماره ۳: مدل داده و ساختار جداول پایگاه‌داده (Data Model & Database Schema)
## طراحی لایه ماندگاری داده‌ها در سرویس ویندوزی \`mahak.service\`

---

### ۱. نیازمندی‌های لایه داده
- **ایزولاسیون و پایداری در برابر کرش**: ذخیره وضعیت در دیتابیس قبل و بعد از هر درخواست به فارا.
- **انطباق با PCI-DSS**: عدم ذخیره CVV2 و ماسک کردن شماره کارت‌ها به صورت \`603799******1234\`.

---

### ۲. اسکریپت ساخت جداول SQLite

\`\`\`sql
CREATE TABLE IF NOT EXISTS [OrderTransactions] (
    [Id] INTEGER PRIMARY KEY AUTOINCREMENT,
    [CorrelationId] TEXT NOT NULL,
    [OrderTrace] TEXT UNIQUE NULL,
    [Status] INTEGER NOT NULL DEFAULT 0,
    [TerminalId] TEXT NOT NULL,
    [AcceptorCode] TEXT NOT NULL,
    [TotalAmount] INTEGER NOT NULL,
    [SubsidizedAmount] INTEGER NOT NULL DEFAULT 0,
    [CashAmount] INTEGER NOT NULL DEFAULT 0,
    [MaskedPan] TEXT NULL,
    [NationalCodeMasked] TEXT NULL,
    [RRN] TEXT NULL,
    [STAN] TEXT NULL,
    [BankPaymentRef] TEXT NULL,
    [FaraConfirmRef] TEXT NULL,
    [ErrorMessage] TEXT NULL,
    [CreatedAtUtc] DATETIME NOT NULL DEFAULT (datetime('now')),
    [UpdatedAtUtc] DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS [IX_OrderTransactions_OrderTrace] ON [OrderTransactions] ([OrderTrace]);
CREATE INDEX IF NOT EXISTS [IX_OrderTransactions_Status] ON [OrderTransactions] ([Status]);
CREATE INDEX IF NOT EXISTS [IX_OrderTransactions_RRN] ON [OrderTransactions] ([RRN]);
\`\`\``
  },
  {
    id: 'auth-token-management',
    number: 4,
    titleFa: 'طراحی سیستم احراز هویت و مدیریت توکن (Authentication & Caching)',
    titleEn: 'Authentication & Token Management Design',
    status: 'completed',
    category: 'security',
    summary: 'پیاده‌سازی TokenManager با IMemoryCache, SemaphoreSlim, Proactive Refresh و هندل کردن انقضای توکن در همزمانی بالا',
    tags: ['JWT', 'MemoryCache', 'Concurrency', 'Resilience'],
    contentMarkdown: `# سند شماره ۴: طراحی سیستم احراز هویت و مدیریت توکن (Authentication & Token Management)
## استراتژی جامع کشینگ و مدیریت هوشمند توکن‌های JWT در \`mahak.service\`

---

### ۱. اصول کلیدی
- **کشینگ هوشمند**: ذخیره توکن ۲۴ ساعته در \`IMemoryCache\` به مدت ۲۳ ساعت و ۴۵ دقیقه.
- **کنترل همزمانی**: استفاده از \`SemaphoreSlim(1,1)\` جهت جلوگیری از درخواست‌های مکرر لاگین حین انقضا.
- **Self-Healing on 401**: در صورت دریافت 401، توکن از کش حذف شده و با توکن تازه ۱ بار تلاش مجدد صورت می‌پذیرد.`
  },
  {
    id: 'reconciliation-error-handling',
    number: 5,
    titleFa: 'استراتژی مغایرت‌گیری و مدیریت خطاها (Reconciliation & Resilience)',
    titleEn: 'Reconciliation & Error Handling Strategy',
    status: 'completed',
    category: 'architecture',
    summary: 'جاب‌های شبانه، مدیریت زمان‌های Cut-off (ساعت ۰۰:۰۰ و ۰۱:۰۰)، سیاست‌های Polly و صف‌های بازآزمایی (Retry Queues)',
    tags: ['Cut-off 00:00/01:00', 'Nightly Reconciliation', 'Polly', 'Circuit Breaker'],
    contentMarkdown: `# سند شماره ۵: استراتژی مغایرت‌گیری و مدیریت خطاها (Reconciliation & Error Handling)
## مدیریت زمان‌های Cut-off، جاب‌های شبانه و انعطاف‌پذیری با Polly در \`mahak.service\`

---

### ۱. زمان‌های کات‌آف
- **ساعت ۰۰:۰۰ بامداد**: بستن روز مالی و شیفت شماره فاکتورها.
- **ساعت ۰۱:۰۰ بامداد**: کات‌آف تسویه شاپرک و اعتبارات فارا.
- **ساعت ۰۱:۳۰ بامداد**: اجرای \`NightlyReconciliationJob\` و ارسال بچ روز قبل به فارا.`
  },
  {
    id: 'windows-service-arch',
    number: 6,
    titleFa: 'معماری ویندوز سرویس (Windows Service Architecture)',
    titleEn: 'Windows Service (BackgroundService, DPAPI, Serilog)',
    status: 'completed',
    category: 'architecture',
    summary: 'پیاده‌سازی BackgroundService دات‌نت، لاگینگ ساختاریافته Serilog، رویدادنگاری EventLog و ذخیره امن با DPAPI',
    tags: ['BackgroundService', 'DPAPI', 'Serilog', 'Local Minimal API'],
    contentMarkdown: `# سند شماره ۶: معماری ویندوز سرویس (Windows Service Architecture)
## طراحی هسته اجرایی \`mahak.service\` با دات‌نت ۸/۹، Serilog، DPAPI و Minimal API

---

### ۱. ساختار سرویس
- سرویس به عنوان **Windows Service** با \`UseWindowsService()\` اجرا شده و پورت محلی \`http://127.0.0.1:5143\` را جهت ارتباط با صندوق محک باز می‌نماید.`
  },
  {
    id: 'security-checklist',
    number: 7,
    titleFa: 'چک‌لیست امنیتی و الزامات شاپرک/فارا (Security Checklist)',
    titleEn: 'Security Checklist & Compliance',
    status: 'completed',
    category: 'security',
    summary: 'الزامات محرمانگی، ممانعت از لاگ کردن CVV2/رمز کارت، رمزنگاری در حالت سکون و حرکت (Data-at-rest & in-transit)',
    tags: ['PCI-DSS Guidelines', 'Shaparak Compliance', 'DPAPI', 'Masking'],
    contentMarkdown: `# سند شماره ۷: چک‌لیست امنیتی و الزامات شاپرک/فارا (Security Checklist & Compliance)
## الزامات محرمانگی، انطباق با مقررات شاپرک و حفاظت داده‌ها در \`mahak.service\`

---

### ۱. چک‌لیست کلیدی
- [x] رمزنگاری کلمات عبور و ClientSecret با **Windows DPAPI**.
- [x] ماسک‌سازی شماره کارت‌ها به صورت \`603799******1234\`.
- [x] ممانعت مطلق از ذخیره CVV2 و رمز دوم و Track2.
- [x] استفاده انحصاری از HTTPS با TLS 1.2+ برای ارتباط با فارا.`
  },
  {
    id: 'deployment-guide',
    number: 8,
    titleFa: 'راهنمای نصب و استقرار ویندوز سرویس (Deployment & Ops Guide)',
    titleEn: 'Deployment & Installation Guide for Windows Service',
    status: 'completed',
    category: 'devops',
    summary: 'فرامین sc.exe، اسکریپت‌های PowerShell، تنظیمات فایروال محلی و پیکربندی ابزار mahak.config.exe',
    tags: ['PowerShell', 'sc.exe', 'Installer', 'MSI / Wix'],
    contentMarkdown: `# سند شماره ۸: راهنمای نصب و استقرار ویندوز سرویس (Deployment & Operations Guide)
## راهنمای گام‌به‌گام نصب، راه‌اندازی، پیکربندی امن و مانیتورینگ \`mahak.service\`

---

### ۱. ثبت سرویس در ویندوز
\`\`\`powershell
New-Service -Name "MahakFaraIntegrationService" \`
            -DisplayName "Mahak Fara / Shoma Integration Service" \`
            -BinaryPathName "C:\\Mahak\\Services\\MahakFaraService\\Mahak.Service.Host.exe" \`
            -StartupType Automatic

sc.exe failure "MahakFaraIntegrationService" reset= 86400 actions= restart/60000/restart/60000/restart/60000
Start-Service -Name "MahakFaraIntegrationService"
\`\`\``
  }
];
