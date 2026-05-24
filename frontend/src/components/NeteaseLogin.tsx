import { useState, useEffect } from 'react'

export default function NeteaseLogin({ currentCookie, onCookieUpdate }: { currentCookie: string, onCookieUpdate: (cookie: string) => void }) {
  const [qrImg, setQrImg] = useState('')
  const [qrKey, setQrKey] = useState('')
  const [statusMsg, setStatusMsg] = useState('Não logado')
  const [isChecking, setIsChecking] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    if (currentCookie) {
      // Check status
      fetch('/api/system/music/login/status')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data && data.data.profile) {
            setUserInfo(data.data.profile)
            setStatusMsg(`Conectado: ${data.data.profile.nickname}`)
          } else {
            setStatusMsg('Cookie Expirado，Faça login novamente')
          }
        })
        .catch(() => setStatusMsg('Falha na aquisição de status'))
    }
  }, [currentCookie])

  const generateQR = async () => {
    try {
      setStatusMsg('Gerando código QR...')
      const keyRes = await fetch('/api/system/music/login/qr/key')
      const keyData = await keyRes.json()
      if (!keyData.success) throw new Error('Failed to get key')
      
      const key = keyData.data.unikey
      setQrKey(key)

      const imgRes = await fetch(`/api/system/music/login/qr/create?key=${key}`)
      const imgData = await imgRes.json()
      if (!imgData.success) throw new Error('Failed to get img')

      setQrImg(imgData.data.qrimg)
      setStatusMsg('Aguardando digitalização')
      setIsChecking(true)
    } catch (e) {
      setStatusMsg('Falha na geração do código QR')
    }
  }

  useEffect(() => {
    let interval: any;
    if (isChecking && qrKey) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/system/music/login/qr/check?key=${qrKey}`)
          const data = await res.json()
          if (data.success) {
            if (data.data.code === 800) {
              setStatusMsg('O código QR expirou')
              setIsChecking(false)
              setQrImg('')
            } else if (data.data.code === 801) {
              setStatusMsg('Aguardando digitalização')
            } else if (data.data.code === 802) {
              setStatusMsg('Código digitalizado，Confirme no seu celular')
            } else if (data.data.code === 803) {
              setStatusMsg('Login autorizado realizado com sucesso！')
              setIsChecking(false)
              setQrImg('')
              if (data.data.cookie) {
                onCookieUpdate(data.data.cookie)
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [isChecking, qrKey])

  return (
    <div className="pt-4 border-t border-slate-200/60">
      <label className="text-sm font-medium text-slate-700 mb-2 block">Música na nuvem NetEase (VIPanalisar)</label>
      <div className="flex flex-col items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
        {userInfo && !qrImg ? (
          <div className="flex flex-col items-center space-y-2 w-full">
            <div className="flex items-center space-x-3 w-full">
              <img src={userInfo.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full shadow" />
              <div className="flex-1 truncate text-sm font-bold text-slate-700">{userInfo.nickname}</div>
              <button 
                onClick={() => { onCookieUpdate(''); setUserInfo(null); setStatusMsg('Não logado') }}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium"
              >
                desistir
              </button>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium w-full">Atualmente analisável VIP Qualidade de som sem perdas</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-3">{statusMsg}</p>
            {qrImg ? (
              <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 mb-3">
                <img src={qrImg} alt="Login QR" className="w-32 h-32" />
              </div>
            ) : null}
            {!isChecking && (
              <button 
                onClick={generateQR}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-md transition-colors shadow-sm"
              >
                APP Digitalize o código para fazer login
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
