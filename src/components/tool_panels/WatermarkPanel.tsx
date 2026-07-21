import React, { useEffect, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, FileText, Loader, CheckCircle, 
  Settings, Sparkles, Layout, Move, Type, Eye, AlertCircle, Upload, Trash2
} from 'lucide-react';
import { WorkingFile } from '../../types';
import { generateThumbnail } from '../../services/pdfService';

interface WatermarkPanelProps {
  file: WorkingFile;
  watermarkText: string;
  setWatermarkText: (val: string) => void;
  watermarkImg: string;
  setWatermarkImg: (val: string) => void;
  watermarkSize: number;
  setWatermarkSize: (val: number) => void;
  watermarkColor: string;
  setWatermarkColor: (val: string) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (val: number) => void;
  watermarkRotation: number;
  setWatermarkRotation: (val: number) => void;
  watermarkTiled: boolean;
  setWatermarkTiled: (val: boolean) => void;
  watermarkPos: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  setWatermarkPos: (val: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
}

export function WatermarkPanel({
  file,
  watermarkText,
  setWatermarkText,
  watermarkImg,
  setWatermarkImg,
  watermarkSize,
  setWatermarkSize,
  watermarkColor,
  setWatermarkColor,
  watermarkOpacity,
  setWatermarkOpacity,
  watermarkRotation,
  setWatermarkRotation,
  watermarkTiled,
  setWatermarkTiled,
  watermarkPos,
  setWatermarkPos,
}: WatermarkPanelProps) {
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [pageImgUrl, setPageImgUrl] = useState('');
  const [rendering, setRendering] = useState(false);

  // Load preview image for selected page
  useEffect(() => {
    const loadPreview = async () => {
      setRendering(true);
      try {
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

  // Handle watermark image upload locally
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setWatermarkImg(ev.target.result as string);
      }
    };
    reader.readAsDataURL(uploadedFile);
  };

  // Determine single overlay alignment styling
  const getSingleOverlayStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: 'none',
      userSelect: 'none',
      opacity: watermarkOpacity,
      transform: `rotate(${watermarkRotation}deg)`,
      transformOrigin: 'center center',
      transition: 'all 0.15s ease-out',
      zIndex: 10,
    };

    // Text styling
    if (!watermarkImg) {
      base.color = watermarkColor;
      base.fontSize = `${Math.max(10, watermarkSize * 0.55)}px`; // scaled down slightly for visual fit
      base.fontWeight = 'bold';
      base.fontFamily = 'Inter, sans-serif';
      base.whiteSpace = 'nowrap';
    }

    // Apply alignment parameters
    const padding = 20;
    switch (watermarkPos) {
      case 'top-left':
        base.top = `${padding}px`;
        base.left = `${padding}px`;
        break;
      case 'top-right':
        base.top = `${padding}px`;
        base.right = `${padding}px`;
        break;
      case 'bottom-left':
        base.bottom = `${padding}px`;
        base.left = `${padding}px`;
        break;
      case 'bottom-right':
        base.bottom = `${padding}px`;
        base.right = `${padding}px`;
        break;
      case 'center':
      default:
        base.top = '50%';
        base.left = '50%';
        base.transform = `translate(-50%, -50%) rotate(${watermarkRotation}deg)`;
        break;
    }

    return base;
  };

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6" id="watermark-panel">
      
      {/* LEFT COLUMN: Premium Layout Preview Workspace (7 Cols) */}
      <div className="xl:col-span-7 flex flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center min-h-[520px] relative overflow-hidden">
          
