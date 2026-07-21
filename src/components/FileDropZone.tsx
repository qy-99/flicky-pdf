import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileUp, Loader, Shield, Lock, Zap, FileText, Image } from 'lucide-react';

interface FileDropZoneProps {
  onFileSelected: (files: FileList | File[]) => void;
  isImgTool: boolean;
  isMultiFile: boolean;
  loadingFile: boolean;
  error?: string | null;
}

export function FileDropZone({
  onFileSelected,
  isImgTool,
  isMultiFile,
  loadingFile,
  error
}: FileDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className="w-full max-w-3xl mx-auto" 
      id="file-dropzone-outer"
    >
      <input
        ref={fileInputRef}
        type="file"
        id="file-picker"
        multiple={isMultiFile || isImgTool}
        accept={isImgTool ? "image/*" : "application/pdf"}
        className="hidden"
        onChange={handleFileInputChange}
      />

      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden
          ${isDragActive 
            ? 'border-orange-400 bg-orange-50/40 shadow-lg shadow-orange-100' 
            : 'border-orange-200/80 bg-gradient-to-br from-orange-50/20 via-amber-50/10 to-transparent hover:border-orange-300 hover:bg-orange-50/30 hover:shadow-md'
          }
        `}
        id="file-dropzone-interactive"
      >
        {/* Soft Background Radial Glow for Pastel Vibe */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-orange-200/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-amber-200/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Animated Icon Container */}
          <motion.div 
            animate={isDragActive ? { y: -10 } : { y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`rounded-2xl p-5 mb-5 border transition-all duration-300
              ${isDragActive
                ? 'bg-orange-500 text-white border-orange-400 shadow-md scale-110'
                : 'bg-orange-50 text-orange-600 border-orange-100 group-hover:scale-105'
              }
            `}
          >
            {loadingFile ? (
              <Loader className="h-8 w-8 animate-spin" />
            ) : isDragActive ? (
              <FileUp className="h-8 w-8" />
            ) : isImgTool ? (
              <Image className="h-8 w-8 stroke-[1.5]" />
            ) : (
              <Upload className="h-8 w-8 stroke-[1.5]" />
            )}
          </motion.div>

          {/* Heading */}
          <h3 className="font-display text-xl font-bold text-slate-800 tracking-tight">
            {loadingFile 
              ? 'Analyzing file structure...' 
              : isDragActive 
                ? 'Drop to upload!' 
                : `Upload your ${isImgTool ? 'Images' : 'PDF Document'}`
            }
          </h3>

          {/* Prompt */}
          <p className="mt-2.5 max-w-sm text-xs text-slate-500 leading-relaxed">
            {isDragActive 
              ? 'Release your files here to start processing immediately.' 
              : <>Drag and drop here, or <span className="text-orange-600 font-bold underline decoration-orange-200 decoration-2 hover:text-orange-700">browse local files</span></>
            }
          </p>

          <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
            {isMultiFile 
              ? 'Supports selecting multiple files at once' 
              : 'Files are processed strictly locally'
            }
          </div>

          {/* Decorative floating page outlines shown on active drag or hover */}
          <div className="mt-8 flex items-center justify-center gap-6 text-slate-400/80">
            <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors duration-300 bg-white
              ${isDragActive ? 'border-orange-300 text-orange-600' : 'border-slate-100 text-slate-500'}
            `}>
              <Shield className="h-3.5 w-3.5 text-orange-500/80" />
              <span>Zero Server Uploads</span>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors duration-300 bg-white
              ${isDragActive ? 'border-orange-300 text-orange-600' : 'border-slate-100 text-slate-500'}
            `}>
              <Lock className="h-3.5 w-3.5 text-orange-500/80" />
              <span>Private Sandbox</span>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors duration-300 bg-white
              ${isDragActive ? 'border-orange-300 text-orange-600' : 'border-slate-100 text-slate-500'}
            `}>
              <Zap className="h-3.5 w-3.5 text-orange-500/80" />
              <span>WASM Offline Speed</span>
            </div>
          </div>
        </div>

        {/* Drag Over Ring Pulse */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-2 rounded-[22px] border-2 border-orange-400/40 pointer-events-none animate-pulse"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-start gap-2.5 rounded-2xl bg-orange-50/50 border border-orange-100 p-4 text-xs text-orange-800 leading-relaxed"
          id="file-dropzone-error"
        >
          <div className="rounded-lg bg-orange-100 p-1 text-orange-700 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-grow">
            <span className="font-bold block text-slate-800 mb-0.5">Upload Failed</span>
            <span>{error}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
