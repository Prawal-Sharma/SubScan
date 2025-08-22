const PREFIXES_TO_REMOVE = [
  'POS DEBIT',
  'POS PURCHASE',
  'WEB PMT',
  'ONLINE PMT',
  'RECURRING PAYMENT',
  'Purchase authorized on',
  'Recurring Payment authorized on',
  'CHECKCARD',
  'DEBIT CARD PURCHASE',
  'VISA PURCHASE',
  'ACH DEBIT',
  'ACH CREDIT',
  'ONLINE TRANSFER',
  'MOBILE TRANSFER',
  'SQ *',
  'TST*',
  'SP ',
  'AMZ*',
  'AMAZON MKTPL*',
];

const SUFFIXES_TO_REMOVE = [
  /Card \d{4}$/,
  /\s+\d{10,}$/, // Long transaction IDs
  /\s+[A-Z0-9]{15,}$/, // Reference numbers
  /\s+REF#[A-Z0-9]+$/i,
  /\s+AUTH#[A-Z0-9]+$/i,
  /\s+ID:\s*[A-Z0-9]+$/i,
];

const LOCATION_PATTERNS = [
  /\s+(TX|CA|NY|FL|IL|PA|OH|GA|NC|MI|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY|DC)\s*$/,
  /\s+\d{5}(-\d{4})?$/, // ZIP codes
  /\s+[A-Z][a-z]+\s+(TX|CA|NY|FL|IL|PA|OH|GA|NC|MI)$/, // City + State
];

export function normalizeMerchant(merchant: string): string {
  if (!merchant) return '';
  
  let normalized = merchant.trim().toUpperCase();
  
  // Remove date patterns
  normalized = normalized.replace(/\d{2}\/\d{2}(\s|$)/g, '');
  normalized = normalized.replace(/\d{2}-\d{2}(\s|$)/g, '');
  
  // Remove common prefixes
  for (const prefix of PREFIXES_TO_REMOVE) {
    if (normalized.startsWith(prefix.toUpperCase())) {
      normalized = normalized.substring(prefix.length).trim();
    }
  }
  
  // Remove suffixes
  for (const pattern of SUFFIXES_TO_REMOVE) {
    normalized = normalized.replace(pattern, '');
  }
  
  // Extract core merchant name before location
  for (const pattern of LOCATION_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }
  
  // Remove special characters but keep spaces and basic punctuation
  normalized = normalized.replace(/[^A-Z0-9\s&\-'.]/g, ' ');
  
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Special cases for known merchants - expanded list
  const merchantMappings: Record<string, string> = {
    'GOOGLE YOUTUBE TV': 'YOUTUBE TV',
    'GOOGLE YOUTUBEPRE': 'YOUTUBE PREMIUM',
    'GOOGLE YOUTUBE': 'YOUTUBE',
    'LTF LIFE TIME': 'LIFETIME FITNESS',
    'HLU HULU': 'HULU',
    'HLU HULUPLUS': 'HULU PLUS',
    'DD DOORDASH': 'DOORDASH',
    'AMZN': 'AMAZON',
    'WM SUPERCENTER': 'WALMART',
    'WMT': 'WALMART',
    'H-E-B': 'HEB GROCERY',
    'H E B': 'HEB GROCERY',
    'NETFLIX COM': 'NETFLIX',
    'NETFLIX INC': 'NETFLIX',
    'SPOTIFYUSA': 'SPOTIFY',
    'SPOTIFY USA': 'SPOTIFY',
    'SPOTIFY COM': 'SPOTIFY',
    'APPLE COM BILL': 'APPLE',
    'APPLE COM': 'APPLE',
    'APL ITUNES': 'APPLE ITUNES',
    'UBER TRIP': 'UBER',
    'UBER EATS': 'UBER EATS',
    'LYFT RIDE': 'LYFT',
    'GRUBHUB': 'GRUBHUB',
    'POSTMATES': 'POSTMATES',
    'INSTACART': 'INSTACART',
    'CHIPOTLE': 'CHIPOTLE',
    'STARBUCKS': 'STARBUCKS',
    'SBUX': 'STARBUCKS',
    'MCDONALDS': 'MCDONALDS',
    'MCD': 'MCDONALDS',
  };
  
  for (const [pattern, replacement] of Object.entries(merchantMappings)) {
    if (normalized.includes(pattern)) {
      return replacement;
    }
  }
  
  return normalized;
}

export function areMerchantsSimilar(merchant1: string, merchant2: string, threshold = 0.8): boolean {
  const norm1 = normalizeMerchant(merchant1);
  const norm2 = normalizeMerchant(merchant2);
  
  if (norm1 === norm2) return true;
  
  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Calculate similarity score (simple approach)
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w));
  
  const similarity = (commonWords.length * 2) / (words1.length + words2.length);
  return similarity >= threshold;
}