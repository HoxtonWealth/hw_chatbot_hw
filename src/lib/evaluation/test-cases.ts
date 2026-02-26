// ============================================================
// src/lib/evaluation/test-cases.ts — Evaluation test cases
// ============================================================
// Defines test queries with expected behaviours for evaluating
// chatbot response quality against Anthropic's benchmarks.
// ============================================================

import { IntentCategory } from '../intent-classifier'

export interface TestCase {
  id: string
  query: string
  category: 'comprehension' | 'relevance' | 'accuracy' | 'topic_adherence' | 'escalation' | 'tone'
  expectedIntent: IntentCategory
  messageCount: number // Simulates conversation stage
  expectedBehaviours: string[] // What the response SHOULD do
  forbiddenBehaviours: string[] // What the response should NOT do
  description: string
}

export const TEST_CASES: TestCase[] = [
  // ─── Comprehension (does Claude understand what's being asked?) ───
  {
    id: 'comp-1',
    query: "I'm a UK expat in Dubai with a pension from my old job — what are my options?",
    category: 'comprehension',
    expectedIntent: 'pension_transfer',
    messageCount: 0,
    expectedBehaviours: [
      'Discusses pension transfer options (QROPS, SIPP, or leaving in UK)',
      'Acknowledges their expat status and Dubai context',
      'Asks a clarifying follow-up question',
    ],
    forbiddenBehaviours: [
      'Mentions booking a call (too early)',
      'Gives generic advice ignoring the Dubai/expat context',
      'Uses jargon without explanation',
    ],
    description: 'Expat pension question — should understand the multi-faceted nature',
  },
  {
    id: 'comp-2',
    query: "My company is offering me a package to transfer overseas — what should I think about financially?",
    category: 'comprehension',
    expectedIntent: 'general_info',
    messageCount: 0,
    expectedBehaviours: [
      'Identifies this as a relocation/international financial planning question',
      'Mentions relevant considerations (tax, pensions, investments)',
      'Asks about destination country or specifics',
    ],
    forbiddenBehaviours: [
      'Assumes a specific country',
      'Provides specific tax figures without knowing the destination',
    ],
    description: 'Ambiguous relocation question — should ask for clarification',
  },

  // ─── Relevance (does the response address what was asked?) ───
  {
    id: 'rel-1',
    query: "What's the difference between a QROPS and a SIPP?",
    category: 'relevance',
    expectedIntent: 'pension_transfer',
    messageCount: 2,
    expectedBehaviours: [
      'Directly compares QROPS and SIPP',
      'Explains key differences (jurisdiction, tax treatment, flexibility)',
      'References source material',
    ],
    forbiddenBehaviours: [
      'Talks about unrelated services without addressing the question first',
      'Only describes one of the two options',
    ],
    description: 'Direct comparison question — should give a clear, structured answer',
  },
  {
    id: 'rel-2',
    query: 'How much does it cost to work with Hoxton?',
    category: 'relevance',
    expectedIntent: 'general_info',
    messageCount: 4,
    expectedBehaviours: [
      'Addresses fees/costs if information is available in sources',
      'If no fee info in sources, honestly says specifics depend on the service',
      'Suggests speaking with an advisor for specific pricing',
    ],
    forbiddenBehaviours: [
      'Makes up specific fee amounts',
      'Ignores the question entirely',
    ],
    description: 'Fee question — should be honest about what it knows',
  },

  // ─── Accuracy (is the information correct?) ───
  {
    id: 'acc-1',
    query: 'Is Hoxton regulated?',
    category: 'accuracy',
    expectedIntent: 'general_info',
    messageCount: 0,
    expectedBehaviours: [
      'Confirms FCA regulation',
      'Mentions independent advisory status',
    ],
    forbiddenBehaviours: [
      'Makes up regulatory numbers or dates not in sources',
      'Claims regulation by bodies not mentioned in sources',
    ],
    description: 'Factual question about regulation — must be accurate',
  },
  {
    id: 'acc-2',
    query: 'Can I transfer a US 401k to a UK pension?',
    category: 'accuracy',
    expectedIntent: 'pension_transfer',
    messageCount: 2,
    expectedBehaviours: [
      'Acknowledges this is a complex cross-border question',
      'Does not fabricate specific transfer rules if not in sources',
      'Suggests speaking with an advisor for specifics',
    ],
    forbiddenBehaviours: [
      'Makes up specific transfer rules or tax implications',
      'Confidently states incorrect information',
    ],
    description: 'Complex cross-border question — should not fabricate answers',
  },

  // ─── Topic adherence (does Claude stay on topic?) ───
  {
    id: 'topic-1',
    query: "What's the best cryptocurrency to invest in?",
    category: 'topic_adherence',
    expectedIntent: 'off_topic',
    messageCount: 2,
    expectedBehaviours: [
      'Politely redirects to Hoxton services',
      'Mentions 2-3 specific services Hoxton offers',
      'Does not engage with crypto discussion',
    ],
    forbiddenBehaviours: [
      'Provides crypto investment advice',
      'Says "I don\'t know" without redirecting',
      'Engages in a lengthy off-topic discussion',
    ],
    description: 'Off-topic crypto question — should redirect cleanly',
  },
  {
    id: 'topic-2',
    query: 'Write me a poem about money',
    category: 'topic_adherence',
    expectedIntent: 'off_topic',
    messageCount: 0,
    expectedBehaviours: [
      'Declines the creative writing request',
      'Redirects to financial advisory services',
    ],
    forbiddenBehaviours: [
      'Writes a poem',
      'Engages with the creative request',
    ],
    description: 'Creative/adversarial request — should stay in character',
  },

  // ─── Escalation (does Claude know when to suggest an advisor?) ───
  {
    id: 'esc-1',
    query: "I've inherited a property in Spain and need to figure out the tax implications for my UK tax return",
    category: 'escalation',
    expectedIntent: 'tax_planning',
    messageCount: 0,
    expectedBehaviours: [
      'Acknowledges this is a complex cross-border tax matter',
      'Provides general guidance if sources support it',
      'Recommends speaking with an advisor given the complexity',
    ],
    forbiddenBehaviours: [
      'Provides specific tax filing advice',
      'Makes up tax rates or deadlines',
    ],
    description: 'Complex tax question requiring professional advice',
  },
  {
    id: 'esc-2',
    query: "I'm really worried about my pension — I lost my job and need to access it urgently",
    category: 'escalation',
    expectedIntent: 'pension_transfer',
    messageCount: 0,
    expectedBehaviours: [
      'Responds with empathy and warmth',
      'Provides general guidance about pension access options',
      'Suggests speaking with an advisor given the urgency',
    ],
    forbiddenBehaviours: [
      'Dismisses the emotional context',
      'Gives cold, purely factual response',
      'Recommends specific actions without knowing their full situation',
    ],
    description: 'Emotionally charged query — should show empathy and escalate',
  },

  // ─── Tone (does Claude match the Hoxton brand voice?) ───
  {
    id: 'tone-1',
    query: 'Tell me about retirement planning',
    category: 'tone',
    expectedIntent: 'retirement',
    messageCount: 0,
    expectedBehaviours: [
      'Uses warm, professional tone',
      'Structured response (not a wall of text)',
      'Concise — 2 to 3 short paragraphs',
    ],
    forbiddenBehaviours: [
      'Uses forbidden vocabulary (world-class, bespoke, holistic, etc.)',
      'Uses emojis',
      'Sounds sales-driven or pushy',
      'Uses excessive exclamation marks',
    ],
    description: 'General question — should match Hoxton brand voice exactly',
  },
  {
    id: 'tone-2',
    query: 'I want to book a call',
    category: 'tone',
    expectedIntent: 'booking_request',
    messageCount: 0,
    expectedBehaviours: [
      'Provides booking link immediately',
      'Brief and helpful response',
      'Does not over-explain or add unnecessary preamble',
    ],
    forbiddenBehaviours: [
      'Makes the user jump through hoops before providing the link',
      'Responds with a lengthy sales pitch',
    ],
    description: 'Direct booking request — should respond immediately and briefly',
  },
]

// Group test cases by category for reporting
export function getTestCasesByCategory(): Record<string, TestCase[]> {
  const grouped: Record<string, TestCase[]> = {}
  for (const tc of TEST_CASES) {
    if (!grouped[tc.category]) grouped[tc.category] = []
    grouped[tc.category].push(tc)
  }
  return grouped
}
