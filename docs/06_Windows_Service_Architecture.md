# سند شماره ۶: معماری ویندوز سرویس (Windows Service Architecture)
## طراحی هسته اجرایی `mahak.service` با دات‌نت ۸/۹، Serilog، DPAPI و Minimal API

---

### مشخصات سند (Document Control)
| مشخصه | مقدار |
| :--- | :--- |
| **نام پروژه** | هسته اجرایی سرویس ویندوزی `mahak.service` |
| **تکنولوژی میزبان** | .NET 8 / .NET 9 Worker Service با `Microsoft.Extensions.Hosting.WindowsServices` |
| **مکانیزم لاگینگ** | Serilog (Rolling File Sink + Windows EventLog Sink) |
| **مکانیزم IPC با صندوق** | Kestrel Local Minimal API (محدود به `http://127.0.0.1:5143`) |
| **نسخه سند** | 1.0.0 |
| **وضعیت** | نهایی و مصوب (Approved) |

---

## ۱. ساختار کلان سرویس میزبان (Host Architecture)

سرویس `mahak.service` به عنوان یک پروسه مستقل سیستم‌عامل با امتیازات کاربری استاندارد (`NT SERVICE\mahak.service` یا `LocalSystem`) اجرا شده و معماری چندوظیفگی (Multi-tasking) زیر را ارائه می‌دهد:

```mermaid
flowchart TB
    subgraph WindowsServiceHost [میزبان ویندوز سرویس (Mahak.Service.exe)]
        direction TB
        Program[Program.cs\nUseWindowsService] --> DIContainer[IoC / DI Container\n(ServiceCollection)]
        
        DIContainer --> LocalAPI[Kestrel Local Minimal API\nhttp://127.0.0.1:5143\n(ارتباط با صندوق محک)]
        DIContainer --> OrderWorkflow[OrderWorkflowEngine\nمدیریت ماشین حالت ۳ مرحله‌ای]
        DIContainer --> TokenMgr[TokenManager\nکشینگ و تجدید خودکار توکن]
        DIContainer --> Schedulers[Background Cron Jobs\n(Reconciliation, Sweeper, Health)]
        
        DIContainer --> SerilogEngine[Serilog Structured Logging\n- Logs/mahak-service-.log\n- Windows Event Viewer]
        DIContainer --> DpapiModule[Windows DPAPI Module\nProtectedData.LocalMachine]
        DIContainer --> SqliteDb[(پایگاه داده محلی SQLite\nData/mahak_fara.db)]
    end

    PosApp[صندوق فروشگاهی محک (POS Client)] <-->|HTTP REST / JSON| LocalAPI
    OrderWorkflow <-->|HTTPS Bearer JWT| FaraCloud[سرورهای مرکزی فارا / شما]
```

---

## ۲. کد منبع فایل راه‌انداز (`Program.cs`)

