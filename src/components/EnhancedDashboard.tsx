import { useState, useMemo } from 'react';
import { RecurringCharge, ParsedStatement } from '../types';
import { RecurringChargeCard } from './RecurringChargeCard';
import { Button } from './ui/Button';
import { 
  Download, DollarSign, TrendingUp, AlertTriangle, 
  ChevronDown, Calendar, Building2, AlertCircle, CheckCircle
} from 'lucide-react';

interface EnhancedDashboardProps {
  charges: RecurringCharge[];
  statements: ParsedStatement[];
  onChargeClick: (charge: RecurringCharge) => void;
  onExport: (format?: 'csv' | 'json' | 'ics' | 'excel') => void;
}

export function EnhancedDashboard({ 
  charges, 
  statements, 
  onChargeClick, 
  onExport 
}: EnhancedDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'amount' | 'confidence' | 'name'>('amount');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPeriodInfo, setShowPeriodInfo] = useState(true);
  
  // Extract unique banks from statements
  const banks = useMemo(() => {
    const uniqueBanks = new Set(statements.map(s => s.institution));
    return Array.from(uniqueBanks).sort();
  }, [statements]);
  
  // Calculate date coverage
  const dateCoverage = useMemo(() => {
    if (statements.length === 0) return null;
    
    const dates = statements.flatMap(s => [s.startDate, s.endDate]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Find gaps in coverage
    const gaps: { start: Date; end: Date }[] = [];
    const sortedStatements = [...statements].sort((a, b) => 
      a.startDate.getTime() - b.startDate.getTime()
    );
    
    for (let i = 0; i < sortedStatements.length - 1; i++) {
      const currentEnd = sortedStatements[i].endDate;
      const nextStart = sortedStatements[i + 1].startDate;
      const daysDiff = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 7) { // More than a week gap
        gaps.push({ start: currentEnd, end: nextStart });
      }
    }
    
    return { minDate, maxDate, gaps, statements: sortedStatements };
  }, [statements]);
  
  // Filter charges based on selected bank
  const filteredCharges = useMemo(() => {
    let filtered = charges;
    
    // Filter by bank if selected
    if (selectedBank !== 'all') {
      filtered = charges.filter(charge => {
        // Check if any transactions in this charge are from the selected bank
        return charge.transactions.some(txn => {
          const statement = statements.find(s => s.id === txn.statementId);
          return statement?.institution === selectedBank;
        });
      });
    }
    
    // Apply active/inactive filter
    filtered = filtered.filter(charge => {
      if (filter === 'active') return charge.isActive;
      if (filter === 'inactive') return !charge.isActive;
      return true;
    });
    
    return filtered;
  }, [charges, selectedBank, filter, statements]);
  
  // Sort charges
  const sortedCharges = useMemo(() => {
    return [...filteredCharges].sort((a, b) => {
      if (sortBy === 'amount') return b.averageAmount - a.averageAmount;
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      if (sortBy === 'name') return a.merchant.localeCompare(b.merchant);
      return 0;
    });
  }, [filteredCharges, sortBy]);
  
  // Calculate totals
  const { totalMonthly, totalAnnual, activeCount, inactiveCount } = useMemo(() => {
    const monthly = filteredCharges.reduce((sum, charge) => {
      if (!charge.isActive) return sum;
      const monthlyAmount = charge.pattern === 'monthly' ? charge.averageAmount :
                           charge.pattern === 'weekly' ? charge.averageAmount * 4.33 :
                           charge.pattern === 'biweekly' ? charge.averageAmount * 2.17 :
                           charge.pattern === 'quarterly' ? charge.averageAmount / 3 :
                           charge.pattern === 'annual' ? charge.averageAmount / 12 :
                           charge.averageAmount * (30 / charge.intervalDays);
      return sum + monthlyAmount;
    }, 0);
    
    return {
      totalMonthly: monthly,
      totalAnnual: monthly * 12,
      activeCount: filteredCharges.filter(c => c.isActive).length,
      inactiveCount: filteredCharges.filter(c => !c.isActive).length
    };
  }, [filteredCharges]);
  
  // Enhanced charge cards with source information
  const enhancedCharges = useMemo(() => {
    return sortedCharges.map(charge => {
      // Find which statements contributed to this charge
      const sourceStatements = new Set<string>();
      const sourceBanks = new Set<string>();
      
      charge.transactions.forEach(txn => {
        const statement = statements.find(s => s.id === txn.statementId);
        if (statement) {
          sourceStatements.add(`${statement.institution} (${statement.statementPeriod})`);
          sourceBanks.add(statement.institution);
        }
      });
      
      return {
        ...charge,
        sources: Array.from(sourceStatements),
        banks: Array.from(sourceBanks)
      };
    });
  }, [sortedCharges, statements]);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Period Coverage Info */}
      {showPeriodInfo && dateCoverage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">Statement Coverage</h3>
              </div>
              <p className="text-sm text-blue-800">
                Analyzing data from {dateCoverage.minDate.toLocaleDateString()} to {dateCoverage.maxDate.toLocaleDateString()}
                {dateCoverage.gaps.length > 0 && (
                  <span className="text-orange-600 ml-2">
                    ({dateCoverage.gaps.length} gap{dateCoverage.gaps.length > 1 ? 's' : ''} detected)
                  </span>
                )}
              </p>
              {dateCoverage.gaps.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-orange-600">Missing periods:</p>
                  <ul className="text-xs text-orange-600 mt-1">
                    {dateCoverage.gaps.map((gap, idx) => (
                      <li key={idx}>
                        {gap.start.toLocaleDateString()} - {gap.end.toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowPeriodInfo(false)}
              className="text-blue-600 hover:text-blue-700"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Bank Filter */}
      {banks.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filter by Bank</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedBank('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedBank === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Banks ({charges.length})
            </button>
            {banks.map(bank => {
              const bankChargeCount = charges.filter(charge =>
                charge.transactions.some(txn => {
                  const statement = statements.find(s => s.id === txn.statementId);
                  return statement?.institution === bank;
                })
              ).length;
              
              return (
                <button
                  key={bank}
                  onClick={() => setSelectedBank(bank)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedBank === bank
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {bank} ({bankChargeCount})
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Per Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${totalMonthly.toFixed(0)}</p>
          <p className="text-xs text-gray-600 mt-1">Active subscriptions</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Per Year</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${totalAnnual.toFixed(0)}</p>
          <p className="text-xs text-gray-600 mt-1">Annual cost projection</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-xs text-gray-600 mt-1">Recurring charges</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Inactive</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
          <p className="text-xs text-gray-600 mt-1">Past subscriptions</p>
        </div>
      </div>
      
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
            {(['all', 'active', 'inactive'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  filter === value
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="amount">Sort by Amount</option>
            <option value="confidence">Sort by Confidence</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
        
        <div className="relative">
          <Button
            onClick={() => setShowExportMenu(!showExportMenu)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className="w-4 h-4" />
          </Button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => {
                  onExport('csv');
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                Export as CSV
              </button>
              <button
                onClick={() => {
                  onExport('json');
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                Export as JSON
              </button>
              <button
                onClick={() => {
                  onExport('ics');
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                Export as Calendar
              </button>
              <button
                onClick={() => {
                  onExport('excel');
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 font-medium"
              >
                Export as Excel
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Charges Grid with Enhanced Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enhancedCharges.map((charge) => (
          <div key={charge.id} className="relative">
            <RecurringChargeCard
              charge={charge}
              onClick={() => onChargeClick(charge)}
            />
            {/* Source Info Badge */}
            <div className="absolute top-2 right-2 flex flex-wrap gap-1 max-w-[150px]">
              {charge.banks.map(bank => (
                <span
                  key={bank}
                  className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                  title={`From ${bank} statements`}
                >
                  {bank}
                </span>
              ))}
            </div>
            {/* Statement Count */}
            <div className="mt-2 px-3 pb-2">
              <p className="text-xs text-gray-500">
                Found in {charge.transactions.length} transactions across {charge.sources.length} statement(s)
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {sortedCharges.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No recurring charges found
          </h3>
          <p className="text-gray-600">
            {filter !== 'all' ? 'Try adjusting your filters' : 'Upload bank statements to detect subscriptions'}
          </p>
        </div>
      )}
    </div>
  );
}