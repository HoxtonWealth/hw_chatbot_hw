// ============================================================
// src/lib/intent-classifier.ts — Lightweight query intent classification
// ============================================================
// Classifies user queries into intent categories for routing
// and analytics. Rule-based for speed — no LLM call needed.
// ============================================================

export type IntentCategory =
  | 'pension_transfer'
  | 'investment'
  | 'tax_planning'
  | 'retirement'
  | 'estate_planning'
  | 'general_info'
  | 'booking_request'
  | 'greeting'
  | 'off_topic'

export interface ClassificationResult {
  intent: IntentCategory
  confidence: number // 0–1
  secondaryIntent?: IntentCategory
}

interface IntentRule {
  intent: IntentCategory
  patterns: RegExp[]
  keywords: string[]
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'booking_request',
    patterns: [
      /\b(book|schedule|arrange)\b.*\b(call|meeting|appointment|consultation|chat)\b/i,
      /\bspeak\b.*\b(to|with)\b.*\b(someone|adviser|advisor|person|human)\b/i,
      /\b(get in touch|contact|reach out|talk to)\b/i,
      /\bcalendly\b/i,
    ],
    keywords: ['book a call', 'schedule', 'appointment', 'speak to someone', 'talk to an advisor', 'get in touch', 'contact you'],
  },
  {
    intent: 'pension_transfer',
    patterns: [
      /\b(pension|pensions)\b.*\b(transfer|move|consolidat|switch)\b/i,
      /\b(transfer|move|consolidat)\b.*\b(pension|pensions)\b/i,
      /\bqrops\b/i,
      /\bsipp\b/i,
      /\bserps\b/i,
      /\bdefined\s+(benefit|contribution)\b/i,
      /\bfinal\s+salary\b/i,
      /\bpension\s+(pot|fund|scheme|plan|value|worth)\b/i,
    ],
    keywords: ['qrops', 'sipp', 'pension transfer', 'pension', 'defined benefit', 'defined contribution', 'final salary', 'pension pot', 'pension fund', 'annuity', 'drawdown'],
  },
  {
    intent: 'retirement',
    patterns: [
      /\bretir(e|ing|ement)\b/i,
      /\bretirement\s+(planning|plan|income|age|abroad|overseas)\b/i,
      /\b(early|late)\s+retirement\b/i,
      /\bstate\s+pension\b/i,
    ],
    keywords: ['retirement', 'retire', 'retiring', 'retirement planning', 'retirement income', 'state pension', 'retirement abroad'],
  },
  {
    intent: 'tax_planning',
    patterns: [
      /\btax\b.*\b(planning|efficient|relief|free|benefit|implications?|liability|return|allowance)\b/i,
      /\btax[- ]efficient\b/i,
      /\b(capital\s+gains|inheritance\s+tax|income\s+tax|cgt|iht)\b/i,
      /\btax\s+(resident|residency|domicile)\b/i,
      /\bcross[- ]?border\s+tax\b/i,
      /\bdouble\s+taxation\b/i,
    ],
    keywords: ['tax planning', 'tax efficient', 'tax-efficient', 'capital gains', 'inheritance tax', 'tax relief', 'tax residency', 'double taxation', 'tax implications', 'cgt', 'iht'],
  },
  {
    intent: 'investment',
    patterns: [
      /\binvest(ing|ment|ments|or)?\b/i,
      /\bportfolio\b/i,
      /\b(stocks?|shares?|bonds?|funds?|etfs?|isas?)\b/i,
      /\basset\s+(allocation|management|class)\b/i,
      /\bwealth\s+(management|building|growth)\b/i,
      /\bmanage\b.*\bwealth\b/i,
      /\bsavings?\b/i,
    ],
    keywords: ['investment', 'investing', 'portfolio', 'stocks', 'shares', 'bonds', 'funds', 'isa', 'asset allocation', 'wealth management', 'savings'],
  },
  {
    intent: 'estate_planning',
    patterns: [
      /\bestate\s+(planning|plan)\b/i,
      /\b(will|wills|trust|trusts)\b.*\b(planning|set up|create|need)\b/i,
      /\binheritance\b(?!.*\btax\b)/i,
      /\bprobate\b/i,
      /\bsuccession\s+planning\b/i,
    ],
    keywords: ['estate planning', 'will', 'trust', 'inheritance', 'probate', 'succession planning', 'legacy'],
  },
  {
    intent: 'general_info',
    patterns: [
      /\b(what|who|where|how|tell me)\b.*\b(hoxton|you|your)\b/i,
      /\b(services?|offer|provide)\b/i,
      /\bdo you\b.*\b(offer|provide|have|do)\b/i,
      /\b(offices?|locations?|countries|based)\b/i,
      /\bfca\b/i,
      /\bregulated\b/i,
      /\b(fees?|charges?|cost|pricing)\b/i,
    ],
    keywords: ['hoxton wealth', 'services', 'what do you offer', 'tell me about', 'where are you', 'offices', 'fees', 'how it works'],
  },
  {
    intent: 'greeting',
    patterns: [
      /^(hi|hello|hey|good\s+(morning|afternoon|evening)|howdy|greetings)[\s!.,?]*$/i,
      /^(thanks?|thank\s+you|cheers)[\s!.,?]*$/i,
    ],
    keywords: [],
  },
]

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function classifyIntent(query: string): ClassificationResult {
  const normalised = normalise(query)
  const scores: { intent: IntentCategory; score: number }[] = []

  for (const rule of INTENT_RULES) {
    let score = 0

    // Pattern matches (stronger signal)
    for (const pattern of rule.patterns) {
      if (pattern.test(query)) {
        score += 0.4
      }
    }

    // Keyword matches (weaker but cumulative)
    for (const keyword of rule.keywords) {
      if (normalised.includes(keyword.toLowerCase())) {
        score += 0.2
      }
    }

    // Cap at 1.0
    score = Math.min(score, 1.0)

    if (score > 0) {
      scores.push({ intent: rule.intent, score })
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  if (scores.length === 0) {
    return { intent: 'off_topic', confidence: 0.3 }
  }

  const primary = scores[0]
  const secondary = scores.length > 1 ? scores[1] : undefined

  return {
    intent: primary.intent,
    confidence: primary.score,
    secondaryIntent: secondary?.intent,
  }
}

// Map intents to Hoxton service areas for analytics/routing
export const INTENT_SERVICE_MAP: Record<IntentCategory, string | null> = {
  pension_transfer: 'Pension Transfers',
  investment: 'Investment Management',
  tax_planning: 'Tax Planning',
  retirement: 'Retirement Planning',
  estate_planning: 'Estate Planning',
  general_info: null,
  booking_request: null,
  greeting: null,
  off_topic: null,
}
