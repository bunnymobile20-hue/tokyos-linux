import winston from 'winston'
import path from 'path'

/**
 * Winston Registro geral
 *
 * Instruções de reparo（v1.26.0）：
 * 1. correção de caminho：usar `../../logs` substituir `../../../logs`，Após a compilação dist/utils/ Escreva em tempo de execução backend/logs/
 * 2. Rotação de log：maxsize 50MB，manter recente 5 arquivos
 * 3. Nível rebaixado para debug：Cooperar sa-logger Plano de gravação completo
 */

// dist/utils/ -> dist/ -> backend/ -> backend/logs/
const logDir = path.resolve(__dirname, '../../logs')

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, module }) => {
    return `[${timestamp}] [${module || 'System'}] [${level.toUpperCase()}] ${message}`
  })
)

export const logger = winston.createLogger({
  level: 'debug',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'backend-error.log'),
      level: 'error',
      maxsize: 50 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'backend-out.log'),
      level: 'warn',
      maxsize: 50 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
})

// Não production Saída adicional do ambiente para console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    ),
  }))
}
