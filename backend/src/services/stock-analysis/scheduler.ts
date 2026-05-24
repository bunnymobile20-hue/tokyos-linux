import cron from 'node-cron'

import { logger } from '../../utils/logger'
import { DEFAULT_SERVER_PATHS, getServerPaths } from '../../utils/serverConfig'
import { saLog } from './sa-logger'
import {
  POST_MARKET_BATCH_WINDOW_MS,
  bootstrapStockAnalysis,
  generateMonthlyReport,
  generateWeeklyReport,
  runMorningSupplementAnalysis,
  runStockAnalysisDaily,
  runStockAnalysisPostMarket,
  runAutoDecisions,
  refreshSignalsRealtime,
  startIntradayMonitor,
  stopIntradayMonitor,
} from './service'
import { isTradingDay, syncOnlineTradingCalendar, isOnlineCacheExpired, initCalendarCacheDir, validateAndSyncCalendarOnStartup } from './trading-calendar'

let initialized = false

// [M7] Configuração explícita de fuso horário，Certifique-se de que a implantação em servidores de fuso horário fora da China ainda seja acionada corretamente
const CRON_OPTIONS = { timezone: 'Asia/Shanghai' } as const

// [M8] Prevenção em nível de data de execução repetida：Registre o que foi concluído com sucesso naquele dia cron Tipo de execução
// apenas para cron O gatilho automático entra em vigor，Manual API O disparo não é afetado
const completedCronDates: Record<string, Set<string>> = {}

/** P2-D4: Usar o horário de Pequim（e cron de Asia/Shanghai Mesmo fuso horário） */
function todayDateStr(): string {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Shanghai' })
}

/** [M8] Verifique se o tipo de execução especificado foi aprovado hoje cron Concluído com sucesso */
function hasCronCompletedToday(runType: string): boolean {
  const today = todayDateStr()
  return completedCronDates[today]?.has(runType) ?? false
}

/** [M8] Marcar o tipo de execução especificado como aprovado hoje cron Concluído com sucesso */
function markCronCompletedToday(runType: string): void {
  const today = todayDateStr()
  if (!completedCronDates[today]) {
    // Limpe registros de datas antigas，Manter apenas o dia atual
    for (const key of Object.keys(completedCronDates)) {
      if (key !== today) delete completedCronDates[key]
    }
    completedCronDates[today] = new Set()
  }
  completedCronDates[today].add(runType)
}

async function getStockAnalysisDir() {
  const paths = await getServerPaths()
  return paths.stockAnalysisDir || DEFAULT_SERVER_PATHS.stockAnalysisDir
}

/** Determine se hoje é o último dia deste mês */
function isLastDayOfMonth(): boolean {
  const today = new Date()
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  return tomorrow.getDate() === 1
}

/**
 * v1.35.0 [A5-P0-3] Compensar corridas perdidas na inicialização cron Tarefa
 *
 * Se o processo estiver antes do disco 08:05、intradiário 09:25 ou depois do expediente 16:00 O horário está esgotado，Após a reinicialização, essas tarefas não serão executadas novamente no mesmo dia.。
 * Esta função detecta：
 *   1. Hoje é dia de negociação?
 *   2. O horário atual de Pequim já passou de um certo tempo? cron ponto no tempo
 *   3. A tarefa foi concluída hoje?（passar hasCronCompletedToday ou lastRunAt）
 * Se todos estiverem satisfeitos「Deveria ter corrido, mas não correu」então faça uma corrida imediatamente。
 */
