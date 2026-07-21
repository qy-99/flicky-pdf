export enum ToolId {
  MERGE = 'merge',
  SPLIT = 'split',
  ORGANIZE = 'organize',
  ROTATE = 'rotate',
  REMOVE_PAGES = 'remove_pages',
  EXTRACT_PAGES = 'extract_pages',
  EDIT = 'edit',
  WATERMARK = 'watermark',
  PAGE_NUMBERS = 'page_numbers',
  CROP = 'crop',
  REDACT = 'redact',
  PDF_TO_IMG = 'pdf_to_img',
  IMG_TO_PDF = 'img_to_pdf',
  COMPRESS = 'compress',
  SIGN = 'sign',
  PASSWORD_PROTECT = 'password_protect',
  UNLOCK = 'unlock',
  OCR = 'ocr',
  COMPARE = 'compare',
  FILL_FORMS = 'fill_forms',
  REPAIR = 'repair',
  READER = 'reader'
}

export type ToolCategory = 'organize' | 'edit' | 'convert' | 'security' | 'view_scan' | 'compress';

export interface PDFTool {
  id: ToolId;
  name: string;
  shortDesc: string;
  description: string;
  category: ToolCategory;
  iconName: string; // Lucide icon name to render dynamically
  badge?: string;
}

export interface WorkingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  numPages: number;
  thumbnails: string[]; // data URLs
  isLoadingThumbnails: boolean;
  pagesMeta?: Array<{
    pageIndex: number;
    angle: number; // 0, 90, 180, 270
    isDeleted?: boolean;
    id: string; // for drag & drop keys
    width?: number;
    height?: number;
    dimensionsLabel?: string;
  }>;
}

// Service worker state
export interface OfflineState {
  isSupported: boolean;
  isRegistered: boolean;
  isCached: boolean;
  checking: boolean;
}
