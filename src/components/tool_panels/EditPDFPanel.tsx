import React, { useEffect, useRef, useState } from 'react';
import { 
  Type, Square, Circle, Minus, ArrowUpRight, MessageSquare, Ruler, 
  MousePointer, Palette, Trash2, Loader, ArrowLeft, ArrowRight, Settings, 
  Layers, Compass, HelpCircle, Check, Eye
} from 'lucide-react';
import { WorkingFile } from '../../types';
import { generateThumbnail } from '../../services/pdfService';

export interface PDFAnnotation {
  id: string;
  pageIndex: number;
  type: 'text' | 'rect' | 'circle' | 'line' | 'arrow' | 'callout' | 'dimension';
  x: number; // percentage left (0-100) of top-left anchor or line start
  y: number; // percentage top (0-100) of top-left anchor or line start
  width?: number; // percentage width
  height?: number; // percentage height
  x2?: number; // percentage end X (for lines, arrows, callouts, dimensions)
  y2?: number; // percentage end Y
  text?: string; // custom note text
  color: string; // stroke/text Hex
  fillColor?: string; // shape fill Hex or 'transparent'
  fontSize?: number; // font size in pt
  strokeWidth?: number; // stroke thickness in px
  opacity?: number; // opacity (0-1)
  calibratedUnit?: string; // Unit string (m, ft, in, cm, etc.)
  calibratedValue?: string; // Formatted calculation string (e.g., "12.5 m")
}

interface EditPDFPanelProps {
  file: WorkingFile;
  annotations: PDFAnnotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<PDFAnnotation[]>>;
}

