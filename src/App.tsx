import { useState } from 'react';
import { HeroSection } from './components/HeroSection';
import { HowItWorks } from './components/HowItWorks';
import { SupportedBanks } from './components/SupportedBanks';
import { EnhancedPDFUploader } from './components/EnhancedPDFUploader';
import { Dashboard } from './components/Dashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { exportToCSV, exportToJSON, exportToICS, downloadFile } from './utils/exportUtils';
import { PDFProcessor } from './engines/pdfProcessor';
import { RecurrenceDetector } from './engines/recurrenceDetector';
import { Transaction, RecurringCharge, ParsedStatement } from './types';
import { FileSearch } from 'lucide-react';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedStatements, setProcessedStatements] = useState<ParsedStatement[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [recurringCharges, setRecurringCharges] = useState<RecurringCharge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const exportFormat = 'csv'; // Default export format

  const pdfProcessor = new PDFProcessor();
  const recurrenceDetector = new RecurrenceDetector();

  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    setHasUploaded(true);

    try {
      const newStatements: ParsedStatement[] = [];
      const newTransactions: Transaction[] = [];

      // Process each PDF file
      for (const file of files) {
        // Processing file
        const result = await pdfProcessor.processPDF(file);
        
        if (result.success && result.data) {
          newStatements.push(result.data);
          newTransactions.push(...result.data.transactions);
          
          if (result.data.parsingErrors && result.data.parsingErrors.length > 0) {
            // Parsing warnings logged internally
          }
        } else {
          // Error already displayed in UI
          setError(`Failed to process ${file.name}: ${result.error}`);
        }
      }

      // Combine with existing transactions
      const combinedTransactions = [...allTransactions, ...newTransactions];
      setAllTransactions(combinedTransactions);
      setProcessedStatements([...processedStatements, ...newStatements]);

      // Detect recurring charges
      if (combinedTransactions.length > 0) {
        const detected = recurrenceDetector.detectRecurringCharges(combinedTransactions);
        const merged = recurrenceDetector.mergeSimilarRecurringCharges(detected);
        setRecurringCharges(merged);
        
        // Detection complete
      }
    } catch (err) {
      // Error handling
      setError(err instanceof Error ? err.message : 'An error occurred while processing files');
    } finally {
      setIsProcessing(false);
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
          statements: processedStatements,
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
                
                <EnhancedPDFUploader 
                  onFilesSelected={handleFilesSelected}
                  isProcessing={isProcessing}
                />
              </div>
            </div>
            
            <SupportedBanks />
          </>
        ) : (
          <>
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
              <Dashboard
                charges={recurringCharges}
                onChargeClick={handleChargeClick}
                onExport={handleExport}
              />
            )}
            
            {/* Analytics Dashboard */}
            {recurringCharges.length > 0 && showAnalytics && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <AnalyticsDashboard
                  recurringCharges={recurringCharges}
                  allTransactions={allTransactions}
                />
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              </div>
            )}
            
            {/* Add More Files */}
            <div className="py-8 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto text-center">
                <p className="text-gray-600 mb-4">
                  Processed {processedStatements.length} statement(s) • 
                  {allTransactions.length} transactions • 
                  {recurringCharges.length} subscriptions found
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
    </div>
  );
}

export default App;