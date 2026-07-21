import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Keyboard, Upload, Trash2, ArrowLeft, ArrowRight, Loader } from 'lucide-react';
import { WorkingFile } from '../../types';
import { generateThumbnail } from '../../services/pdfService';

export interface SignaturePlacement {
  pageIndex: number;
  image: string; // DataUrl representation
  x: number; // percentage left
  y: number; // percentage top
  width: number; // pt sizes
  height: number;
}

interface SignPDFPanelProps {
  file: WorkingFile;
  placement: SignaturePlacement | null;
  setPlacement: React.Dispatch<React.SetStateAction<SignaturePlacement | null>>;
}

export function SignPDFPanel({ file, placement, setPlacement }: SignPDFPanelProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageImgUrl, setPageImgUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [signMethod, setSignMethod] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Signature States
  const [typedName, setTypedName] = useState('My Signature');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  
  // Drawing Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset page index on file change to prevent out of bounds index loading
  useEffect(() => {
    setCurrentPage(0);
    setPageImgUrl('');
  }, [file.id]);

  // 1. Render Current Page
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

  // 2. Initialize Canvas Drawing Handlers
  useEffect(() => {
    if (signMethod === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signMethod]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    draw(e);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
      // Update signature output
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setSignatureDataUrl('');
    }
  };

  // 3. Generate typed cursive text signature onto offscreen canvas
  const generateTypedSignature = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw handwriting style cursive text
    ctx.font = 'italic 36px "Space Grotesk", Georgia, serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(typedName, 30, 60);

    // Decorative underline loop
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, 75);
    ctx.bezierCurveTo(100, 80, 200, 60, 380, 75);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
  };

  useEffect(() => {
    if (signMethod === 'type') {
      generateTypedSignature();
    }
  }, [signMethod, typedName]);

  // 4. File upload for signature image
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uFile = e.target.files?.[0];
    if (!uFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSignatureDataUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(uFile);
  };

  // 5. Placing signature stamp on click
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!signatureDataUrl || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pctX = (clickX / rect.width) * 100;
    const pctY = (clickY / rect.height) * 100;

    setPlacement({
      pageIndex: currentPage,
      image: signatureDataUrl,
      x: pctX,
      y: pctY,
      width: 150, // default pt width
      height: 45  // default pt height
    });
  };

  return (
    <div className="w-full grid grid-cols-1 gap-6 lg:grid-cols-12" id="signature-container">
      {/* 1. Method choosing column (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-950 mb-3">Create Signature</h3>

          {/* Selector */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-1 rounded-lg mb-4">
            <button
              onClick={() => { setSignMethod('draw'); setSignatureDataUrl(''); }}
              className={`flex flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-bold ${
                signMethod === 'draw' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Draw</span>
            </button>
            <button
              onClick={() => { setSignMethod('type'); }}
              className={`flex flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-bold ${
                signMethod === 'type' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>Type</span>
            </button>
            <button
              onClick={() => { setSignMethod('upload'); setSignatureDataUrl(''); }}
              className={`flex flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-bold ${
                signMethod === 'upload' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload</span>
            </button>
          </div>

          {/* Creation stage */}
          <div className="border-t border-zinc-100 pt-4">
            {signMethod === 'draw' && (
              <div className="flex flex-col items-center">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg touch-none cursor-pencil"
                />
                <button
                  onClick={clearCanvas}
                  className="mt-2.5 flex items-center gap-1.5 text-[10px] font-extrabold text-red-500 uppercase tracking-widest hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear Board</span>
                </button>
              </div>
            )}

            {signMethod === 'type' && (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  placeholder="Enter your full name"
                />
                <div className="w-full bg-zinc-50 border border-zinc-100 p-4 rounded-lg flex items-center justify-center font-display italic text-lg text-slate-800">
                  {typedName}
                </div>
              </div>
            )}

            {signMethod === 'upload' && (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-lg p-5 bg-zinc-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="hidden"
                  id="sign-image-uploader"
                />
                <label
                  htmlFor="sign-image-uploader"
                  className="flex flex-col items-center gap-2 cursor-pointer"
                >
                  <Upload className="h-6 w-6 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-600 hover:text-zinc-900">
                    Upload PNG/JPG scan
                  </span>
                  <span className="text-[10px] text-zinc-400">transparent PNG is recommended</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Placing instruction */}
        {signatureDataUrl && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-[11px] leading-relaxed text-blue-700">
            👉 <strong>Now Stamp It:</strong> Click any coordinate on the visual document canvas to place your signature. You can adjust the size with the slider below once stamped.
          </div>
        )}

        {placement && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col gap-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Stamp Size</h4>
            <div>
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                <span>Width: {placement.width}pt</span>
                <span>Height: {placement.height}pt</span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                value={placement.width}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  const h = Math.round(w / 3.3); // ratio
                  setPlacement(prev => prev ? { ...prev, width: w, height: h } : null);
                }}
                className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              />
            </div>
            <button
              onClick={() => setPlacement(null)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 text-red-500 bg-red-50 py-2 text-xs font-bold hover:bg-red-100 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove Signature Stamp</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Visual Document Page Column (8 cols) */}
      <div className="lg:col-span-8 flex flex-col items-center">
        {/* Navigation header */}
        <div className="mb-4 flex items-center justify-between w-full">
          <button
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => p - 1)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-35"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>
          <span className="text-xs font-semibold text-zinc-800">
            Page {currentPage + 1} of {file.numPages}
          </span>
          <button
            disabled={currentPage === file.numPages - 1}
            onClick={() => setCurrentPage(p => p + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-35"
          >
            <span>Next</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Board */}
        <div className="relative border border-zinc-200 rounded-2xl bg-zinc-100 p-4 max-w-full overflow-auto flex items-center justify-center shadow-inner min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-zinc-400 py-12">
              <Loader className="h-6 w-6 animate-spin" />
              <span className="text-xs">Rendering page...</span>
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

              {/* Render signature placement if positioned on this page */}
              {placement && placement.pageIndex === currentPage && (
                <div
                  className="absolute border border-dashed border-blue-400 bg-blue-100/10 pointer-events-none shadow"
                  style={{
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    width: `${(placement.width / 400) * 100}%`, // approximate canvas widths
                    height: `${(placement.height / 300) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <img
                    src={placement.image}
                    alt="Signature Stamp"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
