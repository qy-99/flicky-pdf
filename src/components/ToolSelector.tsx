import React, { useState } from 'react';
import { 
  Merge, Scissors, LayoutGrid, RotateCw, Trash2, Download,
  FileEdit, Stamp, Binary, Crop, EyeOff, Image as ImageIcon, FileSymlink,
  Lock, Unlock, PenTool, Eye, Columns, CheckSquare, Wrench, FileDown,
  Search, ArrowRight, BookOpen, Pin
} from 'lucide-react';
import { PDFTool, ToolCategory, ToolId } from '../types';
import { TOOLS } from '../constants';

// Explicit mapping of string name to lucide components
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Merge,
  Scissors,
  LayoutGrid,
  RotateCw,
  Trash2,
  Download,
  FileEdit,
  Stamp,
  Binary,
  Crop,
  EyeOff,
  Image: ImageIcon,
  FileSymlink,
  Lock,
  Unlock,
  PenTool,
  Eye,
  Columns,
  CheckSquare,
  Wrench,
  FileDown,
  BookOpen
};

interface ToolSelectorProps {
  onSelectTool: (tool: PDFTool) => void;
}

export function ToolSelector({ onSelectTool }: ToolSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [pinnedToolIds, setPinnedToolIds] = useState<ToolId[]>(() => {
    try {
      const saved = localStorage.getItem('flicky_pinned_tools');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const togglePin = (e: React.MouseEvent, toolId: ToolId) => {
    e.stopPropagation();
    setPinnedToolIds((prev) => {
      const updated = prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId];
      try {
        localStorage.setItem('flicky_pinned_tools', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const categories: Array<{ id: ToolCategory | 'all'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'organize', label: 'Organize PDF' },
    { id: 'compress', label: 'Optimize PDF' },
    { id: 'convert', label: 'Convert PDF' },
    { id: 'edit', label: 'Edit PDF' },
    { id: 'security', label: 'PDF Security' },
    { id: 'view_scan', label: 'PDF Intelligence' }
  ];

  // Helper to assign a specific, high-contrast, premium color scheme to each tool icon
  const getIconColorClass = (id: ToolId) => {
    switch (id) {
      case ToolId.MERGE:
        return 'bg-red-50 text-red-500 border border-red-100';
      case ToolId.SPLIT:
        return 'bg-orange-50 text-orange-500 border border-orange-100';
      case ToolId.ORGANIZE:
        return 'bg-amber-50 text-amber-500 border border-amber-100';
      case ToolId.ROTATE:
        return 'bg-purple-50 text-purple-600 border border-purple-100';
      case ToolId.REMOVE_PAGES:
        return 'bg-rose-50 text-rose-500 border border-rose-100';
      case ToolId.EXTRACT_PAGES:
        return 'bg-blue-50 text-blue-500 border border-blue-100';
      case ToolId.EDIT:
        return 'bg-teal-50 text-teal-600 border border-teal-100';
      case ToolId.WATERMARK:
        return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      case ToolId.PAGE_NUMBERS:
        return 'bg-pink-50 text-pink-600 border border-pink-100';
      case ToolId.CROP:
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case ToolId.REDACT:
        return 'bg-red-50 text-red-600 border border-red-200';
      case ToolId.PDF_TO_IMG:
        return 'bg-sky-50 text-sky-600 border border-sky-100';
      case ToolId.IMG_TO_PDF:
        return 'bg-orange-50 text-orange-600 border border-orange-200';
      case ToolId.PASSWORD_PROTECT:
        return 'bg-rose-50 text-rose-600 border border-rose-200';
      case ToolId.UNLOCK:
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case ToolId.SIGN:
        return 'bg-cyan-50 text-cyan-600 border border-cyan-100';
      case ToolId.OCR:
        return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
      case ToolId.FILL_FORMS:
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case ToolId.REPAIR:
        return 'bg-amber-50 text-amber-600 border border-amber-200';
      case ToolId.READER:
        return 'bg-violet-50 text-violet-600 border border-violet-100';
      case ToolId.COMPRESS:
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      default:
        return 'bg-zinc-50 text-zinc-600 border border-zinc-100';
    }
  };

  // Filter tools based on category and search query
  const filteredTools = TOOLS.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" id="tool-selector-container">
      {/* Hero Welcome banner */}
      <div className="mb-14 text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl md:text-5.5xl leading-tight">
          Every tool you need to work with PDFs in one place
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-sm sm:text-base text-zinc-500 leading-relaxed font-medium">
          Every tool you need to use PDFs, at your fingertips. All are 100% FREE and easy to use! Merge,
          split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.
        </p>

        {/* Global Search bar */}
        <div className="mx-auto mt-8 max-w-lg">
          <div className="relative rounded-full shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4.5">
              <Search className="h-4.5 w-4.5 text-zinc-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              name="search"
              id="search-tools"
              className="block w-full rounded-full border border-zinc-200 bg-white py-3 pl-11 pr-4 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Search tools (e.g. merge, compress, sign)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-5 text-xs font-semibold text-zinc-400 hover:text-zinc-600"
                id="btn-clear-search"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ⭐ Pinned & Favorite Tools Section */}
      {pinnedToolIds.length > 0 && (
        <div className="mb-12 rounded-3xl border border-zinc-250/60 bg-zinc-50/50 p-6.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.01)]" id="pinned-tools-section">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-zinc-800 uppercase tracking-wider">
              <Pin className="h-4 w-4 text-orange-500 fill-current rotate-45 animate-pulse" />
              <span>Favorites & Quick Access</span>
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold">Unpin tools to remove them from your dashboard header</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {TOOLS.filter(t => pinnedToolIds.includes(t.id)).map((tool) => {
              const IconComponent = ICON_MAP[tool.iconName] || Merge;
              return (
                <div
                  key={`pinned-${tool.id}`}
                  onClick={() => onSelectTool(tool)}
                  className="group relative flex flex-col items-start rounded-2xl border border-zinc-150/80 bg-white p-6.5 text-left shadow-[0_4px_15px_-3px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-400 hover:shadow-md cursor-pointer"
                  id={`pinned-card-${tool.id}`}
                >
                  {/* Pin/Favorite Toggle Button */}
                  <button
                    onClick={(e) => togglePin(e, tool.id)}
                    className="absolute top-4 right-4 z-10 rounded-full p-1.5 transition-all hover:bg-zinc-50 text-orange-500 hover:text-orange-600 cursor-pointer"
                    title="Unpin from top"
                  >
                    <Pin className="h-3.5 w-3.5 fill-current rotate-45" />
                  </button>

                  {/* Icon Wrapper */}
                  <div className={`rounded-xl p-3 mb-4.5 transition-transform duration-300 group-hover:scale-105 ${getIconColorClass(tool.id)}`}>
                    <IconComponent className="h-5.5 w-5.5 stroke-[2]" />
                  </div>

                  {/* Title and descriptions */}
                  <h3 className="text-sm font-bold text-zinc-800 group-hover:text-orange-600 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2 leading-relaxed flex-grow font-normal">
                    {tool.shortDesc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Tabs (Pill Navigation matching screenshot 2) */}
      <div className="mb-10 flex flex-wrap justify-center gap-2" id="category-tabs-container">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-sm font-extrabold'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
              id={`tab-category-${cat.id}`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Tools Grid layout */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" id="tools-grid">
          {filteredTools.map((tool) => {
            const IconComponent = ICON_MAP[tool.iconName] || Merge;
            const isPinned = pinnedToolIds.includes(tool.id);
            return (
              <div
                key={tool.id}
                onClick={() => onSelectTool(tool)}
                className="group relative flex flex-col items-start rounded-2xl border border-zinc-150 bg-white p-6.5 text-left shadow-[0_4px_15px_-3px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-400 hover:shadow-md cursor-pointer"
                id={`card-tool-${tool.id}`}
              >
                {/* Pin/Favorite Toggle Button */}
                <button
                  onClick={(e) => togglePin(e, tool.id)}
                  className={`absolute top-4 right-4 z-10 rounded-full p-1.5 transition-all hover:bg-zinc-50 cursor-pointer ${
                    isPinned ? 'text-orange-500' : 'text-zinc-300 hover:text-zinc-400'
                  }`}
                  id={`btn-pin-${tool.id}`}
                  title={isPinned ? "Unpin from top" : "Pin to top"}
                >
                  <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current rotate-45' : ''}`} />
                </button>

                {/* Badge if exists */}
                {tool.badge && (
                  <span className="absolute top-4 right-10 inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[8px] font-bold text-orange-600 uppercase tracking-wide">
                    {tool.badge}
                  </span>
                )}

                {/* Icon Wrapper */}
                <div className={`rounded-xl p-3 mb-4.5 transition-transform duration-300 group-hover:scale-110 ${getIconColorClass(tool.id)}`}>
                  <IconComponent className="h-5.5 w-5.5 stroke-[2]" />
                </div>

                {/* Title and descriptions */}
                <h3 className="text-sm font-bold text-zinc-800 group-hover:text-orange-600 transition-colors">
                  {tool.name}
                </h3>
                <p className="mt-1.5 text-xs text-zinc-500 line-clamp-3 leading-relaxed flex-grow font-normal">
                  {tool.shortDesc}
                </p>

                {/* Link footer */}
                <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-all duration-150 uppercase tracking-wider">
                  <span>Open Tool</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center" id="tools-empty-state">
          <p className="text-sm font-medium text-slate-500">No tools found matching your criteria.</p>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="mt-4 text-xs font-bold text-slate-900 hover:text-orange-600 underline cursor-pointer"
            id="btn-reset-filters"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
