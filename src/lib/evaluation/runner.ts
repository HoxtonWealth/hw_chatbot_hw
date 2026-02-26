// ============================================================
// src/lib/evaluation/runner.ts — Evaluation orchestrator
// ============================================================
// Runs test cases against the chat API (or prompt builder directly)
// and produces a scored evaluation report.
// ============================================================

import { streamText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { retrieveContext } from '../retrieval/pipeline'
import { buildRAGPrompt, buildEmptyContextPrompt } from '../rag'
import { RETRIEVAL_CONFIG } from '../retrieval/config'
import { classifyIntent } from '../intent-classifier'
import { TEST_CASES, TestCase, getTestCasesByCategory } from './test-cases'
import {
  EvaluationResult,
  MetricScore,
  BENCHMARKS,
  runRuleBasedMetrics,
  computeOverallScore,
} from './metrics'

export interface EvaluationReport {
  timestamp: string
  totalTests: number
  passedTests: number
  failedTests: number
  overallPassRate: number
  categoryScores: Record<string, { avgScore: number; passRate: number; target: number }>
  results: EvaluationResult[]
  intentAccuracy: number
}

// ─── Generate a response for a test case ─────────────────────

async function generateResponse(testCase: TestCase): Promise<string> {
  const { chunks } = await retrieveContext(
    testCase.query,
    undefined,
    {
      expandQueries: RETRIEVAL_CONFIG.expandQueries,
      useReranking: RETRIEVAL_CONFIG.useReranking,
      topK: RETRIEVAL_CONFIG.topK,
    }
  )

  const hasContext = chunks.length > 0
  const ragResult = hasContext ? buildRAGPrompt(chunks, testCase.messageCount) : null
  const systemPrompt = ragResult
    ? ragResult.systemPrompt
    : buildEmptyContextPrompt(testCase.messageCount)

  const result = streamText({
    model: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! })(
      process.env.CHAT_MODEL || 'openai/gpt-4o-mini'
    ),
    system: systemPrompt,
    messages: [{ role: 'user' as const, content: testCase.query }],
  })

  // Collect the full response
  let fullResponse = ''
  for await (const chunk of result.textStream) {
    fullResponse += chunk
  }

  return fullResponse
}

// ─── LLM-based grading ──────────────────────────────────────

async function llmGrade(
  query: string,
  response: string,
  testCase: TestCase
): Promise<MetricScore> {
  const gradePrompt = [
    'You are an evaluation judge for a financial advisory chatbot. Grade the following response.',
    '',
    'QUERY: ' + query,
    '',
    'RESPONSE: ' + response,
    '',
    'EXPECTED BEHAVIOURS:',
    ...testCase.expectedBehaviours.map(b => '- ' + b),
    '',
    'FORBIDDEN BEHAVIOURS:',
    ...testCase.forbiddenBehaviours.map(b => '- ' + b),
    '',
    'CATEGORY: ' + testCase.category,
    '',
    'Rate the response on a scale of 0-100 based on how well it meets the expected behaviours',
    'and avoids the forbidden behaviours. Consider the category-specific requirements.',
    '',
    'Respond with ONLY a JSON object in this format:',
    '{"score": <number 0-100>, "reasoning": "<brief explanation>"}',
  ].join('\n')

  try {
    const result = streamText({
      model: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! })(
        process.env.CHAT_MODEL || 'openai/gpt-4o-mini'
      ),
      messages: [{ role: 'user' as const, content: gradePrompt }],
    })

    let gradeResponse = ''
    for await (const chunk of result.textStream) {
      gradeResponse += chunk
    }

    // Parse the JSON response
    const jsonMatch = gradeResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        name: 'llm_grade',
        score: Math.min(100, Math.max(0, parsed.score)),
        pass: parsed.score >= 70,
        details: parsed.reasoning || 'LLM grading complete',
      }
    }
  } catch {
    // Fall back to rule-based only
  }

  return {
    name: 'llm_grade',
    score: 0,
    pass: false,
    details: 'LLM grading failed — relying on rule-based metrics only',
  }
}

// ─── Run a single test case ──────────────────────────────────

