import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from './useAuth'

import type { Insight } from '@/types'

// ─── All insights ─────────────────────────────────────────────
export function useInsights(opts?: {
  search?: string
  tag?: string
  platform?: string
  sort?: 'newest' | 'oldest' | 'favorites'
}) {
  const { session } = useAuth()
  const uid = session?.user?.id

  return useQuery({
    queryKey: [...queryKeys.insights(uid ?? ''), opts],
    enabled: !!uid,
    queryFn: async (): Promise<Insight[]> => {
      let q = supabase
        .from('insights')
        .select('*, platform:source')
        .eq('user_id', uid!)
        .in('status', ['ready', 'processing', 'pending'])

      if (opts?.search?.trim()) {
        const term = `%${opts.search.trim()}%`
        q = q.or(`title.ilike.${term},raw_input.ilike.${term}`)
      }

      if (opts?.tag && opts.tag !== 'all') {
        const rawTag = opts.tag.trim();
        const capitalizedTag = rawTag.charAt(0).toUpperCase() + rawTag.slice(1);
        const lowerTag = rawTag.toLowerCase();
        const upperTag = rawTag.toUpperCase();
        
        // Supabase array overlap operator (&&) to match case-insensitively
        q = q.overlaps('tags', [rawTag, capitalizedTag, lowerTag, upperTag]);
      }

      if (opts?.platform && opts.platform !== 'all') {
        q = q.eq('source', opts.platform)
      }

      if (opts?.sort === 'oldest') {
        q = q.order('created_at', { ascending: true })
      } else if (opts?.sort === 'favorites') {
        q = q.eq('is_favorited', true).order('created_at', { ascending: false })
      } else {
        q = q.order('created_at', { ascending: false })
      }

      const { data, error } = await q
      if (error) {
        console.warn('useInsights fetch error:', error.message)
        return []
      }
      return (data ?? []) as Insight[]
    },
    retry: 2,
    retryDelay: 1000,
  })
}

// ─── Single insight with its items ───────────────────────────
export function useInsight(id: string) {
  return useQuery({
    queryKey: queryKeys.insightWithItems(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insights')
        .select('*, platform:source, insight_items(*)') 
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message)
      return data as Insight & { insight_items: import('@/types').InsightItem[] }
    },
  })
}

// ─── Today's saves ────────────────────────────────────────────
export function useTodayInsights() {
  const { session } = useAuth()
  const uid = session?.user?.id

  return useQuery({
    queryKey: queryKeys.today(uid ?? ''),
    enabled: !!uid,
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      const hasProcessing = items.some(
        (i) => i.status === 'pending' || i.status === 'processing'
      );
      return hasProcessing ? 2500 : false;
    },
    queryFn: async (): Promise<Insight[]> => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('insights')
        .select('*, platform:source, insight_items(*)')
        .eq('user_id', uid!)
        .in('status', ['ready', 'pending', 'processing'])
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as Insight[]
    },
  })
}

// ─── Yesterday's saves (24-48h ago) ───────────────────────────
export function useYesterdayInsights() {
  const { session } = useAuth()
  const uid = session?.user?.id

  return useQuery({
    queryKey: queryKeys.yesterday(uid ?? ''),
    enabled: !!uid,
    queryFn: async (): Promise<Insight[]> => {
      const now = new Date()
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

      const { data, error } = await supabase
        .from('insights')
        .select('*, platform:source, insight_items(*)')
        .eq('user_id', uid!)
        .eq('status', 'ready')
        .gte('created_at', fortyEightHoursAgo.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as Insight[]
    },
  })
}

// ─── Save a link — full pipeline mutation ─────────────────────
export function useSaveLink() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ url, notes }: { url: string; notes?: string }) => {
      const userId = session!.user.id;

      const { data: insight, error: insertErr } = await supabase
        .from('insights')
        .insert({ user_id: userId, url, raw_input: notes, status: 'pending' })
        .select()
        .single();
      if (insertErr) throw insertErr;

      try {
        // Trigger background processing via the Supabase Edge Function (non-blocking)
        supabase.functions.invoke('process-insight', {
          body: {
            insightId: insight.id,
            url,
            notes,
            userId,
          },
        }).catch((err) => {
          console.error('Background process-insight invocation failed:', err);
        });
      } catch (e: any) {
        await supabase
          .from('insights')
          .update({ status: 'failed', error_message: e.message })
          .eq('id', insight.id);
        throw e;
      }

      return insight;
    },
    onSuccess: () => {
      const uid = session!.user.id;
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(uid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.insightItems(uid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.today(uid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dueReviews(uid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats(uid) });
    },
    onError: (e: any) => {
      console.error('Save link failed:', e.message);
    },
  });
}


// ─── Delete insight ───────────────────────────────────────────
export function useDeleteInsight() {
  const qc = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('insights').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      const uid = session?.user?.id ?? ''
      qc.invalidateQueries({ queryKey: queryKeys.insights(uid) })
      qc.invalidateQueries({ queryKey: queryKeys.today(uid) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(uid) })
    },
  })
}

// ─── Toggle favorite ──────────────────────────────────────────
export function useToggleFavorite() {
  const qc = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase
        .from('insights')
        .update({ is_favorited: !current })
        .eq('id', id)
      if (error) throw new Error(error.message)
      return !current
    },
    onSuccess: (_result, variables) => {
      const uid = session?.user?.id ?? ''
      qc.invalidateQueries({ queryKey: queryKeys.insightWithItems(variables.id) })
      qc.invalidateQueries({ queryKey: queryKeys.insights(uid) })
    },
  })
}

// ─── Update notes ─────────────────────────────────────────────
export function useUpdateNotes() {
  const qc = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const uid = session?.user?.id
      if (!uid) throw new Error('Not authenticated')

      // Check if note already exists for this insight
      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('insight_id', id)
        .eq('user_id', uid)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('notes')
          .update({ content: notes, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from('notes')
          .insert({ insight_id: id, user_id: uid, content: notes })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.insightWithItems(variables.id) })
    },
  })
}

export type { Insight }
