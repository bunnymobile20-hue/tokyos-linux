/**
 * GuideTab — Página de descrição do sistema
 * Organizado com base na lógica de back-end real atual，evitar UI O copywriting continua a usar a semântica estratégica da versão antiga。
 */

const TIMELINE: {
  time: string
  label: string
  desc: string
  color: string
  icon: string
}[] = [
  {
    time: '07:30',
    label: 'Análise do suplemento matinal',
    desc: 'Complementar automaticamente novos anúncios da noite do dia de negociação anterior、Notícias e dados de opinião pública，Execute a coleta de dados apenas com LLM Duas seções de extração de informações，E mesclar os resultados com o dia de negociação anterior FactPool，para 08:05 Use para análise pré-mercado。',
    color: 'bg-sky-500',
    icon: '🌅',
  },
  {
    time: '08:05',
    label: 'Análise diária pré-mercado',
    desc: 'Atualizar automaticamente o CSI500Pool de ações e cotações，Construir o estado do mercado，Filtragem completa completa、Reabastecimento de pool orientado a eventos、Grandes eventos podem ser vetados com um voto、45 especialistas votaram、Pontos técnicos、Soma quantitativa Conviction Filter，Gere o sinal de hoje、Revisão de posição、Sugestões para mudança de posição，E salve-o no disco。',
    color: 'bg-blue-500',
    icon: '🔍',
  },
  {
    time: '09:25',
    label: 'Início do monitoramento intradiário',
    desc: 'Iniciar automaticamente o monitoramento no disco。O sistema pesquisa imediatamente as posições uma vez，Digite novamente a cada 60 Monitorando o ritmo uma vez por segundo。O fechamento automático é realizado apenas durante o horário de negociação。',
    color: 'bg-green-500',
    icon: '📡',
  },
  {
    time: '09:31',
    label: 'Execução automática na abertura',
    desc: 'Execução automática dos sinais do sistema atual：`strong_buy` Comprará automaticamente na ordem recomendada，`buy/watch` será automaticamente marcado como ignorado pelo sistema。A execução automática processa apenas sinais do sistema que não foram processados ​​manualmente por você。',
    color: 'bg-emerald-500',
    icon: '⚡',
  },
  {
    time: '09:30 - 15:00',
    label: 'Atualização intradiária em tempo real',
    desc: 'Durante o horário de negociação, todos 5 Atualize a cada minuto `signal.realtime`，Usado para exibição frontal de preços em tempo real、Aumentar ou diminuir、OHLC；15:00 Vou pegar o preço de fechamento novamente。Este campo em tempo real é independente do pré-mercado snapshot，As linhas de base da análise histórica não serão substituídas。',
    color: 'bg-teal-500',
    icon: '🔄',
  },
  {
    time: 'dentro do horário de negociação',
    label: 'Monitoramento de risco intradiário',
    desc: 'Monitore lembretes de stop loss、Stop loss automático e posição fechada、Obtenha lucro e feche posições automaticamente、Lembrete de lucro、Posições atrasadas、Flutuações anormais e mudanças no setor。Somente paradas automáticas intradiárias que você define nas configurações globais/O limite de lucro desencadeará diretamente a liquidação automática，A maior parte do resto são regras de lembrete。',
    color: 'bg-amber-500',
    icon: '🛡️',
  },
  {
    time: '15:05',
    label: 'Monitoramento intradiário interrompido',
    desc: 'Interromper automaticamente o monitoramento intradiário após o fechamento do mercado，Pesquisa de posição final。',
    color: 'bg-slate-400',
    icon: '⏹️',
  },
  {
    time: '16:00',
    label: 'Análise após o expediente',
    desc: 'Insira automaticamente o mais longo 3 janela de processamento em lote horas após o expediente：Atualizar dados de fechamento、Reavaliar posições、Recálculo do controle de risco da carteira、correr 8 coleta de dados Agent、3 individual LLM extrair Agent、Liquidação de memória no mesmo dia sincronizada com desempenho especializado，e salve os resultados em um arquivo local disponível no dia seguinte。',
    color: 'bg-purple-500',
    icon: '🧠',
  },
  {
    time: '17:00 (Sexta-feira)',
    label: 'Relatório semanal automático',
    desc: 'Gere automaticamente relatórios semanais após o fechamento do mercado, toda sexta-feira，Estatísticas de transações agregadas、renda、taxa de vitórias、Desvantagens e desempenho do grupo modelo。',
    color: 'bg-indigo-500',
    icon: '📋',
  },
  {
    time: '17:30 (fim do mês)',
    label: 'Relatório mensal automático',
    desc: 'Os relatórios mensais são gerados automaticamente no último dia natural de negociação de final de cada mês.，e acionar atualizações de memória de longo prazo。A memória de longo prazo extrai lições de longo prazo de especialistas da memória de médio prazo、Pontos fortes e fracos。',
    color: 'bg-pink-500',
    icon: '📑',
  },
]

