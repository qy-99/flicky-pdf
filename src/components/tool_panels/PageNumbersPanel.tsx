import React, { useEffect, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, FileText, Loader, CheckCircle, 
  Settings, Sparkles, Layout, Move, Type, Eye, AlertCircle
} from 'lucide-react';
import { WorkingFile } from '../../types';
import { generateThumbnail } from '../../services/pdfService';

interface PageNumbersPanelProps {
  file: WorkingFile;
  format: 'number' | 'of-total' | 'page-number' | 'page-of-total';
  setFormat: (val: 'number' | 'of-total' | 'page-number' | 'page-of-total') => void;
  position: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right';
  setPosition: (val: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right') => void;
  startNumber: number;
  setStartNumber: (val: number) => void;
  startAtPage: number;
  setStartAtPage: (val: number) => void;
  endAtPage: number;
  setEndAtPage: (val: number) => void;
  fontSize: number;
  setFontSize: (val: number) => void;
  color: string;
  setColor: (val: string) => void;
  offsetX: number;
  setOffsetX: (val: number) => void;
  offsetY: number;
  setOffsetY: (val: number) => void;
  fontFamily: 'sans' | 'serif' | 'mono';
  setFontFamily: (val: 'sans' | 'serif' | 'mono') => void;
}

export function PageNumbersPanel({
  file,
  format,
  setFormat,
  position,
  setPosition,
  startNumber,
  setStartNumber,
  startAtPage,
  setStartAtPage,
  endAtPage,
  setEndAtPage,
  fontSize,
  setFontSize,
  color,
  setColor,
  offsetX,
  setOffsetX,
  offsetY,
  setOffsetY,
  fontFamily,
  setFontFamily
}: PageNumbersPanelProps) {
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [pageImgUrl, setPageImgUrl] = useState('');
  const [rendering, setRendering] = useState(false);

  // Load preview image for selected page
  useEffect(() => {
    const loadPreview = async () => {
      setRendering(true);
      try {
        // High fidelity page thumbnail at scale 1.0 for interactive accuracy
        const url = await generateThumbnail(file.file, previewPageIndex, 1.0);
        setPageImgUrl(url);
      } catch (err) {
        console.error('Failed to render page preview:', err);
      } finally {
        setRendering(false);
      }
    };
    loadPreview();
  }, [file, previewPageIndex]);

  // Set default bounds
  useEffect(() => {
    if (endAtPage === 0 || endAtPage > file.numPages) {
      setEndAtPage(file.numPages);
    }
  }, [file.numPages, endAtPage, setEndAtPage]);

  // Build simulated page label to show in real-time preview overlay
  const getSimulatedLabel = (pageIdx: number) => {
    const isNumbered = pageIdx + 1 >= startAtPage && pageIdx + 1 <= endAtPage;
    if (!isNumbered) return '';

    const displayNum = (pageIdx + 1 - startAtPage) + startNumber;
    const totalNumbered = endAtPage - startAtPage + 1;

    switch (format) {
      case 'number':
        return `${displayNum}`;
      case 'of-total':
        return `${displayNum} of ${totalNumbered}`;
      case 'page-number':
        return `Page ${displayNum}`;
      case 'page-of-total':
        return `Page ${displayNum} of ${totalNumbered}`;
      default:
        return '';
    }
  };

  // Determine positions of overlay relative to page container
  const getOverlayStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      color: color,
      fontSize: `${Math.max(8, fontSize * 0.9)}px`,
      pointerEvents: 'none',
      userSelect: 'none',
      transition: 'all 0.15s ease-out',
      whiteSpace: 'nowrap',
      lineHeight: 1,
      fontWeight: 'bold',
    };

    // Font style mapper
    if (fontFamily === 'serif') {
      baseStyles.fontFamily = 'Georgia, serif';
    } else if (fontFamily === 'mono') {
      baseStyles.fontFamily = 'Courier New, monospace';
    } else {
      baseStyles.fontFamily = 'Inter, sans-serif';
    }

    // Absolute positioning offsets based on selection
    // Note: PDFLib y=0 is bottom, but HTML y=0 is top. We map top/bottom carefully.
    const padding = 16;
    const adjustX = offsetX * 0.35; // scale down offsets slightly for visual representation
    const adjustY = offsetY * -0.35; // invert Y offset since HTML is top-down

