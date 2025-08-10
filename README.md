# SubScan - Uncover Hidden Subscriptions

SubScan is a privacy-focused web application that helps you identify recurring charges and subscriptions from your bank and credit card statements. All processing happens locally in your browser - your financial data never leaves your device.

## Features

- **100% Private**: All PDF processing happens in your browser
- **Smart Detection**: Adaptive algorithms with merchant category awareness
- **User Control**: Edit, confirm, or dismiss detected subscriptions
- **Multi-Bank Support**: Works with Wells Fargo, Bank of America, Chase, Capital One, Discover
- **Session Persistence**: Your work is automatically saved and restored
- **Analytics Dashboard**: Visual insights into your subscription spending patterns
- **Statement Coverage**: See gaps and overlaps in your financial data
- **Multiple Export Formats**: CSV, JSON, and ICS calendar formats
- **Mobile Friendly**: Fully responsive design for all devices
- **No Account Required**: No sign-up, no tracking, just upload and analyze

## Quick Start

### Online Version
Visit [subscan.vercel.app](https://subscan.vercel.app) to use SubScan instantly.

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/Prawal-Sharma/SubScan.git
cd SubScan
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## How It Works

1. **Upload Your Statements**: Drag and drop PDF bank statements (max 50MB each)
2. **Automatic Analysis**: SubScan extracts transactions and identifies patterns
3. **Review & Edit**: Confirm accurate detections, dismiss false positives, edit details
4. **Organize**: Add custom names, categories, and notes to subscriptions
5. **Analytics Dashboard**: Visualize spending patterns and trends
6. **Export Data**: Download results as CSV, JSON, or calendar (ICS) format
7. **Session Saved**: Your work is automatically saved to browser storage

## Supported Banks

Currently supported:
- Wells Fargo ✅
- Bank of America ✅
- Chase ✅
- Capital One ✅
- Discover ✅

**Coming Soon:**
- Citi
- US Bank
- PNC

Don't see your bank? Upload anyway - SubScan will attempt to parse most PDF statements.

## Privacy & Security

SubScan is built with privacy as the top priority:

- **No Server Processing**: All PDF parsing happens in your browser using PDF.js
- **No Data Storage**: Your financial data is never uploaded or stored
- **No Tracking**: No analytics or user tracking
- **Open Source**: Review the code to verify our privacy claims
- **Secure Headers**: Implements security best practices

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5 with optimized code splitting
- **Styling**: Tailwind CSS 3
- **PDF Processing**: PDF.js with multi-bank parser support
- **Pattern Detection**: Adaptive algorithms with merchant category awareness
- **User Feedback**: Interactive subscription management system
- **State Management**: Enhanced deduplication and session persistence
- **Analytics**: Real-time dashboard with spending insights
- **Export**: Multiple format support (CSV, JSON, ICS)
- **Deployment**: Vercel with edge optimization

## Deployment

### Quick Deploy to Vercel

1. Fork this repository
2. Sign up for [Vercel](https://vercel.com)
3. Import your forked repository
4. Vercel will automatically detect the configuration and deploy

### Custom Domain Setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on:
- Setting up GoDaddy custom domain with Vercel
- Performance optimization
- Production configuration
- Monitoring and analytics

**Quick GoDaddy Setup:**
1. Add domain in Vercel project settings
2. In GoDaddy DNS:
   - For root domain: Add A record → `76.76.21.21`
   - For subdomain: Add CNAME → `cname.vercel-dns.com`
3. SSL automatically provisioned by Vercel

## Development

### Project Structure

```
SubScan/
├── src/
│   ├── components/         # React components
│   │   ├── Dashboard.tsx  # Main dashboard
│   │   ├── AnalyticsDashboard.tsx  # Analytics view
│   │   └── ...
│   ├── engines/           # Core processing engines
│   │   ├── pdfProcessor.ts
│   │   ├── recurrenceDetector.ts
│   │   └── enhancedRecurrenceDetector.ts
│   ├── parsers/           # Bank-specific parsers
│   │   ├── wellsFargoParser.ts
│   │   ├── bankOfAmericaParser.ts
│   │   ├── chaseParser.ts
│   │   ├── discoverParser.ts
│   │   └── capitalOneParser.ts
│   ├── types/             # TypeScript definitions
│   ├── utils/             # Utility functions
│   │   ├── exportUtils.ts
│   │   ├── dateUtils.ts
│   │   ├── merchantNormalizer.ts
│   │   ├── deduplication.ts
│   │   ├── stateManagement.ts
│   │   ├── sessionPersistence.ts
│   │   └── errorHandling.ts
│   └── App.tsx           # Main application
├── public/               # Static assets
├── vercel.json          # Deployment configuration
└── vite.config.ts       # Build optimization
```

### Adding New Bank Parsers

1. Create a new parser in `src/parsers/`
2. Implement the parser interface
3. Register in `PDFProcessor`
4. Test with sample statements

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run test suite
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate test coverage report

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Troubleshooting

### Common Issues

**PDF won't upload:**
- Ensure file is under 50MB
- Verify it's a valid PDF (not password-protected)
- Try downloading a fresh copy from your bank

**No subscriptions detected:**
- Check if your bank is supported
- Ensure statement contains at least 2 months of data
- Try uploading multiple statements for better detection

**False positives:**
- Use the dismiss button to remove incorrect detections
- Edit subscription details to correct amounts or frequency
- The system learns from your feedback

**Data not saving:**
- Check browser's localStorage is enabled
- Try using a different browser
- Clear browser cache if issues persist

## Disclaimer

SubScan is a tool for informational purposes only. Always verify detected subscriptions with your actual bank statements. The accuracy of detection depends on the quality and format of your PDF statements.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Built with privacy in mind. Your financial data stays yours.