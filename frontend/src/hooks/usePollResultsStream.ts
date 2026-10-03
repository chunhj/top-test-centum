import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { PollResults } from '../api/pollApi'
import { queryKeys } from '../lib/queryKeys'

/**
 * Subscribes to the poll's SSE stream while mounted and keeps the TanStack Query cache in sync:
 * `vote-result` payloads are written into the results cache, `phase-changed` refetches the poll
 * detail and results. Closes the stream on unmount or when pollId changes.
 */
export function usePollResultsStream(pollId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!pollId) return

    const stream = new EventSource(`/api/polls/${pollId}/stream`)
    const resultsKey = queryKeys.pollResults(pollId)
    let resultsHidden = false

    // vote-result carries the same PollResults body as GET /results (built per viewer on the
    // server), so write it straight into the cache instead of refetching on every vote.
    stream.addEventListener('vote-result', (event) => {
      let payload: PollResults | undefined
      try {
        payload = JSON.parse(event.data) as PollResults
      } catch {
        payload = undefined
      }
      if (payload && payload.pollId === Number(pollId)) {
        const results = payload
        if (resultsHidden && results.phase === 'LIVE_VISIBLE') return
        // A polling refetch already in flight may carry a snapshot older than this event and
        // would overwrite it when it lands. Cancel it first (reverting to the pre-fetch state),
        // then apply the event.
        void queryClient
          .cancelQueries({ queryKey: resultsKey })
          .then(() => {
            if (resultsHidden && results.phase === 'LIVE_VISIBLE') return
            queryClient.setQueryData(resultsKey, results)
          })
      } else {
        void queryClient.invalidateQueries({ queryKey: resultsKey })
      }
    })

    // The phase also drives whether voting is open (poll detail), so refresh both queries.
    stream.addEventListener('phase-changed', (event) => {
      let phase: unknown
      try {
        phase = (JSON.parse(event.data) as { phase?: unknown }).phase
      } catch {
        // An invalid event still triggers a server refresh below.
      }
      if (phase === 'RESULTS_HIDDEN') {
        resultsHidden = true
        void queryClient.cancelQueries({ queryKey: resultsKey }).then(() => {
          queryClient.setQueryData<PollResults>(resultsKey, (current) =>
            current ? { ...current, phase, results: undefined } : current,
          )
          void queryClient.invalidateQueries({ queryKey: resultsKey })
        })
      } else {
        if (phase === 'CLOSED' || phase === 'LIVE_VISIBLE') resultsHidden = false
        void queryClient.invalidateQueries({ queryKey: resultsKey })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.poll(pollId) })
    })

    return () => stream.close()
  }, [pollId, queryClient])
}