          {/* Main Visual Header */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm">
              <Eye className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Watermark Live Preview</span>
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

          {/* Render PDF page with real-time visual watermark overlaid */}
          {rendering ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader className="h-6 w-6 animate-spin text-red-500" />
              <span className="text-xs font-semibold">Generating document preview...</span>
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

                  {/* Tiled repeating grid overlay */}
                  {watermarkTiled ? (
                    <div 
                      className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2 p-4 pointer-events-none overflow-hidden"
                      style={{ opacity: watermarkOpacity }}
                    >
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-center select-none"
                          style={{
                            transform: `rotate(${watermarkRotation}deg)`,
                            transition: 'all 0.15s ease-out'
                          }}
                        >
                          {watermarkImg ? (
                            <img 
                              src={watermarkImg} 
                              alt="stamp" 
                              referrerPolicy="no-referrer"
                              className="object-contain"
                              style={{ maxHeight: `${Math.max(10, watermarkSize * 0.45)}px`, maxWidth: `${Math.max(10, watermarkSize * 0.45)}px` }}
                            />
                          ) : (
                            <span 
                              style={{ 
                                color: watermarkColor, 
                                fontSize: `${Math.max(8, watermarkSize * 0.35)}px`,
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {watermarkText || 'CONFIDENTIAL'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Single aligned anchor overlay */
                    <div style={getSingleOverlayStyles()}>
                      {watermarkImg ? (
                        <img 
                          src={watermarkImg} 
                          alt="watermark stamp" 
                          referrerPolicy="no-referrer"
                          className="object-contain"
                          style={{ maxHeight: `${watermarkSize * 0.8}px`, maxWidth: `${watermarkSize * 0.8}px` }}
                        />
                      ) : (
                        <span>{watermarkText || 'CONFIDENTIAL'}</span>
                      )}
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
            <span>Mode: {watermarkTiled ? 'Tiled Grid' : `Aligned (${watermarkPos})`}</span>
            <span>Opacity: {Math.round(watermarkOpacity * 100)}% • Rotation: {watermarkRotation}°</span>
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: Precise Formatting and Alignment Controls (5 Cols) */}
      <div className="xl:col-span-5 flex flex-col gap-5">
        
        {/* Section 1: Watermark Content Type */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Type className="h-3.5 w-3.5 text-red-500" />
            <span>Watermark Type & Source</span>
          </h4>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 border border-slate-100 rounded-xl">
            <button
              onClick={() => setWatermarkImg('')}
              className={`rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                !watermarkImg 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-150' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Text Stamp
            </button>
            <button
              className={`relative rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                watermarkImg 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-150' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Image Stamp
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </button>
          </div>

          {/* Text Input */}
          {!watermarkImg ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Watermark Text</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:bg-white focus:border-red-500 focus:outline-none"
                placeholder="CONFIDENTIAL"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-red-50/20 border border-red-100 rounded-xl p-3 text-xs text-slate-600">
              <div className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                <img src={watermarkImg} alt="Watermark source preview" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain pointer-events-none" />
              </div>
              <div className="flex-grow">
                <p className="font-bold text-slate-800">Custom Stamp Image</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Will overlay as graphics</p>
              </div>
              <button 
                onClick={() => setWatermarkImg('')} 
                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                title="Remove image stamp"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Position & Alignment Settings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Move className="h-3.5 w-3.5 text-red-500" />
            <span>Watermark Placement</span>
          </h4>

          {/* Repeating Grid Checkbox */}
          <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              id="panel-tiled-watermark"
              checked={watermarkTiled}
              onChange={(e) => setWatermarkTiled(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500 cursor-pointer h-4 w-4"
            />
            <label htmlFor="panel-tiled-watermark" className="text-xs font-bold text-slate-700 cursor-pointer">
              Tile watermark as repeating grid
            </label>
          </div>

          {/* Preset Alignment Selection (only active if not tiled) */}
          {!watermarkTiled ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Anchor Position</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'center', label: 'Absolute Center' },
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setWatermarkPos(opt.id as any)}
                    className={`rounded-lg py-1.5 text-[10px] font-bold border transition-all cursor-pointer ${
                      watermarkPos === opt.id 
                        ? 'bg-red-500 text-white border-red-500 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 leading-normal bg-blue-50/30 p-2.5 rounded-xl border border-blue-50 flex gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span>Tiled mode covers the entire page with a 3x3 diagonal repeating grid of watermarks automatically.</span>
            </div>
          )}
        </div>

        {/* Section 3: Fine-Tuning controls (sliders & opacity) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Settings className="h-3.5 w-3.5 text-red-500" />
            <span>Fidelity Fine-Tuning</span>
          </h4>

          {/* Size range slider */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span>Stamp Scale / Size</span>
              <span className="font-mono text-red-600 font-bold">{watermarkSize} pt</span>
            </div>
            <input
              type="range"
              min="12"
              max="144"
              value={watermarkSize}
              onChange={(e) => setWatermarkSize(Number(e.target.value))}
              className="w-full appearance-none h-1 bg-slate-150 rounded accent-red-500 cursor-pointer"
            />
          </div>

          {/* Opacity range slider */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span>Opacity / Transparency</span>
              <span className="font-mono text-red-600 font-bold">{Math.round(watermarkOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={watermarkOpacity}
              onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
              className="w-full appearance-none h-1 bg-slate-150 rounded accent-red-500 cursor-pointer"
            />
          </div>

          {/* Rotation range slider */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span>Rotation Angle</span>
              <span className="font-mono text-red-600 font-bold">{watermarkRotation}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={watermarkRotation}
              onChange={(e) => setWatermarkRotation(Number(e.target.value))}
              className="w-full appearance-none h-1 bg-slate-150 rounded accent-red-500 cursor-pointer"
            />
          </div>

          {/* Color Presets (Only if text watermark) */}
          {!watermarkImg && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Stamp Fill Color</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { hex: '#000000', name: 'Black' },
                  { hex: '#ef4444', name: 'Red' },
                  { hex: '#3b82f6', name: 'Blue' },
                  { hex: '#10b981', name: 'Green' },
                  { hex: '#64748b', name: 'Slate' },
                  { hex: '#ffffff', name: 'White' }
                ].map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setWatermarkColor(c.hex)}
                    className={`flex items-center gap-1 border rounded-lg px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                      watermarkColor === c.hex 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span 
                      className="h-2.5 w-2.5 rounded-full border border-black/10 flex-shrink-0" 
                      style={{ backgroundColor: c.hex }} 
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