const PAGE_TABLE: { name: string; desc: string; badge: string }[] = [
  { name: 'Quadro de visão geral', desc: 'situação do mercado、Status em execução、Histórico de notificações críticas、Conselho de hoje、Banners de risco e integridade do sistema', badge: 'bg-blue-100 text-blue-700' },
  { name: 'estratégia diária', desc: 'Sinal de hoje、Classificação de terceira categoria、Eventos e motivos de rejeição、Conselho de venda de posição，e confirme/derrubar/negligência/Entrada de execução automática', badge: 'bg-green-100 text-green-700' },
  { name: 'ações auto-selecionadas', desc: 'procurar A Todas as ações do mercado，Crie sua própria lista de observação，Ver em tempo real OHLC e K Arame，Não participe de negociações automatizadas', badge: 'bg-yellow-100 text-yellow-700' },
  { name: 'Controle de risco de posição', desc: 'Lucros e perdas em tempo real、Status de controle de risco combinado、evento de risco、Sugestões para ocupar cargos、Reduzir posições/Fechando entrada', badge: 'bg-red-100 text-red-700' },
  { name: 'perfil comportamental', desc: 'Conte sua execução de sinais do sistema、derrubar、Negligência e atuação disciplinar', badge: 'bg-violet-100 text-violet-700' },
  { name: 'revisão de memória', desc: 'semana/Resumo mensal、histórico de transações、Espere e veja o registro、desempenho cumulativo、Modelo de desempenho do grupo e resultados de aprendizagem', badge: 'bg-amber-100 text-amber-700' },
  { name: 'AIAnálise especializada', desc: 'Veja detalhes da votação de especialistas para uma data específica、Conclusão hierárquica、Memória especializada e entradas de memória para o dia', badge: 'bg-indigo-100 text-indigo-700' },
  { name: 'AIcoleta de dados', desc: 'Ver a data especificada FactPool、8 dados Agent、3 extração Agent e resultados de extração estruturada', badge: 'bg-fuchsia-100 text-fuchsia-700' },
  { name: 'AI Configuração', desc: 'Configuração provider、piscina modelo、9 individual LLM Camada de análise、15 especialista em regras、3 extração Agent e mapeamento relacionado', badge: 'bg-cyan-100 text-cyan-700' },
  { name: 'Configurações globais', desc: 'Configurar stop loss automático intradiário/Limite de lucro，e dia/semana/Limite mensal de perda do portfólio', badge: 'bg-slate-100 text-slate-700' },
  { name: 'Descrição do sistema', desc: 'página atual。Explique como todo o sistema funciona、Quando executar automaticamente、Quais regras são apenas lembretes?、Quais serão vendidos diretamente?', badge: 'bg-slate-100 text-slate-600' },
]

function ConceptCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50/80 p-3">
      <div className="font-semibold text-slate-800 mb-1">{title}</div>
      <div className="text-slate-600 leading-relaxed">{children}</div>
    </div>
  )
}