export function EditPDFPanel({ file, annotations, setAnnotations }: EditPDFPanelProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageImgUrl, setPageImgUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Tool Selection
  // 'select': move & inspect, others: draw respective annotations
  const [activeTool, setActiveTool] = useState<PDFAnnotation['type'] | 'select'>('select');

  // Drawing Styles
  const [color, setColor] = useState('#ef4444'); // primary markup color (Hex)
  const [fillColor, setFillColor] = useState('transparent'); // filled shape background
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontSize, setFontSize] = useState(14);
  const [opacity, setOpacity] = useState(1.0);
  const [textInput, setTextInput] = useState('New Annotation');

  // Selected Annotation ID for inspecting & real-time styling adjustments
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Calibration Scale settings: "10% of page width equals X Units"
  const [calibRefPct, setCalibRefPct] = useState(10);
  const [calibRealValue, setCalibRealValue] = useState(5.0);
  const [calibUnit, setCalibUnit] = useState('m');

  // Active Drawing & Dragging Interaction state
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartAnn, setDragStartAnn] = useState({ x: 0, y: 0, x2: 0, y2: 0 });

  // Calibration drawing mode
  const [isCalibratingVisually, setIsCalibratingVisually] = useState(false);

  // Reset page index on file change to prevent index error out of bounds
  useEffect(() => {
    setCurrentPage(0);
    setPageImgUrl('');
    setSelectedId(null);
  }, [file.id]);

  // Render current page
  useEffect(() => {
    if (currentPage >= file.numPages || currentPage < 0) return;
    
    const renderPage = async () => {
      setLoading(true);
      try {
        const url = await generateThumbnail(file.file, currentPage, 1.35);
        setPageImgUrl(url);
      } catch (e) {
        console.error('Page generation error:', e);
      } finally {
        setLoading(false);
      }
    };
    renderPage();
  }, [file, currentPage]);

  // Utility to calculate calibrated value from percentage length
  const calculateCalibratedMeasurement = (ann: PDFAnnotation) => {
    const dx = (ann.x2 ?? ann.x) - ann.x;
    const dy = (ann.y2 ?? ann.y) - ann.y;
    const pctLen = Math.sqrt(dx * dx + dy * dy);
    
    // Scale mapping
    const value = pctLen * (calibRealValue / calibRefPct);
    return `${value.toFixed(2)} ${calibUnit}`;
  };

  // Trigger calibration value updates across all measurement lines when scale changes
  useEffect(() => {
    setAnnotations(prev => prev.map(ann => {
      if (ann.type === 'dimension') {
        return {
          ...ann,
          calibratedUnit: calibUnit,
          calibratedValue: calculateCalibratedMeasurement(ann)
        };
      }
      return ann;
    }));
  }, [calibRefPct, calibRealValue, calibUnit]);

  // Mouse Interaction handlers for advanced drag-to-draw or item dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || loading) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pctX = (clickX / rect.width) * 100;
    const pctY = (clickY / rect.height) * 100;

    // Handle Visual Scale Calibration line drawing
    if (isCalibratingVisually) {
      const tempId = 'visual-calib';
      const newAnn: PDFAnnotation = {
        id: tempId,
        pageIndex: currentPage,
        type: 'dimension',
        x: pctX,
        y: pctY,
        x2: pctX,
        y2: pctY,
        color: '#3b82f6', // distinct blue for calib
        strokeWidth: 2,
        opacity: 0.8,
        fontSize: 12,
        calibratedUnit: calibUnit,
        calibratedValue: 'Calibrating...'
      };
      setAnnotations(prev => [...prev.filter(a => a.id !== tempId), newAnn]);
      setDrawingId(tempId);
      return;
    }

    // In Select Mode: Clicking a target to drag/move
    if (activeTool === 'select') {
      // Find if clicked on an annotation
      const target = findAnnotationAt(pctX, pctY);
      if (target) {
        setSelectedId(target.id);
        setDraggingId(target.id);
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragStartAnn({ 
          x: target.x, 
          y: target.y, 
          x2: target.x2 ?? target.x, 
          y2: target.y2 ?? target.y 
        });
      } else {
        setSelectedId(null);
      }
      return;
    }

    // Creating / Drawing Mode
    const id = Math.random().toString(36).substring(2, 9);
    let newAnn: PDFAnnotation = {
      id,
      pageIndex: currentPage,
      type: activeTool,
      x: pctX,
      y: pctY,
      color,
      fillColor: fillColor,
      strokeWidth,
      fontSize,
      opacity
    };

    if (activeTool === 'text') {
      newAnn.text = textInput;
      setAnnotations(prev => [...prev, newAnn]);
      setSelectedId(id);
      setActiveTool('select'); // return to cursor to allow placement tweaking
    } else if (activeTool === 'callout') {
      // Callout: target is arrow tip (x,y), text box default slightly offset (x2, y2)
      newAnn.x2 = pctX + 15;
      newAnn.y2 = pctY - 10;
      newAnn.width = 25;
      newAnn.height = 7;
      newAnn.text = 'Callout Note';
      setAnnotations(prev => [...prev, newAnn]);
      setSelectedId(id);
      setActiveTool('select');
    } else {
      // Multi-point / Dimension lines and shapes
      newAnn.x2 = pctX;
      newAnn.y2 = pctY;
      newAnn.width = 0;
      newAnn.height = 0;
      setAnnotations(prev => [...prev, newAnn]);
      setDrawingId(id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Handling shape drawing
    if (drawingId) {
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const pctX = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
      const pctY = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

      setAnnotations(prev => prev.map(ann => {
        if (ann.id !== drawingId) return ann;

        if (ann.type === 'line' || ann.type === 'arrow' || ann.type === 'dimension') {
          const updated = { ...ann, x2: pctX, y2: pctY };
          if (ann.type === 'dimension') {
            updated.calibratedUnit = calibUnit;
            updated.calibratedValue = calculateCalibratedMeasurement(updated);
          }
          return updated;
        } else {
          // Bounding box shapes (rect, circle)
          const width = pctX - ann.x;
          const height = pctY - ann.y;
          return {
            ...ann,
            width: Math.abs(width),
            height: Math.abs(height),
            // support backwards drag drawing
            x: width < 0 ? pctX : ann.x - (ann.width || 0) === pctX ? pctX : ann.x,
            y: height < 0 ? pctY : ann.y - (ann.height || 0) === pctY ? pctY : ann.y
          };
        }
      }));
      return;
    }

    // Handling item moving
    if (draggingId) {
      const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

      setAnnotations(prev => prev.map(ann => {
        if (ann.id !== draggingId) return ann;

        const updated = {
          ...ann,
          x: Math.max(0, Math.min(100, dragStartAnn.x + deltaX)),
          y: Math.max(0, Math.min(100, dragStartAnn.y + deltaY))
        };

        if (ann.x2 !== undefined && ann.y2 !== undefined) {
          updated.x2 = Math.max(0, Math.min(100, dragStartAnn.x2 + deltaX));
          updated.y2 = Math.max(0, Math.min(100, dragStartAnn.y2 + deltaY));
        }

        if (ann.type === 'dimension') {
          updated.calibratedValue = calculateCalibratedMeasurement(updated);
        }

        return updated;
      }));
    }
  };

  const handleMouseUp = () => {
    if (drawingId === 'visual-calib') {
      // Visual scale calibration finalization
      const calibAnn = annotations.find(a => a.id === 'visual-calib');
      if (calibAnn) {
        const dx = (calibAnn.x2 ?? calibAnn.x) - calibAnn.x;
        const dy = (calibAnn.y2 ?? calibAnn.y) - calibAnn.y;
        const drawnPct = Math.sqrt(dx * dx + dy * dy);
        
        if (drawnPct > 1) {
          const userVal = prompt(`Visually Measured Line covers ${drawnPct.toFixed(1)}% of document width.\n\nEnter the target real-world measurement for this reference distance:`, calibRealValue.toString());
          if (userVal && !isNaN(Number(userVal))) {
            setCalibRefPct(drawnPct);
            setCalibRealValue(Number(userVal));
          }
        }
      }
      setAnnotations(prev => prev.filter(a => a.id !== 'visual-calib'));
      setIsCalibratingVisually(false);
      setActiveTool('select');
    }

    setDrawingId(null);
    setDraggingId(null);
  };

  // Helper to find annotation under mouse pointer for selecting
  const findAnnotationAt = (pctX: number, pctY: number): PDFAnnotation | undefined => {
    const pageAnns = annotations.filter(a => a.pageIndex === currentPage);
    // search in reverse to select the topmost drawn elements first
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      const ann = pageAnns[i];
      if (ann.type === 'text') {
        const dist = Math.sqrt(Math.pow(ann.x - pctX, 2) + Math.pow(ann.y - pctY, 2));
        if (dist < 3.5) return ann;
      } else if (ann.type === 'line' || ann.type === 'arrow' || ann.type === 'dimension') {
        // Distance to line segment
        const x1 = ann.x;
        const y1 = ann.y;
        const x2 = ann.x2 ?? x1;
        const y2 = ann.y2 ?? y1;
        const A = pctX - x1;
        const B = pctY - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        const dist = Math.sqrt(Math.pow(pctX - xx, 2) + Math.pow(pctY - yy, 2));
        if (dist < 3.0) return ann;
      } else {
        // Bounding box (rect, circle, callout box)
        const w = ann.width ?? 0;
        const h = ann.height ?? 0;
        // Check rect boundaries
        if (pctX >= ann.x && pctX <= ann.x + w && pctY >= ann.y && pctY <= ann.y + h) {
          return ann;
        }
        // Check callout anchor too
        if (ann.type === 'callout') {
          const dist = Math.sqrt(Math.pow(ann.x - pctX, 2) + Math.pow(ann.y - pctY, 2));
          if (dist < 4.0) return ann;
        }
      }
    }
    return undefined;
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateSelectedField = (field: keyof PDFAnnotation, val: any) => {
    if (!selectedId) return;
    setAnnotations(prev => prev.map(ann => {
      if (ann.id !== selectedId) return ann;
      const updated = { ...ann, [field]: val };
      if (ann.type === 'dimension' && (field === 'x' || field === 'x2' || field === 'y' || field === 'y2')) {
        updated.calibratedValue = calculateCalibratedMeasurement(updated);
      }
      return updated;
    }));
  };

  const selectedAnn = annotations.find(a => a.id === selectedId);
  const pageAnnotations = annotations.filter(a => a.pageIndex === currentPage);

  // SVG helper to calculate arrowhead path points
  const getArrowPointsStr = (x1: number, y1: number, x2: number, y2: number, size = 11) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return '';
    const ux = dx / len;
    const uy = dy / len;
    const bx = x2 - ux * size;
    const by = y2 - uy * size;
    const px = -uy;
    const py = ux;
    const wing = size * 0.577; // tan(30deg)
    const wx1 = bx + px * wing;
    const wy1 = by + py * wing;
    const wx2 = bx - px * wing;
    const wy2 = by - py * wing;
    return `${x2},${y2} ${wx1},${wy1} ${wx2},${wy2}`;
  };

  return (
    <div className="w-full grid grid-cols-1 gap-6 xl:grid-cols-12" id="edit-pdf-container">
      
      {/* LEFT MARKUP CONTROLS & INSPECTOR (5 columns) */}
      <div className="xl:col-span-5 flex flex-col gap-5">
        
        {/* Tool Selector Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm">
              <Compass className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">PDF markup toolbox</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Switch tools to stamp, draw, and measure</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'select', label: 'Pointer', icon: MousePointer },
              { id: 'text', label: 'Text Note', icon: Type },
              { id: 'rect', label: 'Rectangle', icon: Square },
              { id: 'circle', label: 'Circle', icon: Circle },
              { id: 'line', label: 'Line', icon: Minus },
              { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
              { id: 'callout', label: 'Callout', icon: MessageSquare },
              { id: 'dimension', label: 'Measure', icon: Ruler },
            ].map(tool => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id as any);
                    setSelectedId(null);
                    setIsCalibratingVisually(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                    isActive 
                      ? 'border-red-500 bg-red-500 text-white shadow-sm scale-102 font-bold' 
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                  id={`btn-tool-${tool.id}`}
                  title={tool.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[9px] font-semibold tracking-tight">{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Guidance Box */}
          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3 flex gap-2">
            <HelpCircle className="h-4.5 w-4.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              {activeTool === 'select' && 'Select pointer: Click on any existing markup to move, edit, style, or delete it.'}
              {activeTool === 'text' && 'Text Note: Enter note contents in sidebar, then click on PDF page canvas to place note.'}
              {activeTool === 'callout' && 'Callout: Click on the page to stamp a text box with a pointer line. Drag box to move.'}
              {(activeTool === 'rect' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow' || activeTool === 'dimension') && `Click and drag across the PDF canvas to draw a ${activeTool}.`}
            </p>
          </div>
        </div>

        {/* Global / Selected Element Styling parameters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm">
              <Palette className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {selectedAnn ? `Modify selected: ${selectedAnn.type}` : 'Default Tool Styling'}
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">Real-time parameters rendering</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Color controls */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Stroke / Text Color
                </label>
                <div className="flex flex-wrap gap-1">
                  {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#000000'].map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        if (selectedAnn) updateSelectedField('color', c);
                        else setColor(c);
                      }}
                      className={`h-5 w-5 rounded-full border border-black/10 transition-all ${
                        (selectedAnn ? selectedAnn.color : color) === c 
                          ? 'scale-110 ring-2 ring-red-400' 
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Fill background color (only for rect, circle) */}
              {(!selectedAnn || selectedAnn.type === 'rect' || selectedAnn.type === 'circle') && (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Background Fill
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {['transparent', '#ef444420', '#3b82f620', '#10b98120', '#f59e0b20'].map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          if (selectedAnn) updateSelectedField('fillColor', c === 'transparent' ? 'transparent' : c.substring(0, 7));
                          else setFillColor(c === 'transparent' ? 'transparent' : c.substring(0, 7));
                        }}
                        className={`h-5 w-5 rounded-full border border-slate-300 transition-all flex items-center justify-center ${
                          (selectedAnn ? selectedAnn.fillColor : fillColor) === (c === 'transparent' ? 'transparent' : c.substring(0, 7)) 
                            ? 'scale-110 ring-2 ring-red-400' 
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c === 'transparent' ? '#ffffff' : c }}
                        title={c === 'transparent' ? 'Transparent Fill' : 'Solid Fill'}
                      >
                        {c === 'transparent' && <span className="text-[8px] text-slate-400">∅</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sizes & values */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Line Thickness ({selectedAnn ? selectedAnn.strokeWidth : strokeWidth}px)
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={selectedAnn ? (selectedAnn.strokeWidth || 3) : strokeWidth}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (selectedAnn) updateSelectedField('strokeWidth', val);
                    else setStrokeWidth(val);
                  }}
                  className="w-full appearance-none h-1 bg-slate-150 rounded accent-red-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Font Size ({selectedAnn ? selectedAnn.fontSize : fontSize}pt)
                </label>
                <input
                  type="range"
                  min="8"
                  max="36"
                  value={selectedAnn ? (selectedAnn.fontSize || 14) : fontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (selectedAnn) updateSelectedField('fontSize', val);
                    else setFontSize(val);
                  }}
                  className="w-full appearance-none h-1 bg-slate-150 rounded accent-red-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Opacity slider */}
            <div className="pt-2 border-t border-slate-50">
              <div className="flex justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                <span>Opacity</span>
                <span className="font-mono text-slate-700 font-bold">{Math.round((selectedAnn ? (selectedAnn.opacity ?? 1.0) : opacity) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={selectedAnn ? (selectedAnn.opacity ?? 1.0) : opacity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (selectedAnn) updateSelectedField('opacity', val);
                  else setOpacity(val);
                }}
                className="w-full appearance-none h-1 bg-slate-150 rounded accent-red-500 cursor-pointer"
              />
            </div>

            {/* Bound note text editor (Shows when editing text/callout) */}
            {selectedAnn && (selectedAnn.type === 'text' || selectedAnn.type === 'callout') && (
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-1.5">
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Edit Note Text Content
                </label>
                <textarea
                  value={selectedAnn.text || ''}
                  onChange={(e) => updateSelectedField('text', e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:bg-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  rows={2}
                  placeholder="Enter custom annotation..."
                />
              </div>
            )}

            {/* Standard pre-placement text input for new text annotations */}
            {!selectedAnn && (activeTool === 'text' || activeTool === 'callout') && (
              <div className="pt-3 border-t border-slate-150 flex flex-col gap-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Note Stamp Content
                </label>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold focus:bg-white focus:border-red-500 focus:outline-none"
                  placeholder="Type notes here..."
                />
              </div>
            )}
          </div>
        </div>

        {/* DIMENSION & MEASUREMENT CALIBRATION PANEL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm">
                <Ruler className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Measurement Calibration</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Scale calibrated dimension drawing</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Reference Width
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={calibRefPct}
                    onChange={(e) => setCalibRefPct(Number(e.target.value))}
                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-mono font-bold text-center focus:bg-white"
                  />
                  <span className="text-[10px] font-bold text-slate-400">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Equals Real Value
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={calibRealValue}
                  onChange={(e) => setCalibRealValue(Number(e.target.value))}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-mono font-bold text-center focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Physical Unit
                </label>
                <select
                  value={calibUnit}
                  onChange={(e) => setCalibUnit(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold focus:bg-white"
                >
                  <option value="m">Meters (m)</option>
                  <option value="ft">Feet (ft)</option>
                  <option value="in">Inches (in)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="mm">Millimeters (mm)</option>
                </select>
              </div>
            </div>

            {/* Action buttons for calibration */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCalibratingVisually(!isCalibratingVisually);
                  if (!isCalibratingVisually) {
                    setActiveTool('select');
                    setSelectedId(null);
                  }
                }}
                className={`flex-grow flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                  isCalibratingVisually
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm animate-pulse'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Ruler className="h-4 w-4" />
                <span>{isCalibratingVisually ? 'Draw ref line now...' : 'Calibrate Visually'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  // standard architectural scale presets
                  setCalibRefPct(15); // approx 1 inch Letter width
                  setCalibRealValue(10.0);
                  setCalibUnit('ft');
                }}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600 transition-all cursor-pointer"
                title="Reset to 1 inch = 10 feet"
              >
                1" = 10' Scale
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              📐 <strong>Visual calibration:</strong> Click "Calibrate Visually", draw a line of known length on the drawing, and enter its real size to automatically calibrate scale.
            </p>
          </div>
        </div>

        {/* ACTIVE STAMP LIST/PANEL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col flex-grow min-h-[160px] max-h-[220px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-red-500" />
              <span>Markup Layers ({pageAnnotations.length})</span>
            </h4>
            {annotations.length > 0 && (
              <button
                onClick={() => {
                  setAnnotations([]);
                  setSelectedId(null);
                }}
                className="text-[10px] font-extrabold text-red-500 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1">
            {pageAnnotations.length === 0 ? (
              <p className="text-xs italic text-slate-400 text-center py-6">No annotations on this page yet.</p>
            ) : (
              pageAnnotations.map(a => {
                const isSelected = selectedId === a.id;
                return (
                  <div 
                    key={a.id} 
                    onClick={() => setSelectedId(a.id)}
                    className={`flex items-center justify-between text-xs rounded-xl p-2 cursor-pointer border transition-all ${
                      isSelected 
                        ? 'bg-red-50/50 border-red-200 ring-1 ring-red-100 font-bold' 
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="capitalize text-slate-700 font-semibold truncate">
                        {a.type === 'text' && `Text Note: "${a.text}"`}
                        {a.type === 'callout' && `Callout: "${a.text}"`}
                        {a.type === 'rect' && `Rectangle (Box)`}
                        {a.type === 'circle' && `Circle (Ellipse)`}
                        {a.type === 'line' && `Line Segment`}
                        {a.type === 'arrow' && `Directional Arrow`}
                        {a.type === 'dimension' && `Measure: ${a.calibratedValue}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAnnotation(a.id);
                      }}
                      className="rounded-lg p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer flex-shrink-0"
                      title="Delete element"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT INTERACTIVE DRAWING SURFACE (7 columns) */}
      <div className="xl:col-span-7 flex flex-col items-center">
        
        {/* Navigation Toolbar */}
        <div className="mb-4 flex items-center justify-between w-full bg-slate-50 p-2 border border-slate-150 rounded-2xl">
          <button
            disabled={currentPage === 0}
            onClick={() => {
              setCurrentPage(p => p - 1);
              setSelectedId(null);
            }}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-35 cursor-pointer transition-all shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>
          
          <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl font-mono shadow-sm">
            Page {currentPage + 1} / {file.numPages}
          </span>
          
          <button
            disabled={currentPage === file.numPages - 1}
            onClick={() => {
              setCurrentPage(p => p + 1);
              setSelectedId(null);
            }}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-35 cursor-pointer transition-all shadow-sm"
          >
            <span>Next</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* DRAWING BOARD WORKSPACE */}
        <div className="relative border border-slate-200 rounded-3xl bg-slate-100 p-5 w-full overflow-auto flex items-center justify-center shadow-inner min-h-[560px] max-h-[720px] custom-scrollbar select-none">
          
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-400 py-12">
              <Loader className="h-6 w-6 animate-spin text-red-500" />
              <span className="text-xs font-semibold">Generating interactive canvas...</span>
            </div>
          ) : (
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`relative shadow-xl rounded-lg bg-white overflow-hidden transition-all duration-300 select-none border border-slate-200
                ${isCalibratingVisually ? 'cursor-crosshair' : activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}
              `}
              style={{ width: 'auto', height: 'auto' }}
            >
              {pageImgUrl ? (
                <img
                  src={pageImgUrl}
                  alt={`PDF Page ${currentPage + 1}`}
                  referrerPolicy="no-referrer"
                  className="block max-h-[620px] object-contain pointer-events-none rounded-md"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-24 text-slate-400">
                  <span className="text-xs">No image loaded</span>
                </div>
              )}

              {/* VECTOR SVG MARKUP OVERLAY LAYER */}
              <svg 
                className="absolute inset-0 pointer-events-none w-full h-full"
                style={{ zIndex: 5 }}
              >
                {pageAnnotations.map((ann) => {
                  const isSelected = selectedId === ann.id;
                  const strokeCol = ann.color;
                  const fillCol = ann.fillColor && ann.fillColor !== 'transparent' ? `${ann.fillColor}${Math.round((ann.opacity ?? 1)*255).toString(16).padStart(2,'0')}` : 'transparent';
                  const thickness = ann.strokeWidth || 3;
                  const op = ann.opacity ?? 1.0;

                  // Coordinates calculation based on relative SVG percentage size
                  if (ann.type === 'rect') {
                    return (
                      <g key={ann.id}>
                        <rect
                          x={`${ann.x}%`}
                          y={`${ann.y}%`}
                          width={`${ann.width ?? 0}%`}
                          height={`${ann.height ?? 0}%`}
                          stroke={strokeCol}
                          strokeWidth={thickness}
                          fill={fillCol}
                          strokeOpacity={op}
                          fillOpacity={op}
                        />
                        {/* Selected boundary tracker */}
                        {isSelected && (
                          <rect
                            x={`${ann.x}%`}
                            y={`${ann.y}%`}
                            width={`${ann.width ?? 0}%`}
                            height={`${ann.height ?? 0}%`}
                            stroke="#3b82f6"
                            strokeWidth="1"
                            strokeDasharray="3,3"
                            fill="none"
                          />
                        )}
                      </g>
                    );
                  }

                  if (ann.type === 'circle') {
                    // ellipse drawing inside bounding box
                    const rx = (ann.width ?? 0) / 2;
                    const ry = (ann.height ?? 0) / 2;
                    const cx = ann.x + rx;
                    const cy = ann.y + ry;
                    return (
                      <g key={ann.id}>
                        <ellipse
                          cx={`${cx}%`}
                          cy={`${cy}%`}
                          rx={`${rx}%`}
                          ry={`${ry}%`}
                          stroke={strokeCol}
                          strokeWidth={thickness}
                          fill={fillCol}
                          strokeOpacity={op}
                          fillOpacity={op}
                        />
                        {isSelected && (
                          <rect
                            x={`${ann.x}%`}
                            y={`${ann.y}%`}
                            width={`${ann.width ?? 0}%`}
                            height={`${ann.height ?? 0}%`}
                            stroke="#3b82f6"
                            strokeWidth="1"
                            strokeDasharray="3,3"
                            fill="none"
                          />
                        )}
                      </g>
                    );
                  }

                  if (ann.type === 'line') {
                    const x2 = ann.x2 ?? ann.x;
                    const y2 = ann.y2 ?? ann.y;
                    return (
                      <g key={ann.id}>
                        <line
                          x1={`${ann.x}%`}
                          y1={`${ann.y}%`}
                          x2={`${x2}%`}
                          y2={`${y2}%`}
                          stroke={strokeCol}
                          strokeWidth={thickness}
                          strokeOpacity={op}
                        />
                        {isSelected && (
                          <line
                            x1={`${ann.x}%`}
                            y1={`${ann.y}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke="#3b82f6"
                            strokeWidth="1"
                            strokeDasharray="3,3"
                          />
                        )}
                      </g>
                    );
                  }

                  if (ann.type === 'arrow') {
                    const x2 = ann.x2 ?? ann.x;
                    const y2 = ann.y2 ?? ann.y;
                    return (
                      <g key={ann.id}>
                        {/* Main Arrow shaft line */}
                        <line
                          x1={`${ann.x}%`}
                          y1={`${ann.y}%`}
                          x2={`${x2}%`}
                          y2={`${y2}%`}
                          stroke={strokeCol}
                          strokeWidth={thickness}
                          strokeOpacity={op}
                        />
                        {/* Render customized arrow tip */}
                        <polygon
                          points={getArrowPointsStr(ann.x, ann.y, x2, y2, 12)}
                          fill={strokeCol}
                          fillOpacity={op}
                        />
                        {isSelected && (
                          <line
                            x1={`${ann.x}%`}
                            y1={`${ann.y}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke="#3b82f6"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                          />
                        )}
                      </g>
                    );
                  }

                  if (ann.type === 'dimension') {
                    const x2 = ann.x2 ?? ann.x;
                    const y2 = ann.y2 ?? ann.y;
                    const mx = (ann.x + x2) / 2;
                    const my = (ann.y + y2) / 2;

                    // Compute ticks values orientation
                    const dx = x2 - ann.x;
                    const dy = y2 - ann.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const ux = len > 0 ? dx / len : 1;
                    const uy = len > 0 ? dy / len : 0;
                    const px = -uy;
                    const py = ux;
                    const size = 1.6; // Tick scale percentage

                    return (
                      <g key={ann.id}>
                        {/* main dimension shaft */}
                        <line
                          x1={`${ann.x}%`}
                          y1={`${ann.y}%`}
                          x2={`${x2}%`}
                          y2={`${y2}%`}
                          stroke={strokeCol}
                          strokeWidth={2}
                          strokeOpacity={op}
                        />
                        {/* Start tick line */}
                        <line
                          x1={`${ann.x - px * size + ux * (size/2)}%`}
                          y1={`${ann.y - py * size + uy * (size/2)}%`}
                          x2={`${ann.x + px * size - ux * (size/2)}%`}
                          y2={`${ann.y + py * size - uy * (size/2)}%`}
                          stroke={strokeCol}
                          strokeWidth={2.5}
                          strokeOpacity={op}
                        />
                        {/* End tick line */}
                        <line
                          x1={`${x2 - px * size + ux * (size/2)}%`}
                          y1={`${y2 - py * size + uy * (size/2)}%`}
                          x2={`${x2 + px * size - ux * (size/2)}%`}
                          y2={`${y2 + py * size - uy * (size/2)}%`}
                          stroke={strokeCol}
                          strokeWidth={2.5}
                          strokeOpacity={op}
                        />
                      </g>
                    );
                  }

                  return null;
                })}
              </svg>

              {/* DOM OVERLAY LAYERS (FOR EDITABLE TEXT AND CALLOUT CONTENT) */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                {pageAnnotations.map((ann) => {
                  const isSelected = selectedId === ann.id;
                  
                  if (ann.type === 'text' && ann.text) {
                    return (
                      <div
                        key={ann.id}
                        className={`absolute font-bold select-none whitespace-nowrap px-1 py-0.5 rounded transition-all ${
                          isSelected 
                            ? 'ring-2 ring-blue-400 bg-white/70 shadow-sm' 
                            : 'hover:ring-1 hover:ring-slate-300'
                        }`}
                        style={{
                          left: `${ann.x}%`,
                          top: `${ann.y}%`,
                          color: ann.color,
                          fontSize: `${ann.fontSize || 14}px`,
                          opacity: ann.opacity ?? 1,
                          transform: 'translate(-50%, -50%)',
                          textShadow: '0 1px 2px rgba(255,255,255,0.95)',
                          pointerEvents: activeTool === 'select' ? 'auto' : 'none',
                          cursor: 'move'
                        }}
                        onMouseDown={(e) => {
                          if (activeTool === 'select') {
                            // forward events triggering
                            handleMouseDown(e);
                          }
                        }}
                      >
                        {ann.text}
                      </div>
                    );
                  }

                  if (ann.type === 'callout') {
                    // Callout text bubble placement
                    const x2 = ann.x2 ?? ann.x;
                    const y2 = ann.y2 ?? ann.y;
                    const w = ann.width ?? 25;
                    const h = ann.height ?? 7;

                    return (
                      <React.Fragment key={ann.id}>
                        {/* Vector Pointer Line drawn as custom HTML absolute component */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                          <line
                            x1={`${ann.x}%`}
                            y1={`${ann.y}%`}
                            x2={`${x2 + w/2}%`}
                            y2={`${y2 + h/2}%`}
                            stroke={ann.color}
                            strokeWidth={1.5}
                            strokeDasharray="2,2"
                          />
                          <polygon
                            points={getArrowPointsStr(x2 + w/2, y2 + h/2, ann.x, ann.y, 8)}
                            fill={ann.color}
                          />
                        </svg>

                        {/* Callout box text wrapper */}
                        <div
                          className={`absolute select-none bg-white border flex items-center justify-center p-1.5 transition-all shadow-md overflow-hidden ${
                            isSelected 
                              ? 'ring-2 ring-blue-400 border-blue-400' 
                              : 'hover:border-slate-300'
                          }`}
                          style={{
                            left: `${x2}%`,
                            top: `${y2}%`,
                            width: `${w}%`,
                            height: `${h}%`,
                            borderColor: ann.color,
                            borderWidth: `${ann.strokeWidth || 2}px`,
                            color: ann.color,
                            fontSize: `${ann.fontSize || 12}px`,
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            pointerEvents: activeTool === 'select' ? 'auto' : 'none',
                            cursor: 'move'
                          }}
                          onMouseDown={(e) => {
                            if (activeTool === 'select') {
                              handleMouseDown(e);
                            }
                          }}
                        >
                          <span className="truncate">{ann.text || 'Callout Note'}</span>
                        </div>
                      </React.Fragment>
                    );
                  }

                  if (ann.type === 'dimension') {
                    const x2 = ann.x2 ?? ann.x;
                    const y2 = ann.y2 ?? ann.y;
                    const mx = (ann.x + x2) / 2;
                    const my = (ann.y + y2) / 2;
                    const val = ann.calibratedValue || '0.0';

                    return (
                      <div
                        key={ann.id}
                        className={`absolute font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white shadow border pointer-events-auto select-none ${
                          isSelected ? 'ring-2 ring-blue-400 border-blue-400' : 'border-slate-200'
                        }`}
                        style={{
                          left: `${mx}%`,
                          top: `${my}%`,
                          color: ann.color,
                          transform: 'translate(-50%, -50%)',
                          opacity: ann.opacity ?? 1.0,
                          cursor: 'move'
                        }}
                        onMouseDown={(e) => {
                          if (activeTool === 'select') {
                            handleMouseDown(e);
                          }
                        }}
                      >
                        {val}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

            </div>
          )}

        </div>

        {/* Real-time indicator */}
        <div className="mt-4 text-center text-slate-400 text-[10px] flex items-center gap-1.5 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
          <Eye className="h-3.5 w-3.5 text-red-500" />
          <span>Flick & draw vector overlays on actual layout coords. Saves locally. Exports perfectly flattened vectors.</span>
        </div>

      </div>

    </div>
  );
}
