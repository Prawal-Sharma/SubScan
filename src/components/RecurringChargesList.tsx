import React from 'react';
import { RecurringCharge } from '../types';
import { format } from 'date-fns';
import { Calendar, TrendingUp, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface RecurringChargesListProps {
  charges: RecurringCharge[];
  onChargeClick?: (charge: RecurringCharge) => void;
}

export const RecurringChargesList: React.FC<RecurringChargesListProps> = ({ 
  charges, 
  onChargeClick 
}) => {
  const getPatternLabel = (pattern: string): string => {
    const labels: Record<string, string> = {
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annual: 'Annual',
      irregular: 'Irregular',
    };
    return labels[pattern] || pattern;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const totalMonthly = charges
    .filter(c => c.isActive)
    .reduce((sum, charge) => {
      let monthlyAmount = charge.averageAmount;
      switch (charge.pattern) {
        case 'weekly':
          monthlyAmount *= 4.33;
          break;
        case 'biweekly':
          monthlyAmount *= 2.17;
          break;
        case 'quarterly':
          monthlyAmount /= 3;
          break;
        case 'annual':
          monthlyAmount /= 12;
          break;
      }
      return sum + monthlyAmount;
    }, 0);

  const totalAnnual = totalMonthly * 12;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">
                {charges.filter(c => c.isActive).length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Total</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalMonthly.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Annual Total</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalAnnual.toFixed(2)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charges List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Detected Recurring Charges</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {charges.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No recurring charges detected yet. Upload a PDF statement to get started.
            </div>
          ) : (
            charges.map((charge) => (
              <div
                key={charge.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onChargeClick?.(charge)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {charge.merchant}
                      </h3>
                      {!charge.isActive && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{getPatternLabel(charge.pattern)}</span>
                      </span>
                      
                      <span className="flex items-center space-x-1">
                        <span>{charge.transactions.length} transactions</span>
                      </span>
                      
                      {charge.nextDueDate && charge.isActive && (
                        <span className="flex items-center space-x-1">
                          <span>Next: {format(charge.nextDueDate, 'MMM d')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ${charge.averageAmount.toFixed(2)}
                      </p>
                      {charge.amountVariance > 0.1 && (
                        <p className="text-xs text-gray-500">
                          ±${(charge.averageAmount * charge.amountVariance).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className={`flex items-center space-x-1 ${getConfidenceColor(charge.confidence)}`}>
                      {getConfidenceIcon(charge.confidence)}
                      <span className="text-sm font-medium">{charge.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};