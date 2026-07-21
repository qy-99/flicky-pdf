import React, { useEffect, useRef, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, 
  Printer, Search, Loader, BookOpen, AlertCircle, FileText, CheckCircle
} from 'lucide-react';
import { WorkingFile } from '../../types';
import { generateThumbnail, extractPDFText } from '../../services/pdfService';

interface ReaderPanelProps {
  file: WorkingFile;
}

export function ReaderPanel({ file }: ReaderPanelProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1.2); // scale factor
  const [localRotation, setLocalRotation] = useState<Record<number, number>>({}); // pageIndex -> rotation angle
  const [pageImgUrl, setPageImgUrl] = useState('');
  const [rendering, setRendering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ pageIndex: number; text: string }>>([]);
  const [searchMatches, setSearchMatches] = useState<number[]>([]); // list of page indices with matches
  const [searchStatus, setSearchStatus] = useState('');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(-1);

  // Document Text Cache for instant searches
  const textCacheRef = useRef<Record<number, string>>({});
  const viewerRef = useRef<HTMLDivElement>(null);
  const iframePrintRef = useRef<HTMLIFrameElement>(null);

  // Reset states when a new file is loaded
  useEffect(() => {
    setCurrentPage(0);
    setZoom(1.2);
    setLocalRotation({});
    setPageImgUrl('');
    setSearchQuery('');
    setSearchResults([]);
    setSearchMatches([]);
    setSearchStatus('');
    setCurrentMatchIdx(-1);
    textCacheRef.current = {};
  }, [file.id]);

  // Load and render current page dynamically when page, zoom, or local rotation changes
  useEffect(() => {
    const renderPage = async () => {
      setRendering(true);
      try {
        const url = await generateThumbnail(file.file, currentPage, zoom);
        setPageImgUrl(url);
      } catch (err: any) {
        console.error('Failed to render page:', err);
      } finally {
        setRendering(false);
      }
    };
    renderPage();
  }, [file, currentPage, zoom]);

  // Pre-fetch all text layers for searching
  const indexDocumentText = async () => {
    if (isSearching) return;
    setIsSearching(true);
    setSearchStatus('Indexing pages...');
    
    try {
      const results: Array<{ pageIndex: number; text: string }> = [];
      const matches: number[] = [];
      const query = searchQuery.trim().toLowerCase();

      for (let i = 0; i < file.numPages; i++) {
        let text = textCacheRef.current[i];
        if (!text) {
          text = await extractPDFText(file, i);
          textCacheRef.current[i] = text;
        }

        if (query && text.toLowerCase().includes(query)) {
          results.push({ pageIndex: i, text });
          matches.push(i);
        }
      }

      setSearchResults(results);
      setSearchMatches(matches);

      if (query) {
        if (matches.length > 0) {
          setSearchStatus(`Found ${matches.length} matches across ${matches.length === 1 ? '1 page' : `${matches.length} pages`}.`);
          // Jump to first matching page
          setCurrentPage(matches[0]);
          setCurrentMatchIdx(0);
        } else {
          setSearchStatus('No matches found.');
          setCurrentMatchIdx(-1);
        }
      } else {
        setSearchStatus('');
        setCurrentMatchIdx(-1);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchStatus('Failed to extract text from document.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    indexDocumentText();
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % searchMatches.length;
    setCurrentMatchIdx(nextIdx);
    setCurrentPage(searchMatches[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIdx(prevIdx);
    setCurrentPage(searchMatches[prevIdx]);
  };

  // Toggle rotate view
  const rotateCurrentPage = () => {
    setLocalRotation(prev => {
      const current = prev[currentPage] || 0;
      return {
        ...prev,
        [currentPage]: (current + 90) % 360
      };
    });
  };

  // HTML5 Fullscreen presentation handler
  const toggleFullscreen = () => {
    if (!viewerRef.current) return;

    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Print PDF using an invisible iframe to maintain crisp vector resolution
  const handlePrint = () => {
    try {
      const fileUrl = URL.createObjectURL(file.file);
      if (iframePrintRef.current) {
        iframePrintRef.current.src = fileUrl;
        iframePrintRef.current.onload = () => {
          setTimeout(() => {
            iframePrintRef.current?.contentWindow?.focus();
            iframePrintRef.current?.contentWindow?.print();
            URL.revokeObjectURL(fileUrl);
          }, 300);
        };
      }
    } catch (err) {
      console.error('Print failed:', err);
      alert('Failed to initialize local printer proxy.');
    }
  };

  // Thumbnail click selection
  const handleThumbnailClick = (idx: number) => {
    setCurrentPage(idx);
  };

  return (
    <div className="w-full flex flex-col gap-6" id="reader-tool-panel">
      
      {/* Dynamic Iframe for printing */}
      <iframe ref={iframePrintRef} className="hidden" title="print-frame" />

      {/* Top Professional Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        
        {/* Page navigation group */}
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => p - 1)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent transition-all cursor-pointer"
            title="Previous Page"
            id="btn-reader-prev"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
            <input
              type="number"
              min="1"
              max={file.numPages}
              value={currentPage + 1}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= file.numPages) {
                  setCurrentPage(val - 1);
                }
              }}
              className="w-12 rounded-lg border border-slate-200 px-1.5 py-1 text-center font-bold text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            <span className="text-slate-400">/</span>
            <span>{file.numPages}</span>
          </div>

          <button
            disabled={currentPage === file.numPages - 1}
            onClick={() => setCurrentPage(p => p + 1)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent transition-all cursor-pointer"
            title="Next Page"
            id="btn-reader-next"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Zoom & View Options Group */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          
          {/* Zoom controls */}
          <div className="flex items-center border-r border-slate-100 pr-3 mr-1">
            <button
              onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}
              className="rounded-l-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="border-y border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 font-mono select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
              className="rounded-r-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Preset Zoom factors dropdown */}
          <select
            value={zoom.toString()}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 focus:outline-none"
          >
            <option value="0.6">50% (Compact)</option>
            <option value="1.0">100% (Actual)</option>
            <option value="1.2">120% (Default)</option>
            <option value="1.5">150% (Large)</option>
            <option value="2.0">200% (High Detail)</option>
          </select>

          {/* Local Rotate */}
          <button
            onClick={rotateCurrentPage}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            title="Rotate current view right"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Rotate</span>
          </button>
        </div>

        {/* Action utility group: Print & Fullscreen */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            title="Print entire PDF"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Print Document</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Fullscreen presentation mode"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Slide' : 'Present'}</span>
          </button>
        </div>
      </div>

      {/* Main interactive reading split area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Sidebar panels (Left: Thumbnails & Search - 3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* 1. Dynamic Text Search Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <span>Search Document</span>
            </h4>
            <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
              <input
                type="text"
                placeholder="Find keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white p-1.5 text-xs font-bold transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isSearching ? <Loader className="h-3.5 w-3.5 animate-spin" /> : 'Find'}
              </button>
            </form>

            {/* Match status feedback */}
            {searchStatus && (
              <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-[10px] text-slate-500 leading-relaxed">
                <p className="font-semibold text-slate-600 mb-1">{searchStatus}</p>
                {searchMatches.length > 0 && (
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60">
                    <span className="font-mono text-[9px]">Match {currentMatchIdx + 1} of {searchMatches.length}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={handlePrevMatch}
                        className="rounded bg-white border border-slate-200 px-1 py-0.5 hover:bg-slate-50 text-[9px] font-bold text-slate-600"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMatch}
                        className="rounded bg-white border border-slate-200 px-1 py-0.5 hover:bg-slate-50 text-[9px] font-bold text-slate-600"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Interactive Page Thumbnail Sidebar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-500" />
              <span>Page Thumbnails</span>
            </h4>
            
            <div className="flex flex-col gap-3.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
              {Array.from({ length: file.numPages }).map((_, idx) => {
                const isActive = idx === currentPage;
                const hasSearchMatch = searchMatches.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => handleThumbnailClick(idx)}
                    className={`group relative flex flex-col items-center rounded-xl border p-2 text-center transition-all cursor-pointer bg-slate-50/50 hover:bg-slate-50
                      ${isActive 
                        ? 'border-orange-500 bg-orange-50/10 ring-2 ring-orange-100' 
                        : 'border-slate-100'
                      }
                    `}
                  >
                    {/* Render matching indicator */}
                    {hasSearchMatch && (
                      <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white shadow-sm" title="Search match hit!">
                        ★
                      </span>
                    )}

                    <span className="absolute top-1.5 right-1.5 rounded-md bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500 shadow-sm">
                      {idx + 1}
                    </span>

                    {/* Placeholder image vector box */}
                    <div className="aspect-[3/4] w-24 bg-white border border-slate-200/60 rounded-md flex items-center justify-center shadow-sm overflow-hidden mb-1.5 group-hover:border-orange-200 transition-colors">
                      <FileText className={`h-6 w-6 ${isActive ? 'text-orange-500' : 'text-slate-300'}`} />
                    </div>

                    <span className={`text-[10px] font-bold ${isActive ? 'text-orange-600' : 'text-slate-400'}`}>
                      Page {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Central visual workspace container (9 cols) */}
        <div className="lg:col-span-9 flex flex-col items-center">
          
          {/* Render container viewport */}
          <div 
            ref={viewerRef}
            className={`relative border border-slate-200 rounded-3xl p-6 shadow-inner w-full flex items-center justify-center overflow-auto bg-slate-100 min-h-[560px] max-h-[800px] custom-scrollbar
              ${isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-slate-950 p-10 max-h-screen' : ''}
            `}
          >
            
            {/* Presentation Mode overlay controls */}
            {isFullscreen && (
              <div className="absolute top-4 right-4 z-[999] flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="rounded-lg bg-white/10 hover:bg-white/20 text-white p-2 text-xs font-bold disabled:opacity-20 transition-all cursor-pointer"
                >
                  Prev
                </button>
                <span className="rounded-lg bg-black/60 px-4 py-2 font-mono text-xs font-bold text-white select-none border border-white/10">
                  Slide {currentPage + 1} / {file.numPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(file.numPages - 1, p + 1))}
                  disabled={currentPage === file.numPages - 1}
                  className="rounded-lg bg-white/10 hover:bg-white/20 text-white p-2 text-xs font-bold disabled:opacity-20 transition-all cursor-pointer"
                >
                  Next
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                >
                  Exit Presentation
                </button>
              </div>
            )}

            {rendering ? (
              <div className="flex flex-col items-center gap-2 text-slate-400 py-24">
                <Loader className="h-6 w-6 animate-spin text-orange-500" />
                <span className="text-xs font-semibold">Generating high-fidelity page view...</span>
              </div>
            ) : (
              <div 
                className="relative shadow-xl border border-slate-300 bg-white transition-transform duration-200 select-none overflow-hidden"
                style={{ 
                  transform: `rotate(${localRotation[currentPage] || 0}deg)`,
                  maxWidth: isFullscreen ? '90vw' : '100%'
                }}
              >
                {pageImgUrl ? (
                  <img
                    src={pageImgUrl}
                    alt={`Rendered page ${currentPage + 1}`}
                    referrerPolicy="no-referrer"
                    className="block max-h-[700px] object-contain pointer-events-none rounded-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 p-20">
                    <AlertCircle className="h-8 w-8 text-slate-300" />
                    <span className="text-xs">No preview loaded</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center text-slate-400 text-[10px] flex items-center gap-1.5 font-semibold">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span>Fidelity rendering powered by native browser sandbox vectors. Document stays completely secure locally.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
