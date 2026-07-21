import React, { useEffect, useRef, useState } from 'react';
import { EyeOff, Trash2, ArrowLeft, ArrowRight, Loader, Info } from 'lucide-react';
import { WorkingFile } from '../../types';
import { generateThumbnail, redactPDF, RedactionArea } from '../../services/pdfService';

interface RedactPanelProps {
  file: WorkingFile;
  redactions: RedactionArea[];
  setRedactions: React.Dispatch<React.SetStateAction<RedactionArea[]>>;
}

export function RedactPanel({ file, redactions, setRedactions }: RedactPanelProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageImgUrl, setPageImgUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Black Box stamp sizing (expressed as % width/height)
  const [boxWidth, setBoxWidth] = useState(25);
  const [boxHeight, setBoxHeight] = useState(6);

  // Reset page index on file change to prevent out of bounds index loading
  useEffect(() => {
    setCurrentPage(0);
    setPageImgUrl('');
  }, [file.id]);

  // Render current page
  useEffect(() => {
    if (currentPage >= file.numPages || currentPage < 0) {
      return;
    }
    const renderPage = async () => {
      setLoading(true);
      try {
        const url = await generateThumbnail(file.file, currentPage, 1.2);
        setPageImgUrl(url);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    renderPage();
  }, [file, currentPage]);

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to percentages
    const pctX = (clickX / rect.width) * 100;
    const pctY = (clickY / rect.height) * 100;

    // Anchor redaction from top-left (offsetting by half-width/height so it stamps centered under cursor)
    const startX = Math.max(0, pctX - boxWidth / 2);
    const startY = Math.max(0, pctY - boxHeight / 2);

    const newRed: RedactionArea = {
      pageIndex: currentPage,
      x: startX,
      y: startY,
      width: boxWidth,
      height: boxHeight
    };

    setRedactions(prev => [...prev, newRed]);
  };

  const removeRedaction = (idx: number) => {
    setRedactions(prev => prev.filter((_, i) => i !== idx));
  };

  const clearPageRedactions = () => {
    setRedactions(prev => prev.filter(r => r.pageIndex !== currentPage));
  };

  const currentPageRedactions = redactions.filter(r => r.pageIndex === currentPage);

  return (
    <div className="w-full grid grid-cols-1 gap-6 lg:grid-cols-12" id="redact-panel-container">
      {/* 1. Configuration Controls Column */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
            <EyeOff className="h-4 w-4 text-red-500" />
            <span>Redaction Tool</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Click on the page preview to stamp a black block over sensitive info (names, ssns, figures).
          </p>

          {/* Size sliders */}
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span>Block Width: {boxWidth}% page width</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                value={boxWidth}
                onChange={(e) => setBoxWidth(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span>Block Height: {boxHeight}% page height</span>
              </div>
              <input
                type="range"
                min="2"
                max="40"
                value={boxHeight}
                onChange={(e) => setBoxHeight(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>

            {currentPageRedactions.length > 0 && (
              <button
                onClick={clearPageRedactions}
                className="w-full text-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50/50 py-2 text-xs font-bold"
              >
                Clear Page Redactions ({currentPageRedactions.length})
              </button>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 flex gap-2 text-xs text-slate-500 leading-relaxed">
          <Info className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">Honest Client-side Redaction:</span>
            <p className="mt-1 text-[11px] text-slate-500">
              Flicker flattens redacted pages to high-resolution flattened raster JPEG images with the black blocks burned into the canvas. This guarantees text underneath can never be highlighted, extracted, or recovered!
            </p>
          </div>
        </div>

        {/* Current list */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm max-h-56 overflow-y-auto custom-scrollbar">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
            Placed Blackouts ({redactions.length})
          </h4>
          {redactions.length === 0 ? (
            <p className="text-xs italic text-slate-400">No blackout areas placed yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {redactions.map((red, rIdx) => (
                <div key={rIdx} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700">Block {rIdx + 1}</span>
                    <span className="text-[10px] text-slate-400 block">Page {red.pageIndex + 1} • Size: {Math.round(red.width)}%x{Math.round(red.height)}%</span>
                  </div>
                  <button
                    onClick={() => removeRedaction(rIdx)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                    title="Delete item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Visual Document Page Column */}
      <div className="lg:col-span-8 flex flex-col items-center">
        {/* Navigation header */}
        <div className="mb-4 flex items-center justify-between w-full">
          <button
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => p - 1)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-35"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>
          <span className="text-xs font-bold text-slate-800">
            Page {currentPage + 1} of {file.numPages}
          </span>
          <button
            disabled={currentPage === file.numPages - 1}
            onClick={() => setCurrentPage(p => p + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-35"
          >
            <span>Next</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Visual Board Container */}
        <div className="relative border border-slate-200 rounded-2xl bg-slate-50 p-4 w-full overflow-auto flex items-center justify-center shadow-inner min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-400 py-12">
              <Loader className="h-6 w-6 animate-spin" />
              <span className="text-xs">Rendering PDF canvas...</span>
            </div>
          ) : (
            <div
              ref={containerRef}
              onClick={handlePageClick}
              className="relative shadow-md cursor-crosshair max-w-full select-none rounded-md overflow-hidden bg-white"
              style={{ width: 'auto', height: 'auto' }}
            >
              {pageImgUrl && (
                <img
                  src={pageImgUrl}
                  alt={`PDF Page ${currentPage + 1}`}
                  referrerPolicy="no-referrer"
                  className="block max-h-[600px] object-contain pointer-events-none"
                />
              )}

              {/* Render blackout blocks overlay */}
              {currentPageRedactions.map((red, rIdx) => (
                <div
                  key={rIdx}
                  className="absolute bg-slate-900/95 border border-slate-850 pointer-events-none shadow"
                  style={{
                    left: `${red.x}%`,
                    top: `${red.y}%`,
                    width: `${red.width}%`,
                    height: `${red.height}%`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
