import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Hourglass, 
  Copy, 
  Check, 
  Download, 
  ChevronLeft, 
  ExternalLink,
  BookOpen,
  Share2,
  ListOrdered
} from 'lucide-react';
import { DocumentItem, DOCUMENTS_LIST } from '../data/documentsData';

interface DocumentViewerProps {
  selectedDoc: DocumentItem;
  onSelectDoc: (doc: DocumentItem) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  selectedDoc, 
  onSelectDoc 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(selectedDoc.contentMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedDoc.contentMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedDoc.number.toString().padStart(2, '0')}_${selectedDoc.id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Sidebar: Documents Roadmap (1 to 8) */}
      <aside className="lg:col-span-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-blue-400" />
              <h2 className="font-bold text-slate-100 text-sm">فهرست اسناد ۸ گانه معماری</h2>
            </div>
            <span className="text-xs bg-blue-950 text-blue-300 px-2 py-0.5 rounded-full font-mono border border-blue-800/40">
              1 / 8 تکمیل‌شده
            </span>
          </div>

          <div className="space-y-2">
            {DOCUMENTS_LIST.map((doc) => {
              const isSelected = selectedDoc.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelectDoc(doc)}
                  className={`w-full text-right p-3 rounded-xl transition-all border flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-950/60 border-blue-500/80 shadow-md shadow-blue-500/10'
                      : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="mt-0.5">
                    {doc.status === 'completed' ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                    ) : doc.status === 'in_progress' ? (
                      <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-400 border border-amber-700 flex items-center justify-center text-xs font-bold animate-pulse">
                        ⏳
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center text-xs font-mono">
                        {doc.number}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        سند #{doc.number}
                      </span>
                      {doc.status === 'completed' && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                          تکمیل و نهایی
                        </span>
                      )}
                      {doc.status === 'in_progress' && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-medium">
                          در حال تدوین
                        </span>
                      )}
                      {doc.status === 'pending' && (
                        <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                          در نوبت
                        </span>
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm font-semibold truncate mt-0.5 ${
                      isSelected ? 'text-blue-300' : 'text-slate-200'
                    }`}>
                      {doc.titleFa}
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                      {doc.summary}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Facts Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            اصول طلایی طراحی mahak.service
          </h3>
          <ul className="space-y-1.5 text-slate-300 leading-relaxed list-disc list-inside">
            <li><strong>چرخه ۳ مرحله‌ای:</strong> ItemOrder ← Inquiry ← Confirm</li>
            <li><strong>کشینگ توکن JWT:</strong> ۲۴ ساعت با حاشیه امنیتی (هرگز در هر تراکنش توکن درخواست نشود)</li>
            <li><strong>امنیت DPAPI:</strong> حفاظت از رمزها در سطح LocalMachine</li>
            <li><strong>حفاظت Cut-off:</strong> مدیریت خودکار بازه‌های ۰۰:۰۰ و ۰۱:۰۰</li>
          </ul>
        </div>
      </aside>

      {/* Main Document Content Area */}
      <main className="lg:col-span-8 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
          
          {/* Top Actions Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-md border border-blue-700/50">
                  DOC #{selectedDoc.number}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedDoc.titleEn}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-100 mt-1">
                {selectedDoc.titleFa}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'کپی شد' : 'کپی Markdown'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/30 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود سند (.md)</span>
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 py-3 border-b border-slate-800/80">
            {selectedDoc.tags.map((tag, idx) => (
              <span key={idx} className="text-[11px] bg-slate-950 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-800 font-mono">
                #{tag}
              </span>
            ))}
          </div>

          {/* Rendered Markdown Body */}
          <div className="prose prose-invert prose-blue max-w-none py-4 text-slate-200 leading-relaxed text-sm sm:text-base">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-xl sm:text-2xl font-bold text-slate-100 border-b border-slate-800 pb-2 mt-6 mb-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg sm:text-xl font-bold text-blue-400 mt-6 mb-3 flex items-center gap-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-base sm:text-lg font-semibold text-slate-200 mt-4 mb-2" {...props} />,
                h4: ({node, ...props}) => <h4 className="text-sm sm:text-base font-semibold text-slate-300 mt-3 mb-1" {...props} />,
                p: ({node, ...props}) => <p className="mb-3 text-slate-300 leading-7" {...props} />,
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-4 rounded-xl border border-slate-800">
                    <table className="w-full text-right text-xs sm:text-sm border-collapse bg-slate-950/60" {...props} />
                  </div>
                ),
                th: ({node, ...props}) => <th className="bg-slate-800 text-slate-200 px-4 py-2.5 border-b border-slate-700 font-semibold" {...props} />,
                td: ({node, ...props}) => <td className="px-4 py-2 border-b border-slate-800 text-slate-300" {...props} />,
                code: ({inline, className, children, ...props}: any) => {
                  if (inline) {
                    return (
                      <code className="bg-slate-950 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-800" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <div className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200" {...props}>
                        <code>{children}</code>
                      </pre>
                    </div>
                  );
                },
                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1.5 my-3 text-slate-300 pr-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1.5 my-3 text-slate-300 pr-2" {...props} />,
                blockquote: ({node, ...props}) => (
                  <blockquote className="border-r-4 border-blue-500 bg-blue-950/20 pr-4 pl-2 py-2 my-4 rounded-l text-slate-300 italic" {...props} />
                )
              }}
            >
              {selectedDoc.contentMarkdown}
            </ReactMarkdown>
          </div>

        </div>
      </main>

    </div>
  );
};