async function runMissedCronTasksOnStartup(): Promise<void> {
  if (!isTradingDay()) {
    saLog.info('scheduler', 'Comece a corrida de maquiagem：Hoje não é dia de negociação，pular sobre')
    return
  }

  const now = new Date()
  const beijingStr = now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false })
  const [hourStr, minuteStr] = beijingStr.split(':')
  const hhmm = Number(hourStr) * 100 + Number(minuteStr)
  saLog.info('scheduler', `Iniciar verificação de maquiagem：Hora atual de Pequim ${beijingStr} (hhmm=${hhmm})`)

  // Análise diária pré-mercado（08:05，janela de maquiagem 08:05 ~ 15:00，As corridas de compensação podem ser iniciadas antes ou durante o mercado.）
  if (hhmm >= 805 && hhmm < 1500 && !hasCronCompletedToday('daily')) {
    try {
      const dir = await getStockAnalysisDir()
      saLog.info('scheduler', `[corrida de maquiagem] detectado 08:05 daily Tarefa não concluída，Faça a corrida imediatamente`)
      await runStockAnalysisDaily(dir)
      markCronCompletedToday('daily')
      saLog.info('scheduler', '[corrida de maquiagem] daily Corrida complementar concluída')
    } catch (error) {
      saLog.error('scheduler', `[corrida de maquiagem] daily falhar：${(error as Error).message}`)
    }
  }

  // Análise após o expediente（16:00）— apenas em 16:00 ~ 23:59 Apenas compense isso no meio（Evite cruzar as fronteiras japonesas）
  if (hhmm >= 1600 && !hasCronCompletedToday('postMarket')) {
    try {
      const dir = await getStockAnalysisDir()
      saLog.info('scheduler', `[corrida de maquiagem] detectado 16:00 postMarket Tarefa não concluída，Faça a corrida imediatamente`)
      await runStockAnalysisPostMarket(dir)
      markCronCompletedToday('postMarket')
      saLog.info('scheduler', '[corrida de maquiagem] postMarket Corrida complementar concluída')
    } catch (error) {
      saLog.error('scheduler', `[corrida de maquiagem] postMarket falhar：${(error as Error).message}`)
    }
  }

  // Monitoramento intradiário（09:25 - 15:05）— Só começa ao reiniciar durante o horário de negociação
  if (hhmm >= 925 && hhmm < 1505) {
    try {
      const dir = await getStockAnalysisDir()
      saLog.info('scheduler', `[corrida de maquiagem] Atualmente em sessão de negociação，Iniciar monitoramento de disco`)
      await startIntradayMonitor(dir)
    } catch (error) {
      saLog.error('scheduler', `[corrida de maquiagem] O monitoramento intra-disco falhou ao iniciar：${(error as Error).message}`)
    }
  }
}

