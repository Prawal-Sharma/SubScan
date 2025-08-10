import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface EnhancedPDFUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing?: boolean;
  compact?: boolean;
}

export function EnhancedPDFUploader({ onFilesSelected, isProcessing = false, compact = false }: EnhancedPDFUploaderProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length > 0) {
      const newFiles = pdfFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }));
      setFiles(prev => [...prev, ...newFiles]);
      onFilesSelected(pdfFiles);
      
      // Simulate progress for each file
      newFiles.forEach((fileWrapper, index) => {
        const interval = setInterval(() => {
          setFiles(prev => {
            const updated = [...prev];
            const fileIndex = updated.findIndex(f => f.file === fileWrapper.file);
            if (fileIndex !== -1) {
              if (updated[fileIndex].progress < 100) {
                updated[fileIndex].progress += 10;
                if (updated[fileIndex].progress >= 100) {
                  updated[fileIndex].status = 'completed';
                  clearInterval(interval);
                } else {
                  updated[fileIndex].status = 'processing';
                }
              }
            }
            return updated;
          });
        }, 200 + index * 100);
      });
    }
  }, [onFilesSelected]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    disabled: isProcessing,
    multiple: true,
  });

  if (compact) {
    return (
      <Button
        variant="secondary"
        leftIcon={<Upload className="w-4 h-4" />}
        onClick={() => document.getElementById('file-input')?.click()}
        disabled={isProcessing}
      >
        Add More Statements
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            onDrop(files);
          }}
        />
      </Button>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 md:p-12 text-center
          transition-all duration-200 cursor-pointer
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
            : 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={`
            p-4 rounded-full transition-all duration-200
            ${isDragActive ? 'bg-blue-100 scale-110' : 'bg-gray-100'}
          `}>
            {isDragActive ? (
              <FileText className="w-12 h-12 text-blue-600" />
            ) : (
              <Upload className="w-12 h-12 text-gray-600" />
            )}
          </div>
          
          <div>
            <p className="text-xl font-semibold text-gray-900">
              {isDragActive ? 'Drop your files here' : 'Upload Bank Statements'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Drag & drop PDF files or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports Wells Fargo, Bank of America, Chase, and more
            </p>
          </div>
          
          <Button variant="primary" size="lg">
            Select Files
          </Button>
        </div>
        
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              100% Private
            </div>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              Processing {files.length} file{files.length > 1 ? 's' : ''}
            </h3>
            <button
              onClick={clearAll}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all
            </button>
          </div>
          
          <div className="divide-y divide-gray-100">
            {files.map((fileWrapper, index) => (
              <div key={index} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fileWrapper.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(fileWrapper.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {fileWrapper.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {fileWrapper.status === 'processing' && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    {fileWrapper.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                {fileWrapper.status !== 'completed' && (
                  <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${fileWrapper.progress}%` }}
                    />
                  </div>
                )}
                
                {fileWrapper.error && (
                  <p className="text-xs text-red-600 mt-1">{fileWrapper.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Your Privacy is Our Priority</p>
            <p className="text-amber-800 mt-1">
              All processing happens locally in your browser. Your financial data never touches our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}