// Configuration for recurrence detection algorithms
export const DETECTION_CONFIG = {
  // Minimum number of transactions to consider a pattern recurring
  MIN_TRANSACTIONS: 2,
  
  // Merchant similarity threshold (0-1, higher = stricter matching)
  SIMILARITY_THRESHOLD: 0.8,
  SIMILARITY_THRESHOLD_ADVANCED: 0.75,
  
  // Amount variance threshold (percentage)
  AMOUNT_VARIANCE_THRESHOLD: 0.2, // 20%
  AMOUNT_VARIANCE_THRESHOLD_ADVANCED: 0.25, // 25%
  
  // Statistical outlier detection (standard deviations)
  OUTLIER_THRESHOLD: 2.5,
  
  // Pattern detection ranges (in days)
  PATTERNS: {
    WEEKLY: { min: 5, max: 9, ideal: 7 },
    BIWEEKLY: { min: 11, max: 17, ideal: 14 },
    MONTHLY: { min: 25, max: 35, ideal: 30 },
    QUARTERLY: { min: 80, max: 100, ideal: 90 },
    ANNUAL: { min: 335, max: 395, ideal: 365 },
  },
  
  // Confidence scoring
  CONFIDENCE: {
    HIGH_THRESHOLD: 80,
    MEDIUM_THRESHOLD: 50,
    BOOST_FOR_KNOWN_SUBSCRIPTIONS: 20,
    BOOST_FOR_MATCHING_AMOUNT: 10,
  },
  
  // Active subscription detection
  ACTIVE_SUBSCRIPTION: {
    // Multiplier for expected interval to determine if subscription is still active
    TOLERANCE_MULTIPLIER: 1.5,
    TOLERANCE_MULTIPLIER_ANNUAL: 2.0,
  },
};

// Known subscription services and their typical pricing
export const KNOWN_SUBSCRIPTIONS = new Map<string, { pattern: string; typical: number[] }>([
  ['netflix', { pattern: 'monthly', typical: [8.99, 12.99, 15.99, 19.99] }],
  ['spotify', { pattern: 'monthly', typical: [9.99, 15.99] }],
  ['youtube', { pattern: 'monthly', typical: [11.99, 15.99, 22.99, 72.99] }],
  ['amazon prime', { pattern: 'monthly', typical: [14.99, 139] }],
  ['hulu', { pattern: 'monthly', typical: [7.99, 12.99, 69.99, 75.99] }],
  ['disney', { pattern: 'monthly', typical: [7.99, 13.99] }],
  ['apple', { pattern: 'monthly', typical: [0.99, 4.99, 9.99, 14.99, 19.99] }],
  ['microsoft', { pattern: 'monthly', typical: [6.99, 9.99, 12.99] }],
  ['adobe', { pattern: 'monthly', typical: [9.99, 19.99, 52.99] }],
  ['dropbox', { pattern: 'monthly', typical: [9.99, 11.99, 19.99] }],
  ['gym', { pattern: 'monthly', typical: [10, 20, 30, 40, 50] }],
  ['fitness', { pattern: 'monthly', typical: [10, 15, 20, 30, 40] }],
  ['life time', { pattern: 'monthly', typical: [99, 149, 199, 249] }],
  ['peloton', { pattern: 'monthly', typical: [12.99, 44] }],
]);

// Category detection patterns
export const CATEGORY_PATTERNS = {
  ENTERTAINMENT: ['netflix', 'hulu', 'disney', 'hbo', 'youtube', 'prime video', 'paramount', 'peacock'],
  MUSIC: ['spotify', 'apple music', 'pandora', 'tidal', 'amazon music', 'soundcloud'],
  FITNESS: ['gym', 'fitness', 'peloton', 'life time', 'planet fitness', 'equinox', 'crossfit'],
  SOFTWARE: ['dropbox', 'google', 'microsoft', 'adobe', 'slack', 'zoom', 'github'],
  UTILITIES: ['insurance', 'electric', 'gas', 'water', 'internet', 'phone', 'mobile'],
  NEWS_MEDIA: ['news', 'times', 'journal', 'magazine', 'wsj', 'economist', 'medium'],
  GAMING: ['xbox', 'playstation', 'steam', 'nintendo', 'epic games', 'twitch'],
  FOOD_DELIVERY: ['doordash', 'uber eats', 'grubhub', 'postmates', 'instacart'],
};