    // Alignment rules
    if (position.startsWith('top')) {
      baseStyles.top = `${padding + adjustY}px`;
    } else {
      baseStyles.bottom = `${padding - adjustY}px`;
    }

    if (position.endsWith('left')) {
      baseStyles.left = `${padding + adjustX}px`;
      baseStyles.transform = 'none';
    } else if (position.endsWith('right')) {
      baseStyles.right = `${padding - adjustX}px`;
      baseStyles.transform = 'none';
    } else {
      // Center alignment
      baseStyles.left = `calc(50% + ${adjustX}px)`;
      baseStyles.transform = 'translateX(-50%)';
    }

    return baseStyles;
  };

  const currentLabel = getSimulatedLabel(previewPageIndex);

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6" id="page-number-panel">
      
      {/* LEFT COLUMN: Premium Layout Preview Workspace (7 Cols) */}
      <div className="xl:col-span-7 flex flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center min-h-[520px] relative overflow-hidden">
          
          {/* Main Visual Header */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm">
              <Eye className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Page Number Overlay Live Preview</span>
          </div>

          {/* Quick Page Select Mini Navigator */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white/90 backdrop-blur border border-slate-200/80 rounded-xl p-1 shadow-sm">
            <button
              disabled={previewPageIndex === 0}
              onClick={() => setPreviewPageIndex(p => p - 1)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-35 transition-all cursor-pointer"
              title="Previous Preview Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-bold text-slate-700 px-1 font-mono">
              Page {previewPageIndex + 1} / {file.numPages}
            </span>
            <button
              disabled={previewPageIndex === file.numPages - 1}
              onClick={() => setPreviewPageIndex(p => p + 1)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-35 transition-all cursor-pointer"
              title="Next Preview Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Render Actual PDF.js Canvas with Simulated Overlay */}
          {rendering ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader className="h-6 w-6 animate-spin text-orange-500" />
              <span className="text-xs font-semibold">Generating high-fidelity canvas view...</span>
            </div>
          ) : (
            <div className="relative border border-slate-200 bg-white shadow-lg rounded-md max-w-full overflow-hidden select-none transition-shadow duration-300 hover:shadow-xl">
              
              {pageImgUrl ? (
                <>
                  <img
                    src={pageImgUrl}
                    alt={`Preview Page ${previewPageIndex + 1}`}
                    referrerPolicy="no-referrer"
                    className="block max-h-[460px] object-contain pointer-events-none"
                  />

                  {/* Dynamic page number overlay */}
                  {currentLabel ? (
                    <div style={getOverlayStyles()}>
                      {currentLabel}
                    </div>
                  ) : (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-700/60 p-3 text-center text-white max-w-xs shadow-xl pointer-events-none">
                      <AlertCircle className="h-5 w-5 text-amber-400 mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Unnumbered Page</p>
                      <p className="text-[9px] text-slate-300 mt-1 leading-normal">
                        Page {previewPageIndex + 1} falls outside the selected numbering range (Starts on Page {startAtPage}).
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-20 text-center text-slate-400">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <span className="text-xs">No preview could be rendered</span>
                </div>
              )}
            </div>
          )}

          {/* Real-time Indicator status */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] text-slate-400 font-semibold bg-white/50 px-3 py-1.5 rounded-lg border border-slate-100 backdrop-blur-sm">
            <span>Alignment: {position.replace('-', ' ')}</span>
            <span>Offset X: {offsetX}pt • Offset Y: {offsetY}pt</span>
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: Precise Formatting and Alignment Controls (5 Cols) */}
      <div className="xl:col-span-5 flex flex-col gap-5">
        
        {/* Section 1: Numbering Range & Page Offset */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Settings className="h-3.5 w-3.5 text-orange-500" />
            <span>Numbering Logic</span>
          </h4>

          {/* Start Numbering On Page (Skip page count) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Start numbering on page</label>
              <input
                type="number"
                min="1"
                max={file.numPages}
                value={startAtPage}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(file.numPages, Number(e.target.value)));
                  setStartAtPage(val);
                }}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:bg-white focus:border-orange-500 focus:outline-none"
              />
              <span className="text-[9px] text-slate-400 mt-1 block leading-normal">Skip cover/intro pages before this.</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">First page number value</label>
              <input
                type="number"
                min="1"
                value={startNumber}
                onChange={(e) => setStartNumber(Math.max(1, Number(e.target.value)))}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:bg-white focus:border-orange-500 focus:outline-none"
              />
              <span className="text-[9px] text-slate-400 mt-1 block leading-normal">First numbered page gets this index.</span>
            </div>
          </div>

          {/* End Numbering on page */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Stop numbering on page</label>
            <input
              type="number"
              min={startAtPage}
              max={file.numPages}
              value={endAtPage}
              onChange={(e) => {
                const val = Math.max(startAtPage, Math.min(file.numPages, Number(e.target.value)));
                setEndAtPage(val);
              }}
              className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:bg-white focus:border-orange-500 focus:outline-none"
            />
            <span className="text-[9px] text-slate-400 mt-1 block leading-normal">Numbering will stop after this page (e.g. skip appendices).</span>
          </div>
        </div>

        {/* Section 2: Position & Slight Adjustments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Move className="h-3.5 w-3.5 text-orange-500" />
            <span>Position Fine-Tuning</span>
          </h4>

          {/* Preset Alignment Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Preset Anchor Alignment</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'top-left', label: 'Top Left' },
                { id: 'top-center', label: 'Top Center' },
                { id: 'top-right', label: 'Top Right' },
                { id: 'bottom-left', label: 'Bottom Left' },
                { id: 'bottom-center', label: 'Bottom Center' },
                { id: 'bottom-right', label: 'Bottom Right' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setPosition(opt.id as any)}
                  className={`rounded-lg py-1.5 text-[10px] font-bold border transition-all cursor-pointer ${
                    position === opt.id 
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal Position Fine tuning */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span>Slight Adjustment X (Horizontal Offset)</span>
              <span className="font-mono text-orange-600 font-bold">{offsetX > 0 ? `+${offsetX}` : offsetX} pt</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={offsetX}
              onChange={(e) => setOffsetX(Number(e.target.value))}
              className="w-full appearance-none h-1 bg-slate-150 rounded accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[8px] font-bold text-slate-400 mt-1">
              <span>◀ Move Left</span>
              <span>Center Anchor</span>
              <span>Move Right ▶</span>
            </div>
          </div>

          {/* Vertical Position Fine tuning */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span>Slight Adjustment Y (Vertical Offset)</span>
              <span className="font-mono text-orange-600 font-bold">{offsetY > 0 ? `+${offsetY}` : offsetY} pt</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={offsetY}
              onChange={(e) => setOffsetY(Number(e.target.value))}
              className="w-full appearance-none h-1 bg-slate-150 rounded accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[8px] font-bold text-slate-400 mt-1">
              <span>▼ Move Down</span>
              <span>Center Anchor</span>
              <span>Move Up ▲</span>
            </div>
          </div>
        </div>

        {/* Section 3: Format & Typography Style Presets */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Type className="h-3.5 w-3.5 text-orange-500" />
            <span>Fidelity Style & presets</span>
          </h4>

          {/* Label Format */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Label Design Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="number">"1" (Page Number Only)</option>
              <option value="of-total">"1 of 10" (With Range Total)</option>
              <option value="page-number">"Page 1" (Standard Title)</option>
              <option value="page-of-total">"Page 1 of 10" (Full Metadata)</option>
            </select>
          </div>

          {/* Typography Pairings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Font Face</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold focus:border-orange-500 focus:outline-none"
              >
                <option value="sans">Helvetica (Sans)</option>
                <option value="serif">Times Roman (Serif)</option>
                <option value="mono">Courier (Mono)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Font Size</label>
              <input
                type="number"
                min="6"
                max="48"
                value={fontSize}
                onChange={(e) => setFontSize(Math.max(6, Math.min(48, Number(e.target.value))))}
                className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Stamp Color Fill</label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { hex: '#000000', label: 'Coal Black' },
                { hex: '#ef4444', label: 'Alert Red' },
                { hex: '#3b82f6', label: 'Royal Blue' },
                { hex: '#64748b', label: 'Steel Slate' },
                { hex: '#16a34a', label: 'Forest Green' },
                { hex: '#f97316', label: 'Vibrant Orange' }
              ].map(colorOpt => (
                <button
                  key={colorOpt.hex}
                  onClick={() => setColor(colorOpt.hex)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                    color === colorOpt.hex 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: colorOpt.hex }} />
                  <span>{colorOpt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
