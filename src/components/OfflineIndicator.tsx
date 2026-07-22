import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, CloudLightning, ShieldCheck } from 'lucide-react';
import { OfflineState } from '../types';

export function OfflineIndicator() {
  const [swState, setSwState] = useState<OfflineState>({
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    isRegistered: false,
    isCached: false,
    checking: true
  });
  
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Online/Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // SW Registration
    if (swState.isSupported) {
      navigator.serviceWorker
        .register('./sw.js', { scope: './' })
        .then((reg) => {
          setSwState((prev) => ({ ...prev, isRegistered: true, checking: false }));
          
          // Check if active controller or worker exists
          if (navigator.serviceWorker.controller || reg.active) {
            setSwState((prev) => ({ ...prev, isCached: true }));
          }

          // Monitor installation state changes
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'activated' || installingWorker.state === 'installed') {
                  setSwState((prev) => ({ ...prev, isCached: true }));
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
          setSwState((prev) => ({ ...prev, checking: false }));
        });
    } else {
      setSwState((prev) => ({ ...prev, checking: false }));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [swState.isSupported]);

  return (
    <div className="flex items-center gap-2" id="offline-indicator-wrapper">
      {/* 100% Client-Side Privacy Badge */}
      <div className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 sm:flex">
        <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
        <span>100% Client-Side</span>
      </div>

      {/* Online/Offline Visual Badge */}
      {isOnline ? (
        <div 
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider transition-all ${
            swState.isCached 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
              : 'bg-slate-100 text-slate-600'
          }`}
          title={swState.isCached ? "Flicky is stored locally and will work fully offline" : "Caching core library files for offline use"}
        >
          {swState.isCached ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>READY OFFLINE</span>
            </>
          ) : (
            <>
              <Wifi className="h-3 w-3 animate-pulse text-slate-400" />
              <span>CACHING OFFLINE...</span>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700 uppercase tracking-wider">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline Mode</span>
        </div>
      )}
    </div>
  );
}
