import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface PDFUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing?: boolean;
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({ onFilesSelected, isProcessing = false }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length > 0) {
      onFilesSelected(pdfFiles);
    }
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    disabled: isProcessing,
    multiple: true,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {isDragActive ? (
            <>
              <FileText className="w-16 h-16 text-blue-500" />
              <p className="text-lg font-medium text-gray-700">Drop your PDF statements here</p>
            </>
          ) : (
            <>
              <Upload className="w-16 h-16 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Drop PDF statements here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Support for Wells Fargo, Capital One, Chase, and more
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {acceptedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h3>
          <ul className="space-y-1">
            {acceptedFiles.map((file, index) => (
              <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>{file.name}</span>
                <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Privacy First</p>
            <p className="mt-1">
              Your statements are processed entirely in your browser. 
              No data is uploaded to any server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};