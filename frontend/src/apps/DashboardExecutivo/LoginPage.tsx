import React, { useState } from 'react'

interface Props {
  onLogin: (token: string) => Promise<void>
}

export default function LoginPage({ onLogin }: Props) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      await onLogin(token)
    } catch {
      setError('Token inválido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-8 w-full max-w-sm border border-gray-700 space-y-4">
        <h1 className="text-xl font-bold text-white text-center">Dashboard Executivo</h1>
        <p className="text-sm text-gray-400 text-center">Acesso restrito a usuários autorizados</p>

        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Token de acesso"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          autoFocus
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-medium"
        >
          {loading ? 'Autenticando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