export function GuideTab() {
  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold text-slate-800">Descrição do sistema</h2>

      <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border border-indigo-200/60 rounded-2xl shadow-sm p-4">
        <h3 className="text-base font-bold text-indigo-900 mb-1">O que este sistema está fazendo agora?？</h3>
        <p className="text-sm text-indigo-800 leading-relaxed">
          este é um <strong>local JSON persistente A Sistema de tomada de decisão assistido por estoque</strong>。Vai girar em torno de CSI todos os dias500O pool de ações conclui automaticamente a análise pré-mercado、Execução automática na abertura、Monitoramento intradiário、Coleta de dados fora do expediente e aprendizado especializado，E organize esses resultados em execução em um ambiente de trabalho operável no front-end。Não é um sistema programático de conexão direta para corretoras，Mas durante o horário de negociação，<strong>Você é「Configurações globais」Stop loss automático intradiário configurado aqui/O limite de obtenção de lucro automático acionará diretamente o fechamento automático de posições.</strong>；A maioria das regras restantes ainda são lembretes e auxílios à tomada de decisões。
        </p>
      </div>

      <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm p-4">
        <h3 className="text-base font-bold text-slate-800 mb-1">Cronograma de execução automática diária</h3>
        <p className="text-xs text-slate-500 mb-3">As tarefas a seguir são executadas automaticamente com base no dia de negociação e no horário de Pequim por padrão.。A maioria das etapas possui remoção de duplicação e proteção de maquiagem，Evite execuções repetidas ou execuções perdidas após a reinicialização do serviço。</p>

        <div className="relative ml-4">
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200" />

          <div className="space-y-3">
            {TIMELINE.map((node) => (
              <div key={`${node.time}-${node.label}`} className="relative flex items-start gap-3">
                <div className={`relative z-10 w-4 h-4 rounded-full ${node.color} ring-2 ring-white shadow-sm flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 rounded px-1.5 py-0.5">{node.time}</span>
                    <span className="text-sm font-semibold text-slate-800">{node.icon} {node.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{node.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm p-4">
        <h3 className="text-base font-bold text-slate-800 mb-2">O que você realmente precisa fazer todos os dias?？</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <div className="text-sm font-bold text-blue-800 mb-1.5">Antes do mercado</div>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Olhe primeiro「Quadro de visão geral」Confirme o status do mercado、Status do controle de risco e principais recomendações atuais</li>
              <li>Vá em frente「estratégia diária」Observe os sinais de pontuação alta、Razões para rejeição e recomendação de venda</li>
              <li>Se você não concorda com as recomendações do sistema，Ao capotar, tente anotar claramente os motivos.，Facilita a revisão subsequente</li>
            </ol>
          </div>

          <div className="rounded-xl border border-green-100 bg-green-50/50 p-3">
            <div className="text-sm font-bold text-green-800 mb-1.5">intradiário</div>
            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>O sistema monitorará automaticamente，Não há necessidade de você continuar observando o mercado</li>
              <li>Pare automaticamente a perda se o limite intradiário for atingido/Limite de lucro，O sistema fechará automaticamente a posição diretamente</li>
              <li>Se for apenas um lembrete dos riscos，Principalmente no banner do outdoor、Você será lembrado na página de controle de risco de posição e nas principais notificações</li>
            </ol>
          </div>

          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
            <div className="text-sm font-bold text-purple-800 mb-1.5">depois do expediente</div>
            <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>O processo fora do expediente será executado automaticamente，Geralmente nenhuma intervenção manual é necessária</li>
              <li>Recomenda-se assisti-lo em dias alternados ou uma vez por semana「revisão de memória」e「AIAnálise especializada」</li>
              <li>Se você quiser verificar quais dados o sistema coleta，Apenas vá「AIcoleta de dados」página</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm p-4">
          <h3 className="text-base font-bold text-slate-800 mb-2">Lógica operacional central</h3>
          <div className="space-y-3 text-xs">
            <ConceptCard title="1. Classificação de terceira categoria não é um slogan，Mas o link de cálculo real">
              Pontos de especialistas de <strong>30 Pedaço LLM especialista + 15 especialista em regras</strong>；Pontos técnicos vêm de tendências、estrutura、Dimensões de volume, preço e risco；Os pontos quantitativos provêm do impulso de médio prazo、resistência transversal、Liquidez、Estabilidade e regressão média。Os três fatores são então ponderados de acordo com o sistema de mercado atual para obter a pontuação final.。
            </ConceptCard>

            <ConceptCard title="2. Conviction Filter É o último limite de compra">
              Só porque a pontuação é alta não significa que você definitivamente irá comprá-lo.。O sistema verificará o limite novamente、Artigo de veto、ambiente de mercado、Risco de evento e restrições de posição，Finalmente o sinal foi completado `strong_buy / buy / watch / none`。
            </ConceptCard>

            <ConceptCard title="3. O veto orientado a eventos e a grandes eventos foi integrado ao processo principal">
              Os resultados da extração estruturada pós-mercado do dia de negociação anterior serão lidos antes da abertura do mercado.，Adicionar ações correspondentes a eventos positivos de alta confiança no conjunto de candidatos；Ao mesmo tempo, o relatório financeiro、Veto de um voto para grandes eventos incertos, como alterações no patrimônio líquido。
            </ConceptCard>

            <ConceptCard title="4. A análise completa continuará quando a posição estiver preenchida">
              Se a posição atual estiver ocupada, as vagas subsequentes serão apenas restritas.，O sistema não degenerará em uma fórmula fallback。daily run Ainda realizando pesquisas de especialistas reais、Gere novos sinais e revise posições。
            </ConceptCard>

            <ConceptCard title="5. Os preços ao vivo são separados dos instantâneos pré-mercado">
              Gerado antes de abrir `snapshot` Usado para rastreabilidade e benchmarks de análise；Exibição intradiária e congelamento de fechamento `realtime`。Portanto, o preço atual que você vê não é o preço antigo signals Preço de fechamento estático de ontem no arquivo。
            </ConceptCard>

            <ConceptCard title="6. Especialistas aprendem，No entanto, o padrão de aprendizagem foi alterado para fechar a liquidação no mesmo dia.">
              desempenho especializado、Desempenho do grupo modelo e aprendizado de peso agora pressionam“Previsões de pré-abertura，Fechamento da liquidação”calcular，Chega de esperar para vender posições，Não há mais mistura T+5 Ou calibre de lucro da posição de fechamento。
            </ConceptCard>
          </div>
        </div>

        <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm p-4">
          <h3 className="text-base font-bold text-slate-800 mb-2">Mecanismo de controle de risco</h3>
          <div className="space-y-3 text-xs text-slate-600">
            <div className="rounded-lg border border-red-100 bg-red-50/40 p-3">
              <div className="font-semibold text-red-800 mb-1">Controle prévio de risco：Interceptar diretamente novas posições</div>
              <div className="space-y-1 text-red-700">
                <p>- O número de posições atingiu o limite superior</p>
                <p>- alvo da lista negra</p>
                <p>- Mercado em baixa extremo ou crise de liquidez no nível do mercado</p>
                <p>- Grandes eventos podem ser vetados com um voto</p>
                <p>- O controle de risco combinado está em `paused` estado</p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
              <div className="font-semibold text-amber-800 mb-1">controle de vento intradiário：apontar“Execução automática”e“lembrar”Duas categorias</div>
              <div className="overflow-hidden rounded-lg border border-amber-200/80">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-amber-100/60">
                      <th className="px-2 py-1 text-left font-semibold text-amber-800">regra</th>
                      <th className="px-2 py-1 text-left font-semibold text-amber-800">Condição de gatilho</th>
                      <th className="px-2 py-1 text-left font-semibold text-amber-800">comportamento do sistema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    <tr>
                      <td className="px-2 py-1 font-medium text-amber-700">Stop loss automático e posição fechada</td>
                      <td className="px-2 py-1">As perdas intradiárias atingem o limite definido globalmente</td>
                      <td className="px-2 py-1 text-red-600 font-medium">Fechar posições automaticamente diretamente</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1 font-medium text-amber-700">Obtenha lucro e feche posições automaticamente</td>
                      <td className="px-2 py-1">O lucro intradiário atinge o limite definido globalmente</td>
                      <td className="px-2 py-1 text-green-600 font-medium">Fechar posições automaticamente diretamente</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1 font-medium text-amber-700">parar a perda/Lembrete de lucro</td>
                      <td className="px-2 py-1">Atingir a linha estratégica de stop loss ou 3% / 6% Linha de lucro</td>
                      <td className="px-2 py-1 text-amber-600 font-medium">Principalmente lembrete</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1 font-medium text-amber-700">Posições atrasadas</td>
                      <td className="px-2 py-1">O número de dias em que a posição é mantida excede o limite superior</td>
                      <td className="px-2 py-1 text-amber-600 font-medium">Principalmente lembrete</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1 font-medium text-amber-700">Flutuações anormais / Mudanças no setor</td>
                      <td className="px-2 py-1">Amplitude anormal ou múltiplas ações no setor caíram ao limite</td>
                      <td className="px-2 py-1 text-amber-600 font-medium">Principalmente lembrete</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-amber-700">A liquidação automática depende estritamente do julgamento durante períodos reais de negociação。pausa para almoço、depois de fechar、A venda automática não será acionada nos finais de semana e feriados legais。</p>
            </div>

            <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-3">
              <div className="font-semibold text-purple-800 mb-1">Controle de risco do portfólio：ter“Alarme”e“pausa”Dois níveis de semântica</div>
              <div className="space-y-1 text-purple-700">
                <p>- perda diária、perda semanal、perda mensal、A retração máxima entrará no estado de risco e na linha do tempo do evento</p>
                <p>- realmente desencadeia <strong>Suspender novos cargos</strong> sim：<strong>Perda mensal excede limite</strong> ou <strong>O rebaixamento máximo excede o limite</strong></p>
                <p>- Mesmo se o sistema estiver pausado，Você ainda tem permissão para fechar manualmente uma posição ou reduzir o risco de saída</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="font-semibold text-slate-700 mb-1">Proteção de consistência de transação</div>
              <div className="space-y-1 text-slate-600">
                <p>- Abra uma posição / Fechar posição / Reduza todas as posições e use o bloqueio de arquivo，Evite corrupção de gravação simultânea JSON</p>
                <p>- Fechar posição / zona de iluminação `clientNonce` Proteção idempotente，Evite que cliques duplos e novas tentativas de rede vendam novamente</p>
                <p>- T+1 A verificação ainda é válida，Comprar no mesmo dia não pode vender no mesmo dia</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm p-4">
        <h3 className="text-base font-bold text-slate-800 mb-2">AI e sistemas de dados</h3>
        <div className="grid grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="font-semibold text-slate-700 mb-1">Pool de ações e cotações</div>
            <p>O principal pool de ações atual é CSI500Ações constituintes。Capas de pesquisa de ações autosselecionadas A mercado de ações。A captura de mercado é baseada principalmente na Tencent，Reserve outras fontes para alguns links como backup。</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="font-semibold text-slate-700 mb-1">AI sistema especialista</div>
            <p>Sistema integrado 9 individual LLM Camada de análise，comum 30 Pedaço LLM especialista；Também 15 especialista em regras。LLM vote em mais provider、fallback、Limite de corrente simultânea、Degradação de tempo limite e ponderação dinâmica especializada。</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="font-semibold text-slate-700 mb-1">Coleta e extração de dados</div>
            <p>Executar automaticamente após o expediente 8 coleta de dados Agent，Então por 3 individual LLM extrair Agent faça um anúncio、Impacto de notícias e extração estruturada de sentimento。dia seguinte 07:30 Corra novamente pela manhã para reabastecer，Adicione novas informações especialmente à noite。</p>
          </div>
        </div>
      </div>

      <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm p-4">
        <h3 className="text-base font-bold text-slate-800 mb-2">Armazenamento local e auditabilidade</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Os resultados de execução deste sistema persistem principalmente no diretório local. <code className="bg-slate-200/80 px-1 rounded text-[10px]">~/documento/AIAnálise de negociação de ações</code>。
          em `signals/` Salve sinais diários、`positions.json` Mantenha uma posição、`trades.json` transação de depósito、`intraday/` Salvando status、`experts/` Retenção de memória e desempenho especializado、`config/strategy.json` Salvar parâmetros de comportamento global。
          Se você quiser verificar“Por que o sistema chegou a essa conclusão?”，Não olhe apenas para os cartões da página inicial，Vá diretamente「AIAnálise especializada」e「AIcoleta de dados」Veja o voto original、FactPool e resultados de extração。
        </p>
      </div>

      <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm p-4">
        <h3 className="text-base font-bold text-slate-800 mb-2">Lista de funções em cada página</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200/80 text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="px-3 py-2 font-semibold text-slate-700 w-28">página</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Descrição da função</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PAGE_TABLE.map((row) => (
                <tr key={row.name}>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${row.badge}`}>{row.name}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 leading-relaxed">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 border border-green-200/60 rounded-2xl shadow-sm p-4">
        <h3 className="text-base font-bold text-green-900 mb-2">para a versão atual 6 sugestões de uso</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { num: '1', title: 'Primeiro distinguir“Execução automática”e“Fechamento automático”', desc: '09:31 A execução automática consiste em abrir uma posição no sinal do sistema/negligência；A liquidação intradiária automática é um método de controle de risco para manutenção de posições.，Os dois não são a mesma coisa。' },
            { num: '2', title: 'Defina as configurações globais primeiro e depois implemente o disco', desc: 'Stop loss automático intradiário、Obter lucro automaticamente、Os limites diários, semanais e mensais são alterações no nível do sistema.，Primeiro ajuste-o para um intervalo que você possa aceitar.。' },
            { num: '3', title: 'Verifique o preço em tempo real realtime calibre', desc: 'O benchmark de análise e a cotação intradiária em tempo real na página de sinais pré-mercado são separados.，Não jogue fora o velho snapshot Tratar como preço atual intradiário。' },
            { num: '4', title: 'Suspensão não significa que não possa ser vendido', desc: 'Suspensão do controle de risco da carteira apenas limita novas posições，Você ainda pode fechar ou reduzir sua posição para sair do risco。' },
            { num: '5', title: 'Se você não acredita em caixas pretas, vá para a página de auditoria', desc: 'Página de análise de especialistas para ver os votos，Veja a página de coleta de dados FactPool e resultados de extração，Isso é melhor do que apenas ler uma frase“Recomendado para comprar”mais confiável。' },
            { num: '6', title: 'Ações autosselecionadas são uma plataforma de observação，Não é um pool automático', desc: 'A página autosselecionada permite que você fique de olho nas ações individuais em todo o mercado，Mas não entrará automaticamente no CSI500Conjunto principal de estratégias，Não será comprado automaticamente。' },
          ].map((tip) => (
            <div key={tip.num} className="rounded-xl bg-white/70 border border-green-100 p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{tip.num}</span>
                <span className="text-sm font-semibold text-green-800">{tip.title}</span>
              </div>
              <p className="text-xs text-green-700 leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl shadow-sm px-4 py-3">
        <h3 className="text-sm font-bold text-amber-800 mb-1">Isenção de responsabilidade</h3>
        <p className="text-xs text-amber-700 leading-relaxed">
          Este sistema é apenas uma ferramenta de aprendizagem pessoal e de ajuda à tomada de decisões，<strong>Não constitui qualquer conselho de investimento</strong>。desempenho histórico、Conclusão do modelo、Nem a votação de especialistas nem as regras automatizadas garantem retornos futuros.，Todas as decisões comerciais e consequências de lucros e perdas são suportadas pelo usuário.。
        </p>
      </div>
    </div>
  )
}
