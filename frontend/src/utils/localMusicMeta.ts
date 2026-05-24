export interface MetadataBadge {
  label: string
  className: string
  title: string
}

interface BadgeSource {
  warmupFailed?: boolean
  warmupFailureReason?: string
  metadataSource?: 'embedded' | 'netease-cache' | 'netease-live' | 'mixed'
}

export const getMetadataBadge = (song: BadgeSource): MetadataBadge | null => {
  if (song.warmupFailed) {
    return { label: 'Falha na conclusão', className: 'bg-amber-50 text-amber-700 border-amber-200', title: song.warmupFailureReason || 'Não foi possível preencher mais informações do NetEase Cloud' }
  }

  switch (song.metadataSource) {
    case 'mixed':
      return { label: 'mensagem mista', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', title: 'Algumas informações vêm de arquivos locais，Parcialmente da conclusão do NetEase Cloud' }
    case 'netease-live':
      return { label: 'Conclusão da nuvem', className: 'bg-sky-50 text-sky-700 border-sky-200', title: 'As informações são preenchidas online pela NetEase Cloud e armazenadas em cache localmente.' }
    default:
      return null
  }
}
