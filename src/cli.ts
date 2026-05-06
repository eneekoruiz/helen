#!/usr/bin/env node
import { createProgram } from './index.js';
import { logger } from './core/logger.js';

process.on('unhandledRejection', (err) => {
  logger.error('Fatal: Unhandled promise rejection');
  console.error(err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Fatal: Uncaught exception');
  console.error(err);
  process.exit(1);
});

const program = createProgram();
program.parse(process.argv);

