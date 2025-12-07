#!/usr/bin/env node

// Generate a secure random secret for Vercel cron jobs
import crypto from 'crypto';

function generateCronSecret() {
  return crypto.randomBytes(32).toString('hex');
}

console.log('Generated Cron Secret:');
console.log('CRON_SECRET=' + generateCronSecret());
console.log('\nAdd this to your .env file and Vercel environment variables.');