async function runTestCase(testCase: TestCase): Promise<EvaluationResult> {
  const response = await generateResponse(testCase)
  const ruleMetrics = runRuleBasedMetrics(response, testCase)
  const llmMetric = await llmGrade(testCase.query, response, testCase)

  const allMetrics = [...ruleMetrics, llmMetric]
  const overallScore = computeOverallScore(allMetrics)

  return {
    testCaseId: testCase.id,
    query: testCase.query,
    response,
    metrics: allMetrics,
    overallScore,
    pass: overallScore >= 70,
  }
}

// ─── Run all test cases ──────────────────────────────────────

export async function runEvaluation(
  testCaseIds?: string[]
): Promise<EvaluationReport> {
  const casesToRun = testCaseIds
    ? TEST_CASES.filter(tc => testCaseIds.includes(tc.id))
    : TEST_CASES

  // Run test cases sequentially to avoid rate limiting
  const results: EvaluationResult[] = []
  for (const tc of casesToRun) {
    console.log('Running test case: ' + tc.id + ' — ' + tc.description)
    const result = await runTestCase(tc)
    results.push(result)
    console.log('  Score: ' + result.overallScore + ' (' + (result.pass ? 'PASS' : 'FAIL') + ')')
  }

  // Calculate category scores
  const grouped = getTestCasesByCategory()
  const categoryScores: Record<string, { avgScore: number; passRate: number; target: number }> = {}

  for (const [category, cases] of Object.entries(grouped)) {
    const categoryResults = results.filter(r =>
      cases.some(c => c.id === r.testCaseId)
    )
    const avgScore = categoryResults.length > 0
      ? Math.round(categoryResults.reduce((s, r) => s + r.overallScore, 0) / categoryResults.length)
      : 0
    const passRate = categoryResults.length > 0
      ? Math.round((categoryResults.filter(r => r.pass).length / categoryResults.length) * 100)
      : 0

    const benchmarkKey = category === 'topic_adherence' ? 'topicAdherence' : category
    const target = BENCHMARKS[benchmarkKey as keyof typeof BENCHMARKS]?.target ?? 80

    categoryScores[category] = { avgScore, passRate, target }
  }

  // Check intent classification accuracy
  let correctIntents = 0
  for (const tc of casesToRun) {
    const classification = classifyIntent(tc.query)
    if (classification.intent === tc.expectedIntent) {
      correctIntents++
    }
  }
  const intentAccuracy = Math.round((correctIntents / casesToRun.length) * 100)

  const passedTests = results.filter(r => r.pass).length

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    overallPassRate: Math.round((passedTests / results.length) * 100),
    categoryScores,
    results,
    intentAccuracy,
  }
}

// ─── Pretty-print report ────────────────────────────────────

export function formatReport(report: EvaluationReport): string {
  const lines: string[] = [
    '╔══════════════════════════════════════════════╗',
    '║         CHATBOT EVALUATION REPORT            ║',
    '╚══════════════════════════════════════════════╝',
    '',
    'Timestamp: ' + report.timestamp,
    'Tests run: ' + report.totalTests,
    'Passed: ' + report.passedTests + ' | Failed: ' + report.failedTests,
    'Overall pass rate: ' + report.overallPassRate + '%',
    'Intent classification accuracy: ' + report.intentAccuracy + '%',
    '',
    '── Category Scores ──────────────────────────',
  ]

  for (const [category, scores] of Object.entries(report.categoryScores)) {
    const status = scores.avgScore >= scores.target ? 'MEETS TARGET' : 'BELOW TARGET'
    lines.push(
      '  ' + category.padEnd(20) +
      'avg: ' + String(scores.avgScore).padStart(3) + '%' +
      '  pass: ' + String(scores.passRate).padStart(3) + '%' +
      '  target: ' + scores.target + '%' +
      '  [' + status + ']'
    )
  }

  lines.push('')
  lines.push('── Individual Results ───────────────────────')

  for (const result of report.results) {
    const status = result.pass ? 'PASS' : 'FAIL'
    lines.push('')
    lines.push('  [' + status + '] ' + result.testCaseId + ' (score: ' + result.overallScore + ')')
    lines.push('    Query: ' + result.query.slice(0, 80))
    lines.push('    Response: ' + result.response.slice(0, 120) + '...')

    const failedMetrics = result.metrics.filter(m => !m.pass)
    if (failedMetrics.length > 0) {
      lines.push('    Failed metrics:')
      for (const m of failedMetrics) {
        lines.push('      - ' + m.name + ': ' + m.details)
      }
    }
  }

  return lines.join('\n')
}
