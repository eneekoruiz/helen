#!/usr/bin/env node
import { startMcpServer } from './core/mcp.js';

// Entry point for running HELEN as an MCP stdio server
startMcpServer(process.stdin, process.stdout);
