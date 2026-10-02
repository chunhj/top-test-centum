/**
 * TanStack Query keys, defined in one place. For the public poll screens pollId is normalised to a string so the list
 * (numeric pollId from the API) and the detail page (string route param) share one cache
 * entry and invalidations from either side reach both.
 */
export const queryKeys = {
  polls: () => ['polls'] as const,
  poll: (pollId: number | string) => ['poll', String(pollId)] as const,
  pollResults: (pollId: number | string) => ['poll-results', String(pollId)] as const,
  /** Prefix of every admin poll list (any account); use for invalidation. */
  adminPollsAll: () => ['admin-polls'] as const,
  adminPolls: (username: string | undefined) => ['admin-polls', username] as const,
  adminPoll: (pollId: string) => ['admin-poll', pollId] as const,
}
