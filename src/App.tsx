import { useState, useEffect } from 'react';
import { HeroSection } from './components/HeroSection';
import { HowItWorks } from './components/HowItWorks';
import { SupportedBanks } from './components/SupportedBanks';
import { EnhancedPDFUploader } from './components/EnhancedPDFUploader';
import { Dashboard } from './components/Dashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { exportToCSV, exportToJSON, exportToICS, downloadFile } from './utils/exportUtils';
import { PDFProcessor } from './engines/pdfProcessor';
import { RecurrenceDetector } from './engines/recurrenceDetector';
import { RecurringCharge, ParsedStatement } from './types';
import { FileSearch, AlertCircle } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { 
  createInitialState, 
  addStatementsToState, 
  addProcessingError, 
  getStateSummary,
  AppState 
} from './utils/stateManagement';
import { v4 as uuidv4 } from 'uuid';
import { checkBrowserCompatibility } from './utils/errorHandling';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [appState, setAppState] = useState<AppState>(createInitialState());
  const [recurringCharges, setRecurringCharges] = useState<RecurringCharge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, filename: '' });
  const exportFormat = 'csv'; // Default export format

  const pdfProcessor = new PDFProcessor();
  const recurrenceDetector = new RecurrenceDetector();
  
  // Check browser compatibility on mount
  useEffect(() => {
    const compatibilityError = checkBrowserCompatibility();
    if (compatibilityError) {
      setError(`Browser compatibility issue: ${compatibilityError.message}. ${compatibilityError.details || ''}`);
    }
  }, []);

  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    setHasUploaded(true);
    setProcessingProgress({ current: 0, total: files.length, filename: '' });

    try {
      const newStatements: ParsedStatement[] = [];
      let currentState = appState;
      let fileIndex = 0;

      // Process each PDF file
      for (const file of files) {
        fileIndex++;
        setProcessingProgress({ 
          current: fileIndex, 
          total: files.length, 
          filename: file.name 
        });
        
        const result = await pdfProcessor.processPDF(file);
        
        if (result.success && result.data) {
          // Assign unique ID and metadata
          const statementWithId: ParsedStatement = {
            ...result.data,
            id: uuidv4(),
            sourceFile: file.name,
            uploadedAt: new Date(),
            statementPeriod: `${result.data.startDate.getFullYear()}-${String(result.data.startDate.getMonth() + 1).padStart(2, '0')}`
          };
          
          newStatements.push(statementWithId);
          
          if (result.data.parsingErrors && result.data.parsingErrors.length > 0) {
            console.warn(`Parsing warnings for ${file.name}:`, result.data.parsingErrors);
          }
        } else {
          // Track error in state
          let errorMessage = `Failed to process ${file.name}: `;
          if (result.error?.includes('Unable to detect bank type')) {
            errorMessage += 'Bank format not recognized. Try selecting a different file or contact support if this is a supported bank.';
          } else if (result.error?.includes('Failed to process PDF')) {
            errorMessage += 'PDF file may be corrupted or password-protected. Please ensure the file is a valid, unprotected PDF.';
          } else {
            errorMessage += result.error || 'Unknown error occurred. Please try again.';
          }
          
          currentState = addProcessingError(currentState, file.name, errorMessage);
          setError(errorMessage);
        }
      }

      // Update state with new statements (handles deduplication and merging)
      if (newStatements.length > 0) {
        const updatedState = addStatementsToState(currentState, newStatements);
        setAppState(updatedState);
        
        // Detect recurring charges on all deduplicated transactions
        if (updatedState.allTransactions.length > 0) {
          const detected = recurrenceDetector.detectRecurringCharges(updatedState.allTransactions);
          const merged = recurrenceDetector.mergeSimilarRecurringCharges(detected);
          setRecurringCharges(merged);
        }
        
        // Log summary
        const summary = getStateSummary(updatedState);
        console.info('Processing complete:', {
          statements: summary.statementCount,
          transactions: summary.transactionCount,
          duplicatesRemoved: summary.duplicatesRemoved,
          recurringCharges: recurringCharges.length
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing files');
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0, filename: '' });
    }
  };

  const handleChargeClick = (_charge: RecurringCharge) => {
    // Charge details can be viewed in the dashboard
    // Future enhancement: Add detailed modal view
  };

  const handleExport = (format: 'csv' | 'json' | 'ics' = exportFormat) => {
    if (recurringCharges.length === 0) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    const dateStr = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'json':
        content = exportToJSON({
          statements: appState.processedStatements,
          recurringCharges,
          timestamp: new Date()
        });
        filename = `subscriptions-${dateStr}.json`;
        mimeType = 'application/json';
        break;
      case 'ics':
        content = exportToICS(recurringCharges);
        filename = `subscriptions-${dateStr}.ics`;
        mimeType = 'text/calendar';
        break;
      case 'csv':
      default:
        content = exportToCSV(recurringCharges);
        filename = `subscriptions-${dateStr}.csv`;
        mimeType = 'text/csv';
        break;
    }

    downloadFile(content, filename, mimeType);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <FileSearch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  SubScan
                </h1>
                <p className="text-xs text-gray-500">Uncover hidden subscriptions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {!hasUploaded ? (
          <>
            <HeroSection />
            <HowItWorks />
            
            {/* Upload Section */}
            <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Get Started</h2>
                  <p className="text-lg text-gray-600">Upload your statements to begin</p>
                </div>
                
                <ErrorBoundary>
                  <EnhancedPDFUploader 
                    onFilesSelected={handleFilesSelected}
                    isProcessing={isProcessing}
                  />
                </ErrorBoundary>
              </div>
            </div>
            
            <SupportedBanks />
          </>
        ) : (
          <>
            {/* Processing Overlay */}
            {isProcessing && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-lg font-medium text-gray-900">Processing PDFs...</p>
                    {processingProgress.total > 0 && (
                      <>
                        <p className="mt-2 text-sm text-gray-600">
                          File {processingProgress.current} of {processingProgress.total}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 truncate max-w-full">
                          {processingProgress.filename}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                          />
                        </div>
                      </>
                    )}
                    <p className="mt-2 text-sm text-gray-600">Detecting recurring subscriptions</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Toggle Analytics View */}
            {recurringCharges.length > 0 && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowAnalytics(false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      !showAnalytics 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Subscriptions List
                  </button>
                  <button
                    onClick={() => setShowAnalytics(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showAnalytics 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Analytics Dashboard
                  </button>
                </div>
              </div>
            )}
            
            {/* Results Dashboard */}
            {recurringCharges.length > 0 && !showAnalytics && (
              <ErrorBoundary>
                <Dashboard
                  charges={recurringCharges}
                  onChargeClick={handleChargeClick}
                  onExport={handleExport}
                />
              </ErrorBoundary>
            )}
            
            {/* Analytics Dashboard */}
            {recurringCharges.length > 0 && showAnalytics && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <ErrorBoundary>
                  <AnalyticsDashboard
                    recurringCharges={recurringCharges}
                    allTransactions={appState.allTransactions}
                  />
                </ErrorBoundary>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">Processing Error</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                      <div className="mt-3">
                        <button
                          onClick={() => setError(null)}
                          className="text-sm font-medium text-red-600 hover:text-red-500"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Add More Files */}
            <div className="py-8 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto text-center">
                <p className="text-gray-600 mb-4">
                  Processed {appState.processedStatements.length} statement(s) • 
                  {appState.allTransactions.length} transactions • 
                  {recurringCharges.length} subscriptions found
                  {(() => {
                    const summary = getStateSummary(appState);
                    return summary.duplicatesRemoved > 0 ? ` • ${summary.duplicatesRemoved} duplicates removed` : '';
                  })()}
                </p>
                <EnhancedPDFUploader 
                  onFilesSelected={handleFilesSelected}
                  isProcessing={isProcessing}
                  compact
                />
              </div>
            </div>
          </>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              SubScan - Your financial data stays private, always.
            </p>
            <p className="text-xs mt-2">
              All processing happens in your browser. No data is ever uploaded to our servers.
            </p>
          </div>
        </div>
      </footer>
      <Analytics />
      </div>
    </ErrorBoundary>
  );
}

export default App;