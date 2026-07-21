import React, { useEffect, useState } from 'react';
import { Loader, CheckSquare, ListPlus, Type, AlertCircle } from 'lucide-react';
import { WorkingFile } from '../../types';
import { getFormFields, FormFieldData } from '../../services/pdfService';

interface FormFillPanelProps {
  file: WorkingFile;
  fieldValues: Record<string, string>;
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function FormFillPanel({ file, fieldValues, setFieldValues }: FormFillPanelProps) {
  const [fields, setFields] = useState<FormFieldData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const scanForm = async () => {
      setLoading(true);
      setError('');
      try {
        const detectedFields = await getFormFields(file);
        setFields(detectedFields);
        
        // Setup initial values
        const initialVals: Record<string, string> = {};
        detectedFields.forEach(f => {
          initialVals[f.name] = f.value;
        });
        setFieldValues(prev => ({ ...initialVals, ...prev }));
      } catch (e: any) {
        console.warn(e);
        setError('Could not scan for interactive form fields. The document might not have standard AcroForm fields.');
      } finally {
        setLoading(false);
      }
    };

    scanForm();
  }, [file]);

  const handleValueChange = (name: string, val: string) => {
    setFieldValues(prev => ({ ...prev, [name]: val }));
  };

  if (loading) {
    return (
      <div className="py-8 text-center" id="form-loader">
        <Loader className="mx-auto h-6 w-6 animate-spin text-zinc-600" />
        <p className="mt-2 text-xs font-medium text-zinc-500">Scanning PDF structure for fillable AcroForm fields...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-zinc-500" id="form-error">
        <AlertCircle className="mx-auto mb-2.5 h-6 w-6 text-zinc-400" />
        <p className="text-xs font-semibold">{error}</p>
        <p className="mt-1 text-[11px] text-zinc-400 max-w-sm mx-auto">
          You can still download this document as-is or add overlays (text/shapes) by selecting the <strong className="text-zinc-600">Edit PDF</strong> tool.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-zinc-200 shadow-sm" id="form-fields-container">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-950">Fill Interactive Fields</h3>
        <span className="font-mono text-xs text-zinc-400">Detected: {fields.length} fields</span>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-6 text-center text-zinc-400">
          <p className="text-xs font-medium text-zinc-500">No standard AcroForm fields detected in this PDF.</p>
          <p className="mt-1 text-[11px] text-zinc-400">
            For static documents, use the <strong className="text-zinc-500">Edit PDF</strong> tool to place visual text annotations and signatures.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" id="fields-inputs-grid">
          {fields.map((field) => {
            const currentVal = fieldValues[field.name] || '';

            return (
              <div
                key={field.name}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-3.5"
                id={`field-input-${field.name}`}
              >
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-zinc-500 tracking-wide uppercase">
                  {field.type === 'text' && <Type className="h-3 w-3 text-zinc-400" />}
                  {field.type === 'checkbox' && <CheckSquare className="h-3 w-3 text-zinc-400" />}
                  {field.type === 'dropdown' && <ListPlus className="h-3 w-3 text-zinc-400" />}
                  <span className="truncate max-w-[200px]" title={field.name}>
                    {field.name.replace(/_/g, ' ')}
                  </span>
                </div>

                {field.type === 'checkbox' ? (
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id={`cb-${field.name}`}
                      checked={currentVal === 'true'}
                      onChange={(e) => handleValueChange(field.name, e.target.checked ? 'true' : 'false')}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                    />
                    <label htmlFor={`cb-${field.name}`} className="text-xs text-zinc-600 font-medium select-none">
                      Checked
                    </label>
                  </div>
                ) : field.type === 'dropdown' && field.options ? (
                  <select
                    value={currentVal}
                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                    className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value="">-- Select Option --</option>
                    {field.options.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  // Default text input
                  <input
                    type="text"
                    value={currentVal}
                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                    className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                    placeholder={`Enter ${field.name}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
