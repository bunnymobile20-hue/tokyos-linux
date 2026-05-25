import { useState, useEffect, useCallback } from 'react'

export interface StoreData {
  store_id: string
  store_name: string
  daily_revenue: number
  monthly_goal: number
  monthly_revenue: number
  ticket_avg: number
  sale_count: number
  last_sync: string
  is_below_goal: boolean
  daily_goal?: number
}

export interface DashboardData {
  stores: StoreData[]
  last_sync: string | null
  cache_age_minutes: number
  warning?: string
}

export interface GeralData {
  total_stores: number
  summary: {
    monthly_revenue: number
    monthly_goal: number
    monthly_gap: number
    daily_revenue: number
    daily_goal: number
    daily_gap: number
    previous_day_revenue: number
    ticket_avg_revenue: number
    ticket_avg_products: number
    sales_count: number
    products_sold_count: number
    working_days: number
    revenue_trend: string
  }
  dre: Record<string, number>
  cash_flow: Record<string, number>
  year: number | null
  month: number | null
}

export interface LojaResumo {
  store_id: string
  store_name: string
  monthly_revenue: number
  monthly_goal: number
  monthly_gap: number
  daily_revenue: number
  daily_goal: number
  daily_gap: number
  ticket_avg_revenue: number
  ticket_avg_products: number
  previous_day_revenue: number
  revenue_trend: string
  working_days: number
  sales_count: number
  products_sold_count: number
  year: number
  month: number
}

export interface LojaDetail {
  store: StoreData
  historico: any[]
  current: any | null
  dre: any[]
  cash_flow: any[]
}

const API_BASE = '/api/v1'

export function useDashboardAPI() {
  const [token, setToken] = useState<string | null>(null)

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (init?.body && typeof init.body === 'string') {
      headers['Content-Type'] = 'application/json'
    }
    const res = await fetch(url, {
      ...init,
      headers: { ...headers, ...init?.headers as Record<string, string> },
      credentials: 'include',
    })
    return res
  }, [token])

  const login = async (t: string) => {
    const res = await fetch(`${API_BASE}/dashboard/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Token inválido')
    setToken(t)
    return res.json()
  }

  const fetchGeral = useCallback(async (year?: number, month?: number): Promise<GeralData> => {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (month) params.set('month', String(month))
    const res = await authedFetch(`${API_BASE}/dashboard/geral?${params}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [authedFetch])

  const fetchLojas = useCallback(async (year?: number, month?: number): Promise<LojaResumo[]> => {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (month) params.set('month', String(month))
    const res = await authedFetch(`${API_BASE}/dashboard/lojas?${params}`)
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    return json.lojas
  }, [authedFetch])

  const fetchLojaDetail = useCallback(async (storeId: string, year?: number, month?: number): Promise<LojaDetail> => {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (month) params.set('month', String(month))
    const res = await authedFetch(`${API_BASE}/dashboard/loja/${storeId}?${params}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [authedFetch])

  const registrarMensal = useCallback(async (data: any) => {
    const res = await authedFetch(`${API_BASE}/dashboard/registrar`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [authedFetch])

  const registrarDre = useCallback(async (data: any) => {
    const res = await authedFetch(`${API_BASE}/dashboard/dre/registrar`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [authedFetch])

  const registrarFluxoCaixa = useCallback(async (data: any) => {
    const res = await authedFetch(`${API_BASE}/dashboard/fluxo-caixa/registrar`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [authedFetch])

  return { login, fetchGeral, fetchLojas, fetchLojaDetail, registrarMensal, registrarDre, registrarFluxoCaixa }
}
