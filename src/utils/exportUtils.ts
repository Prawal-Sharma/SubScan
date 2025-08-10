import { RecurringCharge, ParsedStatement } from '../types';

// Export to JSON
export function exportToJSON(data: {
  statements: ParsedStatement[];
  recurringCharges: RecurringCharge[];
  timestamp: Date;
}): string {
  return JSON.stringify(data, null, 2);
}

// Export to CSV
export function exportToCSV(recurringCharges: RecurringCharge[]): string {
  const headers = [
    'Merchant',
    'Pattern',
    'Average Amount',
    'Next Due Date',
    'Confidence %',
    'Status',
    'Transaction Count',
    'First Transaction',
    'Last Transaction',
  ];
  
  const rows = recurringCharges.map(charge => {
    const firstTransaction = charge.transactions[0];
    const lastTransaction = charge.transactions[charge.transactions.length - 1];
    
    return [
      charge.merchant,
      charge.pattern,
      charge.averageAmount.toFixed(2),
      charge.nextDueDate ? charge.nextDueDate.toLocaleDateString() : 'N/A',
      charge.confidence.toFixed(0),
      charge.isActive ? 'Active' : 'Inactive',
      charge.transactions.length.toString(),
      firstTransaction.date.toLocaleDateString(),
      lastTransaction.date.toLocaleDateString(),
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  return csvContent;
}

// Export to ICS (Calendar format)
export function exportToICS(recurringCharges: RecurringCharge[]): string {
  const events: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SubScan//Recurring Charges//EN'];
  
  recurringCharges
    .filter(charge => charge.isActive && charge.nextDueDate)
    .forEach((charge, index) => {
      const nextDue = charge.nextDueDate!;
      const uid = `subscan-${charge.id || index}-${Date.now()}`;
      
      // Format dates for ICS (YYYYMMDD)
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };
      
      // Calculate recurrence rule
      let rrule = '';
      switch (charge.pattern) {
        case 'weekly':
          rrule = 'RRULE:FREQ=WEEKLY';
          break;
        case 'biweekly':
          rrule = 'RRULE:FREQ=WEEKLY;INTERVAL=2';
          break;
        case 'monthly':
          rrule = 'RRULE:FREQ=MONTHLY';
          break;
        case 'quarterly':
          rrule = 'RRULE:FREQ=MONTHLY;INTERVAL=3';
          break;
        case 'annual':
          rrule = 'RRULE:FREQ=YEARLY';
          break;
      }
      
      events.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${formatDate(nextDue)}`,
        `SUMMARY:${charge.merchant} - $${charge.averageAmount.toFixed(2)}`,
        `DESCRIPTION:Recurring ${charge.pattern} subscription. Average amount: $${charge.averageAmount.toFixed(2)}. Confidence: ${charge.confidence.toFixed(0)}%`,
        rrule,
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        `DESCRIPTION:${charge.merchant} subscription due tomorrow`,
        'END:VALARM',
        'END:VEVENT'
      );
    });
  
  events.push('END:VCALENDAR');
  
  return events.join('\r\n');
}

// Export detailed PDF report (HTML template for PDF generation)
export function generatePDFHTML(
  recurringCharges: RecurringCharge[],
  _statements?: ParsedStatement[]
): string {
  const activeCharges = recurringCharges.filter(c => c.isActive);
  const inactiveCharges = recurringCharges.filter(c => !c.isActive);
  
  // Calculate totals
  const monthlyTotal = activeCharges
    .filter(c => c.pattern === 'monthly')
    .reduce((sum, c) => sum + c.averageAmount, 0);
  
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
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>SubScan - Subscription Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #4F46E5;
          border-bottom: 2px solid #4F46E5;
          padding-bottom: 10px;
        }
        h2 {
          color: #1F2937;
          margin-top: 30px;
        }
        .summary {
          background: #F3F4F6;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .metric {
          background: white;
          padding: 15px;
          border-radius: 6px;
        }
        .metric-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #1F2937;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #4F46E5;
          color: white;
          padding: 10px;
          text-align: left;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #E5E7EB;
        }
        tr:hover {
          background: #F9FAFB;
        }
        .active {
          color: #10B981;
          font-weight: bold;
        }
        .inactive {
          color: #EF4444;
          font-weight: bold;
        }
        .confidence-high {
          color: #10B981;
        }
        .confidence-medium {
          color: #F59E0B;
        }
        .confidence-low {
          color: #EF4444;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          color: #6B7280;
          font-size: 12px;
        }
        @media print {
          body {
            margin: 0;
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <h1>SubScan Subscription Report</h1>
      <p>Generated on ${new Date().toLocaleDateString()}</p>
      
      <div class="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="metric">
            <div class="metric-label">Active Subscriptions</div>
            <div class="metric-value">${activeCharges.length}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Monthly Spend</div>
            <div class="metric-value">$${monthlyTotal.toFixed(2)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Annual Projection</div>
            <div class="metric-value">$${annualProjection.toFixed(2)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Inactive Subscriptions</div>
            <div class="metric-value">${inactiveCharges.length}</div>
          </div>
        </div>
      </div>
      
      <h2>Active Subscriptions</h2>
      <table>
        <thead>
          <tr>
            <th>Merchant</th>
            <th>Pattern</th>
            <th>Amount</th>
            <th>Next Due</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          ${activeCharges.map(charge => `
            <tr>
              <td>${charge.merchant}</td>
              <td>${charge.pattern}</td>
              <td>$${charge.averageAmount.toFixed(2)}</td>
              <td>${charge.nextDueDate ? charge.nextDueDate.toLocaleDateString() : 'N/A'}</td>
              <td class="${getConfidenceClass(charge.confidence)}">${charge.confidence.toFixed(0)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${inactiveCharges.length > 0 ? `
        <h2>Inactive Subscriptions</h2>
        <table>
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Pattern</th>
              <th>Amount</th>
              <th>Last Transaction</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${inactiveCharges.map(charge => {
              const lastTransaction = charge.transactions[charge.transactions.length - 1];
              return `
                <tr>
                  <td>${charge.merchant}</td>
                  <td>${charge.pattern}</td>
                  <td>$${charge.averageAmount.toFixed(2)}</td>
                  <td>${lastTransaction.date.toLocaleDateString()}</td>
                  <td class="${getConfidenceClass(charge.confidence)}">${charge.confidence.toFixed(0)}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : ''}
      
      <div class="footer">
        <p>Generated by SubScan - Your Privacy-First Subscription Tracker</p>
        <p>All processing done locally in your browser</p>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 80) return 'confidence-high';
  if (confidence >= 50) return 'confidence-medium';
  return 'confidence-low';
}

// Download helper function
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}