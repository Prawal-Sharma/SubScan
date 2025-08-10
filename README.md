# SubScan - Uncover Hidden Subscriptions

SubScan is a privacy-focused web application that helps you identify recurring charges and subscriptions from your bank and credit card statements. All processing happens locally in your browser - your financial data never leaves your device.

## Features

- **100% Private**: All PDF processing happens in your browser
- **Smart Detection**: Advanced algorithms identify recurring patterns with confidence scoring
- **Multi-Bank Support**: Works with Wells Fargo, Bank of America, Chase, Capital One, Discover, and more
- **Analytics Dashboard**: Visual insights into your subscription spending patterns
- **Multiple Export Formats**: CSV, JSON, and ICS calendar formats
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

1. **Upload Your Statements**: Drag and drop PDF bank statements
2. **Automatic Analysis**: SubScan extracts transactions and identifies patterns
3. **Review Results**: See all detected subscriptions with confidence scores
4. **Export Data**: Download results as CSV for further analysis

## Supported Banks

Currently supported:
- Wells Fargo ✅
- Bank of America ✅
- Chase ✅
- Capital One ✅
- Discover ✅

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
- **Pattern Detection**: Advanced ML-inspired algorithms with confidence scoring
- **Analytics**: Real-time dashboard with spending insights
- **Export**: Multiple format support (CSV, JSON, ICS)
- **Deployment**: Vercel with edge optimization

## Deployment

### Deploy to Vercel

1. Fork this repository
2. Sign up for [Vercel](https://vercel.com)
3. Import your forked repository
4. Vercel will automatically detect the configuration and deploy

### Custom Domain Setup

1. In Vercel dashboard, go to your project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update your DNS records as instructed by Vercel:
   - For apex domain: Add A record pointing to `76.76.21.21`
   - For subdomain: Add CNAME record pointing to `cname.vercel-dns.com`

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
│   │   ├── PDFProcessor.ts
│   │   ├── recurrenceDetector.ts
│   │   └── advancedRecurrenceDetector.ts
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
│   │   └── merchantNormalizer.ts
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

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

SubScan is a tool for informational purposes only. Always verify detected subscriptions with your actual bank statements. The accuracy of detection depends on the quality and format of your PDF statements.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Built with privacy in mind. Your financial data stays yours.