import React, { useState } from 'react';
import { 
  Monitor, Check, Download, ExternalLink, ShieldCheck, 
  Sparkles, Layers, FileEdit, Merge, PenTool, FileDown, 
  X, Terminal, Info, ChevronRight, CornerDownRight
} from 'lucide-react';

interface WindowsIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallPwa?: () => void;
  isInstalledPwa?: boolean;
}

export function WindowsIntegrationModal({
  isOpen,
  onClose,
  onInstallPwa,
  isInstalledPwa = false,
}: WindowsIntegrationModalProps) {
  const [activeTab, setActiveTab] = useState<'pwa' | 'registry' | 'cmd'>('registry');
  const [downloadedReg, setDownloadedReg] = useState(false);
  const [downloadedUninstaller, setDownloadedUninstaller] = useState(false);

  if (!isOpen) return null;

  // Determine host URL for registry integration
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://qy-99.github.io';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/flicky-pdf/';
  const fullAppUrl = `${currentOrigin}${currentPath}`;

  // Generate Windows Registry (.reg) Script Content
  const generateRegFile = () => {
    return `Windows Registry Editor Version 5.00

; ====================================================================
; FlickyPDF - Windows File Explorer Right-Click Context Menu Installer
; Created for: ${fullAppUrl}
; ====================================================================

; 1. Add "Edit with Flicky" to PDF context menu
[HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Edit with Flicky]
@="Edit with Flicky"
"Icon"="C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe,0"

[HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Edit with Flicky\\command]
@="cmd.exe /c start \"\" \"${fullAppUrl}?action=edit\""

; 2. Add "Merge with Flicky" to PDF context menu
[HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Merge with Flicky]
@="Merge with Flicky"
"Icon"="C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe,0"

[HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Merge with Flicky\\command]
@="cmd.exe /c start \"\" \"${fullAppUrl}?action=merge\""

; 3. Add "Sign with Flicky" to PDF context menu
[HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Sign with Flicky]
@="Sign with Flicky"
"Icon"="C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe,0"

[HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Sign with Flicky\\command]
@="cmd.exe /c start \"\" \"${fullAppUrl}?action=sign\""

; 4. Add "Compress with Flicky" to PDF context menu
[HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Compress with Flicky]
@="Compress with Flicky"
"Icon"="C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe,0"

[HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Compress with Flicky\\command]
@="cmd.exe /c start \"\" \"${fullAppUrl}?action=compress\""
`;
  };

  const generateUninstallRegFile = () => {
    return `Windows Registry Editor Version 5.00

; ====================================================================
; FlickyPDF - Windows File Explorer Context Menu Uninstaller
; ====================================================================

[-HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Edit with Flicky]
[-HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Merge with Flicky]
[-HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Sign with Flicky]
[-HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\Compress with Flicky]
`;
  };

  const handleDownloadReg = () => {
    const content = generateRegFile();
    const blob = new Blob([content], { type: 'application/x-msregedit' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Add-Flicky-To-Windows-Context-Menu.reg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedReg(true);
    setTimeout(() => setDownloadedReg(false), 5000);
  };

  const handleDownloadUninstallReg = () => {
    const content = generateUninstallRegFile();
    const blob = new Blob([content], { type: 'application/x-msregedit' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Remove-Flicky-From-Windows-Context-Menu.reg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedUninstaller(true);
    setTimeout(() => setDownloadedUninstaller(false), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Windows Context Menu Integration</span>
                <span className="rounded-full bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 font-mono text-[10px] text-orange-300">
                  Windows 10 / 11
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Add "Edit with Flicky" & "Merge with Flicky" directly to File Explorer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            id="btn-close-windows-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('registry')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'registry'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Right-Click Context Menu (.reg)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pwa'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>PWA File Association ("Open with")</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          
          {activeTab === 'registry' && (
            <div className="space-y-5">
              {/* Context Menu Mockup Visual Preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-slate-200 shadow-inner">
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Windows File Explorer Preview</span>
                  <span className="text-emerald-400 font-bold">Right-Click on any .PDF</span>
                </p>
                <div className="rounded-xl bg-slate-800/90 border border-slate-700 p-2 max-w-sm mx-auto shadow-2xl font-sans text-xs space-y-1">
                  <div className="px-3 py-1 text-slate-400 text-[10px] border-b border-slate-700/60 font-semibold">
                    Open
                  </div>
                  
                  {/* Highlighted Flicky Commands */}
                  <div className="px-3 py-1.5 rounded-md bg-orange-500/20 border border-orange-500/40 text-orange-200 flex items-center justify-between font-medium">
                    <span className="flex items-center gap-2">
                      <FileEdit className="h-3.5 w-3.5 text-orange-400" />
                      <strong>Edit with Flicky</strong>
                    </span>
                    <span className="text-[9px] text-orange-300 font-mono">FlickyPDF</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Merge className="h-3.5 w-3.5 text-orange-400" />
                      <span>Merge with Flicky</span>
                    </span>
                  </div>

                  <div className="px-3 py-1.5 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <PenTool className="h-3.5 w-3.5 text-orange-400" />
                      <span>Sign with Flicky</span>
                    </span>
                  </div>

                  <div className="px-3 py-1.5 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileDown className="h-3.5 w-3.5 text-orange-400" />
                      <span>Compress with Flicky</span>
                    </span>
                  </div>

                  <div className="px-3 py-1 text-slate-400 text-[10px] border-t border-slate-700/60">
                    Open with &gt;
                  </div>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>How to enable in Windows File Explorer (3 Easy Steps)</span>
                </h4>
                
                <ol className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white font-bold text-[10px] flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Download the 1-Click Registry Script</p>
                      <p className="text-slate-500 text-[11px]">Click the button below to generate and save <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-[10px]">Add-Flicky-To-Windows-Context-Menu.reg</code>.</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white font-bold text-[10px] flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Double-Click the .reg File on Windows</p>
                      <p className="text-slate-500 text-[11px]">Open the downloaded file. Windows will ask "Do you want to add this information to the registry?". Click <strong>Yes</strong>.</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white font-bold text-[10px] flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Right-Click any PDF File in Explorer!</p>
                      <p className="text-slate-500 text-[11px]">Right-click any <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-[10px]">.pdf</code> file in Windows File Explorer to instantly see <strong>Edit with Flicky</strong>, <strong>Merge with Flicky</strong>, and more!</p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                <button
                  onClick={handleDownloadReg}
                  className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                  id="btn-download-reg-installer"
                >
                  {downloadedReg ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Script Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download Windows Registry Script (.reg)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadUninstallReg}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                  id="btn-download-reg-uninstaller"
                >
                  {downloadedUninstaller ? 'Uninstaller Downloaded' : 'Download Uninstaller (.reg)'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pwa' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 mb-0.5">Native Windows "Open with..." Integration</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Flicky includes modern Web App Manifest File Handling (<code className="bg-orange-100/80 px-1 rounded font-mono text-[10px]">file_handlers</code>). When installed as a Desktop PWA, Windows automatically lists Flicky under <strong>"Open with..."</strong> in Windows File Explorer and in Windows Default Apps settings!
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800">How to register Flicky as a Windows App:</h4>
                <ol className="space-y-2 list-decimal pl-4 text-slate-600 text-[11px]">
                  <li>
                    Click the <strong>"Download App" / "Install App"</strong> button in the top header (or click the install icon in Chrome/Edge address bar).
                  </li>
                  <li>
                    Confirm installation. Chrome/Edge will create a desktop shortcut and register Flicky with Windows File System API.
                  </li>
                  <li>
                    Right-click any PDF file on your computer -&gt; select <strong>Open with</strong> -&gt; choose <strong>Flicky</strong>.
                  </li>
                  <li>
                    (Optional) Check <em>"Always use this app to open .pdf files"</em> to set Flicky as your primary Windows PDF reader and editor!
                  </li>
                </ol>
              </div>

              {onInstallPwa && !isInstalledPwa && (
                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={onInstallPwa}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    <Download className="h-4 w-4 text-orange-400" />
                    <span>Install Flicky PWA on Windows</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info stamp */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Safe & 100% Client-Side. No admin privileges required for user registry keys.</span>
          </div>
          <button
            onClick={onClose}
            className="font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
