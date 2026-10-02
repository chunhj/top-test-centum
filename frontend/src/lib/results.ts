import type { PollOption, PollResult, PollResults } from '../api/pollApi'

export interface ResultWithOption extends PollResult {
  option: PollOption
}

/**
 * Pairs each result row with its candidate. The poll detail and the results are separate
 * queries refreshed on different triggers (polling vs SSE), so a result can briefly reference
 * an option the detail doesn't have yet (or anymore). Such rows are skipped instead of crashing.
 */
export function joinResultsWithOptions(results: PollResult[] | undefined, options: PollOption[]): ResultWithOption[] {
  if (!results) return []
  const optionById = new Map(options.map((option) => [option.optionId, option]))
  return results.flatMap((result) => {
    const option = optionById.get(result.optionId)
    return option ? [{ ...result, option }] : []
  })
}

/**
 * 1-based rank for every candidate: results order first (the server sorts by vote count),
 * then any candidate missing from the results in its original order. Without results this is
 * simply the candidate order, which matches the previous behaviour.
 */
export function rankByOptionId(results: PollResult[] | undefined, options: PollOption[]): Map<number, number> {
  const optionIds = new Set(options.map((option) => option.optionId))
  const ranked = (results ?? []).map((result) => result.optionId).filter((optionId) => optionIds.has(optionId))
  const rankedIds = new Set(ranked)
  const rest = options.map((option) => option.optionId).filter((optionId) => !rankedIds.has(optionId))
  return new Map([...ranked, ...rest].map((optionId, index) => [optionId, index + 1]))
}

/** Rank lookup for sorting and badges; an id missing from the map (not expected) sorts last. */
export function createRankLookup(results: PollResult[] | undefined, options: PollOption[]): (optionId: number) => number {
  const ranks = rankByOptionId(results, options)
  return (optionId) => ranks.get(optionId) ?? ranks.size + 1
}

/**
 * Rank badges: while voting is open only for viewers who have voted (LIVE_VISIBLE + voted),
 * hidden during RESULTS_HIDDEN / before opening, and for everyone once the poll is CLOSED.
 * Mirrors when the server includes `results` (VoteResultService.findResults).
 */
export function canShowRanks(results: PollResults | undefined): boolean {
  return (
    results?.results !== undefined &&
    (results.phase === 'CLOSED' || (results.phase === 'LIVE_VISIBLE' && results.voted))
  )
}
