import { useState } from 'react';
import { RecurringCharge } from '../types';
import { 
  Check, X, Edit2, Save, AlertCircle, 
  DollarSign, Calendar, Tag,
  MessageSquare
} from 'lucide-react';

interface SubscriptionManagerProps {
  charge: RecurringCharge;
  onUpdate: (charge: RecurringCharge) => void;
  onDismiss: (chargeId: string) => void;
  onConfirm: (chargeId: string) => void;
}

export interface EnhancedRecurringCharge extends RecurringCharge {
  userConfirmed?: boolean;
  userDismissed?: boolean;
  customName?: string;
  category?: string;
  notes?: string;
  tags?: string[];
}

export function SubscriptionManager({ 
  charge: initialCharge, 
  onUpdate, 
  onDismiss,
  onConfirm 
}: SubscriptionManagerProps) {
  const [charge, setCharge] = useState<EnhancedRecurringCharge>(initialCharge as EnhancedRecurringCharge);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customName: charge.customName || charge.merchant,
    category: charge.category || 'Other',
    notes: charge.notes || '',
    averageAmount: charge.averageAmount,
    pattern: charge.pattern,
    isActive: charge.isActive
  });

  const categories = [
    'Entertainment', 'Software', 'Utilities', 'Fitness', 
    'Food & Delivery', 'Transportation', 'Insurance', 
    'Education', 'Healthcare', 'Shopping', 'Other'
  ];

  const handleSave = () => {
    const updatedCharge: EnhancedRecurringCharge = {
      ...charge,
      customName: editForm.customName,
      category: editForm.category,
      notes: editForm.notes,
      averageAmount: editForm.averageAmount,
      pattern: editForm.pattern,
      isActive: editForm.isActive,
      userConfirmed: true
    };
    
    setCharge(updatedCharge);
    onUpdate(updatedCharge);
    setIsEditing(false);
  };

  const handleConfirm = () => {
    const updatedCharge = { ...charge, userConfirmed: true };
    setCharge(updatedCharge);
    onConfirm(charge.id);
  };

  const handleDismiss = () => {
    const updatedCharge = { ...charge, userDismissed: true };
    setCharge(updatedCharge);
    onDismiss(charge.id);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPatternLabel = (pattern: string) => {
    const labels: Record<string, string> = {
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annual: 'Annual',
      irregular: 'Variable'
    };
    return labels[pattern] || pattern;
  };

  if (charge.userDismissed) {
    return null; // Don't show dismissed charges
  }

  return (
    <div className={`bg-white rounded-lg border ${
      charge.userConfirmed ? 'border-green-200' : 'border-gray-200'
    } shadow-sm hover:shadow-md transition-all duration-200`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editForm.customName}
                onChange={(e) => setEditForm({ ...editForm, customName: e.target.value })}
                className="text-lg font-semibold text-gray-900 border-b-2 border-indigo-500 outline-none"
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">
                {charge.customName || charge.merchant}
              </h3>
            )}
            
            <div className="flex items-center gap-2 mt-1">
              {/* Confidence Badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                getConfidenceColor(charge.confidence)
              }`}>
                {charge.confidence}% confidence
              </span>
              
              {/* User Confirmed Badge */}
              {charge.userConfirmed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Check className="w-3 h-3 mr-1" />
                  Confirmed
                </span>
              )}
              
              {/* Category */}
              {isEditing ? (
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="text-xs px-2 py-1 border rounded"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : charge.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  <Tag className="w-3 h-3 mr-1" />
                  {charge.category}
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {!isEditing ? (
              <>
                {!charge.userConfirmed && (
                  <button
                    onClick={handleConfirm}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Confirm this subscription"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Dismiss (not a subscription)"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Save changes"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      customName: charge.customName || charge.merchant,
                      category: charge.category || 'Other',
                      notes: charge.notes || '',
                      averageAmount: charge.averageAmount,
                      pattern: charge.pattern,
                      isActive: charge.isActive
                    });
                  }}
                  className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Details */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-3">
          {/* Amount */}
          <div>
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <DollarSign className="w-3 h-3 mr-1" />
              Average Amount
            </div>
            {isEditing ? (
              <input
                type="number"
                value={editForm.averageAmount}
                onChange={(e) => setEditForm({ ...editForm, averageAmount: parseFloat(e.target.value) })}
                className="text-lg font-semibold text-gray-900 border rounded px-2 py-1 w-full"
                step="0.01"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">
                ${charge.averageAmount.toFixed(2)}
              </p>
            )}
          </div>
          
          {/* Pattern */}
          <div>
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <Calendar className="w-3 h-3 mr-1" />
              Frequency
            </div>
            {isEditing ? (
              <select
                value={editForm.pattern}
                onChange={(e) => setEditForm({ ...editForm, pattern: e.target.value as 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'irregular' })}
                className="text-sm font-medium text-gray-700 border rounded px-2 py-1"
              >
                {['weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'irregular'].map(p => (
                  <option key={p} value={p}>{getPatternLabel(p)}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium text-gray-700">
                {getPatternLabel(charge.pattern)}
              </p>
            )}
          </div>
          
          {/* Status */}
          <div>
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <AlertCircle className="w-3 h-3 mr-1" />
              Status
            </div>
            {isEditing ? (
              <select
                value={editForm.isActive ? 'active' : 'inactive'}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                className="text-sm font-medium border rounded px-2 py-1"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            ) : (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                charge.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {charge.isActive ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        </div>
        
        {/* Notes */}
        {(isEditing || charge.notes) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <MessageSquare className="w-3 h-3 mr-1" />
              Notes
            </div>
            {isEditing ? (
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full text-sm text-gray-700 border rounded px-2 py-1 resize-none"
                rows={2}
                placeholder="Add notes about this subscription..."
              />
            ) : (
              <p className="text-sm text-gray-700">{charge.notes}</p>
            )}
          </div>
        )}
        
        {/* Transaction Count */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>Based on {charge.transactions.length} transactions</span>
          {charge.nextDueDate && (
            <span>Next: {new Date(charge.nextDueDate).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}