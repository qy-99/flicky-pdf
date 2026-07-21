import React, { useState, useEffect } from 'react';
import { Columns, ArrowRight, CheckCircle2, AlertTriangle, Loader, RefreshCw } from 'lucide-react';
import { WorkingFile } from '../../types';
import { comparePDFs, TextDiffResult } from '../../services/pdfService';

interface ComparePanelProps {
  files: WorkingFile[];
}

export function ComparePanel({ files }: ComparePanelProps) {
  const [comparing, setComparing] = useState(false);
  const [diffResult, setDiffResult] = useState<TextDiffResult | null>(null);
  const [error, setError] = useState('');
  const [activePage, setActivePage] = useState(0);

  const runComparison = async () => {
    if (files.length < 2) {
      setError('Please upload exactly 2 files to compare.');
      return;
    }
    setError('');
    setComparing(true);
    try {
      const result = await comparePDFs(files[0], files[1]);
      setDiffResult(result);
      setActivePage(0);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to compare the uploaded PDF files.');
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    if (files.length === 2) {
      runComparison();
    } else {
      setDiffResult(null);
    }
  }, [files]);

  if (files.length !== 2) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-zinc-400" id="compare-unsupported">
        <Columns className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
        <p className="text-sm font-medium text-zinc-500">
          This tool requires exactly <strong className="text-zinc-800">2 PDF files</strong> to compare.
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Currently uploaded: {files.length} {files.length === 1 ? 'file' : 'files'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full" id="compare-panel-container">
      {/* File details banner */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-1.5 font-bold text-zinc-800 max-w-[200px] truncate" title={files[0].name}>
            File A: {files[0].name}
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-400" />
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-1.5 font-bold text-zinc-800 max-w-[200px] truncate" title={files[1].name}>
            File B: {files[1].name}
          </div>
        </div>

        <button
          disabled={comparing}
          onClick={runComparison}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 disabled:opacity-50"
          id="btn-recompare"
        >
          {comparing ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span>Re-compare</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 flex gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {comparing && (
        <div className="py-12 text-center" id="compare-loader">
          <Loader className="mx-auto h-8 w-8 animate-spin text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-zinc-500">Extracting text streams and comparing line diffs...</p>
        </div>
      )}

      {diffResult && !comparing && (
        <div className="flex flex-col gap-6" id="compare-results">
          {/* Summary Indicator */}
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm border border-zinc-200 bg-white">
            {diffResult.hasDiff ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-zinc-800">Modifications detected between File A and File B.</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-zinc-800">Perfect Match! No text differences detected between File A and File B.</span>
              </>
            )}
          </div>

          {/* Page Tabs */}
          {diffResult.pagesDiff.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 overflow-x-auto custom-scrollbar">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-2">Pages:</span>
                {diffResult.pagesDiff.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePage(idx)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      activePage === idx
                        ? 'bg-zinc-950 text-white shadow-sm'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                    id={`btn-page-diff-${idx}`}
                  >
                    Page {idx + 1}
                  </button>
                ))}
              </div>

              {/* Diff Viewer Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* File A text layer */}
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 border-b border-zinc-100 pb-2">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      File A Page {activePage + 1} Text
                    </h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-lg bg-zinc-50 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-700">
                      {diffResult.pagesDiff[activePage]?.doc1Text || '(Page contains no selectable text)'}
                    </pre>
                  </div>
                </div>

                {/* Diff Comparison Layer */}
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 border-b border-zinc-100 pb-2">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      Text Level Diff Analysis
                    </h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-lg bg-zinc-900 p-4 font-mono text-[11px] leading-relaxed">
                    {diffResult.pagesDiff[activePage]?.diffLines.length === 0 ? (
                      <p className="text-zinc-500 italic">No text differences found on this page.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {diffResult.pagesDiff[activePage]?.diffLines.map((line, lIdx) => {
                          if (line.type === 'removed') {
                            return (
                              <div key={lIdx} className="bg-red-950/50 border-l-2 border-red-500 px-2 py-0.5 text-red-300">
                                - {line.text}
                              </div>
                            );
                          } else if (line.type === 'added') {
                            return (
                              <div key={lIdx} className="bg-emerald-950/50 border-l-2 border-emerald-500 px-2 py-0.5 text-emerald-300">
                                + {line.text}
                              </div>
                            );
                          } else {
                            return (
                              <div key={lIdx} className="px-2 py-0.5 text-zinc-400">
                                  {line.text}
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
