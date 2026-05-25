import React, { useState } from 'react'

interface Props {
  storeName: string
  storeId: string
  onDelegate: (storeId: string, to: string, instruction: string) => Promise<void>
  onClose: () => void
}

export default function DelegateModal({ storeName, storeId, onDelegate, onClose }: Props) {
  const [to, setTo] = useState('COO')
  const [instruction, setInstruction] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!instruction.trim()) return
    setSending(true)
    try {
      await onDelegate(storeId, to, instruction)
      setDone(true)
    } catch {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        {done ? (
          <div className="text-center space-y-4">
            <p className="text-green-400 text-lg font-medium">Ação delegada com sucesso!</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-white mb-1">Delegar ação corretiva</h2>
            <p className="text-sm text-gray-400 mb-4">Loja: {storeName}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Delegar para</label>
                <select
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="COO">COO — Operações</option>
                  <option value="CFO">CFO — Financeiro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Instrução</label>
                <textarea
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  placeholder="Ex.: Revisar escala da equipe para aumentar vendas no horário de pico"
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={sending || !instruction.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white"
                >
                  {sending ? 'Enviando...' : 'Delegar'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
