import React, { useMemo } from 'react';
import { RecurringCharge, Transaction } from '../types';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AnalyticsDashboardProps {
  recurringCharges: RecurringCharge[];
  allTransactions?: Transaction[];
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  recurringCharges,
}) => {
  const analytics = useMemo(() => {
    // Active vs Inactive subscriptions
    const activeCharges = recurringCharges.filter(c => c.isActive);
    const inactiveCharges = recurringCharges.filter(c => !c.isActive);
    
    // Total monthly spend
    const monthlySpend = activeCharges
      .filter(c => c.pattern === 'monthly')
      .reduce((sum, c) => sum + c.averageAmount, 0);
    
    // Annual projection
    const annualProjection = activeCharges.reduce((sum, charge) => {
      switch (charge.pattern) {
        case 'weekly':
          return sum + charge.averageAmount * 52;
        case 'biweekly':
          return sum + charge.averageAmount * 26;
        case 'monthly':
          return sum + charge.averageAmount * 12;
        case 'quarterly':
          return sum + charge.averageAmount * 4;
        case 'annual':
          return sum + charge.averageAmount;
        default:
          return sum + charge.averageAmount * (365 / charge.intervalDays);
      }
    }, 0);
    
    // Pattern breakdown
    const patternBreakdown = recurringCharges.reduce((acc, charge) => {
      if (!acc[charge.pattern]) {
        acc[charge.pattern] = { count: 0, amount: 0 };
      }
      acc[charge.pattern].count += 1;
      acc[charge.pattern].amount += charge.averageAmount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);
    
    // High confidence subscriptions
    const highConfidence = recurringCharges.filter(c => c.confidence >= 80);
    const mediumConfidence = recurringCharges.filter(c => c.confidence >= 50 && c.confidence < 80);
    const lowConfidence = recurringCharges.filter(c => c.confidence < 50);
    
    // Potential savings (inactive subscriptions)
    const potentialSavings = inactiveCharges.reduce((sum, charge) => {
      switch (charge.pattern) {
        case 'monthly':
          return sum + charge.averageAmount * 12;
        case 'annual':
          return sum + charge.averageAmount;
        default:
          return sum + charge.averageAmount * (365 / charge.intervalDays);
      }
    }, 0);
    
    return {
      activeCount: activeCharges.length,
      inactiveCount: inactiveCharges.length,
      totalCount: recurringCharges.length,
      monthlySpend,
      annualProjection,
      patternBreakdown,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      potentialSavings,
    };
  }, [recurringCharges]);
  
  const categoryBreakdown = useMemo((): CategoryBreakdown[] => {
    const categories: Record<string, { amount: number; count: number }> = {};
    
    recurringCharges.forEach(charge => {
      const category = detectCategory(charge.merchant);
      if (!categories[category]) {
        categories[category] = { amount: 0, count: 0 };
      }
      categories[category].amount += charge.averageAmount;
      categories[category].count += 1;
    });
    
    const total = Object.values(categories).reduce((sum, c) => sum + c.amount, 0);
    
    return Object.entries(categories)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / total) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [recurringCharges]);
  
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<CreditCard className="w-5 h-5" />}
          title="Active Subscriptions"
          value={analytics.activeCount}
          subtitle={`${analytics.inactiveCount} inactive`}
          trend="neutral"
        />
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          title="Monthly Spend"
          value={`$${analytics.monthlySpend.toFixed(2)}`}
          subtitle="Recurring charges"
          trend="up"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Annual Projection"
          value={`$${analytics.annualProjection.toFixed(2)}`}
          subtitle="Based on active subs"
          trend="up"
        />
        <MetricCard
          icon={<AlertCircle className="w-5 h-5" />}
          title="Potential Savings"
          value={`$${analytics.potentialSavings.toFixed(2)}`}
          subtitle="From inactive subs"
          trend="down"
        />
      </div>
      
      {/* Pattern Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Subscription Patterns
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(analytics.patternBreakdown).map(([pattern, data]) => (
            <div key={pattern} className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {data.count}
              </div>
              <div className="text-sm text-gray-600 capitalize">{pattern}</div>
              <div className="text-xs text-gray-500">
                ${data.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Confidence Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Detection Confidence
        </h3>
        <div className="space-y-3">
          <ConfidenceBar
            label="High Confidence"
            count={analytics.highConfidence.length}
            total={analytics.totalCount}
            color="green"
            icon={<CheckCircle className="w-4 h-4" />}
          />
          <ConfidenceBar
            label="Medium Confidence"
            count={analytics.mediumConfidence.length}
            total={analytics.totalCount}
            color="yellow"
            icon={<Activity className="w-4 h-4" />}
          />
          <ConfidenceBar
            label="Low Confidence"
            count={analytics.lowConfidence.length}
            total={analytics.totalCount}
            color="red"
            icon={<XCircle className="w-4 h-4" />}
          />
        </div>
      </div>
      
      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Spending by Category
        </h3>
        <div className="space-y-3">
          {categoryBreakdown.map((category) => (
            <div key={category.category} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getCategoryColor(category.category)}`} />
                <div>
                  <div className="font-medium text-gray-900">{category.category}</div>
                  <div className="text-sm text-gray-500">
                    {category.count} subscription{category.count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  ${category.amount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  {category.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Upcoming Payments */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Upcoming Payments
        </h3>
        <div className="space-y-2">
          {recurringCharges
            .filter(c => c.isActive && c.nextDueDate)
            .sort((a, b) => {
              if (!a.nextDueDate || !b.nextDueDate) return 0;
              return a.nextDueDate.getTime() - b.nextDueDate.getTime();
            })
            .slice(0, 5)
            .map((charge) => (
              <div key={charge.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-gray-900">{charge.merchant}</div>
                  <div className="text-sm text-gray-500">
                    {charge.nextDueDate?.toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ${charge.averageAmount.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">
                    {charge.pattern}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// Helper Components
interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, subtitle, trend }) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`${trendColors[trend]}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
};

interface ConfidenceBarProps {
  label: string;
  count: number;
  total: number;
  color: 'green' | 'yellow' | 'red';
  icon: React.ReactNode;
}

const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ label, count, total, color, icon }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <span className={`text-${color}-600`}>{icon}</span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm text-gray-600">
          {count} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Helper Functions
function detectCategory(merchant: string): string {
  const merchantLower = merchant.toLowerCase();
  
  if (merchantLower.includes('netflix') || merchantLower.includes('hulu') || 
      merchantLower.includes('disney') || merchantLower.includes('hbo') ||
      merchantLower.includes('youtube') || merchantLower.includes('prime video')) {
    return 'Entertainment';
  }
  if (merchantLower.includes('spotify') || merchantLower.includes('apple music') ||
      merchantLower.includes('pandora') || merchantLower.includes('tidal')) {
    return 'Music';
  }
  if (merchantLower.includes('gym') || merchantLower.includes('fitness') ||
      merchantLower.includes('peloton') || merchantLower.includes('life time')) {
    return 'Fitness';
  }
  if (merchantLower.includes('dropbox') || merchantLower.includes('google') ||
      merchantLower.includes('microsoft') || merchantLower.includes('adobe')) {
    return 'Software';
  }
  if (merchantLower.includes('insurance') || merchantLower.includes('electric') ||
      merchantLower.includes('gas') || merchantLower.includes('water')) {
    return 'Utilities';
  }
  if (merchantLower.includes('news') || merchantLower.includes('times') ||
      merchantLower.includes('journal') || merchantLower.includes('magazine')) {
    return 'News & Media';
  }
  
  return 'Other';
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Entertainment': 'bg-purple-500',
    'Music': 'bg-pink-500',
    'Fitness': 'bg-green-500',
    'Software': 'bg-blue-500',
    'Utilities': 'bg-gray-500',
    'News & Media': 'bg-yellow-500',
    'Other': 'bg-indigo-500',
  };
  
  return colors[category] || 'bg-gray-500';
}