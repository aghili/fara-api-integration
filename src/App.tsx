import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentViewer } from './components/DocumentViewer';
import { InteractiveSimulator } from './components/InteractiveSimulator';
import { MermaidViewer } from './components/MermaidViewer';
import { SecuritySection } from './components/SecuritySection';
import { DOCUMENTS_LIST, DocumentItem } from './data/documentsData';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'docs' | 'simulator' | 'diagrams' | 'architecture'>('docs');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem>(DOCUMENTS_LIST[0]);

  const handleSelectDocById = (id: string) => {
    const found = DOCUMENTS_LIST.find(d => d.id === id);
    if (found) setSelectedDoc(found);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDocId={selectedDoc.id}
        onSelectDoc={handleSelectDocById}
      />

      {/* Main Tab Content */}
      <div className="flex-1">
        {activeTab === 'docs' && (
          <DocumentViewer
            selectedDoc={selectedDoc}
            onSelectDoc={setSelectedDoc}
          />
        )}

        {activeTab === 'simulator' && (
          <InteractiveSimulator />
        )}

        {activeTab === 'diagrams' && (
          <MermaidViewer />
        )}

        {activeTab === 'architecture' && (
          <SecuritySection />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            سرویس یکپارچه‌سازی سامانه شبکه ملی اعتبار (فارا / شما - کالابرگ الکترونیکی) | <span className="font-mono">mahak.service</span>
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            Target: .NET 8 / .NET 9 Worker Service • Windows DPAPI • Iran Standard Time (IRST)
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
