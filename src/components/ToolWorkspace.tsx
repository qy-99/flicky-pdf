import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Upload, FileText, Loader, CheckCircle2, AlertTriangle, Play, HelpCircle, Trash2,
  BookOpen, FileEdit, LayoutGrid, PenTool, CheckSquare, EyeOff, Stamp, Binary, Crop, RotateCw, 
  Scissors, FileDown, Lock, Unlock, Eye, Columns, Wrench, Download, Image as ImageIcon, FileSymlink, Merge,
  Sparkles, Layers, Ruler, Compass, Palette, ArrowRight, MousePointer, Type, Square, Circle, Minus, ArrowUpRight,
  MessageSquare, Plus
} from 'lucide-react';
import { PDFTool, ToolId, WorkingFile } from '../types';
import { loadFileMeta, downloadBytes, downloadZip, generateThumbnail } from '../services/pdfService';
import { TOOLS } from '../constants';

const TOOL_ICONS: Record<ToolId, React.ComponentType<any>> = {
  [ToolId.READER]: BookOpen,
  [ToolId.FILL_FORMS]: CheckSquare,
  [ToolId.EDIT]: FileEdit,
  [ToolId.REDACT]: EyeOff,
  [ToolId.WATERMARK]: Stamp,
  [ToolId.PAGE_NUMBERS]: Binary,
  [ToolId.CROP]: Crop,
  [ToolId.ORGANIZE]: LayoutGrid,
  [ToolId.ROTATE]: RotateCw,
  [ToolId.SPLIT]: Scissors,
  [ToolId.MERGE]: Merge,
  [ToolId.REMOVE_PAGES]: Trash2,
  [ToolId.EXTRACT_PAGES]: Download,
  [ToolId.SIGN]: PenTool,
  [ToolId.PASSWORD_PROTECT]: Lock,
  [ToolId.UNLOCK]: Unlock,
  [ToolId.OCR]: Eye,
  [ToolId.COMPARE]: Columns,
  [ToolId.COMPRESS]: FileDown,
  [ToolId.REPAIR]: Wrench,
  [ToolId.PDF_TO_IMG]: ImageIcon,
  [ToolId.IMG_TO_PDF]: FileSymlink,
};

// Import sub panels
import { OrganizePagesPanel } from './tool_panels/OrganizePagesPanel';
import { OCRPanel } from './tool_panels/OCRPanel';
import { ComparePanel } from './tool_panels/ComparePanel';
import { FormFillPanel } from './tool_panels/FormFillPanel';
import { EditPDFPanel, PDFAnnotation } from './tool_panels/EditPDFPanel';
import { SignPDFPanel, SignaturePlacement } from './tool_panels/SignPDFPanel';
import { RedactPanel } from './tool_panels/RedactPanel';
import { ReaderPanel } from './tool_panels/ReaderPanel';
import { PageNumbersPanel } from './tool_panels/PageNumbersPanel';
import { WatermarkPanel } from './tool_panels/WatermarkPanel';
import { FileDropZone } from './FileDropZone';

// Core functions mapped
import { 
  mergePDFs, splitPDF, rotatePDF, removeOrExtractPages,
  addWatermark, addPageNumbers, cropPDF, pdfToImages,
  imagesToPDF, compressPDF, redactPDF, signPDF, fillFormFields,
  repairPDF, protectPDF, unlockPDF
} from '../services/pdfService';

export function parseCustomPageRange(rangeStr: string, maxPages: number): number[] {
  const pages: number[] = [];
  if (!rangeStr.trim()) return [];
  
  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Check if it's a range like "1-3" or "1 - 3" or "1 to 3"
    const rangeMatch = trimmed.match(/^(\d+)\s*[-–—to]+\s*(\d+)$/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.min(start, end);
        const to = Math.max(start, end);
        for (let i = from; i <= to; i++) {
          if (i >= 1 && i <= maxPages) {
            pages.push(i);
          }
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum)) {
        if (pageNum >= 1 && pageNum <= maxPages) {
          pages.push(pageNum);
        }
      }
    }
  }
  
  return Array.from(new Set(pages)).sort((a, b) => a - b);
}

interface ToolWorkspaceProps {
  tool: PDFTool;
  onBack: () => void;
}

