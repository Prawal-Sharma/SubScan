# SubScan User Guide

## 📚 Complete Guide to Using SubScan

### Table of Contents
1. [What is SubScan?](#what-is-subscan)
2. [Getting Started](#getting-started)
3. [Supported Banks & File Types](#supported-banks--file-types)
4. [Step-by-Step Instructions](#step-by-step-instructions)
5. [Understanding Your Results](#understanding-your-results)
6. [Export Options](#export-options)
7. [Troubleshooting](#troubleshooting)
8. [Privacy & Security](#privacy--security)
9. [FAQ](#frequently-asked-questions)

---

## What is SubScan?

SubScan is a **100% private** web application that helps you discover hidden subscriptions and recurring charges in your bank statements. All processing happens directly in your browser - your financial data never leaves your device.

### Key Benefits:
- 🔍 **Find Hidden Subscriptions**: Discover recurring charges you may have forgotten about
- 💰 **Save Money**: Identify and cancel unwanted subscriptions
- 📊 **Visualize Spending**: See where your money goes each month
- 🔒 **Complete Privacy**: No data uploaded to servers, ever
- ⚡ **Instant Results**: Get insights in seconds

---

## Getting Started

### What You'll Need:
- **PDF Bank Statements**: Download from your bank's website
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge
- **5 Minutes**: That's all it takes!

### Quick Start:
1. Visit [subscan.app](https://subscan.app)
2. Click "Upload Bank Statements" or drag & drop your PDFs
3. View detected subscriptions instantly
4. Export results for your records

---

## Supported Banks & File Types

### ✅ Fully Supported Banks:
- **Wells Fargo** - Personal & Business Checking/Savings
- **Bank of America** - All account types
- **Chase** - Checking, Savings, Credit Cards
- **Capital One** - All Venture & Quicksilver cards
- **Discover** - Credit cards

### 📄 File Requirements:
- **Format**: PDF only (not scanned images)
- **Size**: Up to 10MB per file
- **Protection**: Must be unprotected (no password)
- **Type**: Bank statements, credit card statements
- **Period**: Any date range (monthly statements work best)

### ❌ What Won't Work:
- Screenshots or photos of statements
- Password-protected PDFs
- Scanned paper statements (unless OCR quality is excellent)
- Excel/CSV files (PDF only)
- Investment account statements

---

## Step-by-Step Instructions

### Step 1: Download Your Bank Statements

#### From Wells Fargo:
1. Log into Wells Fargo Online
2. Go to "Statements & Documents"
3. Select your account
4. Click "Download" next to desired statement
5. Choose "PDF" format

#### From Bank of America:
1. Sign in to Online Banking
2. Click "Statements & Documents"
3. Select account and date range
4. Download as PDF

#### From Chase:
1. Sign in to Chase.com
2. Click "Statements & documents"
3. Select your account
4. Download PDF statements

#### From Other Banks:
Look for "Statements", "Documents", or "Download" in your online banking.

### Step 2: Upload to SubScan

#### Method A: Drag & Drop
1. Open SubScan in your browser
2. Locate your PDF files on your computer
3. Drag the files onto the upload area
4. Files will start processing automatically

#### Method B: Click to Browse
1. Click "Select Files" button
2. Navigate to your PDFs
3. Select one or multiple files (Ctrl/Cmd+Click)
4. Click "Open"

#### Method C: Try Sample PDFs
1. Click "Try with Sample PDFs"
2. Download a sample statement
3. Upload it to see how SubScan works

### Step 3: Wait for Processing

- **Processing Time**: 2-10 seconds per statement
- **What Happens**: 
  - Text extraction from PDF
  - Transaction parsing
  - Pattern detection
  - Merchant identification
  - Recurrence analysis

You'll see a loading spinner with "Processing PDFs..." message.

### Step 4: Review Results

After processing, you'll see your dashboard with detected subscriptions.

---

## Understanding Your Results

### Dashboard Overview

#### Top Statistics:
- **Monthly Spend**: Total recurring charges per month
- **Annual Projection**: Estimated yearly subscription costs
- **Active Subscriptions**: Currently charging subscriptions
- **Inactive**: Subscriptions that appear cancelled

### Subscription Cards

Each detected subscription shows:

#### 1. **Merchant Name**
- The company charging you
- Cleaned and normalized for clarity

#### 2. **Amount**
- Average charge amount
- May vary slightly month-to-month

#### 3. **Pattern Badge**
- 🔄 **Monthly**: Charges every month
- 📅 **Weekly**: Charges every week
- 📆 **Biweekly**: Every two weeks
- 🗓️ **Quarterly**: Every three months
- 📆 **Annual**: Once per year

#### 4. **Confidence Score**
- **80-100%**: Very likely a subscription (green)
- **50-79%**: Probably a subscription (yellow)
- **Below 50%**: Possibly recurring (red)

#### 5. **Status Indicator**
- ✅ **Active**: Still charging your account
- ⏸️ **Inactive**: No recent charges (possibly cancelled)

#### 6. **Next Due Date**
- Predicted date of next charge
- Based on historical pattern

### Analytics View

Toggle to "Analytics Dashboard" to see:

#### Spending Insights:
- **Category Breakdown**: Entertainment, Software, Fitness, etc.
- **Spending Trends**: How subscriptions change over time
- **Pattern Distribution**: Types of billing cycles
- **Confidence Levels**: Accuracy of detections

#### Visual Charts:
- Pie chart of spending by category
- Bar graph of monthly trends
- Timeline of subscription starts

---

## Export Options

### Available Formats:

#### 1. **CSV (Spreadsheet)**
Best for: Excel, Google Sheets, budgeting apps

**Contains:**
- Merchant name
- Pattern (monthly, weekly, etc.)
- Average amount
- Next due date
- Confidence percentage
- Active/Inactive status

**How to use:**
1. Click Export → Export as CSV
2. Open in Excel or Google Sheets
3. Sort, filter, and analyze

#### 2. **JSON (Data)**
Best for: Developers, advanced analysis

**Contains:**
- Complete transaction history
- Detailed pattern analysis
- All metadata

**How to use:**
1. Click Export → Export as JSON
2. Use in custom applications
3. Import to other tools

#### 3. **ICS (Calendar)**
Best for: Calendar reminders

**Contains:**
- Recurring events for each subscription
- Payment reminders
- Due date alerts

**How to use:**
1. Click Export → Export as ICS
2. Import to Google Calendar, Outlook, or Apple Calendar
3. Get payment reminders

---

## Troubleshooting

### Common Issues & Solutions:

#### "Bank format not recognized"
**Problem**: SubScan can't identify your bank
**Solutions**:
- Ensure PDF is from supported bank
- Try a different statement period
- Check PDF isn't corrupted

#### "No subscriptions detected"
**Problem**: No recurring charges found
**Possible Reasons**:
- Statement period too short (need 2+ months)
- No recurring charges in account
- Transactions too irregular

#### "PDF file may be corrupted"
**Problem**: Can't read the PDF file
**Solutions**:
- Re-download from your bank
- Ensure file isn't password-protected
- Try opening in Adobe Reader first

#### "Processing takes too long"
**Problem**: Large file or slow processing
**Solutions**:
- Try smaller date ranges
- Upload one file at a time
- Refresh page and try again

### Error Messages Explained:

| Error | Meaning | Solution |
|-------|---------|----------|
| "Failed to process PDF" | File corrupted or protected | Re-download from bank |
| "Unable to detect bank type" | Unknown bank format | Manual review needed |
| "No transactions found" | Empty or invalid statement | Check file content |
| "Parsing errors occurred" | Some transactions skipped | Review results carefully |

---

## Privacy & Security

### Your Data is Safe:

#### 🔒 **100% Client-Side Processing**
- All analysis happens in your browser
- No data sent to servers
- No account creation required
- No tracking or analytics

#### 🛡️ **Security Measures**:
- HTTPS encryption
- No data storage
- No cookies tracking financial info
- Open-source for transparency

#### ✅ **What We CAN'T See**:
- Your bank statements
- Your transactions
- Your personal information
- Your subscription data

#### ❌ **What We DON'T Do**:
- Store your PDFs
- Track your spending
- Sell your data
- Share with third parties

---

## Frequently Asked Questions

### General Questions

**Q: Is SubScan really free?**
A: Yes, completely free with no hidden costs.

**Q: Do I need to create an account?**
A: No, SubScan works without any sign-up.

**Q: Can I use SubScan on my phone?**
A: Yes, it works on mobile browsers, though desktop is recommended for best experience.

**Q: How accurate is the detection?**
A: Typically 85-95% accurate for major subscriptions. Check confidence scores for reliability.

### Technical Questions

**Q: What browsers are supported?**
A: Chrome, Firefox, Safari, Edge (latest versions).

**Q: Can I process multiple accounts?**
A: Yes, upload statements from different banks simultaneously.

**Q: How far back can I analyze?**
A: Any period - SubScan handles both recent and historical statements.

**Q: Why can't I upload Excel/CSV files?**
A: SubScan is designed for PDF bank statements which maintain formatting and structure.

### Privacy Questions

**Q: Where is my data processed?**
A: Entirely in your browser - no server processing.

**Q: Can SubScan access my bank account?**
A: No, SubScan only reads PDFs you manually upload.

**Q: Is my data stored anywhere?**
A: No, all data is deleted when you close the browser tab.

**Q: Can employers/others see my data?**
A: No, processing is 100% local to your device.

### Troubleshooting Questions

**Q: Why aren't my subscriptions showing?**
A: Ensure you've uploaded at least 2-3 months of statements for pattern detection.

**Q: Can I save my results?**
A: Yes, use the Export feature to save as CSV, JSON, or ICS.

**Q: What if my bank isn't supported?**
A: Try uploading anyway - SubScan attempts to parse most PDF formats.

**Q: How do I report a bug?**
A: Open an issue on [GitHub](https://github.com/yourusername/SubScan).

---

## Pro Tips

### 💡 **Get Better Results:**
1. Upload 3-6 months of statements for best accuracy
2. Include both checking and credit card statements
3. Review low-confidence detections manually
4. Use the Analytics view for deeper insights

### 💰 **Save More Money:**
1. Sort by amount to find biggest expenses
2. Filter by "Inactive" to find forgotten subscriptions
3. Export to calendar for cancellation reminders
4. Check annual subscriptions you might miss monthly

### 🚀 **Power User Features:**
1. Upload multiple accounts at once
2. Use JSON export for custom analysis
3. Compare months to spot price increases
4. Set calendar reminders for annual renewals

---

## Getting Help

### Need Assistance?
- **Documentation**: [GitHub README](https://github.com/yourusername/SubScan)
- **Report Issues**: [GitHub Issues](https://github.com/yourusername/SubScan/issues)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)

### Quick Actions:
- 🔄 **Refresh page** if something seems stuck
- 🗑️ **Clear browser cache** for persistent issues
- 📧 **Check PDF** isn't password-protected
- 💻 **Try different browser** if problems persist

---

## Summary

SubScan makes it easy to:
1. **Upload** bank statement PDFs
2. **Detect** recurring subscriptions automatically
3. **Analyze** spending patterns and trends
4. **Export** results for budgeting
5. **Save** money by cancelling unwanted subscriptions

All while keeping your financial data 100% private and secure.

---

*Last Updated: January 2025*
*Version: 1.0.0*