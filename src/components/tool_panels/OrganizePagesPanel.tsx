import React, { useEffect, useState, useRef } from 'react';
import { 
  RotateCw, Trash2, Loader, Plus, FileText, Layers, Upload,
  Undo, Redo, Keyboard, ZoomIn, ZoomOut, HelpCircle, Info
} from 'lucide-react';
import { WorkingFile } from '../../types';
import { generateThumbnail } from '../../services/pdfService';

export interface OrganizedPage {
  id: string;
  fileId: string;
  pageIndex: number;
  angle: number;
  isDeleted?: boolean;
}

interface OrganizePagesPanelProps {
  files: WorkingFile[];
  pages: OrganizedPage[];
  setPages: React.Dispatch<React.SetStateAction<OrganizedPage[]>>;
  onInsertFileAt: (file: File, index: number) => void | Promise<void>;
  onRemoveFile: (fileId: string) => void;
  onAddFiles: (files: File[]) => void;
}

export function OrganizePagesPanel({ 
  files, 
  pages, 
  setPages, 
  onInsertFileAt, 
  onAddFiles 
}: OrganizePagesPanelProps) {
  const [renderedThumbnails, setRenderedThumbnails] = useState<Record<string, string>>({});
  const [loadingPages, setLoadingPages] = useState<Record<string, boolean>>({});
  const [expandedFileIds, setExpandedFileIds] = useState<Record<string, boolean>>({});
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'left' | 'right' | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [isDraggingOverQueue, setIsDraggingOverQueue] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  
  // Selection States
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  
  // Zoom State
  const [zoom, setZoom] = useState<number>(160); // 160px base min-width

  // Show Metadata Toggle State
  const [showMetadata, setShowMetadata] = useState<boolean>(true);
  
  // Keyboard Shortcuts Modal State
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  // Undo / Redo History States
  const [history, setHistory] = useState<OrganizedPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Click & Drag Marquee Selection Box State
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  const rotateAllSelected = (direction: 'cw' | 'ccw') => {
    if (selectedPageIds.length === 0) return;
    updatePagesAndHistory(prev => 
      prev.map(p => {
        if (selectedPageIds.includes(p.id)) {
          const delta = direction === 'cw' ? 90 : 270;
          return { ...p, angle: (p.angle + delta) % 360 };
        }
        return p;
      })
    );
  };

  const renderedThumbnailsRef = useRef<Record<string, string>>({});
  const loadingPagesRef = useRef<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear caches when files are completely empty
  useEffect(() => {
    if (files.length === 0) {
      renderedThumbnailsRef.current = {};
      loadingPagesRef.current = {};
      setRenderedThumbnails({});
      setLoadingPages({});
    }
  }, [files]);

  // Auto-expand newly uploaded files only if they are single page
  useEffect(() => {
    files.forEach(f => {
      if (expandedFileIds[f.id] === undefined) {
        const isMultiPage = f.numPages > 1;
        setExpandedFileIds(prev => ({ ...prev, [f.id]: !isMultiPage }));
      }
    });
  }, [files]);

  // Sequentially load thumbnails for pages in pages (Fixes infinite render and stuck state bug)
  useEffect(() => {
    let active = true;

    const loadThumbnails = async () => {
      for (const p of pages) {
        if (!active) break;
        const key = `${p.fileId}-${p.pageIndex}`;

        // Check mutable ref values instead of stale closures
        if (renderedThumbnailsRef.current[key] || loadingPagesRef.current[key]) {
          continue;
        }

        const idx = p.pageIndex;
        const fileId = p.fileId;
        const targetFile = files.find(f => f.id === fileId);
        if (!targetFile) continue;

        // Mark as loading in both ref and state
        loadingPagesRef.current[key] = true;
        setLoadingPages(prev => ({ ...prev, [key]: true }));

        try {
          const url = await generateThumbnail(targetFile.file, idx, 0.45);
          if (active) {
            renderedThumbnailsRef.current[key] = url;
            setRenderedThumbnails(prev => ({ ...prev, [key]: url }));
          }
        } catch (e) {
          console.error('Failed to render page thumbnail', idx, e);
        } finally {
          loadingPagesRef.current[key] = false;
          setLoadingPages(prev => ({ ...prev, [key]: false }));
        }
      }
    };

    loadThumbnails();

    return () => {
      active = false;
    };
  }, [pages, files]);

  // Synchronize history when pages are externally loaded or updated by the parent component
  useEffect(() => {
    if (history.length === 0 || (historyIndex >= 0 && history[historyIndex] !== pages)) {
      const currentHistoryState = historyIndex >= 0 ? history[historyIndex] : null;
      const isMatched = currentHistoryState && 
                        currentHistoryState.length === pages.length && 
                        currentHistoryState.every((p, i) => p.id === pages[i].id && p.angle === pages[i].angle);
      
      if (!isMatched) {
        setHistory([pages]);
        setHistoryIndex(0);
      }
    }
  }, [pages]);

  const updatePagesAndHistory = (next: OrganizedPage[] | ((prev: OrganizedPage[]) => OrganizedPage[])) => {
    const nextPages = typeof next === 'function' ? next(pages) : next;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nextPages);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPages(nextPages);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setPages(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setPages(history[nextIdx]);
    }
  };

  // Page Operations
  const moveLeft = (idx: number) => {
    if (idx === 0) return;
    updatePagesAndHistory(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
  };

  const moveRight = (idx: number) => {
    if (idx === pages.length - 1) return;
    updatePagesAndHistory(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
  };

  const rotatePage = (idx: number) => {
    updatePagesAndHistory(prev => prev.map((p, i) => i === idx ? { ...p, angle: (p.angle + 90) % 360 } : p));
  };

  const deletePage = (idx: number) => {
    updatePagesAndHistory(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleExpandFile = (fileId: string) => {
    setExpandedFileIds(prev => ({
      ...prev,
      [fileId]: !prev[fileId]
    }));
  };

  const moveCollapsedFile = (fileId: string, direction: 'left' | 'right') => {
    updatePagesAndHistory(prev => {
      interface VisualBlock {
        type: 'expanded-page' | 'collapsed-file';
        fileId: string;
        pages: OrganizedPage[];
      }

      const blocks: VisualBlock[] = [];
      let currentBlock: VisualBlock | null = null;

      for (const p of prev) {
        const isExpanded = expandedFileIds[p.fileId] !== false;
        if (isExpanded) {
          blocks.push({
            type: 'expanded-page',
            fileId: p.fileId,
            pages: [p]
          });
          currentBlock = null;
        } else {
          if (currentBlock && currentBlock.fileId === p.fileId) {
            currentBlock.pages.push(p);
          } else {
            currentBlock = {
              type: 'collapsed-file',
              fileId: p.fileId,
              pages: [p]
            };
            blocks.push(currentBlock);
          }
        }
      }

      const blockIdx = blocks.findIndex(b => b.fileId === fileId && b.type === 'collapsed-file');
      if (blockIdx === -1) return prev;

      if (direction === 'left' && blockIdx > 0) {
        const temp = blocks[blockIdx];
        blocks[blockIdx] = blocks[blockIdx - 1];
        blocks[blockIdx - 1] = temp;
      } else if (direction === 'right' && blockIdx < blocks.length - 1) {
        const temp = blocks[blockIdx];
        blocks[blockIdx] = blocks[blockIdx + 1];
        blocks[blockIdx + 1] = temp;
      } else {
        return prev;
      }

      const reconstructed: OrganizedPage[] = [];
      for (const b of blocks) {
        reconstructed.push(...b.pages);
      }
      return reconstructed;
    });
  };

  const handlePageClick = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    
    if (e.shiftKey) {
      const lastSelectedId = selectedPageIds[selectedPageIds.length - 1];
      if (lastSelectedId) {
        const lastIdx = pages.findIndex(p => p.id === lastSelectedId);
        const currentIdx = pages.findIndex(p => p.id === pageId);
        
        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          const rangeIds = pages.slice(start, end + 1).map(p => p.id);
          
          setSelectedPageIds(prev => {
            const merged = [...prev];
            rangeIds.forEach(id => {
              if (!merged.includes(id)) merged.push(id);
            });
            return merged;
          });
          return;
        }
      }
    }

    if (e.ctrlKey || e.metaKey) {
      setSelectedPageIds(prev => {
        if (prev.includes(pageId)) {
          return prev.filter(id => id !== pageId);
        } else {
          return [...prev, pageId];
        }
      });
    } else {
      setSelectedPageIds([pageId]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only initiate marquee selection if clicking on the actual workspace grid container or empty space,
    // and ONLY for left click!
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    
    // Check if the click target is a card or button or input
    const isInteractive = target.closest('button, input, [draggable="true"], a');
    if (isInteractive) return;

    // Get viewport-relative or container-relative coordinates
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setSelectionBox({
      startX,
      startY,
      endX: startX,
      endY: startY
    });

    // Unless holding Shift/Ctrl, clear existing selections on dragging new empty space
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedPageIds([]);
    }
  };

  // Global window mouse listeners for robust marquee selection
  useEffect(() => {
    if (!selectionBox) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      // Dynamic Selection Calculation while dragging
      const left = Math.min(selectionBox.startX, currentX);
      const right = Math.max(selectionBox.startX, currentX);
      const top = Math.min(selectionBox.startY, currentY);
      const bottom = Math.max(selectionBox.startY, currentY);

      setSelectionBox(prev => prev ? {
        ...prev,
        endX: currentX,
        endY: currentY
      } : null);

      // Query all page elements
      const newlySelectedIds: string[] = [];

      pages.forEach(p => {
        const isFileExpanded = expandedFileIds[p.fileId] !== false;
        const cardId = isFileExpanded ? `page-card-${p.id}` : `collapsed-card-${p.fileId}`;
        const element = document.getElementById(cardId);
        
        if (element && containerRef.current) {
          const elemRect = element.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // Element coords relative to container
          const elemLeft = elemRect.left - containerRect.left;
          const elemRight = elemRect.right - containerRect.left;
          const elemTop = elemRect.top - containerRect.top;
          const elemBottom = elemRect.bottom - containerRect.top;

          // Check intersection
          const intersects = !(elemLeft > right || 
                               elemRight < left || 
                               elemTop > bottom || 
                               elemBottom < top);

          if (intersects) {
            if (isFileExpanded) {
              newlySelectedIds.push(p.id);
            } else {
              // Select all pages in the collapsed stack
              const groupPages = pages.filter(g => g.fileId === p.fileId);
              groupPages.forEach(gp => newlySelectedIds.push(gp.id));
            }
          }
        }
      });

      setSelectedPageIds(prev => {
        // If holding shift/ctrl/meta, combine, otherwise use the newly intersect array
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          const merged = [...prev];
          newlySelectedIds.forEach(id => {
            if (!merged.includes(id)) merged.push(id);
          });
          return merged;
        }
        return newlySelectedIds;
      });
    };

    const handleGlobalMouseUp = () => {
      setSelectionBox(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectionBox, pages, expandedFileIds, setSelectedPageIds]);

  const moveSelectedPages = (direction: 'left' | 'right') => {
    updatePagesAndHistory(prev => {
      const selected = prev.filter(p => selectedPageIds.includes(p.id));
      const remaining = prev.filter(p => !selectedPageIds.includes(p.id));
      
      if (selected.length === 0) return prev;

      const originalIndices = selected.map(s => prev.findIndex(p => p.id === s.id));
      const minIdx = Math.min(...originalIndices);
      const maxIdx = Math.max(...originalIndices);

      let insertAt = 0;
      if (direction === 'left') {
        insertAt = Math.max(0, minIdx - 1);
      } else {
        insertAt = Math.min(prev.length - 1, maxIdx + 1);
        insertAt = Math.max(0, insertAt - selected.length + 1);
      }

      const copy = [...remaining];
      copy.splice(insertAt, 0, ...selected);
      return copy;
    });
  };

  const deleteSelectedPages = () => {
    if (selectedPageIds.length === 0) return;
    
    const firstSelectedIdx = pages.findIndex(p => selectedPageIds.includes(p.id));
    const remaining = pages.filter(p => !selectedPageIds.includes(p.id));
    
    let nextSelectIds: string[] = [];
    if (remaining.length > 0) {
      const nextIdx = Math.min(firstSelectedIdx, remaining.length - 1);
      nextSelectIds = [remaining[nextIdx].id];
    }

    updatePagesAndHistory(prev => prev.filter(p => !selectedPageIds.includes(p.id)));
    setSelectedPageIds(nextSelectIds);
  };

  // Keyboard navigation & deletion listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Undo / Redo Global Listeners
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (selectedPageIds.length === 0) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (selectedPageIds.length === 1) {
          const page = pages.find(p => p.id === selectedPageIds[0]);
          if (page && expandedFileIds[page.fileId] === false) {
            moveCollapsedFile(page.fileId, 'left');
            return;
          }
        }
        moveSelectedPages('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (selectedPageIds.length === 1) {
          const page = pages.find(p => p.id === selectedPageIds[0]);
          if (page && expandedFileIds[page.fileId] === false) {
            moveCollapsedFile(page.fileId, 'right');
            return;
          }
        }
        moveSelectedPages('right');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedPages();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        updatePagesAndHistory(prev => prev.map(p => {
          if (selectedPageIds.includes(p.id)) {
            return { ...p, angle: (p.angle + 90) % 360 };
          }
          return p;
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPageIds, pages, expandedFileIds, historyIndex, history]);

  // Trigger file selection for insertion
  const triggerInsertFile = (index: number) => {
    setInsertIndex(index);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Drag & drop handlers for insert zones
  const handlePageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPageIndex(index);
    setDraggedFileId(null);
    setIsDragActive(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleCollapsedDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggedFileId(fileId);
    setDraggedPageIndex(null);
    setIsDragActive(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPageIndex(null);
    setDraggedFileId(null);
    setDragOverIndex(null);
    setDragOverPosition(null);
    setIsDragActive(false);
    setDragCounter(0);
  };

  const handleContainerDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPageIndex !== null || draggedFileId !== null) return;
    setIsDragActive(true);
  };

  const handleContainerDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPageIndex !== null || draggedFileId !== null) return;

    // Check if the cursor is actually leaving the container boundaries
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;

    // Handle invalid coordinates or window-exit safely
    if (clientX === 0 && clientY === 0) {
      setIsDragActive(false);
      setDragOverIndex(null);
      setDragOverPosition(null);
      return;
    }

    const isOutside = 
      clientX < rect.left || 
      clientX >= rect.right || 
      clientY < rect.top || 
      clientY >= rect.bottom;

    if (isOutside) {
      setIsDragActive(false);
      setDragOverIndex(null);
      setDragOverPosition(null);
    }
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPageIndex !== null || draggedFileId !== null) return;
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    setIsDragActive(false);
    setDragOverIndex(null);
    setDragOverPosition(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      const pdfs = filesArray.filter(f => f.type === 'application/pdf');
      if (pdfs.length > 0) {
        onAddFiles(pdfs);
      }
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetIdx: number, position: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    
    let insertAt = position === 'left' ? targetIdx : targetIdx + 1;
 
    // Case 1: External files are dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      const pdfs = filesArray.filter(f => f.type === 'application/pdf');
      if (pdfs.length > 0) {
        (async () => {
          for (let i = 0; i < pdfs.length; i++) {
            await (onInsertFileAt(pdfs[i], insertAt + i) as any);
          }
        })();
      }
      handleDragEnd();
      return;
    }
 
    // Case 2: Internal Page is dragged
    if (draggedPageIndex !== null) {
      const draggedPage = pages[draggedPageIndex];
      const isMultiSelected = selectedPageIds.includes(draggedPage.id);

      if (isMultiSelected) {
        updatePagesAndHistory(prev => {
          const selected = prev.filter(p => selectedPageIds.includes(p.id));
          const remaining = prev.filter(p => !selectedPageIds.includes(p.id));

          const targetPage = prev[targetIdx];
          let targetIndexInRemaining = remaining.indexOf(targetPage);
          if (targetIndexInRemaining === -1) {
            targetIndexInRemaining = remaining.length;
          }

          let actualInsertAt = position === 'left' ? targetIndexInRemaining : targetIndexInRemaining + 1;
          actualInsertAt = Math.max(0, Math.min(remaining.length, actualInsertAt));

          const updated = [...remaining];
          updated.splice(actualInsertAt, 0, ...selected);
          return updated;
        });
        handleDragEnd();
        return;
      }

      if (draggedPageIndex === targetIdx) {
        handleDragEnd();
        return;
      }
 
      updatePagesAndHistory(prev => {
        const itemToMove = prev[draggedPageIndex];
        const updated = [...prev];
        
        updated.splice(draggedPageIndex, 1);
        
        let actualInsertAt = insertAt;
        if (draggedPageIndex < insertAt) {
          actualInsertAt = Math.max(0, insertAt - 1);
        }
        
        updated.splice(actualInsertAt, 0, itemToMove);
        return updated;
      });
      handleDragEnd();
      return;
    }
 
    // Case 3: Internal Collapsed File is dragged
    if (draggedFileId !== null) {
      updatePagesAndHistory(prev => {
        const draggedPages = prev.filter(p => p.fileId === draggedFileId);
        const remainingPages = prev.filter(p => p.fileId !== draggedFileId);
 
        const targetPage = prev[targetIdx];
        let targetIndexInRemaining = remainingPages.indexOf(targetPage);
        
        if (targetIndexInRemaining === -1) {
          targetIndexInRemaining = remainingPages.length;
        }
 
        let actualInsertAt = position === 'left' ? targetIndexInRemaining : targetIndexInRemaining + 1;
        actualInsertAt = Math.max(0, Math.min(remainingPages.length, actualInsertAt));
 
        const updated = [...remainingPages];
        updated.splice(actualInsertAt, 0, ...draggedPages);
        return updated;
      });
      handleDragEnd();
      return;
    }
 
    handleDragEnd();
  };

  return (
    <div className="w-full flex flex-col gap-6" id="combine-organize-master-panel">
      
      {/* Hidden File Inputs for insertion & uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/pdf"
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && insertIndex !== null) {
            onInsertFileAt(e.target.files[0], insertIndex);
            setInsertIndex(null);
          }
        }}
      />

      <input
        type="file"
        ref={mainFileInputRef}
        className="hidden"
        accept="application/pdf"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddFiles(Array.from(e.target.files));
          }
        }}
      />

      {/* Pages Workspace Container */}
      {files.length === 0 ? (
        /* Empty state Drag and Drop */
        <div 
          onClick={() => mainFileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOverQueue(true); }}
          onDragLeave={() => setIsDraggingOverQueue(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOverQueue(false);
            if (e.dataTransfer.files) {
              const filesArray = Array.from(e.dataTransfer.files) as File[];
              const pdfs = filesArray.filter(f => f.type === 'application/pdf');
              if (pdfs.length > 0) onAddFiles(pdfs);
            }
          }}
          className={`rounded-3xl border-2 border-dashed p-16 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-4 min-h-[350px] ${
            isDraggingOverQueue 
              ? 'border-[#e3282b] bg-red-50/20 text-red-600' 
              : 'border-zinc-200 bg-white hover:border-red-400 text-zinc-400 hover:bg-zinc-50/50'
          }`}
        >
          <Upload className="h-12 w-12 text-zinc-300 animate-pulse" />
          <div className="max-w-sm">
            <h4 className="text-sm font-bold text-zinc-800">Drag & drop your PDFs here</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">or click to browse from your device to begin merging and organizing pages</p>
          </div>
        </div>
      ) : (
        /* The main pages board grid */
        <div className="flex flex-col gap-5">
          {/* Files Manager Bar: shows uploaded files, and allows easy toggle for expand/collapse all or individual files */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-[#e3282b]" />
                <h5 className="text-xs font-extrabold text-zinc-800 uppercase tracking-wider">Document Sources ({files.length})</h5>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const updated: Record<string, boolean> = {};
                    files.forEach(f => { updated[f.id] = false; });
                    setExpandedFileIds(updated);
                  }}
                  className="rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Collapse All (Collage)
                </button>
                <button
                  onClick={() => {
                    const updated: Record<string, boolean> = {};
                    files.forEach(f => { updated[f.id] = true; });
                    setExpandedFileIds(updated);
                  }}
                  className="rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-[#e3282b] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Expand All Pages
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 items-center">
              {files.map((f, fIdx) => {
                const labelChar = String.fromCharCode(65 + fIdx);
                const isExpanded = expandedFileIds[f.id] !== false;
                const filePagesCount = pages.filter(p => p.fileId === f.id).length;
                
                return (
                  <div key={f.id} className="flex items-center gap-2.5 bg-zinc-50/60 border border-zinc-200/80 rounded-xl px-3 py-2 shadow-sm text-xs">
                    {/* Badge */}
                    <div className="bg-[#e3282b] text-white font-extrabold text-[10px] h-5.5 w-5.5 rounded-full flex items-center justify-center shadow-sm">
                      {labelChar}
                    </div>
                    {/* Name & Count */}
                    <div className="flex flex-col max-w-[150px] sm:max-w-[220px]">
                      <span className="font-extrabold text-zinc-800 truncate" title={f.name}>{f.name}</span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none mt-0.5">{filePagesCount} {filePagesCount === 1 ? 'page' : 'pages'}</span>
                    </div>
                    {/* Toggle button */}
                    <button
                      onClick={() => toggleExpandFile(f.id)}
                      className={`ml-2 rounded-lg px-2 py-1 text-[10px] font-bold border transition-all cursor-pointer shadow-sm ${
                        isExpanded 
                          ? 'bg-zinc-100 border-zinc-350 text-zinc-600 hover:bg-zinc-200' 
                          : 'bg-red-50 border-red-150 text-[#e3282b] hover:bg-red-100'
                      }`}
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {pages.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 p-12 text-center text-zinc-400 bg-white">
              No pages left in the workspace. Add more files or reload.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Workspace Toolbar: Zoom, Undo/Redo, Rotate Selected, and Keyboard shortcuts helper */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-2xl p-3 shadow-sm select-none">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-extrabold text-zinc-450 uppercase tracking-wider font-sans">Workspace Actions:</span>
                  
                  {/* Undo / Redo Buttons */}
                  <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-xl border border-zinc-200">
                    <button
                      disabled={historyIndex <= 0}
                      onClick={handleUndo}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-600 transition-all cursor-pointer shadow-xs"
                      title="Undo last action (Ctrl+Z)"
                    >
                      <Undo className="h-4 w-4" />
                    </button>
                    <button
                      disabled={historyIndex >= history.length - 1}
                      onClick={handleRedo}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-600 transition-all cursor-pointer shadow-xs"
                      title="Redo action (Ctrl+Y)"
                    >
                      <Redo className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Rotate Selected Actions */}
                  <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-xl border border-zinc-200">
                    <button
                      disabled={selectedPageIds.length === 0}
                      onClick={() => rotateAllSelected('ccw')}
                      className="p-1.5 rounded-lg text-zinc-650 hover:text-zinc-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-600 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                      title="Rotate selected counter-clockwise (-90°)"
                    >
                      <RotateCw className="h-3.5 w-3.5 transform -scale-x-100 text-zinc-500" />
                      <span className="text-[10px] font-black tracking-tight">-90°</span>
                    </button>
                    <button
                      disabled={selectedPageIds.length === 0}
                      onClick={() => rotateAllSelected('cw')}
                      className="p-1.5 rounded-lg text-zinc-650 hover:text-zinc-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-600 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                      title="Rotate selected clockwise (+90°)"
                    >
                      <RotateCw className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-[10px] font-black tracking-tight">+90°</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Zoom Control Slider */}
                  <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600">
                    <ZoomOut className="h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="range"
                      min="110"
                      max="280"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-20 sm:w-28 accent-[#e3282b] cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
                    />
                    <ZoomIn className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{Math.round((zoom / 160) * 100)}%</span>
                  </div>

                  {/* Show Metadata Toggle */}
                  <button
                    onClick={() => setShowMetadata(!showMetadata)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer shadow-sm ${
                      showMetadata 
                        ? 'bg-red-50 text-[#e3282b] border-red-200 hover:bg-red-100/50' 
                        : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                    }`}
                    title="Toggle metadata overlays like page size and file source label"
                  >
                    <Info className="h-4 w-4" />
                    <span>Metadata</span>
                  </button>

                  {/* Keyboard Shortcuts Dialog Trigger Button */}
                  <button
                    onClick={() => setIsShortcutsModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer shadow-sm"
                  >
                    <Keyboard className="h-4 w-4 text-zinc-500" />
                    <span>Shortcuts</span>
                  </button>
                </div>
              </div>

              {/* Keyboard shortcuts helpful tip bar */}
              {selectedPageIds.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-red-50/50 border border-red-100 rounded-2xl px-4 py-3 text-xs text-zinc-700 animate-fadeIn shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="font-extrabold text-white uppercase tracking-wider text-[10px] bg-[#e3282b] px-2 py-0.5 rounded shadow-sm self-start sm:self-auto">
                      {selectedPageIds.length} {selectedPageIds.length === 1 ? 'Page Selected' : 'Pages Selected'}
                    </span>
                    <span>
                      Use <kbd className="bg-white border border-zinc-300 rounded-md px-1.5 py-0.5 font-mono shadow-xs font-bold text-zinc-850">&larr;</kbd> and <kbd className="bg-white border border-zinc-300 rounded-md px-1.5 py-0.5 font-mono shadow-xs font-bold text-zinc-850">&rarr;</kbd> to reorder, <kbd className="bg-white border border-zinc-300 rounded-md px-1.5 py-0.5 font-mono shadow-xs font-bold text-zinc-850">R</kbd> to rotate, or <kbd className="bg-white border border-zinc-300 rounded-md px-1.5 py-0.5 font-mono shadow-xs font-bold text-zinc-850">Delete</kbd> / <kbd className="bg-white border border-zinc-300 rounded-md px-1.5 py-0.5 font-mono shadow-xs font-bold text-zinc-850">Backspace</kbd>.
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedPageIds([])}
                    className="text-[#e3282b] hover:text-red-700 font-extrabold hover:underline transition-all cursor-pointer self-end sm:self-auto text-[11px]"
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              <div 
                ref={containerRef}
                onDragEnter={handleContainerDragEnter}
                onDragOver={handleContainerDragOver}
                onDragLeave={handleContainerDragLeave}
                onDrop={handleContainerDrop}
                onClick={() => setSelectedPageIds([])}
                onMouseDown={handleMouseDown}
                className="rounded-3xl border border-zinc-200 bg-zinc-50/55 p-6 min-h-[400px] relative select-none"
              >
                {/* Marquee Selection Box Overlay */}
                {selectionBox && (
                  <div 
                    className="absolute bg-red-500/10 border-2 border-[#e3282b] rounded-md z-40 pointer-events-none"
                    style={{
                      left: Math.min(selectionBox.startX, selectionBox.endX),
                      top: Math.min(selectionBox.startY, selectionBox.endY),
                      width: Math.abs(selectionBox.startX - selectionBox.endX),
                      height: Math.abs(selectionBox.startY - selectionBox.endY),
                    }}
                  />
                )}
                           {/* Tight, gorgeous flex of thumbnails with continuous smooth zoom scaling */}
                <div 
                  className="flex flex-wrap gap-6 items-start justify-center sm:justify-start"
                >
                
                {pages.map((p, index) => {
                  const thumbKey = `${p.fileId}-${p.pageIndex}`;
                  const hasThumbnail = renderedThumbnails[thumbKey] !== undefined;
                  const thumbUrl = renderedThumbnails[thumbKey];
                  const sourceFile = files.find(f => f.id === p.fileId);
                  const isFileExpanded = expandedFileIds[p.fileId] !== false;
                  const fileIdx = files.findIndex(f => f.id === p.fileId);
                  const labelChar = String.fromCharCode(65 + Math.max(0, fileIdx)); // A, B, C...

                  // If the file containing this page is collapsed, we render its cover card
                  if (!isFileExpanded) {
                    const firstPageIndex = pages.findIndex(x => x.fileId === p.fileId);
                    if (firstPageIndex !== index) {
                      return null;
                    }

                    const collapsedCount = pages.filter(x => x.fileId === p.fileId).length;
                    const groupPageIds = pages.filter(x => x.fileId === p.fileId).map(x => x.id);
                    const isGroupSelected = groupPageIds.some(id => selectedPageIds.includes(id));

                    // First page dimension label as group representative
                    const groupDimLabel = sourceFile?.pagesMeta?.[0]?.dimensionsLabel || 'A4';

                    return (
                      <div 
                        key={`collapsed-group-${p.fileId}`}
                        draggable={true}
                        onDragStart={(e) => handleCollapsedDragStart(e, p.fileId)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.ctrlKey || e.metaKey) {
                            setSelectedPageIds(prev => {
                              const alreadySelected = groupPageIds.every(id => prev.includes(id));
                              if (alreadySelected) {
                                  return prev.filter(id => !groupPageIds.includes(id));
                              } else {
                                  return [...prev, ...groupPageIds.filter(id => !prev.includes(id))];
                              }
                            });
                          } else {
                            setSelectedPageIds(groupPageIds);
                          }
                        }}
                        className={`group relative flex flex-col items-center rounded-2xl border p-3 shadow-sm transition-all duration-300 select-none cursor-pointer ${
                          isGroupSelected
                            ? 'ring-3 ring-[#e3282b]/80 border-[#e3282b] bg-red-50/10 shadow-md scale-[1.02]'
                            : draggedFileId === p.fileId
                              ? 'opacity-40 border-dashed border-[#e3282b] scale-95 bg-white'
                              : 'border-zinc-200 bg-white hover:border-[#e3282b] hover:shadow-md'
                        }`}
                        style={{ width: `${zoom}px` }}
                        id={`collapsed-card-${p.fileId}`}
                      >
                        {/* Selection badge */}
                        {isGroupSelected && (
                          <div className="absolute -top-1.5 -right-1.5 bg-[#e3282b] text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md z-30 ring-2 ring-white">
                            Selected
                          </div>
                        )}

                        {/* Divider visual guides - Dashed Drop Zones */}
                        {isDragActive && (
                          <div 
                            className={`absolute top-0 bottom-0 z-25 pointer-events-none flex items-center justify-center transition-all duration-200 ${
                              dragOverIndex === index && dragOverPosition === 'left'
                                ? '-left-[16px] w-[32px]'
                                : '-left-[14px] w-[4px]'
                            }`}
                          >
                            <div className={`h-[90%] rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center ${
                              dragOverIndex === index && dragOverPosition === 'left'
                                ? 'border-[#e3282b] bg-red-50/80 w-full'
                                : 'border-zinc-300 bg-transparent w-0 border-r-0 border-t-0 border-b-0'
                            }`} />
                            {dragOverIndex === index && dragOverPosition === 'left' && (
                              <div className="absolute bg-[#e3282b] text-white rounded-full p-1.5 border border-white shadow-md flex items-center justify-center pointer-events-none animate-bounce scale-110">
                                <Plus className="h-3 w-3 stroke-[3.5]" />
                              </div>
                            )}
                          </div>
                        )}

                        {isDragActive && index === pages.length - 1 && (
                          <div 
                            className={`absolute top-0 bottom-0 z-25 pointer-events-none flex items-center justify-center transition-all duration-200 ${
                              dragOverIndex === index && dragOverPosition === 'right'
                                ? '-right-[16px] w-[32px]'
                                : '-right-[14px] w-[4px]'
                            }`}
                          >
                            <div className={`h-[90%] rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center ${
                              dragOverIndex === index && dragOverPosition === 'right'
                                ? 'border-[#e3282b] bg-red-50/80 w-full'
                                : 'border-zinc-300 bg-transparent w-0 border-r-0 border-t-0 border-b-0'
                            }`} />
                            {dragOverIndex === index && dragOverPosition === 'right' && (
                              <div className="absolute bg-[#e3282b] text-white rounded-full p-1.5 border border-white shadow-md flex items-center justify-center pointer-events-none animate-bounce scale-110">
                                <Plus className="h-3 w-3 stroke-[3.5]" />
                              </div>
                            )}
                          </div>
                        )}

                        {isDragActive && (
                          <>
                            {/* Left half drop zone */}
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggedFileId === p.fileId) return;
                                setDragOverIndex(index);
                                setDragOverPosition('left');
                              }}
                              onDragLeave={() => {
                                setDragOverIndex(null);
                                setDragOverPosition(null);
                              }}
                              onDrop={(e) => handleCardDrop(e, index, 'left')}
                              className="absolute left-0 top-0 bottom-0 w-1/2 z-30 cursor-copy"
                            />
                            {/* Right half drop zone */}
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggedFileId === p.fileId) return;
                                setDragOverIndex(index);
                                setDragOverPosition('right');
                              }}
                              onDragLeave={() => {
                                setDragOverIndex(null);
                                setDragOverPosition(null);
                              }}
                              onDrop={(e) => handleCardDrop(e, index, 'right')}
                              className="absolute right-0 top-0 bottom-0 w-1/2 z-30 cursor-copy"
                            />
                          </>
                        )}
                        <div className="relative aspect-[3/4] w-full mt-2 mb-1 select-none pointer-events-none">
                          {/* Decorative Card Layer 1 (Bottom stacked page) */}
                          <div className="absolute inset-0 bg-zinc-200 border border-zinc-200/60 rounded-xl shadow-[2px_6px_12px_rgba(0,0,0,0.08)] transform translate-y-2.5 -rotate-3 scale-[0.93] origin-bottom transition-all duration-300 group-hover:rotate-[-5deg] group-hover:translate-y-3" />
                          
                          {/* Decorative Card Layer 2 (Middle stacked page) */}
                          <div className="absolute inset-0 bg-zinc-100 border border-zinc-200 rounded-xl shadow-[1px_4px_8px_rgba(0,0,0,0.06)] transform translate-y-1.5 rotate-3 scale-[0.96] origin-bottom transition-all duration-300 group-hover:rotate-[4deg] group-hover:translate-y-2" />

                          {/* Main Cover Card (Top page) */}
                          <div className="absolute inset-0 bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm flex flex-col items-center justify-center transition-all duration-300 group-hover:shadow-md">
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-zinc-950/20 to-transparent z-10" />
                            {hasThumbnail ? (
                              <img src={thumbUrl} alt="" className="max-h-full max-w-full object-contain filter contrast-125 select-none pointer-events-none transition-transform duration-300 group-hover:scale-105" draggable={false} referrerPolicy="no-referrer" />
                            ) : (
                              <FileText className="h-12 w-12 text-zinc-300 select-none pointer-events-none" />
                            )}
                            
                            {/* File Letter badge */}
                            <div className="absolute top-3 left-3 bg-[#e3282b] text-white font-extrabold text-xs h-6 w-6 rounded-full flex items-center justify-center shadow-md select-none z-20">
                              {labelChar}
                            </div>

                            {/* Center page count indicator */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-white p-3 text-center">
                              <div className="flex items-center gap-1.5 justify-center">
                                <Layers className="h-5 w-5 text-zinc-200 drop-shadow-md animate-pulse" />
                                <span className="text-3xl font-black drop-shadow-md">{collapsedCount}</span>
                              </div>
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-200 drop-shadow-sm mt-1">Pages stacked</span>
                            </div>

                            {/* Show Metadata overlays inside thumbnail */}
                            {showMetadata && (
                              <div className="absolute bottom-2 inset-x-2 z-20 flex flex-col gap-0.5 bg-zinc-950/80 backdrop-blur-xs rounded-lg p-1 text-[8px] font-bold text-white leading-tight">
                                <span className="text-zinc-350 truncate">📁 {sourceFile?.name || 'Unknown source'}</span>
                                <span className="text-white">📄 {groupDimLabel}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cover Label Footer */}
                        <div className="mt-3 w-full text-center">
                          <h6 className="text-xs font-extrabold text-zinc-800 line-clamp-1 px-1" title={sourceFile?.name}>{sourceFile?.name}</h6>
                          <button
                            onClick={() => toggleExpandFile(p.fileId)}
                            className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl bg-red-50 hover:bg-red-100/80 text-[#e3282b] px-3 py-2 text-xs font-bold transition-all cursor-pointer border border-red-100 shadow-sm"
                          >
                            <span>Expand pages</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Metadata properties for this individual page
                  const pageMeta = sourceFile?.pagesMeta?.find(pm => pm.pageIndex === p.pageIndex);
                  const dimensionsLabel = pageMeta?.dimensionsLabel || 'US Letter';

                  return (
                    <div
                      key={p.id}
                      draggable={true}
                      onDragStart={(e) => handlePageDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => handlePageClick(e, p.id)}
                      className={`group relative flex flex-col items-center rounded-2xl border p-2.5 transition-all duration-200 select-none cursor-pointer ${
                        selectedPageIds.includes(p.id) 
                          ? 'ring-3 ring-[#e3282b]/80 border-[#e3282b] bg-red-50/10 shadow-md scale-[1.02]' 
                          : draggedPageIndex === index
                            ? 'opacity-40 border-dashed border-[#e3282b] scale-95 bg-white'
                            : 'border-zinc-200 bg-white hover:border-[#e3282b] hover:shadow-md'
                      }`}
                      style={{ width: `${zoom}px` }}
                      id={`page-card-${p.id}`}
                    >
                      {/* Selection badge */}
                      {selectedPageIds.includes(p.id) && (
                        <div className="absolute -top-1.5 -right-1.5 bg-[#e3282b] text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md z-30 ring-2 ring-white">
                          Selected
                        </div>
                      )}

                      {/* Divider visual guides - Dashed Drop Zones */}
                      {isDragActive && (
                        <div 
                          className={`absolute top-0 bottom-0 z-25 pointer-events-none flex items-center justify-center transition-all duration-200 ${
                            dragOverIndex === index && dragOverPosition === 'left'
                              ? '-left-[16px] w-[32px]'
                              : '-left-[14px] w-[4px]'
                          }`}
                        >
                          <div className={`h-[90%] rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center ${
                            dragOverIndex === index && dragOverPosition === 'left'
                              ? 'border-[#e3282b] bg-red-50/80 w-full'
                              : 'border-zinc-300 bg-transparent w-0 border-r-0 border-t-0 border-b-0'
                          }`} />
                          {dragOverIndex === index && dragOverPosition === 'left' && (
                            <div className="absolute bg-[#e3282b] text-white rounded-full p-1.5 border border-white shadow-md flex items-center justify-center pointer-events-none animate-bounce scale-110">
                              <Plus className="h-3 w-3 stroke-[3.5]" />
                            </div>
                          )}
                        </div>
                      )}

                      {isDragActive && index === pages.length - 1 && (
                        <div 
                          className={`absolute top-0 bottom-0 z-25 pointer-events-none flex items-center justify-center transition-all duration-200 ${
                            dragOverIndex === index && dragOverPosition === 'right'
                              ? '-right-[16px] w-[32px]'
                              : '-right-[14px] w-[4px]'
                          }`}
                        >
                          <div className={`h-[90%] rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center ${
                            dragOverIndex === index && dragOverPosition === 'right'
                              ? 'border-[#e3282b] bg-red-50/80 w-full'
                              : 'border-zinc-300 bg-transparent w-0 border-r-0 border-t-0 border-b-0'
                          }`} />
                          {dragOverIndex === index && dragOverPosition === 'right' && (
                            <div className="absolute bg-[#e3282b] text-white rounded-full p-1.5 border border-white shadow-md flex items-center justify-center pointer-events-none animate-bounce scale-110">
                              <Plus className="h-3 w-3 stroke-[3.5]" />
                            </div>
                          )}
                        </div>
                      )}

                      {isDragActive && (
                        <>
                          {/* Left half drop zone */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (draggedPageIndex === index) return;
                              setDragOverIndex(index);
                              setDragOverPosition('left');
                            }}
                            onDragLeave={() => {
                              setDragOverIndex(null);
                              setDragOverPosition(null);
                            }}
                            onDrop={(e) => handleCardDrop(e, index, 'left')}
                            className="absolute left-0 top-0 bottom-0 w-1/2 z-30 cursor-copy"
                          />
                          {/* Right half drop zone */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (draggedPageIndex === index) return;
                              setDragOverIndex(index);
                              setDragOverPosition('right');
                            }}
                            onDragLeave={() => {
                              setDragOverIndex(null);
                              setDragOverPosition(null);
                            }}
                            onDrop={(e) => handleCardDrop(e, index, 'right')}
                            className="absolute right-0 top-0 bottom-0 w-1/2 z-30 cursor-copy"
                          />
                        </>
                      )}
                      {/* Hover Overlay Controls */}
                      <div className="absolute top-3.5 left-3.5 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={() => rotatePage(index)}
                          className="rounded-full bg-zinc-900 text-white hover:bg-red-600 p-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border border-zinc-700/50"
                          title="Rotate 90°"
                          id={`hover-btn-rotate-${p.id}`}
                        >
                          <RotateCw className="h-3 w-3 stroke-[2.5]" />
                        </button>
                        <button
                          onClick={() => triggerInsertFile(index + 1)}
                          className="rounded-full bg-zinc-900 text-white hover:bg-red-600 p-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border border-zinc-700/50"
                          title="Insert PDF after this page"
                        >
                          <Plus className="h-3 w-3 stroke-[2.5]" />
                        </button>
                      </div>

                      <div className="absolute top-3.5 right-3.5 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={() => deletePage(index)}
                          className="rounded-full bg-zinc-900 text-white hover:bg-red-600 p-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border border-zinc-700/50"
                          title="Delete Page"
                          id={`hover-btn-delete-${p.id}`}
                        >
                          <Trash2 className="h-3 w-3 stroke-[2.5]" />
                        </button>
                      </div>

                      {/* Quick controls for keyboard order shifts */}
                      <div className="absolute bottom-11 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1">
                        <button
                          disabled={index === 0}
                          onClick={() => moveLeft(index)}
                          className="rounded bg-zinc-900 text-white hover:bg-red-600 px-1.5 py-0.5 text-[9px] font-bold cursor-pointer disabled:opacity-20"
                          title="Move Left"
                        >
                          &larr;
                        </button>
                        <button
                          disabled={index === pages.length - 1}
                          onClick={() => moveRight(index)}
                          className="rounded bg-zinc-900 text-white hover:bg-red-600 px-1.5 py-0.5 text-[9px] font-bold cursor-pointer disabled:opacity-20"
                          title="Move Right"
                        >
                          &rarr;
                        </button>
                      </div>

                      {/* Collapse File back button */}
                      <button
                        onClick={() => toggleExpandFile(p.fileId)}
                        className="absolute bottom-11 left-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded bg-zinc-900 text-white hover:bg-red-600 px-1.5 py-0.5 text-[8px] font-bold cursor-pointer border border-zinc-700/50"
                        title="Collapse back to cover card"
                      >
                        Collapse
                      </button>

                      {/* Visual Thumbnail */}
                      <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-50 border border-zinc-100 shadow-inner select-none pointer-events-none">
                        {hasThumbnail ? (
                          <img
                            src={thumbUrl}
                            alt={`Page ${p.pageIndex + 1}`}
                            referrerPolicy="no-referrer"
                            className="max-h-full max-w-full object-contain transition-transform duration-200 select-none pointer-events-none"
                            style={{ transform: `rotate(${p.angle}deg)` }}
                            draggable={false}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-zinc-400 select-none pointer-events-none">
                            <Loader className="h-4 w-4 animate-spin text-red-500" />
                            <span className="text-[9px] font-medium">Rendering...</span>
                          </div>
                        )}

                        {/* Cover badge showing source file letter prefix */}
                        <div className="absolute top-2.5 left-2.5 bg-[#e3282b] text-white font-black text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center shadow">
                          {labelChar}
                        </div>

                        {/* Show Metadata overlays inside thumbnail */}
                        {showMetadata && (
                          <div className="absolute bottom-2 inset-x-2 z-20 flex flex-col gap-0.5 bg-zinc-950/80 backdrop-blur-xs rounded-lg p-1.5 text-[8px] font-bold text-white select-none pointer-events-none leading-normal">
                            <span className="text-zinc-350 truncate" title={sourceFile?.name}>📁 {sourceFile?.name || 'Unknown source'}</span>
                            <span className="text-white">📄 {dimensionsLabel}</span>
                          </div>
                        )}
                      </div>

                      {/* Page label index under card */}
                      <div className="mt-3 flex flex-col items-center gap-0.5 select-none">
                        <span className="text-sm font-extrabold text-zinc-800 leading-none">
                          {index + 1}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                          page
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Final "Add files" grid item inside grid */}
                <div 
                  onClick={() => mainFileInputRef.current?.click()}
                  className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white hover:border-[#e3282b] hover:bg-red-50/5 p-4.5 aspect-[3/4] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-zinc-400 hover:text-red-600 text-center animate-pulse"
                  style={{ width: `${zoom}px` }}
                  title="Click to add more PDF files"
                >
                  <Plus className="h-10 w-10 text-zinc-300 group-hover:text-[#e3282b] group-hover:scale-110 transition-all duration-300 mb-2" />
                  <span className="text-xs font-bold">Add files</span>
                  <span className="text-[9px] text-zinc-400 mt-1 leading-tight">to append pages</span>
                </div>

              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Subtle Keyboard Shortcuts Modal */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 transition-all duration-300" onClick={() => setIsShortcutsModalOpen(false)}>
          <div 
            className="bg-white rounded-3xl border border-zinc-200 p-6 max-w-md w-full mx-4 shadow-2xl relative transition-all duration-300 transform scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-[#e3282b]" />
                <h4 className="text-sm font-extrabold text-zinc-800 uppercase tracking-wider">Keyboard Shortcuts</h4>
              </div>
              <button 
                onClick={() => setIsShortcutsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 font-semibold p-1 rounded-lg hover:bg-zinc-50 cursor-pointer text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Streamline your page organization with these quick workspace hotkeys. Click to select page thumbnails or collage card covers.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-50 text-xs">
                <span className="text-zinc-600 font-semibold">Select item</span>
                <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">Left Click</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-50 text-xs">
                <span className="text-zinc-600 font-semibold">Add range to selection</span>
                <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">Shift + Click</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-50 text-xs">
                <span className="text-zinc-600 font-semibold">Toggle single selection</span>
                <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">Ctrl / Cmd + Click</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-50 text-xs">
                <span className="text-zinc-600 font-semibold">Draw selection box</span>
                <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">Click & Drag background</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-50 text-xs">
                <span className="text-zinc-600 font-semibold">Move selected left / right</span>
                <div className="flex gap-1">
                  <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">&larr;</kbd>
                  <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">&rarr;</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-50 text-xs">
                <span className="text-zinc-600 font-semibold">Rotate selected pages 90&deg;</span>
                <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">R</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-50 text-xs">
                <span className="text-zinc-600 font-semibold">Delete selected pages</span>
                <div className="flex gap-1">
                  <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">Backspace</kbd>
                  <span className="text-zinc-400">/</span>
                  <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">Delete</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-50 text-xs">
                <span className="text-zinc-600 font-semibold">Undo last action</span>
                <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">Ctrl / Cmd + Z</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-50 text-xs">
                <span className="text-zinc-600 font-semibold">Redo last action</span>
                <kbd className="bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-zinc-700">Ctrl / Cmd + Y</kbd>
              </div>
            </div>

            <button 
              onClick={() => setIsShortcutsModalOpen(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-zinc-900 text-white font-extrabold text-xs hover:bg-zinc-850 transition-all cursor-pointer shadow-sm text-center"
            >
              Close Help Dialog
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
