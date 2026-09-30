# سند شماره ۲: ماشین حالت تفصیلی و نمودارهای توالی (State Machine & Sequence Diagrams)
## یکپارچه‌سازی سرویس ویندوزی `mahak.service` با سامانه شبکه ملی اعتبار (فارا / شما - کالابرگ)

---

### مشخصات سند (Document Control)
| مشخصه | مقدار |
| :--- | :--- |
| **نام سند** | ماشین حالت تفصیلی، نمودارهای توالی و سناریوهای بازآزمایی و بازیابی |
| **نسخه سند** | 1.0.0 |
| **وضعیت** | نهایی و مصوب (Approved) |
| **استاندارد مدل‌سازی** | Mermaid JS / UML 2.5 |
| **سرویس مقصد** | `mahak.service` (.NET 8 / .NET 9) |

---

## ۱. ماشین حالت تراکنش‌ها (Transaction State Machine)

تراکنش‌های اعتباری در `mahak.service` به صورت Stateful و مقید به گذارهای مشخص مدیریت می‌شوند تا از هرگونه ناهماهنگی میان صندوق فروشگاه، شاپرک و سرورهای فارا جلوگیری گردد.

### ۱.۱. نمودار جامع گذار حالت‌ها (State Transition Diagram)

```mermaid
stateDiagram-v2
    [*] --> None : شروع تراکنش جدید
    
    None --> ItemOrderCreated : فراخوانی موفق ItemOrder\n(تخصیص orderTrace)
    None --> ItemOrderFailed : خطای اعتبارسنجی کالاها / شبکه
    
    ItemOrderCreated --> InquiryReserved : استعلام موفق اعتبار (PurchaseInquiry)\n(رزرو موقت اعتبار فارا)
    ItemOrderCreated --> InquiryFailed : خطای عدم تطابق کد ملی یا شبکه
    ItemOrderCreated --> CancelledByUser : انصراف صندوقدار قبل از استعلام
    
    InquiryReserved --> Confirmed : تراکنش موفق شاپرک + فراخوانی موفق ConfirmOrder
    InquiryReserved --> CancelledByUser : انصراف مشتری / عدم موجودی سهم نقدی\n(فراخوانی CancelOrder)
    InquiryReserved --> ExpiredTimeout : سپری شدن مهلت رزرو موقت اعتبار\n(Sweeper Job بعد از ۱۲۰ ثانیه)
    InquiryReserved --> ConfirmationPending : شاپرک موفق اما ConfirmOrder تایم‌اوت شد\n(ورود به صف استعلام وضعیت)
    
    ConfirmationPending --> Confirmed : استعلام وضعیت مثبت از فارا (StatusInquiry)
    ConfirmationPending --> Reversed : عدم تایید نهایی / اجرای ReverseOrder
    
    Confirmed --> Reversed : خطای چاپ فاکتور / خرابی کالا / اصلاح\n(فراخوانی ReverseOrder)
    Confirmed --> [*] : پایان موفقیت‌آمیز تراکنش
    
    CancelledByUser --> [*] : اعتبار مسدودشده آزاد شد
    Reversed --> [*] : وجه و اعتبار مسترد شد
    ExpiredTimeout --> [*] : لغو خودکار در سرور فارا
    ItemOrderFailed --> [*]
    InquiryFailed --> [*]
```

### ۱.۲. جدول تشریح حالت‌ها (State Dictionary)