```csharp
using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;
using Mahak.Service.Core;
using Mahak.Service.Data;
using Mahak.Service.FaraClient;
using Mahak.Service.FaraClient.Authentication;
using Mahak.Service.Jobs;

namespace Mahak.Service.Host
{
    public class Program
    {
        public static void Main(string[] args)
        {
            // ۱. پیکربندی اولیه لاگینگ با Serilog
            string logDirectory = Path.Combine(AppContext.BaseDirectory, "Logs");
            Directory.CreateDirectory(logDirectory);

            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Information()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Application", "mahak.service")
                .WriteTo.Console()
                .WriteTo.File(
                    path: Path.Combine(logDirectory, "mahak-service-.log"),
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 30,
                    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
                .WriteTo.EventLog(
                    source: "MahakFaraService",
                    logName: "Application",
                    manageEventSource: true)
                .CreateLogger();

            try
            {
                Log.Information("در حال راه‌اندازی ویندوز سرویس mahak.service...");

                var builder = WebApplication.CreateBuilder(new WebApplicationOptions
                {
                    Args = args,
                    ContentRootPath = AppContext.BaseDirectory
                });

                // ۲. فعال‌سازی قابلیت اجرا به عنوان Windows Service
                builder.Host.UseWindowsService(options =>
                {
                    options.ServiceName = "MahakFaraIntegrationService";
                });

                builder.Host.UseSerilog();

                // ۳. محدودسازی Kestrel به لوکال هاست جهت امنیت
                builder.WebHost.ConfigureKestrel(serverOptions =>
                {
                    serverOptions.ListenLocalhost(5143); // http://127.0.0.1:5143
                });

                // ۴. ثبت سرویس‌ها در کانتینر DI
                var services = builder.Services;
                var configuration = builder.Configuration;

                services.AddMemoryCache();
                services.Configure<FaraAuthOptions>(configuration.GetSection("FaraAuth"));

                // ثبت لایه‌های داخلی
                services.AddSingleton<ITokenManager, TokenManager>();
                services.AddTransient<FaraAuthHeaderHandler>();
                
                services.AddHttpClient<IFaraHttpClient, FaraHttpClient>(client =>
                {
                    client.BaseAddress = new Uri(configuration["FaraAuth:BaseUrl"] ?? "https://fara.shoma.gov.ir");
                    client.Timeout = TimeSpan.FromSeconds(15);
                })
                .AddHttpMessageHandler<FaraAuthHeaderHandler>();

                services.AddSingleton<IOrderRepository, SqliteOrderRepository>();
                services.AddScoped<IOrderWorkflowManager, OrderWorkflowManager>();

                // ثبت جاب‌های پس‌زمینه
                services.AddHostedService<NightlyReconciliationJob>();
                services.AddHostedService<StuckOrderSweeperJob>();

                var app = builder.Build();

                // ۵. اندپوینت‌های Minimal API محلی
                app.MapGet("/health", () => Results.Ok(new { status = "HEALTHY", timestamp = DateTime.UtcNow }));
                
                app.MapPost("/api/orders/items", async (ItemOrderRequestDto req, IOrderWorkflowManager workflow) =>
                {
                    var result = await workflow.ProcessItemOrderAsync(req);
                    return Results.Ok(result);
                });

                app.MapPost("/api/orders/inquiry", async (PurchaseInquiryRequestDto req, IOrderWorkflowManager workflow) =>
                {
                    var result = await workflow.ProcessInquiryAsync(req);
                    return Results.Ok(result);
                });

                app.MapPost("/api/orders/confirm", async (ConfirmOrderRequestDto req, IOrderWorkflowManager workflow) =>
                {
                    var result = await workflow.ProcessConfirmAsync(req);
                    return Results.Ok(result);
                });

                app.MapPost("/api/orders/cancel", async (CancelOrderRequestDto req, IOrderWorkflowManager workflow) =>
                {
                    var result = await workflow.ProcessCancelAsync(req);
                    return Results.Ok(result);
                });

                // ۶. اجرای سرویس
                app.Run();
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "ویندوز سرویس mahak.service با خطای بحرانی متوقف شد!");
            }
            finally
            {
                Log.CloseAndFlush();
            }
        }
    }
}
```

---

## ۳. فایل پیکربندی امن (`appsettings.json`)

```json
{
  "FaraAuth": {
    "BaseUrl": "https://fara.shoma.gov.ir",
    "ClientId": "MAHAK_POS_TERMINAL_88201",
    "EncryptedClientSecret": "AQAAANCMnd8BFdERjHoAwE/Cl+sBAAAAoP1Z7l21i0qR...[DPAPI]...==",
    "TerminalId": "98120401",
    "AcceptorCode": "400192841"
  },
  "Database": {
    "ConnectionString": "Data Source=Data/mahak_fara.db;Cache=Shared"
  },
  "CutOffSettings": {
    "EnableNightlyReconciliation": true,
    "ReconciliationHour": 1,
    "ReconciliationMinute": 30
  }
}
```
