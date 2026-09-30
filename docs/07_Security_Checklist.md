# سند شماره ۷: چک‌لیست امنیتی و الزامات شاپرک/فارا (Security Checklist & Compliance)
## الزامات محرمانگی، انطباق با مقررات شاپرک و حفاظت داده‌ها در `mahak.service`

---

### مشخصات سند (Document Control)
| مشخصه | مقدار |
| :--- | :--- |
| **نام سند** | چک‌لیست جامع امنیتی و انطباق با الزامات شبکه پرداخت و کالابرگ |
| **استانداردهای مرجع** | الزامات امنیتی شاپرک، چارچوب PCI-DSS، سند فنی فارا/شما |
| **نسخه سند** | 1.0.0 |
| **وضعیت** | نهایی و مصوب (Approved) |

---

## ۱. جدول ماتریس ارزیابی و تطابق امنیتی (Compliance Matrix)

| ردیف | الزام امنیتی | وضعیت پیاده‌سازی | شرح و مکانیزم فنی در `mahak.service` |
| :---: | :--- | :---: | :--- |
| **۱** | **عدم ذخیره اطلاعات حساس کارت** | ✅ پاس شد | شماره کامل کارت، CVV2، رمز کارت و Track2 تحت هیچ شرایطی در دیتابیس یا فایل‌های لاگ ذخیره نمی‌شوند. |
| **۲** | **ماسک‌سازی شماره کارت (PAN Masking)** | ✅ پاس شد | کلیه شماره کارت‌ها در UI و دیتابیس به صورت `603799******1234` (نمایش ۶ رقم اول و ۴ رقم آخر) ماسک می‌شوند. |
| **۳** | **ماسک‌سازی کد ملی و شماره موبایل** | ✅ پاس شد | کد ملی به صورت `001****678` و موبایل به صورت `0912***789` در لاگ‌های حسابرسی ذخیره می‌گردد. |
| **۴** | **رمزنگاری کلیدها در حالت سکون (Data at Rest)** | ✅ پاس شد | رمزهای عبور و ClientSecret وب‌سرویس فارا با **Windows DPAPI** (`DataProtectionScope.LocalMachine`) رمزنگاری می‌شوند. |
| **۵** | **امنیت داده‌ها در حال انتقال (Data in Transit)** | ✅ پاس شد | کلیه ارتباطات با سرور فارا منحصراً بر بستر **HTTPS با TLS 1.2 و TLS 1.3** انجام می‌پذیرد. |
| **۶** | **محدودسازی دسترسی به API محلی** | ✅ پاس شد | وب‌سرور Kestrel صرفاً بر روی لوپ‌بک (`127.0.0.1:5143`) بایند شده و از شبکه خارجی غیرقابل دسترسی است. |
| **۷** | **عدم درخواست توکن تکراری** | ✅ پاس شد | توکن‌ها در حافظه کش شده و با `SemaphoreSlim` در برابر حملات همزمانی و DoS ناخواسته محافظت می‌شوند. |
| **۸** | **حداقل دسترسی برای اکانت سرویس (Least Privilege)** | ✅ پاس شد | سرویس تحت اکانت ایزوله‌شده `NT SERVICE\mahak.service` بدون نیاز به دسترسی Administrator اجرا می‌شود. |

---

## ۲. توابع کمکی ماسک‌سازی امن داده‌ها (Data Masking Helpers)

```csharp
namespace Mahak.Service.Security
{
    public static class SecurityMasker
    {
        /// <summary>
        /// ماسک‌سازی شماره کارت ۱۶ رقمی بانکی (نمایش ۶ رقم اول و ۴ رقم آخر)
        /// </summary>
        public static string MaskPan(string? pan)
        {
            if (string.IsNullOrWhiteSpace(pan) || pan.Length < 16)
                return "****************";

            return $"{pan.Substring(0, 6)}******{pan.Substring(pan.Length - 4)}";
        }

        /// <summary>
        /// ماسک‌سازی شماره تلفن همراه (نمایش ۴ رقم اول و ۳ رقم آخر)
        /// </summary>
        public static string MaskMobile(string? mobile)
        {
            if (string.IsNullOrWhiteSpace(mobile) || mobile.Length < 11)
                return "***********";

            return $"{mobile.Substring(0, 4)}****{mobile.Substring(mobile.Length - 3)}";
        }

        /// <summary>
        /// ماسک‌سازی کد ملی ۱۰ رقمی (نمایش ۳ رقم اول و ۳ رقم آخر)
        /// </summary>
        public static string MaskNationalCode(string? nationalCode)
        {
            if (string.IsNullOrWhiteSpace(nationalCode) || nationalCode.Length < 10)
                return "**********";

            return $"{nationalCode.Substring(0, 3)}****{nationalCode.Substring(nationalCode.Length - 3)}";
        }
    }
}
```

---

## ۳. دستورالعمل پیکربندی فایروال ویندوز (Windows Firewall Rules)

برای جلوگیری از هرگونه نفوذ خارجی، در صورت نیاز به باز کردن پورت محلی، دسترسی صرفاً به Subnet صندوق‌ها محدود می‌شود:

```powershell
# مسدودسازی دسترسی عمومی و محدود کردن پورت 5143 صرفاً به Localhost
New-NetFirewallRule -DisplayName "Mahak Fara Local IPC" `
                    -Direction Inbound `
                    -LocalPort 5143 `
                    -Protocol TCP `
                    -RemoteAddress 127.0.0.1 `
                    -Action Allow
```
