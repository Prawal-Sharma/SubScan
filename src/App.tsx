import React, { useState } from 'react';
import { PDFUploader } from './components/PDFUploader';
import { RecurringChargesList } from './components/RecurringChargesList';
import { PDFProcessor } from './engines/pdfProcessor';
import { RecurrenceDetector } from './engines/recurrenceDetector';
import { Transaction, RecurringCharge, ParsedStatement } from './types';
import { FileSearch, Loader2 } from 'lucide-react';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedStatements, setProcessedStatements] = useState<ParsedStatement[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [recurringCharges, setRecurringCharges] = useState<RecurringCharge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pdfProcessor = new PDFProcessor();
  const recurrenceDetector = new RecurrenceDetector();

  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);

    try {
      const newStatements: ParsedStatement[] = [];
      const newTransactions: Transaction[] = [];

      // Process each PDF file
      for (const file of files) {
        console.log(`Processing ${file.name}...`);
        const result = await pdfProcessor.processPDF(file);
        
        if (result.success && result.data) {
          newStatements.push(result.data);
          newTransactions.push(...result.data.transactions);
          
          if (result.data.parsingErrors && result.data.parsingErrors.length > 0) {
            console.warn(`Parsing warnings for ${file.name}:`, result.data.parsingErrors);
          }
        } else {
          console.error(`Failed to process ${file.name}:`, result.error);
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
        const merged = recurrenceDetector.mergeSimiiarRecurringCharges(detected);
        setRecurringCharges(merged);
        
        console.log(`Detected ${merged.length} recurring charges from ${combinedTransactions.length} transactions`);
      }
    } catch (err) {
      console.error('Error processing files:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while processing files');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChargeClick = (charge: RecurringCharge) => {
    console.log('Charge details:', charge);
    // TODO: Show detailed view of the charge
  };

  const handleExport = () => {
    if (recurringCharges.length === 0) return;

    // Create CSV content
    const headers = ['Merchant', 'Pattern', 'Average Amount', 'Next Due Date', 'Confidence', 'Status'];
    const rows = recurringCharges.map(charge => [
      charge.merchant,
      charge.pattern,
      charge.averageAmount.toFixed(2),
      charge.nextDueDate ? charge.nextDueDate.toISOString().split('T')[0] : 'N/A',
      `${charge.confidence}%`,
      charge.isActive ? 'Active' : 'Inactive',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileSearch className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SubScan</h1>
                <p className="text-sm text-gray-500">Detect recurring charges from bank statements</p>
              </div>
            </div>
            
            {recurringCharges.length > 0 && (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Upload Section */}
        {allTransactions.length === 0 && (
          <PDFUploader 
            onFilesSelected={handleFilesSelected}
            isProcessing={isProcessing}
          />
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-gray-600">Processing statements...</span>
            </div>
          </div>
        )}

        {/* Results Section */}
        {!isProcessing && allTransactions.length > 0 && (
          <>
            <RecurringChargesList 
              charges={recurringCharges}
              onChargeClick={handleChargeClick}
            />

            {/* Add More Files Button */}
            <div className="mt-8 text-center">
              <PDFUploader 
                onFilesSelected={handleFilesSelected}
                isProcessing={isProcessing}
              />
            </div>

            {/* Statistics */}
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
              <p>
                Processed {processedStatements.length} statement(s) containing {allTransactions.length} transactions.
                Found {recurringCharges.length} recurring charges.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;