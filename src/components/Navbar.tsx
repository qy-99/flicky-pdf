import React, { useState, useEffect } from 'react';
import { OfflineIndicator } from './OfflineIndicator';
import { Download, Monitor, Check, Sparkles, Share2, Copy } from 'lucide-react';

interface NavbarProps {
  onBackToHome?: () => void;
  isHome: boolean;
}

export function Navbar({ onBackToHome, isHome }: NavbarProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clean up workspace preview URLs if needed, but standard href is perfect
      setAppUrl(window.location.origin + window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Detect standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else {
      // Show instructional tooltip or fallback info
      setShowTooltip(prev => !prev);
      setTimeout(() => setShowTooltip(false), 8000);
    }
  };

  const handleCopyLink = () => {
    if (appUrl) {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-orange-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <button
          onClick={onBackToHome}
          className="flex items-center gap-3 transition-opacity hover:opacity-90 cursor-pointer"
          id="btn-navbar-logo"
        >
          {/* Flat Single-Color Page-Peel F Logo (Scalable) */}
          <div className="relative h-10 w-10 flex-shrink-0 text-slate-900">
            <svg
              viewBox="0 0 100 100"
              fill="currentColor"
              className="h-full w-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer square background for contrast - Orange 500 block as per pastel instructions */}
              <rect width="100" height="100" rx="22" className="fill-orange-500" />
              {/* Page silhouette */}
              <path
                d="M30,25 L55,25 L72,42 L72,75 C72,77.8 69.8,80 67,80 L30,80 C27.2,80 25,77.8 25,75 L25,30 C25,27.2 27.2,25 30,25 Z"
                className="fill-white"
              />
              {/* Mid-flick/peel folded corner forming 'F' curve */}
              <path
                d="M55,25 L55,35 C55,38.8 58.2,42 62,42 L72,42 L55,25 Z"
                className="fill-orange-100"
              />
              {/* Inside letter overlay or page structure accentuating the F */}
              <path
                d="M36,44 L54,44 M36,54 L48,54"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                className="stroke-orange-500"
              />
              <path
                d="M36,44 L36,66"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                className="stroke-orange-500"
              />
            </svg>
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">Flicky<span className="text-orange-500">PDF</span></span>
            <span className="font-mono text-[9px] tracking-widest text-orange-400 uppercase">PDF Tool Suite</span>
          </div>
        </button>

        {/* Navigation & Status items */}
        <div className="flex items-center gap-3 relative">
          {/* All Tools home button */}
          {!isHome && (
            <button
              onClick={onBackToHome}
              className="hidden rounded-full border border-orange-100 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 sm:inline-block cursor-pointer"
              id="btn-navbar-tools"
            >
              All Tools
            </button>
          )}

          {/* PWA Download / Install App Button */}
          {!isInstalled && (
            <div className="relative">
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-orange-100"
                title="Install FlickyPDF as a native application"
                id="btn-navbar-pwa-install"
              >
                <Download className="h-3.5 w-3.5 animate-bounce" />
                <span>Download App</span>
              </button>

              {/* Instruction tooltip fallback */}
              {showTooltip && (
                <div className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-orange-100 bg-white p-4 shadow-xl text-xs text-slate-600 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="absolute -top-1.5 right-8 h-3 w-3 rotate-45 border-l border-t border-orange-100 bg-white" />
                  <p className="font-bold text-orange-700 flex items-center gap-1 mb-1">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    <span>Download Offline App</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Flicky works 100% locally. To install it on your device:
                  </p>
                  <ul className="list-disc pl-4 text-[11px] space-y-1.5 text-slate-500">
                    <li><strong>Chrome / Edge:</strong> Click the <strong className="text-orange-600">Install</strong> icon in the address bar (next to the bookmark star).</li>
                    <li><strong>Safari (iOS / macOS):</strong> Tap the <strong className="text-orange-600">Share</strong> button, then choose <strong className="text-orange-600">Add to Home Screen</strong>.</li>
                    <li><strong>Incognito Mode:</strong> Note that browser installation is disabled in Private/Incognito windows. Please open Flicky in a standard tab to install.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Share App Button & Modal */}
          <div className="relative">
            <button
              onClick={() => setShowShareModal(prev => !prev)}
              className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 hover:bg-orange-100/70 text-orange-700 shadow-sm px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
              title="Share this App with friends"
              id="btn-navbar-share"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share App</span>
            </button>

            {showShareModal && (
              <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="absolute -top-1.5 right-10 h-3 w-3 rotate-45 border-l border-t border-zinc-200 bg-white" />
                
                <h4 className="text-xs font-bold text-zinc-900 mb-1">Share Flicky with Friends</h4>
                <p className="text-[10px] text-zinc-500 leading-normal mb-4">
                  Scan this QR code with a phone camera to open Flicky PDF instantly on any device!
                </p>

                {/* QR Code Container */}
                <div className="flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl p-3 mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(appUrl)}`}
                    alt="QR Code to Share Flicky"
                    className="h-36 w-36 object-contain pointer-events-none rounded"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Direct Link Copier */}
                <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-1">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="flex-grow bg-transparent px-2 py-1 font-mono text-[9px] text-zinc-600 outline-none select-all truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="rounded-md bg-orange-500 hover:bg-orange-600 text-white p-1.5 transition-colors cursor-pointer animate-none"
                    title="Copy Link to Clipboard"
                    id="btn-navbar-share-copy"
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-center text-[10px] text-emerald-600 font-bold mt-1.5 animate-pulse">
                    Copied to clipboard!
                  </p>
                )}
              </div>
            )}
          </div>

          <OfflineIndicator />
        </div>
      </div>
    </header>
  );
}
