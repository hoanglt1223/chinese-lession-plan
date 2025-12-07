# Cronjob System for Automated Lesson Generation

## Overview

This cronjob system enables automated, parallel generation of lesson plans from uploaded course outlines. It processes course material unit by unit and lesson by lesson, with configurable concurrency and error handling.

## Features

### Core Functionality
- **Automated Processing**: Generates lesson plans and flashcards from course outlines
- **Parallel Execution**: Processes multiple lessons simultaneously with configurable concurrency
- **Progress Tracking**: Real-time monitoring of individual lesson generation progress
- **Error Handling**: Automatic retry logic and detailed error reporting
- **Flexible Scheduling**: Cron-based scheduling for automated runs

### Key Components

#### 1. Database Schema
- **`cronjobs` table**: Stores job definitions, status, and configuration
- **`cronjob_lesson_statuses` table**: Tracks individual lesson progress

#### 2. API Endpoints (`/api/cronjob`)
- `GET /api/cronjob?action=jobs` - List all cronjobs
- `GET /api/cronjob?action=statuses` - Get lesson generation statuses
- `POST /api/cronjob?action=create` - Create new cronjob
- `POST /api/cronjob?action=run` - Manually trigger job execution
- `POST /api/cronjob?action=pause` - Pause running job
- `DELETE /api/cronjob?action=delete` - Delete cronjob
- `GET /api/cronjob?action=stats` - Get job statistics

#### 3. User Interface (`/cronjob-manager`)
- Job creation and management
- Real-time progress monitoring
- Error reporting and troubleshooting
- Statistics and analytics

## Usage

### 1. Setup Course Outline
First, upload a course outline using the Course Manager at `/course-manager`. The cronjob system requires lessons with status `outline` to be present in the database.

### 2. Create a Cronjob
1. Navigate to `/cronjob-manager`
2. Click "New Job"
3. Configure:
   - **Job Name**: Descriptive name for the job
   - **Schedule**: Cron expression (e.g., `0 * * * *` for every hour)
   - **Max Concurrent**: Number of lessons to process simultaneously (1-10)
   - **Skip Existing**: Don't regenerate lessons that already have plans
   - **Skip Flashcards**: Only generate lesson plans, not flashcards
   - **Retry Failures**: Automatically retry failed lessons

### 3. Monitor Progress
- View real-time progress in the "Lesson Status" tab
- Track individual lesson completion
- Monitor error messages and retry counts

### 4. Manage Jobs
- Run jobs manually or wait for scheduled execution
- Pause/resume running jobs
- Delete completed or failed jobs
- View overall statistics

## Configuration Options

### Job Options
```json
{
  "skipExisting": true,      // Skip lessons with existing plans
  "skipFlashcards": false,   // Generate flashcards along with plans
  "maxConcurrent": 3,        // Process 3 lessons simultaneously
  "retryFailures": true      // Retry failed lessons automatically
}
```

### Example Schedules
- `0 * * * *` - Every hour
- `0 0 * * *` - Every day at midnight
- `0 0 * * 1` - Every Monday at midnight
- `0 9,17 * * 1-5` - Weekdays at 9 AM and 5 PM

## Technical Architecture

### Parallel Processing
- Lessons are grouped by unit for structured processing
- Configurable concurrency limits prevent API overload
- Individual lessons are processed in parallel within each unit

### Error Handling
- Failed lessons are tracked with detailed error messages
- Automatic retry logic for transient failures
- Job continues processing even if individual lessons fail

### Database Integration
- Full integration with existing lesson management system
- Persistent job status tracking across server restarts
- Detailed audit trail of generation activities

## File Structure

```
api/
├── cronjob.ts                    # Main API endpoint
├── _shared/
│   ├── cronjob-service.ts        # Database service layer
│   ├── db-schema.ts             # Updated schema definitions
│   └── ...                       # Existing services

client/src/
├── pages/
│   └── cronjob-manager.tsx       # UI component
└── components/
    └── ...                       # Shared UI components

drizzle/
└── 0005_cronjob_system.sql        # Database migration
```

## Migration

To deploy the cronjob system:

1. Run the database migration:
   ```bash
   pnpm db:migrate
   ```

2. Verify the tables are created:
   ```sql
   SELECT * FROM cronjobs;
   SELECT * FROM cronjob_lesson_statuses;
   ```

3. Set up Vercel Cron Jobs:
   - Add `CRON_SECRET` environment variable in Vercel dashboard
   - Configure cron schedules in `vercel.json`
   - Deploy to Vercel to enable cron functionality

## Vercel Cron Job Setup

### Environment Variables
Set the following environment variables in your Vercel project:

```bash
CRON_SECRET=your_random_secret_key_here
```

### Cron Schedule Configuration
The `vercel.json` file defines cron job schedules:

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

### How Vercel Cron Jobs Work

1. **Scheduling**: Vercel automatically calls the specified endpoint on the defined schedule
2. **Authentication**: The endpoint is protected with the `CRON_SECRET` for security
3. **Execution**: The system checks for jobs that are due to run and executes them
4. **Status Tracking**: Job progress and results are stored in the database

### Custom Schedules

To modify the cron schedule, update the `schedule` field in `vercel.json`:

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

Common schedules:
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Every day at midnight
- `0 0 * * 1` - Every Monday at midnight
- `0 9,17 * * 1-5` - Weekdays at 9 AM and 5 PM

### Limitations and Considerations

- **Execution Time**: Vercel functions have a 300-second timeout
- **Concurrency**: Multiple jobs may run simultaneously
- **Rate Limits**: Consider API rate limits when scheduling frequent runs
- **Monitoring**: Use Vercel's function logs to monitor execution

## Performance Considerations

### API Rate Limits
- Configure concurrency limits based on API quotas
- Monitor OpenAI API usage during bulk generation
- Implement backoff logic for rate limit handling

### Resource Usage
- Serverless functions have 300-second timeouts
- Large courses may require multiple job runs
- Consider database connection pooling for high concurrency

### Monitoring
- Track job completion rates
- Monitor error patterns and retry effectiveness
- Set up alerts for failed jobs

## Troubleshooting

### Common Issues

1. **Job appears stuck**
   - Check individual lesson statuses for errors
   - Verify API connectivity and quotas
   - Review database connection logs

2. **High failure rate**
   - Reduce concurrency limits
   - Check course outline data quality
   - Review error messages for patterns

3. **Performance issues**
   - Optimize database queries with proper indexes
   - Implement caching for repeated operations
   - Consider scaling server resources

### Logs and Debugging
- Individual lesson errors are stored in the database
- API request/response logs track generation progress
- Database transaction logs help identify bottlenecks

## Future Enhancements

### Planned Features
- Webhook notifications for job completion
- Advanced scheduling patterns
- Resource usage analytics
- Integration with CI/CD pipelines

### Potential Improvements
- Machine learning for optimal scheduling
- Dynamic concurrency adjustment based on system load
- Advanced error categorization and recovery
- Integration with external monitoring systems