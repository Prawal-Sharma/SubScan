# SubScan Development Guide

## Project Overview
I am building SubScan, a privacy-focused web tool that detects recurring expenses from PDF bank and credit card statements. All processing happens client-side to ensure user privacy.

## Core Development Principles

### 1. Privacy First
- **All processing must happen in-browser** - No server-side processing of user data
- PDFs are never uploaded to any server
- No user data is stored or transmitted

### 2. Incremental Development & Testing
- **Test every new feature thoroughly before moving on**
- Run the application locally after each major change
- Test with the provided PDF samples in `/Users/prawalsharma/Desktop/statements/`
- Verify parsing accuracy with real bank statements

### 3. Git Workflow
- **Commit frequently with clear, descriptive messages**
- Push to remote repository after each working feature
- Never mention "Claude" or AI assistance in commits
- Write commits as if I personally implemented the changes
- Example: "Add Wells Fargo parser implementation" not "Claude added Wells Fargo parser"

## Technical Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **PDF Processing**: PDF.js for text extraction, Tesseract.js for OCR
- **Data Processing**: date-fns, lodash, fuse.js for fuzzy matching
- **Deployment**: Vercel/Netlify (static hosting)

### Key Components

1. **PDF Parser Pipeline**
   - Extract text from PDF using PDF.js
   - Detect table structures
   - Map columns to transaction fields
   - Handle bank-specific formats
   - Validate file size and type
   - Clean up resources after processing

2. **Transaction Normalization**
   - Clean merchant names (remove "POS", "WEB PMT", etc.)
   - Standardize dates to ISO format
   - Normalize amounts (handle debits/credits)
   - Group similar merchants
   - Enhanced merchant mappings (Netflix, Spotify, etc.)
   - Filter out refunds and reversals

3. **Recurrence Detection (Enhanced)**
   - Adaptive thresholds based on merchant category
   - Support for usage-based billing (utilities)
   - Calculate intervals between transactions
   - Identify patterns (weekly/monthly/annual)
   - Score confidence based on consistency
   - Project next occurrence

4. **User Feedback System**
   - Edit subscription details (name, amount, frequency)
   - Confirm accurate detections
   - Dismiss false positives
   - Add notes and categories
   - Custom naming for subscriptions

5. **State Management**
   - Multi-file/multi-bank handling
   - Transaction deduplication
   - Session persistence to localStorage
   - Memory cleanup for large files
   - Statement coverage tracking

## Bank Parser Patterns

### Wells Fargo
- Date format: MM/DD
- Transaction format: Date | Check Number | Description | Deposits/Additions | Withdrawals/Subtractions | Ending Balance
- Key patterns:
  - "Recurring Payment authorized on"
  - "Purchase authorized on"
  - Merchant name often includes location/state

### Capital One Venture
- Date format: Mon DD
- Transaction format: Trans Date | Post Date | Description | Amount
- Separate sections for payments, transactions, fees, interest
- Clean merchant names without excessive prefixes

## Testing Requirements

### Before Every Commit
1. Run `npm run dev` and test the UI
2. Upload at least one test PDF
3. Verify transaction extraction works
4. Check that recurring patterns are detected
5. Test user feedback system (edit/confirm/dismiss)
6. Verify session persistence (refresh page)
7. Test export functionality (CSV/JSON/ICS)
8. Check mobile responsiveness
9. Test "Start Over" functionality
10. Verify no console.log with sensitive data

### Test Commands
```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development Checklist

### For Each New Feature
- [ ] Write TypeScript interfaces first
- [ ] Implement core logic with unit tests
- [ ] Add UI components
- [ ] Test with real PDF data
- [ ] Test on mobile devices
- [ ] Check memory usage with large files
- [ ] Verify error handling and recovery
- [ ] Update documentation if needed
- [ ] Remove any console.log statements
- [ ] Commit with descriptive message (no AI mentions)
- [ ] Push to GitHub

### For Each Parser
- [ ] Handle date format variations
- [ ] Extract all transaction fields
- [ ] Normalize merchant names
- [ ] Handle multi-page statements
- [ ] Test with multiple statement samples
- [ ] Add fallback for unknown formats

## Common Patterns to Strip

When normalizing merchant names, remove these prefixes/suffixes:
- `POS DEBIT`
- `WEB PMT`
- `ONLINE PMT`
- `RECURRING PAYMENT`
- `Purchase authorized on MM/DD`
- `Card XXXX` (card number references)
- Transaction IDs (long alphanumeric strings)
- Location codes after merchant name

## Enhanced Merchant Mappings

The system now recognizes variations of common services:
- Netflix variations: NETFLIX, NETFLIX.COM, NETFLIX INC
- Spotify variations: SPOTIFY, SPOTIFYUSA, SPOTIFY USA
- Apple variations: APPLE.COM, APL ITUNES, APPLE COM BILL
- And 20+ more common services

## Adaptive Detection Categories

Different merchant types have different variance tolerances:
- **Streaming Services**: 5% variance (fixed pricing)
- **Utilities**: 50% variance (usage-based)
- **Telecom**: 30% variance (plan changes)
- **Gym/Fitness**: 10% variance (membership fees)
- **Software**: 20% variance (tiered plans)
- **Insurance**: 15% variance (policy adjustments)

## Performance Targets

- PDF parsing: < 2 seconds for 10-page statement
- Pattern detection: < 1 second for 100 transactions
- UI should remain responsive during processing
- Use Web Workers for heavy computation if needed

## Security Considerations

- Never log sensitive transaction data to console in production
- Clear memory after processing
- Use Content Security Policy headers
- Sanitize any user-provided input
- No external API calls with user data

## Deployment Notes

- Build generates static files only
- No server-side rendering needed
- Can be hosted on any static file server
- Enable CORS for PDF.js worker files
- Compress assets with gzip/brotli

## Future Enhancements

1. Support more banks (Chase, Bank of America, etc.)
2. Email receipt parsing
3. Budget tracking features
4. Spending analytics
5. Mobile app version
6. Browser extension

## New Components & Features

### EnhancedRecurrenceDetector
- Adaptive thresholds for different billing cycles
- Merchant category awareness
- Filters out refunds and reversals automatically
- Better handling of February billing cycles

### SubscriptionManager
- Interactive UI for managing detected subscriptions
- Edit capabilities for all subscription properties
- Confirmation/dismissal system
- Notes and categorization

### Session Persistence
- Automatic save to localStorage
- 30-day retention policy
- Restore on page refresh
- Export session data

### Enhanced Dashboard
- Bank-specific filtering
- Statement coverage visualization
- Gap detection in data
- Source attribution for charges
- Mobile responsive design

## Resources

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [Tesseract.js Guide](https://tesseract.projectnaptha.com/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

Remember: Always prioritize user privacy and data security. This tool's value proposition is that users can analyze their financial data without sharing it with anyone.