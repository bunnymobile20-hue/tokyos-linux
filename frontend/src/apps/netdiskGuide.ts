export type NetdiskBrand = 'baidu' | 'quark'

export type NetdiskGuideStatus = 'mounted' | 'not_mounted' | 'auth_failed' | 'auth_expired' | 'alist_unreachable' | 'alist_error'

export interface NetdiskGuideData {
  title: string
  targetPath: string
  storageTypeLabel: string
  officialSiteUrl: string
  credentialLabel: string
  credentialField: 'refreshToken' | 'cookie'
  setupSteps: string[]
  cookieGuide: {
    recommended: string[]
    manual: string[]
    notes: string[]
  }
  troubleshooting: Record<Exclude<NetdiskGuideStatus, 'mounted'>, string>
}

export function getNetdiskGuideData(brand: NetdiskBrand): NetdiskGuideData {
  const title = brand === 'baidu' ? 'Baidu SkyDisk' : 'Disco de rede Quark'
  const targetPath = brand === 'baidu' ? '/baidu' : '/quark'
  const storageTypeLabel = title
  const officialSiteUrl = brand === 'baidu' ? 'https://pan.baidu.com/' : 'https://pan.quark.cn/'

  return {
    title,
    targetPath,
    storageTypeLabel,
    officialSiteUrl,
    credentialLabel: brand === 'baidu' ? 'refresh_token' : 'cookie',
    credentialField: brand === 'baidu' ? 'refreshToken' : 'cookie',
    setupSteps: [
      'Conecte-se AList Nos bastidores。',
      'Digitar“armazenar”página，Clique“Adicionar novo armazenamento”。',
      `Seleção do tipo de armazenamento“${storageTypeLabel}”。`,
      `Preencha o caminho de montagem“${targetPath}”。`,
      `${title} obrigatório Cookie Ou pressione o botão de informações de autorização AList Solicitar preenchimento。`,
      'Não se preocupe com as opções avançadas ainda，Basta salvá-lo com sucesso。',
      'voltar para o TokyOS. Clique em "Terminei, testar novamente".'
    ],
    cookieGuide: {
      recommended: [
        `Abra-o primeiro no navegador ${officialSiteUrl} e confirme que você fez login com sucesso ${title}。`,
        'Recomendado para instalar a extensão do navegador Cookie-Editor，Atualize a página do disco de rede após a instalação。',
        'Clique para abrir no site do disco de rede atual Cookie-Editor，Copie diretamente o site atual Cookie contente。',
        'copie o Cookie de acordo com AList A página exige que você cole e salve.。'
      ],
      manual: [
        `Abrir ${officialSiteUrl} e fique logado。`,
        'de acordo com F12 Ferramentas de desenvolvedor abertas。',
        'Cortar para“rede(Network)”Página，Atualize a página da web uma vez。',
        'Basta clicar em uma solicitação，existir“Cabeçalho da solicitação(Request Headers)”Encontrado em Cookie。',
        'Copie o parágrafo inteiro Cookie contente，Colar em AList no campo correspondente。'
      ],
      notes: [
        'Cookie Basta copiá-lo do navegador em que você fez login com sucesso，Não há necessidade de registrar uma nova conta。',
        'Se falhar repentinamente mais tarde，Normalmente, o status de login do disco de rede expirou.，Basta fazer login no site oficial novamente e copiá-lo novamente.。',
        'Basta perseguir primeiro“Pode salvar e ver o arquivo com sucesso”，Outros campos avançados podem ser ajustados posteriormente。'
      ]
    },
    troubleshooting: {
      not_mounted: `ilustrar ${title} O armazenamento ainda não foi vinculado com êxito ${targetPath}。Verificação de prioridade“tipo de armazenamento”e“Caminho de montagem”Você preencheu corretamente?。`,
      auth_failed: 'AList Falha no login automático em segundo plano。Confirme primeiro AList O serviço está em execução，Em seguida, confirme se a senha do administrador em segundo plano ainda é o valor padrão exibido na página atual.。',
      auth_expired: 'AList O status de login expirou。Abra novamente o fundo de montagem subjacente，Depois de confirmar que você pode fazer login normalmente，Volte um pouco mais“Teste novamente”。',
      alist_unreachable: 'TokyOS não consegue conectar ao servidor AList no momento. Verifique se o serviço AList está rodando na porta 5244.',
      alist_error: 'AList retornou um erro。Priorize a verificação se as informações de autorização expiraram、Cookie Está completo?，E se o caminho de montagem é consistente com os requisitos atuais da página。'
    }
  }
}
