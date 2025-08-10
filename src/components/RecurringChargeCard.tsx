import { RecurringCharge } from '../types';
import { Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent } from './ui/Card';

interface RecurringChargeCardProps {
  charge: RecurringCharge;
  onClick: (charge: RecurringCharge) => void;
}

export function RecurringChargeCard({ charge, onClick }: RecurringChargeCardProps) {
  const getPatternIcon = (pattern: string) => {
    const icons: Record<string, { icon: JSX.Element; label: string; color: string }> = {
      weekly: { 
        icon: <span className="text-xs font-bold">W</span>, 
        label: 'Weekly',
        color: 'bg-purple-100 text-purple-700 border-purple-200'
      },
      biweekly: { 
        icon: <span className="text-xs font-bold">2W</span>, 
        label: 'Bi-weekly',
        color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
      },
      monthly: { 
        icon: <span className="text-xs font-bold">M</span>, 
        label: 'Monthly',
        color: 'bg-blue-100 text-blue-700 border-blue-200'
      },
      quarterly: { 
        icon: <span className="text-xs font-bold">Q</span>, 
        label: 'Quarterly',
        color: 'bg-cyan-100 text-cyan-700 border-cyan-200'
      },
      annual: { 
        icon: <span className="text-xs font-bold">Y</span>, 
        label: 'Annual',
        color: 'bg-green-100 text-green-700 border-green-200'
      },
      irregular: { 
        icon: <span className="text-xs font-bold">?</span>, 
        label: 'Irregular',
        color: 'bg-gray-100 text-gray-700 border-gray-200'
      },
    };
    
    return icons[pattern] || icons.irregular;
  };
  
  const patternInfo = getPatternIcon(charge.pattern);
  const confidenceColor = charge.confidence >= 80 ? 'text-green-600' : charge.confidence >= 60 ? 'text-amber-600' : 'text-red-600';
  const annualCost = charge.pattern === 'monthly' ? charge.averageAmount * 12 :
                     charge.pattern === 'weekly' ? charge.averageAmount * 52 :
                     charge.pattern === 'biweekly' ? charge.averageAmount * 26 :
                     charge.pattern === 'quarterly' ? charge.averageAmount * 4 :
                     charge.pattern === 'annual' ? charge.averageAmount :
                     charge.averageAmount * (365 / charge.intervalDays);
  
  return (
    <Card hover onClick={() => onClick(charge)} className="group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {charge.merchant}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {charge.transactions.length} transactions detected
            </p>
          </div>
          
          <div className={`px-2.5 py-1 rounded-lg border ${patternInfo.color} font-medium text-sm`}>
            {patternInfo.label}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Amount</span>
            </div>
            <p className="font-semibold text-gray-900">
              ${charge.averageAmount.toFixed(2)}
              <span className="text-xs text-gray-500 font-normal">/{charge.pattern === 'monthly' ? 'mo' : charge.pattern}</span>
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Annual Cost</span>
            </div>
            <p className="font-semibold text-gray-900">
              ${annualCost.toFixed(0)}
              <span className="text-xs text-gray-500 font-normal">/yr</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            {charge.nextDueDate && (
              <>
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-600">
                  Next: {new Date(charge.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${charge.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className={`text-xs font-medium ${confidenceColor}`}>
              {charge.confidence}% confidence
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}