| وضعیت (State Enum) | مقدار عددی | شرح و معنی وضعیت | عملیات مجاز بعدی |
| :--- | :---: | :--- | :--- |
| `None` | 0 | وضعیت اولیه قبل از هرگونه ارسال به فارا | `ItemOrder` |
| `ItemOrderCreated` | 10 | اقلام سبد کالا ارسال شده و `orderTrace` از فارا دریافت شده است. | `PurchaseInquiry`, `Cancel` |
| `ItemOrderFailed` | 15 | ارسال اقلام به دلیل عدم تطابق بارکد GTIN یا خطای شبکه شکست خورد. | خاتمه / تلاش مجدد |
| `InquiryReserved` | 20 | اعتبار استعلام شده و سهم یارانه به صورت موقت در فارا مسدود شده است. | `ConfirmOrder`, `Cancel` |
| `InquiryFailed` | 25 | استعلام اعتبار به دلیل نامعتبر بودن کارت یا کد ملی ناموفق بود. | خاتمه / تغییر کارت |
| `ConfirmationPending` | 30 | تراکنش شاپرک موفق بوده اما پاسخ `ConfirmOrder` به دلیل تایم‌اوت شبکه دریافت نشد. | `StatusInquiry`, `Reverse` |
| `Confirmed` | 40 | تراکنش به صورت قطعی در فارا و شاپرک ثبت شده و فاکتور نهایی صادر گردید. | `Reverse` (در بازه مجاز) |
| `CancelledByUser` | 50 | تراکنش توسط کاربر لغو شده و متد `CancelOrder` جهت آزادسازی اعتبار ارسال گردید. | پایان |
| `Reversed` | 60 | تراکنش قبلاً تایید شده، به طور کامل برگشت داده شده است. | پایان |
| `ExpiredTimeout` | 70 | تراکنش در وضعیت رزرو به مدت بیش از ۱۲۰ ثانیه رها شده و خودکار منقضی شد. | پایان |

---

## ۲. نمودارهای توالی سناریوهای عملیاتی (Sequence Diagrams)

### ۲.۱. سناریوی ۱: جریان استاندارد خرید با کارت بانکی (Standard Card Flow)

```mermaid
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
```

---

### ۲.۲. سناریوی ۲: جریان خرید بدون کارت با رمز یکبار مصرف (Cardless / OTP Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as خریدار (سرپرست خانوار)
    actor Cashier as صندوقدار محک
    participant Core as mahak.service
    participant FaraClient as FaraClient
    participant FaraAPI as سامانه فارا / شما

    Note over Customer,FaraAPI: ایجاد جلسه OTP
    Customer->>Cashier: اعلام شماره ملی و شماره تلفن همراه
    Cashier->>Core: GenerateOtpSession(nationalCode, mobile)
    Core->>FaraClient: RequestOtpAsync(...)
    FaraClient->>FaraAPI: POST /api/v1/otp/generate
    FaraAPI->>Customer: پیامک کد رمز یکبار مصرف ۶ رقمی
    FaraAPI-->>FaraClient: { sessionId: "OTP-SESS-5519", expiresIn: 120 }
    FaraClient-->>Core: Session آماده است
    Core-->>Cashier: در انتظار دریافت رمز پیامک‌شده از خریدار

    Note over Customer,FaraAPI: استعلام خرید با OTP
    Customer->>Cashier: ارائه رمز پیامک‌شده (مثلاً 749201)
    Cashier->>Core: استعلام با OTP (orderTrace, sessionId, otpCode)
    Core->>FaraClient: SendPurchaseInquiryWithOtpAsync(...)
    FaraClient->>FaraAPI: POST /api/v1/orders/inquiry-otp
    FaraAPI-->>FaraClient: 200 OK { subsidizedAmount: 1200000, cashAmount: 400000 }
    FaraClient-->>Core: تایید اعتبار OTP
    Core->>Core: تغییر وضعیت به InquiryReserved
    Core-->>Cashier: ادامه پرداخت سهم نقدی و تایید نهایی (ConfirmOrder)
```

---

### ۲.۳. سناریوی ۳: انصراف خریدار و آزادسازی اعتبار مسدودشده (Cancel Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as صندوقدار محک
    participant Core as mahak.service
    participant FaraClient as FaraClient
    participant FaraAPI as سامانه فارا / شما

    Note over Cashier,FaraAPI: پس از استعلام، خریدار از خرید منصرف می‌شود
    Cashier->>Core: لغو سفارش (orderTrace)
    Core->>FaraClient: SendCancelOrderAsync(orderTrace, reason: "CustomerDeclined")
    FaraClient->>FaraAPI: POST /api/v1/orders/cancel { orderTrace: "TRC-984321" }
    FaraAPI-->>FaraClient: 200 OK { status: "CANCELLED", unreservedAmount: 850000 }
    FaraClient-->>Core: تایید آزادسازی اعتبار
    Core->>Core: به‌روزرسانی وضعیت به CancelledByUser
    Core-->>Cashier: سفارش لغو و اعتبار مشتری بلافاصله آزاد گردید
```

