export const RETRIEVAL_CONFIG = {
  // Hybrid search settings
  similarityThreshold: 0.3, // Was 0.5 - lowered to let more chunks through
  initialLimit: 30, // Was 20 - more candidates for reranking
  vectorWeight: 0.7,
  keywordWeight: 0.3,

  // Pipeline settings
  topK: 8, // Was 5 - more context for LLM
  diversityFactor: 0.2, // Was 0.3 - less aggressive diversity
  expandQueries: true,
  useReranking: true,

  // Confidence settings
  confidenceCutoff: 0.5, // Was 0.6 - don't hide answers as aggressively
  confidenceLevels: {
    high: 70, // Was 80
    medium: 50, // Was 50 (displayed as percentage)
    low: 30, // Was 0 (anything below medium)
  },
}
