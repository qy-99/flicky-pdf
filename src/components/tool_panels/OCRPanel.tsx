import React, { useState } from 'react';
import { Eye, Copy, Download, Loader, Check, AlertCircle } from 'lucide-react';
import { WorkingFile } from '../../types';
import { runOCR } from '../../services/pdfService';

interface OCRPanelProps {
  file: WorkingFile;
}

export function OCRPanel({ file }: OCRPanelProps) {
  const [selectedPage, setSelectedPage] = useState(0);
  const [language, setLanguage] = useState('eng');
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const startOCR = async () => {
    setRunning(true);
    setOcrText('');
    setOcrStatus('Bootstrapping local WASM engine...');
    try {
      const text = await runOCR(file, selectedPage, language, (status) => {
        setOcrStatus(status);
      });
      setOcrText(text || '(No text could be extracted from this page image.)');
    } catch (e: any) {
      console.error(e);
      setOcrStatus(`OCR Error: ${e?.message || e || 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  };

  const copyToClipboard = () => {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = () => {
    if (!ocrText) return;
    const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.pdf$/i, '')}_page_${selectedPage + 1}_ocr.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full" id="ocr-panel-container">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-zinc-950">Local Offline OCR Reader</h3>

        {/* Configurations row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Select Page to Extract
            </label>
            <select
              disabled={running}
              value={selectedPage}
              onChange={(e) => setSelectedPage(Number(e.target.value))}
              className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              id="select-ocr-page"
            >
              {Array.from({ length: file.numPages }, (_, i) => (
                <option key={i} value={i}>
                  Page {i + 1} of {file.numPages}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              OCR Language
            </label>
            <select
              disabled={running}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              id="select-ocr-lang"
            >
              <option value="eng">English (eng)</option>
              <option value="spa">Spanish (spa)</option>
              <option value="fra">French (fra)</option>
              <option value="deu">German (deu)</option>
              <option value="chi_sim">Chinese Simplified (chi_sim)</option>
            </select>
          </div>
        </div>

        {/* Trigger */}
        <div className="flex flex-col items-center">
          <button
            disabled={running}
            onClick={startOCR}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400"
            id="btn-run-ocr"
          >
            {running ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Running OCR...</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Analyze and Extract Text</span>
              </>
            )}
          </button>

          {/* Running status display */}
          {running && (
            <div className="mt-4 flex flex-col items-center gap-2 text-zinc-500" id="ocr-status-indicator">
              <span className="font-mono text-[11px] animate-pulse text-zinc-600 font-bold">{ocrStatus}</span>
              <p className="max-w-md text-[10px] text-zinc-400 text-center leading-relaxed">
                Tesseract operates fully client-side inside a browser-based WASM sandbox. This will keep your data 100% secure, but processing scanned documents might take 10-30 seconds.
              </p>
            </div>
          )}
        </div>

        {/* Extracted Text Box */}
        {ocrText && (
          <div className="mt-6 border-t border-zinc-100 pt-6 animate-fade-in" id="ocr-results-wrapper">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Extracted Text Layer
              </span>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                  title="Copy to clipboard"
                  id="btn-copy-ocr"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={downloadText}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                  title="Download as .txt"
                  id="btn-download-ocr-txt"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <pre className="whitespace-pre-wrap font-sans text-xs text-zinc-700 leading-relaxed custom-scrollbar">
                {ocrText}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
