import { useState } from 'react';
import { RecurringCharge } from '../types';
import { RecurringChargeCard } from './RecurringChargeCard';
import { Button } from './ui/Button';
import { Download, Filter, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  charges: RecurringCharge[];
  onChargeClick: (charge: RecurringCharge) => void;
  onExport: () => void;
}

export function Dashboard({ charges, onChargeClick, onExport }: DashboardProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'amount' | 'confidence' | 'name'>('amount');
  
  const filteredCharges = charges.filter(charge => {
    if (filter === 'active') return charge.isActive;
    if (filter === 'inactive') return !charge.isActive;
    return true;
  });
  
  const sortedCharges = [...filteredCharges].sort((a, b) => {
    if (sortBy === 'amount') return b.averageAmount - a.averageAmount;
    if (sortBy === 'confidence') return b.confidence - a.confidence;
    if (sortBy === 'name') return a.merchant.localeCompare(b.merchant);
    return 0;
  });
  
  const totalMonthly = charges.reduce((sum, charge) => {
    if (!charge.isActive) return sum;
    const monthly = charge.pattern === 'monthly' ? charge.averageAmount :
                   charge.pattern === 'weekly' ? charge.averageAmount * 4.33 :
                   charge.pattern === 'biweekly' ? charge.averageAmount * 2.17 :
                   charge.pattern === 'quarterly' ? charge.averageAmount / 3 :
                   charge.pattern === 'annual' ? charge.averageAmount / 12 :
                   charge.averageAmount * (30 / charge.intervalDays);
    return sum + monthly;
  }, 0);
  
  const totalAnnual = totalMonthly * 12;
  const activeCount = charges.filter(c => c.isActive).length;
  const inactiveCount = charges.filter(c => !c.isActive).length;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <AlertTriangle className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-xs text-gray-600 mt-1">Recurring charges</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Filter className="w-5 h-5 text-gray-600" />
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
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-all
                  ${filter === value 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="amount">Sort by Amount</option>
            <option value="confidence">Sort by Confidence</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
        
        <Button
          variant="primary"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={onExport}
        >
          Export CSV
        </Button>
      </div>
      
      {/* Results Grid */}
      {sortedCharges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCharges.map((charge) => (
            <RecurringChargeCard
              key={charge.id}
              charge={charge}
              onClick={onChargeClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">No recurring charges found matching your filter</p>
        </div>
      )}
    </div>
  );
}