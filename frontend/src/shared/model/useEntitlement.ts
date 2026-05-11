import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEntitlement, type Entitlement } from './entitlementApi'

const KEY = ['entitlement']

export function useEntitlement() {
  return useQuery<Entitlement>({
    queryKey: KEY,
    queryFn: fetchEntitlement,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useInvalidateEntitlement() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: KEY })
}
