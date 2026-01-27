import path from 'path'
import winston from 'winston'
import 'winston-daily-rotate-file'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const logger = winston.createLogger({
  level: (process.env.NODE_ENV === 'development' ? 'verbose' : 'info'),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.DailyRotateFile({
      format: winston.format.json(),
      dirname: path.join(__dirname, '..', 'logs'),
      filename: 'kapture-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d'
    })
  ]
})
