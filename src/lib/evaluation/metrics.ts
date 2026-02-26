// ============================================================
// src/lib/evaluation/metrics.ts — Response quality scoring
// ============================================================
// LLM-based grading and rule-based checks for evaluating
// chatbot responses against defined test cases.
// ============================================================

import { TestCase } from './test-cases'

export interface MetricScore {
  name: string
  score: number // 0–100
  pass: boolean
  details: string
}

export interface EvaluationResult {
  testCaseId: string
  query: string
  response: string
  metrics: MetricScore[]
  overallScore: number
  pass: boolean
}

// ─── Benchmarks (from Anthropic customer support guide) ──────

export const BENCHMARKS = {
  comprehension: { target: 95, description: 'Query comprehension accuracy' },
  relevance: { target: 90, description: 'Response relevance to the specific question' },
  accuracy: { target: 100, description: 'Correctness of factual information' },
  topicAdherence: { target: 95, description: 'Staying on topic / redirecting off-topic queries' },
  escalation: { target: 95, description: 'Recognising when human intervention is needed' },
  tone: { target: 90, description: 'Brand voice consistency' },
  citationRelevance: { target: 80, description: 'Relevant source citations when beneficial' },
} as const

// ─── Rule-based checks (fast, no LLM needed) ────────────────

const FORBIDDEN_VOCABULARY = [
  'world-class', 'unparalleled', 'leading', 'bespoke', 'holistic',
  'revolutionary', 'dreams', 'aspirations', 'disrupt', 'innovate',
  'transform', 'comprehensive suite', 'optimisation',
]

export function checkForbiddenVocabulary(response: string): MetricScore {
  const lower = response.toLowerCase()
  const found = FORBIDDEN_VOCABULARY.filter(word => lower.includes(word))

  return {
    name: 'forbidden_vocabulary',
    score: found.length === 0 ? 100 : 0,
    pass: found.length === 0,
    details: found.length === 0
      ? 'No forbidden vocabulary detected'
      : 'Found forbidden words: ' + found.join(', '),
  }
}

export function checkResponseLength(response: string): MetricScore {
  const paragraphs = response.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  const wordCount = response.split(/\s+/).length

  // Target: 2-3 short paragraphs, roughly 50-200 words
  const tooShort = wordCount < 20
  const tooLong = wordCount > 400 || paragraphs.length > 5

  let score = 100
  let details = ''

  if (tooShort) {
    score = 40
    details = 'Response too short (' + wordCount + ' words)'
  } else if (tooLong) {
    score = 60
    details = 'Response too long (' + wordCount + ' words, ' + paragraphs.length + ' paragraphs)'
  } else {
    details = wordCount + ' words, ' + paragraphs.length + ' paragraphs — good length'
  }

  return {
    name: 'response_length',
    score,
    pass: score >= 60,
    details,
  }
}

export function checkNoEmoji(response: string): MetricScore {
  // Check for common emoji ranges
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
  const hasEmoji = emojiPattern.test(response)

  return {
    name: 'no_emoji',
    score: hasEmoji ? 0 : 100,
    pass: !hasEmoji,
    details: hasEmoji ? 'Response contains emoji (brand violation)' : 'No emoji detected',
  }
}

export function checkExpectedBehaviours(
  response: string,
  testCase: TestCase
): MetricScore {
  // Simple keyword/phrase presence check for expected behaviours
  // This is a heuristic — the LLM grader provides deeper analysis
  const lower = response.toLowerCase()
  let matched = 0

  for (const behaviour of testCase.expectedBehaviours) {
    // Extract key terms from the expected behaviour description
    const terms = behaviour.toLowerCase()
      .replace(/[()]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 4) // Only meaningful words

    const termMatches = terms.filter(t => lower.includes(t)).length
    if (termMatches >= Math.ceil(terms.length * 0.3)) {
      matched++
    }
  }

  const score = Math.round((matched / testCase.expectedBehaviours.length) * 100)

  return {
    name: 'expected_behaviours',
    score,
    pass: score >= 50,
    details: matched + '/' + testCase.expectedBehaviours.length + ' expected behaviours detected (heuristic)',
  }
}

export function checkForbiddenBehaviours(
  response: string,
  testCase: TestCase
): MetricScore {
  const lower = response.toLowerCase()
  const violations: string[] = []

  for (const behaviour of testCase.forbiddenBehaviours) {
    const terms = behaviour.toLowerCase()
      .replace(/[()]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 4)

    const termMatches = terms.filter(t => lower.includes(t)).length
    if (termMatches >= Math.ceil(terms.length * 0.5)) {
      violations.push(behaviour)
    }
  }

  const score = violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 30)

  return {
    name: 'forbidden_behaviours',
    score,
    pass: violations.length === 0,
    details: violations.length === 0
      ? 'No forbidden behaviours detected'
      : 'Potential violations: ' + violations.join('; '),
  }
}

// ─── Aggregate scoring ──────────────────────────────────────

export function runRuleBasedMetrics(
  response: string,
  testCase: TestCase
): MetricScore[] {
  return [
    checkForbiddenVocabulary(response),
    checkResponseLength(response),
    checkNoEmoji(response),
    checkExpectedBehaviours(response, testCase),
    checkForbiddenBehaviours(response, testCase),
  ]
}

export function computeOverallScore(metrics: MetricScore[]): number {
  if (metrics.length === 0) return 0
  return Math.round(metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length)
}
