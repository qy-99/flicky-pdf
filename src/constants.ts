import { PDFTool, ToolId } from './types';

export const TOOLS: PDFTool[] = [
  // Organize
  {
    id: ToolId.ORGANIZE,
    name: 'Merge & Organize PDF',
    shortDesc: 'Combine multiple PDFs, reorder, rotate, or delete pages.',
    description: 'Visual grid workspace to merge multiple PDF files together, drag and drop pages or whole documents to reorder, delete unnecessary sheets, duplicate, or rotate pages.',
    category: 'organize',
    iconName: 'LayoutGrid'
  },
  {
    id: ToolId.SPLIT,
    name: 'Split PDF',
    shortDesc: 'Extract pages or ranges into separate PDFs.',
    description: 'Extract specific pages or page ranges (e.g., 1-5, 8) from your PDF into separate standalone documents.',
    category: 'organize',
    iconName: 'Scissors'
  },
  {
    id: ToolId.ROTATE,
    name: 'Rotate PDF',
    shortDesc: 'Rotate all pages in 90-degree increments.',
    description: 'Rotate entire documents or individual pages in portrait or landscape orientations easily.',
    category: 'organize',
    iconName: 'RotateCw'
  },
  {
    id: ToolId.REMOVE_PAGES,
    name: 'Remove Pages',
    shortDesc: 'Delete unwanted pages from a PDF document.',
    description: 'Select pages directly from a visual thumbnail grid and remove them to download a cleaned PDF.',
    category: 'organize',
    iconName: 'Trash2'
  },
  {
    id: ToolId.EXTRACT_PAGES,
    name: 'Extract Pages',
    shortDesc: 'Extract selected pages into a new PDF.',
    description: 'Pull selected pages out of your PDF document and download them as a brand new, lightweight PDF.',
    category: 'organize',
    iconName: 'Download'
  },

  // Edit
  {
    id: ToolId.EDIT,
    name: 'Edit PDF',
    shortDesc: 'Add text, shapes, and annotations.',
    description: 'Draw freehand, add text annotations, or insert custom shapes (rectangles, lines, circles) directly onto your PDF pages.',
    category: 'edit',
    iconName: 'FileEdit'
  },
  {
    id: ToolId.WATERMARK,
    name: 'Add Watermark',
    shortDesc: 'Stamp customized text or images onto pages.',
    description: 'Protect your work by adding text or image watermarks. Customize position, opacity, font size, color, and rotation.',
    category: 'edit',
    iconName: 'Stamp'
  },
  {
    id: ToolId.PAGE_NUMBERS,
    name: 'Add Page Numbers',
    shortDesc: 'Number pages with custom formats and alignments.',
    description: 'Add page numbers automatically. Customize position, start number, format, size, and font colors.',
    category: 'edit',
    iconName: 'Binary'
  },
  {
    id: ToolId.CROP,
    name: 'Crop PDF',
    shortDesc: 'Trim page margins and adjust layout area.',
    description: 'Crop margins or define a custom crop area. Apply to specific pages or the entire document.',
    category: 'edit',
    iconName: 'Crop'
  },
  {
    id: ToolId.REDACT,
    name: 'Redact PDF',
    shortDesc: 'Permanently blackout and flatten sensitive text.',
    description: 'Draw redaction boxes over private data. Flicky will rasterize and flatten the page to ensure text is permanently destroyed.',
    category: 'edit',
    iconName: 'EyeOff',
    badge: '100% Secure'
  },

  // Convert
  {
    id: ToolId.PDF_TO_IMG,
    name: 'PDF to Image',
    shortDesc: 'Render PDF pages into high-res JPG/PNG.',
    description: 'Render each page of a PDF as a high-quality image and download them as a ZIP package or direct image files.',
    category: 'convert',
    iconName: 'Image'
  },
  {
    id: ToolId.IMG_TO_PDF,
    name: 'Image to PDF',
    shortDesc: 'Convert JPG, PNG to PDF document.',
    description: 'Embed standard images (JPG, PNG, WebP) into a clean, uniform PDF. Set orientation, margins, and paper sizes.',
    category: 'convert',
    iconName: 'FileSymlink'
  },

  // Security
  {
    id: ToolId.PASSWORD_PROTECT,
    name: 'Password Protect',
    shortDesc: 'Encrypt your PDF with standard user passwords.',
    description: 'Secure your confidential files with strong password encryption completely offline inside the browser.',
    category: 'security',
    iconName: 'Lock'
  },
  {
    id: ToolId.UNLOCK,
    name: 'Unlock PDF',
    shortDesc: 'Remove encryption and open password protected PDFs.',
    description: 'Decrypt and strip user password protection permanently (requires entering the current password).',
    category: 'security',
    iconName: 'Unlock'
  },
  {
    id: ToolId.SIGN,
    name: 'Sign PDF',
    shortDesc: 'Visually draw or upload signature stamps.',
    description: 'Create handwritten signatures, upload signature scans, or type your name, then position and resize them on pages.',
    category: 'security',
    iconName: 'PenTool'
  },

  // View & Scan
  {
    id: ToolId.OCR,
    name: 'OCR PDF',
    shortDesc: 'Convert scans to searchable selectable text.',
    description: 'Run tesseract.js locally inside the browser to extract text from images and scanned PDF pages with absolute privacy.',
    category: 'view_scan',
    iconName: 'Eye',
    badge: 'Offline OCR'
  },
  {
    id: ToolId.COMPARE,
    name: 'Compare PDFs',
    shortDesc: 'Compare text differences between two PDFs.',
    description: 'Extract and analyze text layers from two PDF documents to show line-by-line, side-by-side textual modifications.',
    category: 'view_scan',
    iconName: 'Columns'
  },
  {
    id: ToolId.FILL_FORMS,
    name: 'Fill PDF Forms',
    shortDesc: 'Fill out interactive AcroForm fields.',
    description: 'Read, fill, and download standardized interactive PDF form fields like checkmarks, textfields, and select options.',
    category: 'view_scan',
    iconName: 'CheckSquare'
  },
  {
    id: ToolId.REPAIR,
    name: 'Repair PDF',
    shortDesc: 'Fix minor syntax errors and corrupted files.',
    description: 'Do a best-effort structural repair by rebuilding cross-reference indexes and catalog trees on damaged PDF headers.',
    category: 'view_scan',
    iconName: 'Wrench'
  },
  {
    id: ToolId.READER,
    name: 'Interactive Reader',
    shortDesc: 'Read, zoom, search, and present PDFs.',
    description: 'A premium, high-fidelity browser PDF viewer. Search text layers, navigate with page thumbnails, apply zoom & fit controls, rotate views, and trigger native prints with 100% local privacy.',
    category: 'view_scan',
    iconName: 'BookOpen',
    badge: 'Desktop Premium'
  },

  // Compress
  {
    id: ToolId.COMPRESS,
    name: 'Compress PDF',
    shortDesc: 'Downsample page resolutions for smaller sizes.',
    description: 'Optimize image streams and downscale page assets using Canvas compression. Drastically reduces sizes of scanned files.',
    category: 'compress',
    iconName: 'FileDown',
    badge: 'Offline'
  }
];
