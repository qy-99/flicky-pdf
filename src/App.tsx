import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ToolSelector } from './components/ToolSelector';
import { ToolWorkspace } from './components/ToolWorkspace';
import { PDFTool, ToolId } from './types';
import { TOOLS } from './constants';
import { ShieldAlert, Cpu } from 'lucide-react';

export default function App() {
  const [selectedTool, setSelectedTool] = useState<PDFTool | null>(null);

  // Check URL parameters & PWA Launch Queue for Windows File Integration
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. URL Query Param Routing (e.g. ?action=edit, ?action=merge)
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    if (action) {
      let targetToolId: ToolId | null = null;
      if (action === 'edit') targetToolId = ToolId.EDIT;
      else if (action === 'merge' || action === 'organize') targetToolId = ToolId.ORGANIZE;
      else if (action === 'sign') targetToolId = ToolId.SIGN;
      else if (action === 'compress') targetToolId = ToolId.COMPRESS;
      else if (action === 'split') targetToolId = ToolId.SPLIT;
      else if (action === 'reader') targetToolId = ToolId.READER;

      if (targetToolId) {
        const foundTool = TOOLS.find(t => t.id === targetToolId);
        if (foundTool) {
          setSelectedTool(foundTool);
        }
      }
    }

    // 2. Windows PWA Launch Queue API for File Associations
    if ('launchQueue' in window && 'files' in (window as any).launchQueue) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files || !launchParams.files.length) return;
        
        // If no tool is selected yet, default to Reader or Organize
        if (!selectedTool) {
          const defaultTool = TOOLS.find(t => t.id === ToolId.READER) || TOOLS[0];
          setSelectedTool(defaultTool);
        }
      });
    }
  }, []);

  const handleSelectTool = (tool: PDFTool) => {
    setSelectedTool(tool);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setSelectedTool(null);
    // Clean query params on return to home
    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 selection:bg-orange-100">
      {/* Universal Branding Header */}
      <Navbar onBackToHome={handleBackToHome} isHome={!selectedTool} />

      {/* Main Interactive Stage */}
      <main className="flex-grow">
        {selectedTool ? (
          <ToolWorkspace tool={selectedTool} onBack={handleBackToHome} />
        ) : (
          <ToolSelector onSelectTool={handleSelectTool} />
        )}
      </main>

      {/* Privacy-First Compliant Footer */}
      <footer className="border-t border-slate-200 bg-white py-12" id="app-footer">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-6">
            
            {/* Guarantee Checklist row */}
            <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Zero File Uploads</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Runs 100% Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>No User Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>No Accounts Required</span>
              </div>
            </div>

            {/* Privacy Warning Stamp */}
            <div className="max-w-md rounded-2xl bg-slate-50 border border-slate-200/60 p-4 text-[11px] text-slate-400 leading-relaxed">
              <p className="flex items-center justify-center gap-1.5 font-bold text-slate-700 mb-1">
                <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
                <span>Privacy & Security Guarantee</span>
              </p>
              <span>
                Flicky operates purely client-side inside your browser sandbox. No document pages, text strings, file names, or image stamps ever leave your machine. Caching caches application code files ONLY.
              </span>
            </div>

            {/* Creator Signature */}
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200/60 rounded-full px-4 py-1.5">
              <span className="text-orange-500 animate-pulse">❤️</span>
              <span>Created with passion by <strong className="text-slate-800">QY</strong></span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-mono text-[10px]">Est. 2026</span>
            </div>

            {/* Core Attribution */}
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-xs text-slate-400">
                &copy; 2026 FlickyPDF. Built for absolute privacy.
              </p>
              <div className="flex items-center gap-1 font-mono text-[9px] text-slate-300">
                <Cpu className="h-3 w-3 text-slate-300" />
                <span>WASM + PDF-Lib Sandbox</span>
              </div>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}