export function ToolWorkspace({ tool, onBack }: ToolWorkspaceProps) {
  const activeTabId = tool.id;

  const [files, setFiles] = useState<WorkingFile[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Tool Specific states
  // Split
  const [ranges, setRanges] = useState<Array<{ start: number; end: number }>>([{ start: 1, end: 1 }]);
  // Organize / Reorder
  const [pagesOrder, setPagesOrder] = useState<Array<{ id: string; fileId: string; pageIndex: number; angle: number }>>([]);
  const [exportCompression, setExportCompression] = useState<'none' | 'low' | 'medium' | 'high'>('none');
  const [removeAnnotations, setRemoveAnnotations] = useState(false);
  const [removeForms, setRemoveForms] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewStats, setPreviewStats] = useState<{ pagesCount: number; sizeKb: number } | null>(null);
  const [previewTab, setPreviewTab] = useState<'grid' | 'document'>('grid');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [customPageRange, setCustomPageRange] = useState('');
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  // Rotate all
  const [globalRotation, setGlobalRotation] = useState(90);
  // Watermark
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkImg, setWatermarkImg] = useState('');
  const [watermarkSize, setWatermarkSize] = useState(48);
  const [watermarkColor, setWatermarkColor] = useState('#000000');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [watermarkTiled, setWatermarkTiled] = useState(false);
  const [watermarkPos, setWatermarkPos] = useState<'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('center');
  // Page Numbers
  const [numFormat, setNumFormat] = useState<'number' | 'of-total' | 'page-number' | 'page-of-total'>('page-of-total');
  const [numPos, setNumPos] = useState<'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right'>('bottom-center');
  const [numStart, setNumStart] = useState(1);
  const [numSize, setNumSize] = useState(10);
  const [numColor, setNumColor] = useState('#64748b');
  const [numStartAtPage, setNumStartAtPage] = useState(1);
  const [numEndAtPage, setNumEndAtPage] = useState(0);
  const [numOffsetX, setNumOffsetX] = useState(0);
  const [numOffsetY, setNumOffsetY] = useState(0);
  const [numFontFamily, setNumFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  // Crop
  const [cropTop, setCropTop] = useState(10);
  const [cropBottom, setCropTopBottom] = useState(10);
  const [cropLeft, setCropLeft] = useState(10);
  const [cropRight, setCropRight] = useState(10);
  // Password Encryption
  const [encryptPassword, setEncryptPassword] = useState('');
  const [decryptPassword, setDecryptPassword] = useState('');
  // Annotations (Edit tool)
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  // Visual Signature
  const [sigPlacement, setSigPlacement] = useState<SignaturePlacement | null>(null);
  // Redactions
  const [redactions, setRedactions] = useState<any[]>([]);
  // Form values
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  // Compression level
  const [compQuality, setCompQuality] = useState<'low' | 'medium' | 'high'>('medium');
  // Image to PDF settings
  const [imgOrientation, setImgOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');

  // Multi-file settings helpers
  const isMultiFile = activeTabId === ToolId.MERGE || activeTabId === ToolId.ORGANIZE || activeTabId === ToolId.COMPARE;
  const isImgTool = activeTabId === ToolId.IMG_TO_PDF;

  const activeToolObj = TOOLS.find(t => t.id === activeTabId) || tool;

  // Cleanup preview URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  // Sync loaded page details for operations (Merge, Organize, visual select, split, etc.)
  useEffect(() => {
    if (activeTabId === ToolId.MERGE || activeTabId === ToolId.ORGANIZE) {
      setPagesOrder(prev => {
        if (files.length === 0) return [];
        const currentFileIds = new Set(files.map(f => f.id));
        // Keep only pages of active files
        let updated = prev.filter(p => currentFileIds.has(p.fileId));
        
        // Append missing pages from any new files
        files.forEach(f => {
          const hasPages = updated.some(p => p.fileId === f.id);
          if (!hasPages && f.pagesMeta) {
            const filePages = f.pagesMeta.map(pm => ({
              id: pm.id,
              fileId: f.id,
              pageIndex: pm.pageIndex,
              angle: pm.angle || 0
            }));
            updated = [...updated, ...filePages];
          }
        });
        return updated;
      });
    } else if (files.length === 1 && files[0].pagesMeta) {
      const mapped = files[0].pagesMeta.map(pm => ({
        id: pm.id,
        fileId: files[0].id,
        pageIndex: pm.pageIndex,
        angle: pm.angle || 0
      }));
      setPagesOrder(mapped);
    }
  }, [files, activeTabId]);

  // Generate first-page thumbnail for all uploaded PDF files that don't have it yet
  useEffect(() => {
    let active = true;

    const loadFirstPageThumbnails = async () => {
      let changed = false;
      const updatedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type === 'application/pdf' && (!file.thumbnails || file.thumbnails.length === 0)) {
            try {
              const url = await generateThumbnail(file.file, 0, 0.45);
              changed = true;
              return {
                ...file,
                thumbnails: [url],
                isLoadingThumbnails: false
              };
            } catch (e) {
              console.error('Failed to generate preview thumbnail:', e);
              return {
                ...file,
                isLoadingThumbnails: false
              };
            }
          }
          return file;
        })
      );

      if (active && changed) {
        setFiles(updatedFiles);
      }
    };

    if (files.some(file => file.type === 'application/pdf' && (!file.thumbnails || file.thumbnails.length === 0))) {
      loadFirstPageThumbnails();
    }

    return () => {
      active = false;
    };
  }, [files]);

  // File drag & drop handling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent | FileList | File[]) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    setError('');
    setSuccessMsg('');
    
    let uploadedFiles: File[] = [];
    if (e instanceof FileList || Array.isArray(e)) {
      uploadedFiles = Array.from(e);
    } else if (e && 'dataTransfer' in e && e.dataTransfer && e.dataTransfer.files) {
      uploadedFiles = Array.from(e.dataTransfer.files);
    } else if (e && 'target' in e && e.target && (e.target as HTMLInputElement).files) {
      uploadedFiles = Array.from((e.target as HTMLInputElement).files || []);
    }

    if (uploadedFiles.length === 0) return;

    // Filter file types
    if (isImgTool) {
      uploadedFiles = uploadedFiles.filter(f => f.type.startsWith('image/'));
      if (uploadedFiles.length === 0) {
        setError('Please select valid PNG/JPG/WebP images only.');
        return;
      }
    } else {
      uploadedFiles = uploadedFiles.filter(f => f.type === 'application/pdf');
      if (uploadedFiles.length === 0) {
        setError('Please select PDF files only.');
        return;
      }
    }

    setLoadingFile(true);
    try {
      const workingList: WorkingFile[] = [];
      for (const rawFile of uploadedFiles) {
        if (isImgTool) {
          // Convert image to basic model (1 meta page)
          const fileId = Math.random().toString(36).substring(2, 9);
          const reader = new FileReader();
          const imgUrl = await new Promise<string>((res) => {
            reader.onload = (ev) => res(ev.target?.result as string || '');
            reader.readAsDataURL(rawFile);
          });
          
          workingList.push({
            id: fileId,
            name: rawFile.name,
            size: rawFile.size,
            type: rawFile.type,
            file: rawFile,
            numPages: 1,
            thumbnails: [imgUrl],
            isLoadingThumbnails: false,
          });
        } else {
          // Resolve PDF structure
          const working = await loadFileMeta(rawFile);
          workingList.push(working);
        }
      }

      setFiles(prev => {
        if (isMultiFile || isImgTool) {
          return [...prev, ...workingList];
        } else {
          // Single file tool replaces previous queue
          return [workingList[0]];
        }
      });
    } catch (e: any) {
      console.error(e);
      setError(`Failed to read document: ${e?.message || 'The PDF is encrypted or invalid.'}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const insertFileAtPageIndex = async (rawFile: File, insertAtIndex: number) => {
    setLoadingFile(true);
    setError('');
    setSuccessMsg('');
    try {
      const working = await loadFileMeta(rawFile);
      setFiles(prev => [...prev, working]);
      
      const filePages = (working.pagesMeta || []).map(pm => ({
        id: pm.id,
        fileId: working.id,
        pageIndex: pm.pageIndex,
        angle: pm.angle || 0
      }));
      
      setPagesOrder(prev => {
        const copy = [...prev];
        copy.splice(insertAtIndex, 0, ...filePages);
        return copy;
      });
      setSuccessMsg(`Successfully inserted "${rawFile.name}" (${working.numPages} pages)`);
    } catch (e: any) {
      setError(`Failed to insert PDF: ${e?.message || e}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const reorderMergeFiles = (idx: number, direction: 'up' | 'down') => {
    setFiles(prev => {
      const copy = [...prev];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Watermark Image handler
  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setWatermarkImg(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 2. CORE PDF GENERATION / COMPILE TRIGGER
  const handleCompile = async () => {
    if (files.length === 0) {
      setError('Please add a file to process first.');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccessMsg('');

    try {
      let outputBytes: Uint8Array | null = null;
      let zipFiles: Array<{ filename: string; bytes: Uint8Array }> = [];
      const primaryFile = files[0];

      switch (activeTabId) {
        case ToolId.MERGE:
        case ToolId.ORGANIZE: {
          if (pagesOrder.length === 0) {
            throw new Error('No pages left in the workspace. Please add a PDF file.');
          }
          
          // Page-level merge across all files in pagesOrder
          const PDFLib = (window as any).PDFLib;
          const mergedDoc = await PDFLib.PDFDocument.create();
          
          // Map of fileId to loaded PDFDocument
          const loadedDocs: Record<string, any> = {};
          for (const fileObj of files) {
            const bytes = await fileObj.file.arrayBuffer();
            loadedDocs[fileObj.id] = await PDFLib.PDFDocument.load(bytes);
          }
          
          // Copy and rotate pages
          let targetPages = [...pagesOrder];
          if (customPageRange.trim()) {
            const allowedIndices = parseCustomPageRange(customPageRange, pagesOrder.length);
            if (allowedIndices.length > 0) {
              targetPages = allowedIndices.map(idx => pagesOrder[idx - 1]).filter(Boolean);
            }
          }

          for (const p of targetPages) {
            const srcDoc = loadedDocs[p.fileId];
            if (srcDoc) {
              const [copiedPage] = await mergedDoc.copyPages(srcDoc, [p.pageIndex]);
              
              if (p.angle !== 0) {
                const currentAngle = copiedPage.getRotation().angle;
                copiedPage.setRotation(PDFLib.degrees((currentAngle + p.angle) % 360));
              }
              
              mergedDoc.addPage(copiedPage);
            }
          }

          // Apply clean up options (Remove annotations & Forms)
          if (removeAnnotations) {
            const pages = mergedDoc.getPages();
            for (const page of pages) {
              page.node.delete(PDFLib.PDFName.of('Annots'));
            }
          }

          if (removeForms) {
            try {
              const form = mergedDoc.getForm();
              if (form) {
                form.flatten();
              }
            } catch (e) {
              console.warn("Failed to flatten forms during export:", e);
            }
          }
          
          outputBytes = await mergedDoc.save();

          // Apply compression if requested
          if (exportCompression !== 'none') {
            const tempFile: WorkingFile = {
              id: 'temp-compiled-compress',
              file: new File([outputBytes], 'temp.pdf', { type: 'application/pdf' }),
              name: 'temp.pdf',
              size: outputBytes.length,
              type: 'application/pdf',
              isLoadingThumbnails: false,
              numPages: mergedDoc.getPageCount(),
              thumbnails: [],
              pagesMeta: []
            };
            outputBytes = await compressPDF(tempFile, exportCompression as any);
          }
          break;
        }

        case ToolId.SPLIT:
          zipFiles = await splitPDF(primaryFile, ranges);
          break;

        case ToolId.ROTATE:
          // Rotate all pages by selected angle
          const anglesList = Array(primaryFile.numPages).fill(globalRotation);
          outputBytes = await rotatePDF(primaryFile, anglesList);
          break;

        case ToolId.REMOVE_PAGES:
          // Extract remaining pages
          const kept = pagesOrder.map(p => p.pageIndex);
          outputBytes = await removeOrExtractPages(primaryFile, kept);
          break;

        case ToolId.EXTRACT_PAGES:
          const extractedIndices = pagesOrder.map(p => p.pageIndex);
          outputBytes = await removeOrExtractPages(primaryFile, extractedIndices);
          break;

        case ToolId.WATERMARK:
          outputBytes = await addWatermark(primaryFile, {
            text: watermarkText,
            image: watermarkImg || undefined,
            size: watermarkSize,
            color: watermarkColor,
            opacity: watermarkOpacity,
            rotation: watermarkRotation,
            tiled: watermarkTiled,
            position: watermarkPos
          });
          break;

        case ToolId.PAGE_NUMBERS:
          outputBytes = await addPageNumbers(primaryFile, {
            format: numFormat,
            position: numPos,
            startNumber: numStart,
            size: numSize,
            color: numColor,
            startAtPage: numStartAtPage,
            endAtPage: numEndAtPage || undefined,
            offsetX: numOffsetX,
            offsetY: numOffsetY,
            fontFamily: numFontFamily
          });
          break;

        case ToolId.CROP:
          outputBytes = await cropPDF(primaryFile, {
            top: cropTop,
            bottom: cropBottom,
            left: cropLeft,
            right: cropRight
          });
          break;

        case ToolId.COMPRESS:
          outputBytes = await compressPDF(primaryFile, compQuality);
          break;

        case ToolId.REDACT:
          outputBytes = await redactPDF(primaryFile, redactions);
          break;

        case ToolId.SIGN:
          if (!sigPlacement) throw new Error('Please draw and stamp your signature on the page canvas first.');
          outputBytes = await signPDF(primaryFile, sigPlacement);
          break;

        case ToolId.FILL_FORMS:
          outputBytes = await fillFormFields(primaryFile, fieldValues);
          break;

        case ToolId.REPAIR:
          outputBytes = await repairPDF(primaryFile);
          break;

        case ToolId.PASSWORD_PROTECT:
          if (!encryptPassword) throw new Error('Please specify an encryption password.');
          outputBytes = await protectPDF(primaryFile, encryptPassword);
          break;

        case ToolId.UNLOCK:
          if (!decryptPassword) throw new Error('Please enter the document password to unlock.');
          outputBytes = await unlockPDF(primaryFile, decryptPassword);
          break;

        case ToolId.IMG_TO_PDF:
          const urls = files.map(f => f.thumbnails[0]);
          outputBytes = await imagesToPDF(urls, imgOrientation);
          break;

        case ToolId.PDF_TO_IMG:
          const renderedPages = await pdfToImages(primaryFile);
          // Map to zipFiles payload
          for (const item of renderedPages) {
            const res = await fetch(item.dataUrl);
            const rawBytes = new Uint8Array(await res.arrayBuffer());
            zipFiles.push({
              filename: `${primaryFile.name.replace(/\.pdf$/i, '')}_page_${item.pageIndex + 1}.jpeg`,
              bytes: rawBytes
            });
          }
          break;

        case ToolId.EDIT:
          // Draw annotations
          const editLib = (window as any).PDFLib;
          const editBytes = await primaryFile.file.arrayBuffer();
          const editDoc = await editLib.PDFDocument.load(editBytes);
          const docPagesEdit = editDoc.getPages();
          const hFont = await editDoc.embedFont(editLib.StandardFonts.HelveticaBold);

          for (const ann of annotations) {
            if (ann.pageIndex >= docPagesEdit.length) continue;
            const page = docPagesEdit[ann.pageIndex];
            const { width, height } = page.getSize();
            
            // Convert percentage coordinates to PDF coordinates
            const xPos = (ann.x / 100) * width;
            const yPos = height - ((ann.y / 100) * height); // invert Y

            // Stroke/Primary color parsing
            const hex = ann.color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            const colorRgb = editLib.rgb(r, g, b);

            // Fill color parsing
            let fillColorRgb = undefined;
            if (ann.fillColor && ann.fillColor !== 'transparent') {
              const fHex = ann.fillColor.replace('#', '');
              const fr = parseInt(fHex.substring(0, 2), 16) / 255;
              const fg = parseInt(fHex.substring(2, 4), 16) / 255;
              const fb = parseInt(fHex.substring(4, 6), 16) / 255;
              fillColorRgb = editLib.rgb(fr, fg, fb);
            }

            const strokeThickness = ann.strokeWidth || 3;
            const op = ann.opacity ?? 1.0;
            const fSize = ann.fontSize || 14;

            if (ann.type === 'text' && ann.text) {
              // Center align slightly horizontally/vertically based on Helvetica dimensions
              page.drawText(ann.text, {
                x: xPos - (ann.text.length * fSize * 0.15),
                y: yPos - (fSize / 3),
                size: fSize,
                font: hFont,
                color: colorRgb,
                opacity: op
              });
            } else if (ann.type === 'rect' && ann.width && ann.height) {
              const rWidth = (ann.width / 100) * width;
              const rHeight = (ann.height / 100) * height;
              page.drawRectangle({
                x: xPos,
                y: yPos - rHeight, // adjust for top-left anchor click
                width: rWidth,
                height: rHeight,
                borderColor: colorRgb,
                borderWidth: strokeThickness,
                color: fillColorRgb,
                opacity: op
              });
            } else if (ann.type === 'circle' && ann.width && ann.height) {
              const rxVal = ((ann.width) / 2 / 100) * width;
              const ryVal = ((ann.height) / 2 / 100) * height;
              const cX = xPos + rxVal;
              const cY = yPos - ryVal;
              page.drawEllipse({
                x: cX,
                y: cY,
                xScale: rxVal,
                yScale: ryVal,
                borderColor: colorRgb,
                borderWidth: strokeThickness,
                color: fillColorRgb,
                opacity: op
              });
            } else if (ann.type === 'line') {
              const x2Pos = ((ann.x2 ?? ann.x) / 100) * width;
              const y2Pos = height - (((ann.y2 ?? ann.y) / 100) * height);
              page.drawLine({
                start: { x: xPos, y: yPos },
                end: { x: x2Pos, y: y2Pos },
                color: colorRgb,
                thickness: strokeThickness,
                opacity: op
              });
            } else if (ann.type === 'arrow') {
              const x2Pos = ((ann.x2 ?? ann.x) / 100) * width;
              const y2Pos = height - (((ann.y2 ?? ann.y) / 100) * height);
              page.drawLine({
                start: { x: xPos, y: yPos },
                end: { x: x2Pos, y: y2Pos },
                color: colorRgb,
                thickness: strokeThickness,
                opacity: op
              });

              // draw arrowhead at (x2Pos, y2Pos)
              const dx = x2Pos - xPos;
              const dy = y2Pos - yPos;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len > 0) {
                const ux = dx / len;
                const uy = dy / len;
                const arrowSize = 12;
                const bx = x2Pos - ux * arrowSize;
                const by = y2Pos - uy * arrowSize;
                const px = -uy;
                const py = ux;
                const wingWidth = arrowSize * 0.577;
                const wx1 = bx + px * wingWidth;
                const wy1 = by + py * wingWidth;
                const wx2 = bx - px * wingWidth;
                const wy2 = by - py * wingWidth;
                page.drawLine({
                  start: { x: x2Pos, y: y2Pos },
                  end: { x: wx1, y: wy1 },
                  color: colorRgb,
                  thickness: strokeThickness,
                  opacity: op
                });
                page.drawLine({
                  start: { x: x2Pos, y: y2Pos },
                  end: { x: wx2, y: wy2 },
                  color: colorRgb,
                  thickness: strokeThickness,
                  opacity: op
                });
              }
            } else if (ann.type === 'callout') {
              const x2Pos = ((ann.x2 ?? ann.x) / 100) * width;
              const y2Pos = height - (((ann.y2 ?? ann.y) / 100) * height);
              const cWidth = ((ann.width || 25) / 100) * width;
              const cHeight = ((ann.height || 7) / 100) * height;

              // Textbox center in PDF points
              const bcX = x2Pos + cWidth / 2;
              const bcY = y2Pos - cHeight / 2;

              // Draw callout pointer line from textbox center to arrow target (xPos, yPos)
              page.drawLine({
                start: { x: bcX, y: bcY },
                end: { x: xPos, y: yPos },
                color: colorRgb,
                thickness: 1.5,
                opacity: op
              });

              // Draw arrowhead at target (xPos, yPos)
              const dx = xPos - bcX;
              const dy = yPos - bcY;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len > 0) {
                const ux = dx / len;
                const uy = dy / len;
                const arrowSize = 10;
                const bx = xPos - ux * arrowSize;
                const by = yPos - uy * arrowSize;
                const px = -uy;
                const py = ux;
                const wingWidth = arrowSize * 0.577;
                const wx1 = bx + px * wingWidth;
                const wy1 = by + py * wingWidth;
                const wx2 = bx - px * wingWidth;
                const wy2 = by - py * wingWidth;
                page.drawLine({
                  start: { x: xPos, y: yPos },
                  end: { x: wx1, y: wy1 },
                  color: colorRgb,
                  thickness: 1.5,
                  opacity: op
                });
                page.drawLine({
                  start: { x: xPos, y: yPos },
                  end: { x: wx2, y: wy2 },
                  color: colorRgb,
                  thickness: 1.5,
                  opacity: op
                });
              }

              // Draw Solid White textbox background with border
              page.drawRectangle({
                x: x2Pos,
                y: y2Pos - cHeight,
                width: cWidth,
                height: cHeight,
                borderColor: colorRgb,
                borderWidth: strokeThickness,
                color: editLib.rgb(1, 1, 1),
                opacity: op
              });

              // Draw Text inside callout box
              if (ann.text) {
                page.drawText(ann.text, {
                  x: x2Pos + 6,
                  y: y2Pos - (cHeight / 2) - (fSize / 3),
                  size: fSize,
                  font: hFont,
                  color: colorRgb,
                  opacity: op
                });
              }
            } else if (ann.type === 'dimension') {
              const x2Pos = ((ann.x2 ?? ann.x) / 100) * width;
              const y2Pos = height - (((ann.y2 ?? ann.y) / 100) * height);
              
              // Draw dimension segment line
              page.drawLine({
                start: { x: xPos, y: yPos },
                end: { x: x2Pos, y: y2Pos },
                color: colorRgb,
                thickness: 2,
                opacity: op
              });

              const dx = x2Pos - xPos;
              const dy = y2Pos - yPos;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len > 0) {
                const ux = dx / len;
                const uy = dy / len;
                const px = -uy;
                const py = ux;
                const tickLen = 6;

                // Start dimension tick
                page.drawLine({
                  start: { x: xPos - px * tickLen + ux * (tickLen/2), y: yPos - py * tickLen + uy * (tickLen/2) },
                  end: { x: xPos + px * tickLen - ux * (tickLen/2), y: yPos + py * tickLen - uy * (tickLen/2) },
                  color: colorRgb,
                  thickness: 2,
                  opacity: op
                });

                // End dimension tick
                page.drawLine({
                  start: { x: x2Pos - px * tickLen + ux * (tickLen/2), y: y2Pos - py * tickLen + uy * (tickLen/2) },
                  end: { x: x2Pos + px * tickLen - ux * (tickLen/2), y: y2Pos + py * tickLen - uy * (tickLen/2) },
                  color: colorRgb,
                  thickness: 2,
                  opacity: op
                });

                // Measurement text centered at (cx, cy)
                const cx = (xPos + x2Pos) / 2;
                const cy = (yPos + y2Pos) / 2;
                const textStr = ann.calibratedValue || '0.0';
                const fSizeVal = ann.fontSize || 11;
                const textWidth = textStr.length * fSizeVal * 0.6;
                const textHeight = fSizeVal + 4;

                // Masking rect so text is highly legible
                page.drawRectangle({
                  x: cx - textWidth / 2 - 4,
                  y: cy - textHeight / 2,
                  width: textWidth + 8,
                  height: textHeight,
                  color: editLib.rgb(1, 1, 1),
                  opacity: 0.95
                });

                // Text
                page.drawText(textStr, {
                  x: cx - textWidth / 2,
                  y: cy - fSizeVal / 2 + 1,
                  size: fSizeVal,
                  font: hFont,
                  color: colorRgb,
                  opacity: op
                });
              }
            }
          }
          outputBytes = await editDoc.save();
          break;

        default:
          throw new Error('Unsupported tool selection');
      }

      // Apply Custom Page Range to single PDF outputs if configured (for non-Merge/Organize tools)
      if (outputBytes && customPageRange.trim() && activeTabId !== ToolId.MERGE && activeTabId !== ToolId.ORGANIZE) {
        const PDFLib = (window as any).PDFLib;
        const tempDoc = await PDFLib.PDFDocument.load(outputBytes);
        const totalPageCount = tempDoc.getPageCount();
        const allowedIndices = parseCustomPageRange(customPageRange, totalPageCount);
        if (allowedIndices.length > 0 && allowedIndices.length < totalPageCount) {
          const slicedDoc = await PDFLib.PDFDocument.create();
          const copiedPages = await slicedDoc.copyPages(tempDoc, allowedIndices.map(idx => idx - 1));
          for (const copiedPage of copiedPages) {
            slicedDoc.addPage(copiedPage);
          }
          outputBytes = await slicedDoc.save();
        }
      }

      // 3. Trigger Download
      const cleanName = primaryFile ? primaryFile.name.replace(/\.(pdf|png|jpg|jpeg|webp)$/i, '') : 'flicky_pdf';
      
      if (zipFiles.length > 0) {
        // Zip downloads (PDF-to-Image, multiple split extractions)
        await downloadZip(zipFiles, `${cleanName}_flicky_output.zip`);
        setSuccessMsg('Extraction succeeded! Downloading your ZIP package.');
      } else if (outputBytes) {
        // Normal single file output download
        let outName = `${cleanName}_flicky.pdf`;
        if (activeTabId === ToolId.PASSWORD_PROTECT) outName = `${cleanName}_encrypted.pdf`;
        if (activeTabId === ToolId.UNLOCK) outName = `${cleanName}_unlocked.pdf`;
        
        downloadBytes(outputBytes, outName);
        setSuccessMsg('Compilation succeeded! Downloading your optimized file.');
      }
    } catch (e: any) {
      console.error(e);
      setError(`Processing Error: ${e?.message || e || 'An unexpected failure occurred during processing.'}`);
    } finally {
      setProcessing(false);
    }
  };

  // Generate high-fidelity merged preview
  const handlePreviewPdf = async () => {
    if (files.length === 0) {
      setError('Please add a file first.');
      return;
    }
    setPreviewLoading(true);
    setError('');
    
    try {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }

      let outputBytes: Uint8Array | null = null;
      const PDFLib = (window as any).PDFLib;
      
      if (activeTabId === ToolId.MERGE || activeTabId === ToolId.ORGANIZE) {
        if (pagesOrder.length === 0) {
          throw new Error('No pages in pagesOrder to preview.');
        }
        
        const mergedDoc = await PDFLib.PDFDocument.create();
        const loadedDocs: Record<string, any> = {};
        for (const fileObj of files) {
          const bytes = await fileObj.file.arrayBuffer();
          loadedDocs[fileObj.id] = await PDFLib.PDFDocument.load(bytes);
        }
        
        let targetPages = [...pagesOrder];
        if (customPageRange.trim()) {
          const allowedIndices = parseCustomPageRange(customPageRange, pagesOrder.length);
          if (allowedIndices.length > 0) {
            targetPages = allowedIndices.map(idx => pagesOrder[idx - 1]).filter(Boolean);
          }
        }

        for (const p of targetPages) {
          const srcDoc = loadedDocs[p.fileId];
          if (srcDoc) {
            const [copiedPage] = await mergedDoc.copyPages(srcDoc, [p.pageIndex]);
            if (p.angle !== 0) {
              const currentAngle = copiedPage.getRotation().angle;
              copiedPage.setRotation(PDFLib.degrees((currentAngle + p.angle) % 360));
            }
            mergedDoc.addPage(copiedPage);
          }
        }

        if (removeAnnotations) {
          const pages = mergedDoc.getPages();
          for (const page of pages) {
            page.node.delete(PDFLib.PDFName.of('Annots'));
          }
        }

        if (removeForms) {
          try {
            const form = mergedDoc.getForm();
            if (form) {
              form.flatten();
            }
          } catch (e) {
            console.warn(e);
          }
        }

        outputBytes = await mergedDoc.save();

        if (exportCompression !== 'none') {
          const tempFile: WorkingFile = {
            id: 'temp-preview',
            file: new File([outputBytes], 'temp.pdf', { type: 'application/pdf' }),
            name: 'temp.pdf',
            size: outputBytes.length,
            type: 'application/pdf',
            isLoadingThumbnails: false,
            numPages: mergedDoc.getPageCount(),
            thumbnails: [],
            pagesMeta: []
          };
          outputBytes = await compressPDF(tempFile, exportCompression as any);
        }
      } else {
        // Standard single file preview for other active tools
        const primaryFile = files[0];
        outputBytes = await primaryFile.file.arrayBuffer();
      }

      if (outputBytes && customPageRange.trim() && activeTabId !== ToolId.MERGE && activeTabId !== ToolId.ORGANIZE) {
        const tempDoc = await PDFLib.PDFDocument.load(outputBytes);
        const totalPageCount = tempDoc.getPageCount();
        const allowedIndices = parseCustomPageRange(customPageRange, totalPageCount);
        if (allowedIndices.length > 0 && allowedIndices.length < totalPageCount) {
          const slicedDoc = await PDFLib.PDFDocument.create();
          const copiedPages = await slicedDoc.copyPages(tempDoc, allowedIndices.map(idx => idx - 1));
          for (const copiedPage of copiedPages) {
            slicedDoc.addPage(copiedPage);
          }
          outputBytes = await slicedDoc.save();
        }
      }

      if (outputBytes) {
        const finalPagesCount = (customPageRange.trim()) 
          ? parseCustomPageRange(customPageRange, activeTabId === ToolId.MERGE || activeTabId === ToolId.ORGANIZE ? pagesOrder.length : files[0].numPages).length
          : (activeTabId === ToolId.MERGE || activeTabId === ToolId.ORGANIZE ? pagesOrder.length : files[0].numPages);

        const blob = new Blob([outputBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewPdfUrl(url);
        setPreviewStats({
          pagesCount: finalPagesCount || 1,
          sizeKb: Math.round(outputBytes.length / 1024)
        });
        setIsPreviewModalOpen(true);
      }
    } catch (e: any) {
      console.error(e);
      setError(`Failed to generate preview: ${e?.message || e}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[95rem] px-4 py-8 sm:px-6 lg:px-8 xl:px-12" id="workspace-container">
      {/* Back row Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg py-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors group cursor-pointer"
            id="btn-workspace-back"
          >
            <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-orange-600" />
            <span>Back to Tools</span>
          </button>

          {files.length > 0 && (
            <button
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border border-red-200"
              title="Clear all loaded files and reset current session"
              id="btn-global-clear-all"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
              <span>Clear All</span>
            </button>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-sm font-bold text-slate-900">{activeToolObj.name}</h2>
          <p className="text-[10px] text-orange-600 font-mono tracking-wider uppercase font-semibold">
            {files.length > 0 ? 'Document Active Session' : 'Interactive Sandbox'}
          </p>
        </div>
      </div>

      {files.length === 0 ? (
        /* Upload Dragbox area */
        <div className="flex flex-col items-center justify-center" id="upload-stage">
          <FileDropZone
            onFileSelected={handleFileChange}
            isImgTool={isImgTool}
            isMultiFile={isMultiFile}
            loadingFile={loadingFile}
            error={error}
          />
        </div>
      ) : (
        /* Interactive Workspace Stage */
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12" id="workspace-stage">
          {/* Sidebar configuration (4 cols on lg, 3 cols on xl, positioned on the right on desktop) */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 order-2 lg:order-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {(activeTabId === ToolId.ORGANIZE || activeTabId === ToolId.MERGE) ? (
                // Premium ILovePDF-style Sidebar
                <div className="flex flex-col h-full justify-between" id="ilovepdf-sidebar">
                  <div>
                    {/* Header: Title */}
                    <h3 className="text-xl font-extrabold text-zinc-900 leading-tight mb-2 tracking-tight capitalize">
                      {activeTabId === ToolId.ORGANIZE ? 'Organize PDF' : 'Merge PDF'}
                    </h3>

                    {/* Files container */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-3 border-b border-zinc-100 pb-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Files:</span>
                        <button
                          onClick={() => {
                            setIsClearAllConfirmOpen(true);
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline cursor-pointer flex items-center gap-1"
                          id="btn-sidebar-reset-all"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Clear All</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                        {files.map((file, fIdx) => {
                          const labelChar = String.fromCharCode(65 + fIdx); // A, B, C...
                          return (
                            <div
                              key={file.id}
                              className="flex items-center justify-between rounded-xl border border-red-200 bg-[#fbf2f3] hover:bg-[#faebec] text-[#721c24] px-3.5 py-3.5 transition-colors shadow-sm font-bold text-xs"
                            >
                              <span className="truncate pr-2 select-none" title={file.name}>
                                {labelChar}: {file.name}
                              </span>
                              <button
                                onClick={() => removeFile(file.id)}
                                className="text-[#721c24] hover:text-[#491217] transition-colors p-1 rounded hover:bg-red-200/50 cursor-pointer"
                                title="Remove File"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add more files zone inside the sidebar */}
                      <button
                        onClick={() => document.getElementById('sidebar-file-picker')?.click()}
                        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-red-200 bg-red-50/25 hover:bg-red-50/50 p-3 text-xs font-bold text-red-600 transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add more files</span>
                      </button>
                      <input
                        type="file"
                        id="sidebar-file-picker"
                        multiple
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  {/* Export Customization Options */}
                  <div className="mt-6 border-t border-zinc-100 pt-5 flex flex-col gap-4 select-none">
                    <div className="flex items-center gap-1.5 border-b border-zinc-100 pb-2">
                      <Sparkles className="h-4 w-4 text-[#e3282b]" />
                      <h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Export Customization</h4>
                    </div>

                    {/* Compression Level dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-zinc-700">Compression Level</label>
                        <span className="text-[9px] text-[#e3282b] uppercase font-mono font-black">
                          {exportCompression === 'none' ? 'original quality' : exportCompression === 'low' ? 'low' : exportCompression === 'medium' ? 'medium' : 'high'}
                        </span>
                      </div>
                      <select
                        value={exportCompression}
                        onChange={(e: any) => setExportCompression(e.target.value)}
                        className="w-full text-xs font-bold bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      >
                        <option value="none">None (Maximum Original Quality)</option>
                        <option value="low">Low Compression (Very High Quality)</option>
                        <option value="medium">Medium Compression (Recommended Size)</option>
                        <option value="high">High Compression (Minimum File Size)</option>
                      </select>
                    </div>

                    {/* Custom Page Range Input */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-zinc-700">Custom Page Range</label>
                        {customPageRange.trim() && (
                          <span className="text-[9px] text-[#e3282b] uppercase font-mono font-black animate-pulse">
                            Filtering pages
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={customPageRange}
                        onChange={(e) => setCustomPageRange(e.target.value)}
                        placeholder="e.g. 1-3, 5, 8-10"
                        className="w-full text-xs font-bold bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                      <span className="text-[9px] text-zinc-400 font-medium leading-tight">
                        Specify exactly which pages to include. Leave blank to include all pages.
                      </span>
                    </div>

                    {/* Checkboxes for cleaning PDF metadata */}
                    <div className="flex flex-col gap-2.5 bg-zinc-50 border border-zinc-150 p-3 rounded-xl shadow-xs">
                      <label className="flex items-start gap-2.5 cursor-pointer text-zinc-700 hover:text-zinc-950 transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={removeAnnotations}
                          onChange={(e) => setRemoveAnnotations(e.target.checked)}
                          className="accent-[#e3282b] h-4 w-4 rounded-md border-zinc-300 mt-0.5 cursor-pointer"
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold leading-none">Strip annotations</span>
                          <span className="text-[9px] text-zinc-400 font-medium">Remove external user markups and notes</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer text-zinc-700 hover:text-zinc-950 transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={removeForms}
                          onChange={(e) => setRemoveForms(e.target.checked)}
                          className="accent-[#e3282b] h-4 w-4 rounded-md border-zinc-300 mt-0.5 cursor-pointer"
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold leading-none">Flatten interactive forms</span>
                          <span className="text-[9px] text-zinc-400 font-medium">Lock fields to prevent any editing</span>
                        </div>
                      </label>
                    </div>

                    {/* Preview Before Export Button */}
                    <button
                      disabled={previewLoading || files.length === 0}
                      onClick={handlePreviewPdf}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white hover:bg-zinc-50 disabled:bg-zinc-50 disabled:text-zinc-400 px-4 py-2.5 text-xs font-extrabold text-zinc-800 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                      title="Generate a high-fidelity preview of the merged and reordered document"
                    >
                      {previewLoading ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin text-zinc-500" />
                          <span>Generating Preview...</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 text-zinc-500" />
                          <span>Preview Before Export</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Big Red Button at the bottom of the sidebar */}
                  <div className="mt-8 border-t border-zinc-100 pt-5">
                    <button
                      disabled={processing || files.length === 0}
                      onClick={handleCompile}
                      className="flex w-full items-center justify-between gap-2 rounded-2xl bg-[#e3282b] hover:bg-[#cb1c1f] disabled:bg-zinc-100 disabled:text-zinc-400 px-6 py-4.5 text-base font-extrabold text-white transition-all cursor-pointer shadow-md hover:shadow-lg"
                      id="btn-sidebar-trigger-action"
                    >
                      {processing ? (
                        <div className="mx-auto flex items-center gap-2">
                          <Loader className="h-5 w-5 animate-spin text-white" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <>
                          <span className="capitalize">{activeTabId === ToolId.ORGANIZE ? 'Organize' : 'Merge PDF'}</span>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#e3282b] shadow-sm">
                            <ArrowRight className="h-4.5 w-4.5 stroke-[2.5]" />
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                // Standard configuration for other tools
                <>
                  <div className="mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration</h3>
                  </div>

                  {/* DYNAMIC SIDEBAR PRESETS PER TOOL */}
                  <div className="flex flex-col gap-5 text-sm">
                    {activeTabId === ToolId.SPLIT && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 mb-2">Split Page Range</h4>
                          {ranges.map((rng, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-2 mb-2">
                              <input
                                type="number"
                                min="1"
                                max={files[0].numPages}
                                value={rng.start}
                                onChange={(e) => setRanges(prev => prev.map((item, idx) => idx === rIdx ? { ...item, start: Number(e.target.value) } : item))}
                                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                placeholder="Start"
                              />
                              <span className="text-slate-400 text-xs">to</span>
                              <input
                                type="number"
                                min="1"
                                max={files[0].numPages}
                                value={rng.end}
                                onChange={(e) => setRanges(prev => prev.map((item, idx) => idx === rIdx ? { ...item, end: Number(e.target.value) } : item))}
                                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                placeholder="End"
                              />
                              {ranges.length > 1 && (
                                <button
                                  onClick={() => setRanges(prev => prev.filter((_, idx) => idx !== rIdx))}
                                  className="text-xs font-bold text-red-500 hover:underline"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setRanges(prev => [...prev, { start: 1, end: files[0].numPages }])}
                          className="text-left text-xs font-bold text-red-600 hover:text-red-700 underline"
                        >
                          + Add Range Range
                        </button>
                      </div>
                    )}

                {activeTabId === ToolId.ROTATE && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Rotation Angle</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[90, 180, 270].map(deg => (
                        <button
                          key={deg}
                          onClick={() => setGlobalRotation(deg)}
                          className={`rounded-lg py-2.5 text-xs font-bold transition-all ${
                            globalRotation === deg ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          +{deg}° Right
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTabId === ToolId.CROP && (
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-slate-700">Margin Crop Sizes (%)</h4>
                    {[['Top', cropTop, setCropTop], ['Bottom', cropBottom, setCropTopBottom], ['Left', cropLeft, setCropLeft], ['Right', cropRight, setCropRight]].map(([label, val, setVal]: any) => (
                      <div key={label}>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>{label} Margin: {val}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="45"
                          value={val}
                          onChange={(e) => setVal(Number(e.target.value))}
                          className="w-full appearance-none h-1 bg-slate-200 rounded accent-red-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeTabId === ToolId.COMPRESS && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Compression Mode</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'medium', label: 'Recommended', desc: 'Balanced visual quality and file compression' },
                        { id: 'low', label: 'Extreme Compression', desc: 'Saves maximal size by downscaling images heavily' },
                        { id: 'high', label: 'Light Compression', desc: 'High visual sharpness, minor size savings' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setCompQuality(opt.id as any)}
                          className={`rounded-xl border p-3.5 text-left transition-all ${
                            compQuality === opt.id ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="block text-xs font-bold text-slate-900">{opt.label}</span>
                          <span className="block text-[10px] text-slate-400 mt-1 leading-relaxed">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTabId === ToolId.PASSWORD_PROTECT && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Specify Password</label>
                      <input
                        type="password"
                        value={encryptPassword}
                        onChange={(e) => setEncryptPassword(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        placeholder="Enter secure password"
                      />
                    </div>
                  </div>
                )}

                {activeTabId === ToolId.UNLOCK && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Document Password</label>
                      <input
                        type="password"
                        value={decryptPassword}
                        onChange={(e) => setDecryptPassword(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        placeholder="Enter PDF password to decrypt"
                      />
                    </div>
                  </div>
                )}

                {activeTabId === ToolId.IMG_TO_PDF && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Page Layout Orientation</label>
                      <select
                        value={imgOrientation}
                        onChange={(e) => setImgOrientation(e.target.value as any)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      >
                        <option value="auto">Auto (Match Image dimensions)</option>
                        <option value="portrait">Standard Portrait (Tall)</option>
                        <option value="landscape">Standard Landscape (Wide)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Info summary for standard generic tools */}
                {!isMultiFile && activeTabId !== ToolId.SPLIT && activeTabId !== ToolId.ROTATE && activeTabId !== ToolId.WATERMARK && activeTabId !== ToolId.CROP && activeTabId !== ToolId.COMPRESS && activeTabId !== ToolId.PASSWORD_PROTECT && activeTabId !== ToolId.UNLOCK && activeTabId !== ToolId.IMG_TO_PDF && activeTabId !== ToolId.READER && (
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex gap-2">
                    <HelpCircle className="h-4.5 w-4.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Use the active interactive center panel on the right to customize details, and click the prominent processing button below to trigger the compiler.
                    </p>
                  </div>
                )}

                {activeTabId === ToolId.READER && (
                  <div className="rounded-xl bg-orange-50/50 p-4 border border-orange-100 flex flex-col gap-2.5">
                    <div className="flex gap-2">
                      <HelpCircle className="h-4.5 w-4.5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-orange-800">Local Reader Mode</p>
                        <p className="text-[11px] text-orange-600 mt-0.5 leading-relaxed">
                          You are reading this file securely inside your browser's private sandbox. No data ever reaches any external servers.
                        </p>
                      </div>
                    </div>
                    <div className="mt-1 pt-2 border-t border-orange-100 text-[11px] text-slate-500 space-y-1.5 font-semibold">
                      <p className="truncate">📁 <strong>File:</strong> {files[0]?.name}</p>
                      <p>📄 <strong>Pages:</strong> {files[0]?.numPages}</p>
                      <p>💾 <strong>Size:</strong> {Math.round(files[0]?.size / 1024)} KB</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

              {/* ACTION FOOTER */}
              {activeTabId !== ToolId.ORGANIZE && activeTabId !== ToolId.MERGE && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  {activeTabId === ToolId.READER ? (
                    <button
                      onClick={() => removeFile(files[0].id)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800 cursor-pointer shadow-sm"
                      id="btn-close-reader-doc"
                    >
                      <span>Close Document</span>
                    </button>
                  ) : (
                    <button
                      disabled={processing || files.length === 0}
                      onClick={handleCompile}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer shadow-sm"
                      id="btn-trigger-action"
                    >
                      {processing ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-current" />
                          <span>
                            {activeTabId === ToolId.SPLIT && `Split into Ranges`}
                            {activeTabId === ToolId.ROTATE && `Rotate PDF Pages`}
                            {activeTabId === ToolId.REMOVE_PAGES && `Save Trimmed PDF`}
                            {activeTabId === ToolId.EXTRACT_PAGES && `Extract PDF`}
                            {activeTabId === ToolId.WATERMARK && `Stamp Watermark`}
                            {activeTabId === ToolId.PAGE_NUMBERS && `Number PDF Pages`}
                            {activeTabId === ToolId.CROP && `Crop PDF Document`}
                            {activeTabId === ToolId.COMPRESS && `Optimize & Compress`}
                            {activeTabId === ToolId.REDACT && `Burn Redactions`}
                            {activeTabId === ToolId.SIGN && `Flatten Signature Stamp`}
                            {activeTabId === ToolId.FILL_FORMS && `Apply Form Fields`}
                            {activeTabId === ToolId.REPAIR && `Repair Structures`}
                            {activeTabId === ToolId.PASSWORD_PROTECT && `Encrypt and Save`}
                            {activeTabId === ToolId.UNLOCK && `Decrypt and Save`}
                            {activeTabId === ToolId.IMG_TO_PDF && `Compile Images to PDF`}
                            {activeTabId === ToolId.PDF_TO_IMG && `Render PNG ZIP`}
                            {activeTabId === ToolId.EDIT && `Apply Annotations`}
                            {!Object.values(ToolId).includes(activeTabId) && `Compile Document`}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Error & Success indicators */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700 leading-relaxed shadow-sm">
                <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-700 leading-relaxed shadow-sm">
                <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* Interactive Workspace Area (8 cols on lg, 9 cols on xl) */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 order-1 lg:order-1">
            {/* Multi-file grid/list selection */}
            {(isMultiFile || isImgTool) && activeTabId !== ToolId.COMPARE && activeTabId !== ToolId.ORGANIZE && activeTabId !== ToolId.MERGE && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Uploaded File Queue</h3>
                  <button
                    onClick={() => document.getElementById('sub-file-picker')?.click()}
                    className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                  >
                    + Add More Files
                  </button>
                  <input
                    type="file"
                    id="sub-file-picker"
                    multiple
                    accept={isImgTool ? "image/*" : "application/pdf"}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {files.map(file => (
                    <div key={file.id} className="relative rounded-xl border border-zinc-200 bg-white p-3 shadow-sm flex flex-col items-center">
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute top-1.5 right-1.5 text-red-500 hover:bg-red-50 p-1 rounded-md"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      
                      <div className="aspect-[3/4] w-full bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-center overflow-hidden mb-2">
                        {file.thumbnails[0] ? (
                          <img src={file.thumbnails[0]} alt={file.name} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <FileText className="h-8 w-8 text-zinc-400" />
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-zinc-800 truncate w-full text-center" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DYNAMIC COMPONENT MODALS OVERRIDE PER TOOL */}
            {(activeTabId === ToolId.ORGANIZE || activeTabId === ToolId.MERGE) && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <OrganizePagesPanel
                  files={files}
                  pages={pagesOrder}
                  setPages={setPagesOrder}
                  onInsertFileAt={insertFileAtPageIndex}
                  onRemoveFile={removeFile}
                  onAddFiles={async (uploadedFiles) => {
                    setLoadingFile(true);
                    setError('');
                    setSuccessMsg('');
                    try {
                      const workingList = [];
                      for (const rawFile of uploadedFiles) {
                        const working = await loadFileMeta(rawFile);
                        workingList.push(working);
                      }
                      setFiles(prev => [...prev, ...workingList]);
                    } catch (e: any) {
                      setError(`Failed to read document: ${e?.message || e}`);
                    } finally {
                      setLoadingFile(false);
                    }
                  }}
                />
              </div>
            )}

            {activeTabId === ToolId.OCR && (
              <OCRPanel file={files[0]} />
            )}

            {activeTabId === ToolId.COMPARE && (
              <ComparePanel files={files} />
            )}

            {activeTabId === ToolId.FILL_FORMS && (
              <FormFillPanel
                file={files[0]}
                fieldValues={fieldValues}
                setFieldValues={setFieldValues}
              />
            )}

            {activeTabId === ToolId.EDIT && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <EditPDFPanel
                  file={files[0]}
                  annotations={annotations}
                  setAnnotations={setAnnotations}
                />
              </div>
            )}

            {activeTabId === ToolId.SIGN && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <SignPDFPanel
                  file={files[0]}
                  placement={sigPlacement}
                  setPlacement={setSigPlacement}
                />
              </div>
            )}

            {activeTabId === ToolId.REDACT && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <RedactPanel
                  file={files[0]}
                  redactions={redactions}
                  setRedactions={setRedactions}
                />
              </div>
            )}

            {activeTabId === ToolId.READER && (
              <ReaderPanel file={files[0]} />
            )}

            {activeTabId === ToolId.PAGE_NUMBERS && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <PageNumbersPanel
                  file={files[0]}
                  format={numFormat}
                  setFormat={setNumFormat}
                  position={numPos}
                  setPosition={setNumPos}
                  startNumber={numStart}
                  setStartNumber={setNumStart}
                  startAtPage={numStartAtPage}
                  setStartAtPage={setNumStartAtPage}
                  endAtPage={numEndAtPage}
                  setEndAtPage={setNumEndAtPage}
                  fontSize={numSize}
                  setFontSize={setNumSize}
                  color={numColor}
                  setColor={setNumColor}
                  offsetX={numOffsetX}
                  setOffsetX={setNumOffsetX}
                  offsetY={numOffsetY}
                  setOffsetY={setNumOffsetY}
                  fontFamily={numFontFamily}
                  setFontFamily={setNumFontFamily}
                />
              </div>
            )}

            {activeTabId === ToolId.WATERMARK && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <WatermarkPanel
                  file={files[0]}
                  watermarkText={watermarkText}
                  setWatermarkText={setWatermarkText}
                  watermarkImg={watermarkImg}
                  setWatermarkImg={setWatermarkImg}
                  watermarkSize={watermarkSize}
                  setWatermarkSize={setWatermarkSize}
                  watermarkColor={watermarkColor}
                  setWatermarkColor={setWatermarkColor}
                  watermarkOpacity={watermarkOpacity}
                  setWatermarkOpacity={setWatermarkOpacity}
                  watermarkRotation={watermarkRotation}
                  setWatermarkRotation={setWatermarkRotation}
                  watermarkTiled={watermarkTiled}
                  setWatermarkTiled={setWatermarkTiled}
                  watermarkPos={watermarkPos}
                  setWatermarkPos={setWatermarkPos}
                />
              </div>
            )}

            {/* General Fallback layout for standard tools */}
            {!isMultiFile && activeTabId !== ToolId.OCR && activeTabId !== ToolId.FILL_FORMS && activeTabId !== ToolId.EDIT && activeTabId !== ToolId.SIGN && activeTabId !== ToolId.REDACT && activeTabId !== ToolId.READER && activeTabId !== ToolId.PAGE_NUMBERS && activeTabId !== ToolId.WATERMARK && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  
                  {/* Left Side: Dynamic Visual PDF.js Page Preview */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center">
                    <div className="group relative aspect-[3/4] w-48 bg-slate-50 border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 flex items-center justify-center overflow-hidden">
                      {files[0].thumbnails && files[0].thumbnails[0] ? (
                        <>
                          <img 
                            src={files[0].thumbnails[0]} 
                            alt="PDF first page preview" 
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-contain pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-300" />
                          <span className="absolute bottom-3 right-3 rounded-md bg-zinc-900/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider select-none shadow-sm">
                            Page 1 Preview
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <Loader className="h-6 w-6 animate-spin text-orange-500" />
                          <span className="text-[10px] font-semibold">Generating visual preview...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Document Stats and Action Triggers */}
                  <div className="md:col-span-7 text-center md:text-left flex flex-col gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700 border border-orange-100">
                        <FileText className="h-3 w-3" />
                        <span>Document Loaded</span>
                      </span>
                      <h4 className="mt-3 text-lg font-bold text-zinc-900 break-all leading-snug">{files[0].name}</h4>
                      <p className="mt-1 text-xs text-zinc-400 font-medium">
                        {files[0].numPages} {files[0].numPages === 1 ? 'page' : 'pages'} • {Math.round(files[0].size / 1024)} KB
                      </p>
                    </div>

                    <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
                      Apply the <strong>{activeToolObj.name}</strong> tool configured on the left sidebar directly to this document. Click compile to apply all parameters locally.
                    </p>

                    <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-3">
                      <button
                        onClick={() => removeFile(files[0].id)}
                        className="rounded-xl border border-zinc-200 px-5 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-all cursor-pointer"
                      >
                        Remove File
                      </button>
                      <button
                        disabled={processing}
                        onClick={handleCompile}
                        className="rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-all disabled:bg-zinc-100 disabled:text-zinc-400 cursor-pointer shadow-sm"
                      >
                        {processing ? 'Processing...' : `Apply ${activeToolObj.name}`}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Read-Only Export Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10" id="export-preview-modal">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsPreviewModalOpen(false)} 
          />
          
          {/* Modal Container */}
          <div className="relative flex h-full max-h-[85vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-6 py-4.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-[#e3282b]">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 leading-tight">Export Preview</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                    Verify page composition and quality settings before save
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-all cursor-pointer"
              >
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>

            {/* Modal Sub-Header (Stats & Tabs) */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 bg-white px-6 py-3">
              {/* Stats info */}
              <div className="flex items-center gap-4 text-xs font-bold text-zinc-500">
                <span className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200/50">
                  📄 Total Pages: <span className="text-zinc-900">{previewStats?.pagesCount || 0}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200/50">
                  💾 Estimated Size: <span className="text-zinc-900">{previewStats?.sizeKb || 0} KB</span>
                </span>
              </div>

              {/* View Selector Tabs */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                <button
                  onClick={() => setPreviewTab('grid')}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                    previewTab === 'grid' 
                      ? 'bg-white text-zinc-900 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Thumbnail Flow</span>
                </button>
                <button
                  onClick={() => setPreviewTab('document')}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                    previewTab === 'document' 
                      ? 'bg-white text-zinc-900 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Document Reader</span>
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 bg-zinc-100/50 overflow-y-auto p-6">
              {previewTab === 'grid' ? (
                /* Dynamic Thumbnail Preview Grid representing reordered flow */
                <div className="flex flex-wrap gap-5 justify-center">
                  {pagesOrder.map((page, index) => {
                    const fileObj = files.find(f => f.id === page.fileId);
                    const thumbUrl = fileObj?.thumbnails[page.pageIndex];
                    return (
                      <div 
                        key={index} 
                        className="flex flex-col items-center gap-2 bg-white border border-zinc-200 p-2.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 w-32"
                      >
                        {/* Page Preview Thumbnail Wrapper */}
                        <div className="relative aspect-[3/4] w-full bg-zinc-50 border border-zinc-100 rounded-xl overflow-hidden flex items-center justify-center">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={`Preview page ${index + 1}`}
                              referrerPolicy="no-referrer"
                              className="max-h-full max-w-full object-contain pointer-events-none"
                              style={{ transform: `rotate(${page.angle}deg)` }}
                            />
                          ) : (
                            <Loader className="h-4 w-4 animate-spin text-zinc-400" />
                          )}

                          {/* Source Label overlay Badge */}
                          <div className="absolute top-1.5 left-1.5 bg-zinc-900/85 backdrop-blur-xs text-white font-black text-[8px] h-4 w-4 rounded-full flex items-center justify-center">
                            {String.fromCharCode(65 + files.findIndex(f => f.id === page.fileId))}
                          </div>
                        </div>

                        {/* Sequenced Page marker */}
                        <div className="text-[10px] font-black text-zinc-700 tracking-wider">
                          PAGE {index + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Native PDF Web Embed using generated Blob object URL */
                <div className="h-full w-full rounded-2xl overflow-hidden border border-zinc-200 bg-white">
                  {previewPdfUrl ? (
                    <iframe
                      src={`${previewPdfUrl}#toolbar=0&navpanes=0`}
                      className="h-full w-full border-none"
                      title="PDF Document Embed Preview"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-zinc-400 gap-2">
                      <Loader className="h-6 w-6 animate-spin text-red-500" />
                      <span className="text-xs font-bold">Rendering Document...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-6 py-4.5">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 px-5 py-2.5 text-xs font-extrabold text-zinc-700 transition-all cursor-pointer shadow-xs"
              >
                Close Preview
              </button>

              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  handleCompile();
                }}
                className="flex items-center gap-2 rounded-xl bg-[#e3282b] hover:bg-[#cb1c1f] px-6 py-2.5 text-xs font-extrabold text-white transition-all cursor-pointer shadow-sm"
              >
                <Download className="h-4 w-4 text-white" />
                <span>Confirm & Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Dialog Modal */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" id="clear-all-confirmation-modal">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsClearAllConfirmOpen(false)} 
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-zinc-200 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-[#e3282b]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 leading-tight">Clear Workspace</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                  Confirm document stack reset
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to clear all loaded files? This will reset the current document stack, clear your annotations/customizations, and restore the upload stage. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 px-4 py-2.5 text-xs font-extrabold text-zinc-700 transition-all cursor-pointer shadow-xs"
              >
                No, Keep Files
              </button>
              <button
                onClick={() => {
                  setFiles([]);
                  setPagesOrder([]);
                  setCustomPageRange('');
                  setError('');
                  setSuccessMsg('');
                  setIsClearAllConfirmOpen(false);
                }}
                className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-extrabold text-white transition-all cursor-pointer shadow-sm"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
