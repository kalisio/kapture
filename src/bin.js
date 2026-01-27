#!/usr/bin/env node

import { createServer } from './main.js'
import { logger } from './logger.js'

async function run () {
  try {
    await createServer()
    logger.info('Server started listening')
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

run()