---

### ۲.۴. سناریوی ۴: مدیریت قطعی شبکه در حین Confirm و بازیابی خودکار (Recovery Flow)

```mermaid
sequenceDiagram
    autonumber
    participant Core as mahak.service
    participant FaraClient as FaraClient
    participant FaraAPI as سامانه فارا / شما
    participant SweeperJob as Background Sweeper Job

    Note over Core,FaraAPI: شاپرک تایید شده اما در حین Confirm ارتباط قطع می‌شود
    Core->>FaraClient: SendConfirmOrderAsync(orderTrace, RRN, STAN)
    FaraClient-x FaraAPI: POST /api/v1/orders/confirm (Network Timeout 504 / Connection Drop)
    FaraClient-->>Core: SocketException / HttpRequestException
    Core->>Core: تغییر وضعیت به ConfirmationPending (علامت‌گذاری بلاتکلیف)

    Note over SweeperJob,FaraAPI: جاب بازیابی تراکنش‌های بلاتکلیف (هر ۶۰ ثانیه)
    SweeperJob->>Core: دریافت تراکنش‌های در وضعیت ConfirmationPending
    SweeperJob->>FaraClient: GetOrderStatusAsync(orderTrace)
    FaraClient->>FaraAPI: GET /api/v1/orders/status?orderTrace=TRC-984321
    alt در سرور فارا سفارش ثبت نهایی شده است
        FaraAPI-->>FaraClient: { status: "CONFIRMED", confirmRef: "CNF-991" }
        FaraClient-->>Core: سفارش موفق بوده است
        Core->>Core: تغییر وضعیت به Confirmed و حل خودکار مغایرت
    else در سرور فارا سفارش تایید نشده است
        FaraAPI-->>FaraClient: { status: "RESERVED" }
        FaraClient-->>Core: ارسال مجدد Confirm یا Reverse
        Core->>FaraClient: SendReverseOrderAsync(orderTrace, RRN)
        FaraClient->>FaraAPI: POST /api/v1/orders/reverse
        FaraAPI-->>FaraClient: { status: "REVERSED" }
        Core->>Core: تغییر وضعیت به Reversed و ثبت در لاگ مغایرت‌ها
    end
```

---

## ۳. جدول تصمیم‌گیری اقدامات خودکار (Decision Matrix)

| رخداد در سیستم | وضعیت جاری | اقدام مهندسی سرویس `mahak.service` | وضعیت نهایی محلی |
| :--- | :--- | :--- | :--- |
| خطای اعتبار سنجی اقلام | `None` | عدم فراخوانی فارا، بازگشت پیام دقیق خطا به صندوقدار | `ItemOrderFailed` |
| عدم پاسخ دهی سرور فارا در ItemOrder | `None` | اعمال پالیسی Polly Retry (۳ بار با فاصله نمایی) | در صورت شکست: `ItemOrderFailed` |
| انصراف بعد از استعلام | `InquiryReserved` | ارسال قطعی متد `CancelOrder` برای آزادسازی سهم یارانه | `CancelledByUser` |
| رد شدن کارت در شاپرک | `InquiryReserved` | ارسال `CancelOrder` برای رفع انسداد سهم کالابرگ | `CancelledByUser` |
| تایم‌اوت پاسخ شاپرک | `InquiryReserved` | استعلام از دستگاه کارتخوان؛ در صورت عدم وصول وجه، لغو سفارش | `CancelledByUser` |
| تایم‌اوت در فراخوانی ConfirmOrder | `InquiryReserved` | تغییر وضعیت به `ConfirmationPending` و سپردن به Sweeper Job | `Confirmed` یا `Reversed` |
| خطای سوختن رول کاغذ چاپگر | `Confirmed` | ثبت فاکتور الکترونیک در دیتابیس + فعال‌سازی گزینه چاپ مجدد فاکتور | `Confirmed` |
