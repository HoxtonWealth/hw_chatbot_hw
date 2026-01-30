/**
 * Test fixture data for document-related tests
 */

export const SAMPLE_TEXT = `# GTM Strategy Guide

## Overview
This document outlines the go-to-market strategy for Q1 2026.

## Target Market
Our primary target market consists of enterprise B2B SaaS companies with 100-500 employees.

## Key Metrics
- Customer Acquisition Cost: $500
- Lifetime Value: $15,000
- Payback Period: 4 months

## Competitive Analysis
Our main competitors include Company A and Company B. We differentiate through superior AI capabilities.
`

export const SAMPLE_CHUNKS = [
  {
    id: 'chunk-1',
    content: 'This document outlines the go-to-market strategy for Q1 2026.',
    chunk_index: 0,
    section_header: 'Overview',
    combined_score: 0.92,
    similarity_score: 0.90,
    keyword_score: 0.85,
    document_id: 'doc-1',
  },
  {
    id: 'chunk-2',
    content: 'Our primary target market consists of enterprise B2B SaaS companies with 100-500 employees.',
    chunk_index: 1,
    section_header: 'Target Market',
    combined_score: 0.85,
    similarity_score: 0.82,
    keyword_score: 0.78,
    document_id: 'doc-1',
  },
  {
    id: 'chunk-3',
    content: 'Customer Acquisition Cost: $500. Lifetime Value: $15,000. Payback Period: 4 months.',
    chunk_index: 2,
    section_header: 'Key Metrics',
    combined_score: 0.78,
    similarity_score: 0.75,
    keyword_score: 0.70,
    document_id: 'doc-1',
  },
]

export const SAMPLE_DOCUMENT = {
  id: 'doc-1',
  title: 'GTM Strategy Guide',
  source_type: 'md' as const,
  file_name: 'gtm-strategy.md',
  status: 'ready' as const,
  created_at: '2026-01-15T00:00:00Z',
  chunk_count: 3,
}
