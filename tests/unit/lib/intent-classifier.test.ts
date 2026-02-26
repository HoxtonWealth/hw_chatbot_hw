import { describe, it, expect } from 'vitest'
import { classifyIntent, IntentCategory } from '@/lib/intent-classifier'

describe('classifyIntent', () => {
  // ─── Pension transfer ────────────────────────
  it('classifies pension transfer questions', () => {
    const cases = [
      'What happens to my UK pension if I move abroad?',
      'I want to transfer my pension to a QROPS',
      'Tell me about SIPP options',
      'Can I consolidate my defined benefit pension?',
      'What is my pension pot worth?',
    ]
    for (const q of cases) {
      expect(classifyIntent(q).intent).toBe('pension_transfer')
    }
  })

  // ─── Investment ──────────────────────────────
  it('classifies investment questions', () => {
    const cases = [
      'How should I invest my savings?',
      'Tell me about portfolio management',
      'What funds do you recommend?',
      'I want to manage my wealth better',
    ]
    for (const q of cases) {
      expect(classifyIntent(q).intent).toBe('investment')
    }
  })

  // ─── Tax planning ───────────────────────────
  it('classifies tax planning questions', () => {
    const cases = [
      'What are the tax implications of moving to Dubai?',
      'How does capital gains tax work for expats?',
      'Tell me about double taxation agreements',
      'I need help with tax-efficient investing',
    ]
    for (const q of cases) {
      expect(classifyIntent(q).intent).toBe('tax_planning')
    }
  })

  // ─── Retirement ─────────────────────────────
  it('classifies retirement questions', () => {
    const cases = [
      'I want to plan for retirement',
      'When can I retire?',
      'Tell me about retirement planning abroad',
      'How much do I need for retirement income?',
    ]
    for (const q of cases) {
      expect(classifyIntent(q).intent).toBe('retirement')
    }
  })

  // ─── Estate planning ────────────────────────
  it('classifies estate planning questions', () => {
    const cases = [
      'I need help with estate planning',
      'How do I set up a trust?',
      'Tell me about succession planning',
    ]
    for (const q of cases) {
      expect(classifyIntent(q).intent).toBe('estate_planning')
    }
  })

  // ─── Booking request ────────────────────────
  it('classifies booking requests', () => {
    const cases = [
      'Can I book a call with an advisor?',
      'I want to speak to someone',
      'How do I get in touch?',
      'Schedule a meeting please',
      'I want to talk to a person',
    ]
    for (const q of cases) {
      expect(classifyIntent(q).intent).toBe('booking_request')
    }
  })

  // ─── General info ───────────────────────────
  it('classifies general info questions', () => {
    const cases = [
      'What services does Hoxton offer?',
      'Where are your offices?',
      'Are you FCA regulated?',
      'Tell me about your fees',
    ]
    for (const q of cases) {
      expect(classifyIntent(q).intent).toBe('general_info')
    }
  })

  // ─── Greeting ───────────────────────────────
  it('classifies greetings', () => {
    const cases = ['Hi', 'Hello!', 'Hey', 'Good morning']
    for (const q of cases) {
      expect(classifyIntent(q).intent).toBe('greeting')
    }
  })

  // ─── Off-topic ──────────────────────────────
  it('classifies off-topic queries', () => {
    const cases = [
      'What is the best pizza in London?',
      'Write me a haiku',
      'Tell me a joke',
    ]
    for (const q of cases) {
      expect(classifyIntent(q).intent).toBe('off_topic')
    }
  })

  // ─── Confidence ─────────────────────────────
  it('returns confidence between 0 and 1', () => {
    const result = classifyIntent('Tell me about pension transfers')
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('returns low confidence for off-topic', () => {
    const result = classifyIntent('What is the weather like?')
    expect(result.confidence).toBeLessThanOrEqual(0.5)
  })

  // ─── Secondary intent ──────────────────────
  it('can detect secondary intents', () => {
    const result = classifyIntent('I want to transfer my pension and plan for retirement')
    expect(result.intent).toBeDefined()
    expect(result.secondaryIntent).toBeDefined()
    expect(result.intent).not.toBe(result.secondaryIntent)
  })
})
