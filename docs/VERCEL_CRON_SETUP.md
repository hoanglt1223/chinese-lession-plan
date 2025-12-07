# Vercel Cron Job Integration

This document explains how the cronjob system integrates with Vercel's native cron functionality.

## Overview

The cronjob system now supports Vercel's built-in cron job scheduling, which provides reliable, managed scheduling without external dependencies.

## Components

### 1. Vercel Cron Endpoint (`/api/cron-schedule`)
- **Purpose**: Main entry point called by Vercel's cron scheduler
- **Security**: Protected by `CRON_SECRET` environment variable
- **Logic**: Finds jobs due to run and executes them in parallel

### 2. Configuration (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron-schedule",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 3. Job Management (`/api/cronjob`)
- **Purpose**: Manual job management and UI
- **Features**: Create, run, pause, monitor jobs
- **Integration**: Works seamlessly with scheduled jobs

## Setup Instructions

### 1. Environment Variables
Generate and set the cron secret:

```bash
pnpm cron:generate-secret
```

Add to `.env`:
```
CRON_SECRET=your_generated_secret_here
```

Add to Vercel project settings:
- Go to Project Settings → Environment Variables
- Add `CRON_SECRET` with the generated value

### 2. Deployment
1. Deploy the application to Vercel
2. Vercel automatically detects the `crons` configuration
3. Cron jobs are scheduled and run automatically

### 3. Verification
Check Vercel function logs to verify cron job execution:
```
Starting scheduled cron job execution...
Found X jobs to run
Starting job: job-name (job-id)
Completed job: job-name (job-id)
```

## How It Works

### Scheduling Flow
1. Vercel calls `/api/cron-schedule` on schedule
2. Endpoint validates the request with `CRON_SECRET`
3. System queries database for jobs due to run
4. Each eligible job is executed in parallel
5. Job progress and results are tracked in database

### Job Eligibility
Jobs are executed when:
- Status is `pending`
- `nextRun` time is in the past or null
- Course outline exists in database

### Error Handling
- Failed jobs are marked with `failed` status
- Errors are logged to Vercel function logs
- Individual lesson failures don't stop other jobs
- Jobs can be retried manually or on next scheduled run

## Configuration Options

### Schedule Patterns
Modify `vercel.json` to change schedules:

```json
{
  "crons": [
    {
      "path": "/api/cron-schedule",
      "schedule": "0 */6 * * *"  // Every 6 hours
    }
  ]
}
```

### Concurrency
- Vercel may run multiple cron instances simultaneously
- Database transactions handle concurrency safely
- Job status tracking prevents duplicate executions

### Timeout Handling
- Vercel functions timeout after 300 seconds
- Large courses may require multiple runs
- Progress is saved between runs

## Monitoring

### Vercel Dashboard
- Function logs show execution details
- Usage metrics track API calls
- Error reporting for failed executions

### Database Monitoring
```sql
-- View recent job executions
SELECT * FROM cronjobs
ORDER BY updated_at DESC
LIMIT 10;

-- Check failed lessons
SELECT * FROM cronjob_lesson_statuses
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Application UI
- Visit `/cronjob-manager` for job status
- Real-time progress monitoring
- Error reporting and troubleshooting

## Best Practices

### Performance
- Limit concurrent jobs to prevent API rate limits
- Use appropriate schedules (avoid excessive frequency)
- Monitor database performance with large datasets

### Reliability
- Set up alerts for failed executions
- Regular backup of job configurations
- Test failover scenarios

### Security
- Keep `CRON_SECRET` secure and unique
- Rotate secrets periodically
- Monitor unauthorized access attempts

## Troubleshooting

### Common Issues

1. **Jobs not executing**
   - Check Vercel function logs
   - Verify `CRON_SECRET` is set correctly
   - Ensure cron configuration is valid

2. **Jobs failing midway**
   - Check for API rate limits
   - Review function timeout logs
   - Monitor database connection issues

3. **Duplicate executions**
   - Check job status logic
   - Review database transaction handling
   - Verify Vercel cron configuration

### Debug Mode
Add environment variable to enable detailed logging:
```
DEBUG_CRON=true
```

This provides additional logging in cron job execution.

## Migration from Manual to Automatic

Existing manual jobs continue to work:
1. Jobs created in UI still available
2. Manual execution still possible
3. Scheduled execution automatically handles eligible jobs

To enable scheduling for existing jobs:
1. Ensure job has valid cron schedule
2. Set status to `pending`
3. System will automatically pick up on next run

## Example Usage

### Daily Course Processing
```json
{
  "crons": [
    {
      "path": "/api/cron-schedule",
      "schedule": "0 2 * * *"  // 2 AM daily
    }
  ]
}
```

### Weekday Business Hours
```json
{
  "crons": [
    {
      "path": "/api/cron-schedule",
      "schedule": "0 9,13,17 * * 1-5"  // 9 AM, 1 PM, 5 PM weekdays
    }
  ]
}
```

This integration provides a robust, scalable solution for automated lesson generation using Vercel's managed infrastructure.