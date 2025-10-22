#!/usr/bin/env node
import dotenv from 'dotenv';
import { spawn } from 'child_process';

// Load environment variables from .env file
dotenv.config();

// Get PORT from environment, default to 3000
const port = process.env.PORT || '3000';

console.log(`Starting localtunnel on port ${port}...`);

// Spawn localtunnel process
const lt = spawn('lt', ['--port', port], {
  stdio: 'inherit',
  shell: true
});

lt.on('error', (error) => {
  console.error('Failed to start localtunnel:', error);
  process.exit(1);
});

lt.on('close', (code) => {
  process.exit(code || 0);
});
