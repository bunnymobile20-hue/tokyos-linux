export async function startQuarkWebLoginFlow(openWindow: typeof window.open, fetchImpl: typeof fetch, basePath = '') {
  const loginUrl = `${basePath}/proxy/quark-auth/`
  const popup = openWindow(loginUrl, '_blank', 'noopener,noreferrer')

  if (!popup) {
    throw new Error('O navegador interceptou a janela pop-up de login do Quark，Permita a janela pop-up e tente novamente')
  }

  try {
    await fetchImpl(`${basePath}/api/system/netdisk/quark-auth/reset`, { method: 'POST' })
  } catch (error) {
    popup.close()
    throw error
  }

  return popup
}