export function initStockAnalysisScheduler() {
  if (initialized || process.env.NODE_ENV === 'test') {
    return
  }

  initialized = true

  // [P2-4] Ao iniciar, conclua a sincronização do calendário antes de iniciar o negócio.，Elimine as condições de corrida
  // Após a conclusão da autoverificação do calendário → Atraso 10 Segundo → Inicialização de negócios（Certifique-se de que os dados do calendário estejam disponíveis）
  void getStockAnalysisDir()
    .then(async (dir) => {
      initCalendarCacheDir(dir)
      saLog.info('scheduler', 'comece: O autoteste do calendário de negociação começa')
      await validateAndSyncCalendarOnStartup()
      saLog.info('scheduler', 'comece: Autoteste do calendário de negociação concluído')
    })
    .catch((error) => {
      const msg = (error as Error).message
      saLog.error('scheduler', `comece: Falha no autoteste do calendário de negociação erro=${msg}`)
      logger.error(`Falha no autoteste de inicialização do calendário de negociação: ${msg}`, { module: 'StockAnalysis' })
    })
    .then(() => {
      // Atraso após a conclusão da autoverificação do calendário 10 Comece o negócio em segundos
      setTimeout(() => {
        void getStockAnalysisDir()
          .then((dir) => {
            saLog.info('scheduler', 'comece: Começa o aquecimento dos negócios')
            return bootstrapStockAnalysis(dir)
          })
          .then(() => {
            saLog.info('scheduler', 'comece: Aquecimento de negócios concluído')
            // v1.35.0 [A5-P0-3] Comece a corrida de maquiagem：Se o processo for cron O ponto de tempo passou, mas não foi concluído hoje，Faça a corrida imediatamente
            return runMissedCronTasksOnStartup()
          })
          .catch((error) => {
            const msg = (error as Error).message
            saLog.error('scheduler', `comece: O aquecimento dos negócios falhou erro=${msg}`)
            logger.error(`AI Falha no aquecimento da inicialização da negociação de ações: ${msg}`, { module: 'StockAnalysis' })
          })
      }, 10_000)
    })

  // Antes do mercado 08:05 Segunda a sexta — análise diária
  // [H1] Aumentar isTradingDay() guarda，Evite corridas vazias em feriados legais
  // [M8] Aumentar hasCronCompletedToday() guarda，Evite repetir no mesmo dia
  // [M7] explícito timezone Assegurar
  cron.schedule('5 8 * * 1-5', () => {
    if (!isTradingDay()) {
      logger.info('Hoje não é dia de negociação，Pular análise diária', { module: 'StockAnalysis' })
      return
    }
    if (hasCronCompletedToday('daily')) {
      logger.info('[M8] A análise diária de hoje foi fornecida por cron Terminar，Pular execução repetida', { module: 'StockAnalysis' })
      return
    }
    void getStockAnalysisDir()
      .then((dir) => {
        saLog.info('scheduler', 'cron:daily A análise diária pré-mercado começa')
        return runStockAnalysisDaily(dir)
      })
      .then(() => {
        markCronCompletedToday('daily')
        saLog.info('scheduler', 'cron:daily Análise diária pré-mercado concluída')
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:daily A análise diária pré-mercado falhou erro=${msg}`)
        logger.error(`AI A atualização falhou antes da abertura do mercado de ações: ${msg}`, { module: 'StockAnalysis' })
      })
  }, CRON_OPTIONS)

  // depois de abrir 09:31 Segunda a sexta — Execução automática com um clique（A compra forte abre automaticamente uma posição + comprar/Espere para ver e ignore automaticamente）
  // v1.30.1：Acionar versão automaticamente。confiar 08:05 A análise diária foi concluída
  // Compartilhado com botão manual runAutoDecisions()，É seguro acionar repetidamente no mesmo dia：O sinal processado será decisionSource !== 'system' salto de guarda
  cron.schedule('31 9 * * 1-5', () => {
    if (!isTradingDay()) {
      logger.info('Hoje não é dia de negociação，Ignorar a execução automática', { module: 'StockAnalysis' })
      return
    }
    if (hasCronCompletedToday('autoExecute')) {
      logger.info('[M8] A execução automática de hoje foi concluída，Ignorar gatilhos repetidos', { module: 'StockAnalysis' })
      return
    }
    void getStockAnalysisDir()
      .then((dir) => {
        saLog.info('scheduler', 'cron:autoExecute A execução automática começa na abertura')
        return runAutoDecisions(dir)
      })
      .then((result) => {
        markCronCompletedToday('autoExecute')
        saLog.info(
          'scheduler',
          `cron:autoExecute Terminar tradeDate=${result.tradeDate} bought=${result.autoBoughtCount} ignored=${result.autoIgnoredCount} skipped=${result.skippedCount}`,
        )
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:autoExecute Execução automática de abertura falhou erro=${msg}`)
        logger.error(`AI Falha na execução automática de abertura de estoque: ${msg}`, { module: 'StockAnalysis' })
      })
  }, CRON_OPTIONS)

  // v1.30.2: Atualização de cotação de mercado intradiária em tempo real — dia útil 09:30-15:00 Todo 5 Atualização de minuto signals Documentário realtime Campo
  // resolver"Gerado antes da negociação matinal signals → Exibir os preços de fechamento de ontem ao longo do dia"oportunidade bug
  // Não coberto snapshot（snapshot Mantém a linha de base histórica de quando o sinal foi gerado），escreva apenas signal.realtime
  // Use dois cron：09:30-09:55 Todo 5 minuto + 10:00-14:59 Todo 5 minuto + 15:00（Congelamento de fechamento único）
  //   node-cron O tamanho da etapa de extensão não é compatível，usar '*/5 9-14 * * 1-5' + Cobertura extra 15:00
  // Nenhuma nova tentativa em caso de falha，Próximo tick Irá atualizar naturalmente，Projeto tolerante a falhas em refreshSignalsRealtime interno
  cron.schedule('*/5 9-14 * * 1-5', () => {
    if (!isTradingDay()) return
    const now = new Date()
    const beijingHours = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai', hour: '2-digit', hour12: false }))
    const beijingMinutes = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai', minute: '2-digit' }))
    // Execute apenas durante o horário de negociação real：09:30-11:30, 13:00-15:00
    const inMorningSession = (beijingHours === 9 && beijingMinutes >= 30) || (beijingHours === 10) || (beijingHours === 11 && beijingMinutes <= 30)
    const inAfternoonSession = beijingHours >= 13 && beijingHours <= 14
    if (!inMorningSession && !inAfternoonSession) {
      return
    }
    void getStockAnalysisDir()
      .then((dir) => refreshSignalsRealtime(dir))
      .then((result) => {
        saLog.info('scheduler', `cron:refreshRealtime Terminar tradeDate=${result.tradeDate} updated=${result.updated} skipped=${result.skipped}`)
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:refreshRealtime falhar erro=${msg}`)
      })
  }, CRON_OPTIONS)

  // v1.30.2: 15:00 Fechando congelamento — Seja independente pelo menos uma vez，Capture e escreva o preço final de fechamento do dia realtime
  cron.schedule('0 15 * * 1-5', () => {
    if (!isTradingDay()) return
    void getStockAnalysisDir()
      .then((dir) => refreshSignalsRealtime(dir))
      .then((result) => {
        saLog.info('scheduler', `cron:refreshRealtime O fechamento foi concluído tradeDate=${result.tradeDate} updated=${result.updated} skipped=${result.skipped}`)
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:refreshRealtime Falha ao fechar o congelamento erro=${msg}`)
      })
  }, CRON_OPTIONS)

  // [H2] Sexta-feira 17:00 — Gere relatórios semanais automaticamente (S2)
  // de 16:00 Mudar para 17:00，Evite análises fora do expediente 16:00 Conflito de simultaneidade
  // [M8] Aumentar hasCronCompletedToday() guarda
  // [M7] explícito timezone Assegurar
  cron.schedule('0 17 * * 5', () => {
    if (!isTradingDay()) {
      logger.info('Hoje não é dia de negociação，Pular relatório semanal', { module: 'StockAnalysis' })
      return
    }
    if (hasCronCompletedToday('weekly')) {
      logger.info('[M8] O relatório semanal desta semana foi fornecido por cron Terminar，Pular execução repetida', { module: 'StockAnalysis' })
      return
    }
    void getStockAnalysisDir()
      .then((dir) => {
        saLog.info('scheduler', 'cron:weekly A geração de relatórios semanais começa')
        return generateWeeklyReport(dir)
      })
      .then(() => {
        markCronCompletedToday('weekly')
        saLog.info('scheduler', 'cron:weekly Geração de relatório semanal concluída')
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:weekly Falha na geração do relatório semanal erro=${msg}`)
        logger.error(`AI Falha ao gerar relatório semanal de negociação de ações: ${msg}`, { module: 'StockAnalysis' })
      })
  }, CRON_OPTIONS)

  // [M6] O último dia do mês 17:30 — Gere relatórios mensais automaticamente (S3)
  // Remover limite semanal（Mudar para * em vez de 1-5），Depender de isLastDayOfMonth() guarda interna
  // hora de 16:30 Mudar para 17:30，Evite conflitos com análises fora do expediente
  // [M8] Aumentar hasCronCompletedToday() guarda
  // [M7] explícito timezone Assegurar
  cron.schedule('30 17 28-31 * *', () => {
    if (!isLastDayOfMonth()) return
    if (hasCronCompletedToday('monthly')) {
      logger.info('[M8] O relatório mensal deste mês foi fornecido por cron Terminar，Pular execução repetida', { module: 'StockAnalysis' })
      return
    }
    void getStockAnalysisDir()
      .then((dir) => {
        saLog.info('scheduler', 'cron:monthly A geração de relatórios mensais começa')
        return generateMonthlyReport(dir)
      })
      .then(() => {
        markCronCompletedToday('monthly')
        saLog.info('scheduler', 'cron:monthly Geração de relatório mensal concluída')
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:monthly Falha na geração do relatório mensal erro=${msg}`)
        logger.error(`AI Falha ao gerar relatório mensal de negociação de ações: ${msg}`, { module: 'StockAnalysis' })
      })
  }, CRON_OPTIONS)

  // suplemento matinal 07:30 Segunda a sexta — Suplemento de notícias noturnas/Dados do anúncio (G1.5)
  // Apenas corra Phase 4（Coleta de dados）+ Phase 5（LLM extração de informações），Fundido no conjunto de fatos do dia de negociação anterior
  cron.schedule('30 7 * * 1-5', () => {
    if (!isTradingDay()) {
      logger.info('Hoje não é dia de negociação，Pular análise suplementar matinal', { module: 'StockAnalysis' })
      return
    }
    if (hasCronCompletedToday('morningSupplement')) {
      logger.info('[M8] A análise complementar desta manhã foi fornecida por cron Terminar，Pular execução repetida', { module: 'StockAnalysis' })
      return
    }
    void getStockAnalysisDir()
      .then((dir) => {
        saLog.info('scheduler', 'cron:morningSupplement Começa a análise complementar matinal')
        return runMorningSupplementAnalysis(dir)
      })
      .then(() => {
        markCronCompletedToday('morningSupplement')
        saLog.info('scheduler', 'cron:morningSupplement Análise suplementar matinal concluída')
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:morningSupplement Falha na análise do suplemento matinal erro=${msg}`)
        logger.error(`AI Falha na análise suplementar da manhã de negociação de ações: ${msg}`, { module: 'StockAnalysis' })
      })
  }, CRON_OPTIONS)

  // depois do expediente 16:00 Segunda a sexta — Processo de análise após o expediente (G1 ciclo duplo)
  // [M8] Aumentar hasCronCompletedToday() guarda
  // [M7] explícito timezone Assegurar
  cron.schedule('0 16 * * 1-5', () => {
    if (!isTradingDay()) {
      logger.info('Hoje não é dia de negociação，Ignorar análise após o expediente', { module: 'StockAnalysis' })
      return
    }
    if (hasCronCompletedToday('postMarket')) {
      logger.info('[M8] A análise fora do expediente de hoje foi fornecida por cron Terminar，Pular execução repetida', { module: 'StockAnalysis' })
      return
    }
    void getStockAnalysisDir()
      .then((dir) => {
        saLog.info('scheduler', `cron:postMarket A análise após o expediente começa janela máxima=${POST_MARKET_BATCH_WINDOW_MS}ms`)
        return runStockAnalysisPostMarket(dir)
      })
      .then(() => {
        markCronCompletedToday('postMarket')
        saLog.info('scheduler', 'cron:postMarket Análise após o expediente concluída')
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:postMarket Falha na análise após o expediente erro=${msg}`)
        logger.error(`AI O processo de negociação de ações fora do horário comercial falhou: ${msg}`, { module: 'StockAnalysis' })
      })
  }, CRON_OPTIONS)

  // abertura 09:25 Segunda a sexta — Iniciar monitoramento de disco (S1)
  // [M7] explícito timezone Assegurar
  cron.schedule('25 9 * * 1-5', () => {
    if (!isTradingDay()) {
      logger.info('Hoje não é dia de negociação，Ignorar monitoramento intradiário', { module: 'StockAnalysis' })
      return
    }
    void getStockAnalysisDir()
      .then((dir) => {
        saLog.info('scheduler', 'cron:intraday Início do monitoramento intradiário')
        return startIntradayMonitor(dir)
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:intraday O monitoramento intra-disco falhou ao iniciar erro=${msg}`)
        logger.error(`AI Falha ao iniciar o monitoramento intradiário de negociação de ações: ${msg}`, { module: 'StockAnalysis' })
      })
  }, CRON_OPTIONS)

  // fechar 15:05 Segunda a sexta — Pare o monitoramento intradiário
  // [M7] explícito timezone Assegurar
  cron.schedule('5 15 * * 1-5', () => {
    if (!isTradingDay()) return
    void getStockAnalysisDir()
      .then((dir) => {
        saLog.info('scheduler', 'cron:intraday Monitoramento intradiário interrompido')
        return stopIntradayMonitor(dir)
      })
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:intraday O monitoramento intradiário não conseguiu parar erro=${msg}`)
        logger.error(`AI O monitoramento intradiário da negociação de ações não conseguiu parar: ${msg}`, { module: 'StockAnalysis' })
      })
  }, CRON_OPTIONS)

  // diariamente 07:30 — Sincronização do calendário de negociação online（Se o cache expirou）
  // Análise pré-mercado (08:05) Atualizar antes，certificar-se isTradingDay Use os dados mais recentes
  cron.schedule('30 7 * * *', () => {
    if (!isOnlineCacheExpired()) return
    saLog.info('scheduler', 'cron:calendarSync Começa a sincronização regular do calendário de negociação online')
    void syncOnlineTradingCalendar()
      .then(() => saLog.info('scheduler', 'cron:calendarSync O calendário de negociação online é sincronizado regularmente'))
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:calendarSync A sincronização periódica do calendário de negociação online falha erro=${msg}`)
        logger.error(`A sincronização periódica do calendário de negociação online falha: ${msg}`, { module: 'StockAnalysis' })
    })
  }, CRON_OPTIONS)

  // por mês 1 dia 06:00 — Forçar atualização do calendário de negociação online（Não verifique a expiração）
  // Certifique-se de fazer uma sincronização completa pelo menos uma vez por mês，Evite o uso prolongado de caches expirados
  cron.schedule('0 6 1 * *', () => {
    saLog.info('scheduler', 'cron:calendarForceSync A sincronização obrigatória mensal do calendário começa')
    void syncOnlineTradingCalendar()
      .then(() => saLog.info('scheduler', 'cron:calendarForceSync Sincronização mensal obrigatória do calendário concluída'))
      .catch((error) => {
        const msg = (error as Error).message
        saLog.error('scheduler', `cron:calendarForceSync Falha na sincronização forçada do calendário mensal erro=${msg}`)
        logger.error(`Falha na sincronização forçada mensal do calendário de negociação on-line: ${msg}`, { module: 'StockAnalysis' })
    })
  }, CRON_OPTIONS)
}
