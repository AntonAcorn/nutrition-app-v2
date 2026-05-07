import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCalorieBankSnapshot,
  markRelaxDay,
  unmarkRelaxDay,
  type CalorieBankSnapshot,
} from './calorieBankApi'

export function useCalorieBank(date: string) {
  const queryClient = useQueryClient()

  const query = useQuery<CalorieBankSnapshot>({
    queryKey: ['calorie-bank', date],
    queryFn: () => fetchCalorieBankSnapshot(date),
    staleTime: 30_000,
  })

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['calorie-bank'] })
  }

  const markRelax = useMutation({
    mutationFn: () => markRelaxDay(date),
    onSuccess: invalidate,
  })

  const unmarkRelax = useMutation({
    mutationFn: () => unmarkRelaxDay(date),
    onSuccess: invalidate,
  })

  return {
    snapshot: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
    markRelax,
    unmarkRelax,
  }
}
