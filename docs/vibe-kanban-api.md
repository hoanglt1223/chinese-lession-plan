# Vibe Kanban API Documentation

## Overview

This document provides comprehensive API documentation for Vibe Kanban, covering task management, attempt handling, Git operations, and development workflows.

## Base URL
```
Development: http://localhost:50027/api
Production: https://your-domain.com/api
```

## Authentication
Currently no authentication is required for development. Production may include JWT tokens or API keys.

---

## 1. Task Routes (`/api/tasks`)

| Method | Path | Function | Description |
|--------|------|----------|-------------|
| `GET` | `/tasks` | `get_tasks` | Get tasks list filtered by project_id |
| `POST` | `/tasks` | `create_task` | **Create new task** |
| `POST` | `/tasks/create-and-start` | `create_task_and_start` | **Create task + start attempt immediately** |
| `GET` | `/tasks/stream/ws` | `stream_tasks_ws` | WebSocket stream for tasks |
| `GET` | `/tasks/{task_id}` | `get_task` | Get task details |
| `PUT` | `/tasks/{task_id}` | `update_task` | Update task |
| `DELETE` | `/tasks/{task_id}` | `delete_task` | Delete task |
| `POST` | `/tasks/{task_id}/share` | `share_task` | Share task |

### Create Task Request
```typescript
interface CreateTask {
  title: string;
  project_id: string;
  description?: string;
  image_ids?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours?: number;
  due_date?: string;
  tags?: string[];
  assigned_to?: string;
}
```

### Create Task Response
```typescript
interface CreateTaskResponse {
  success: boolean;
  data: {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    status: 'todo' | 'inprogress' | 'inreview' | 'done' | 'cancelled';
    created_at: string;
    updated_at: string;
  };
}
```

---

## 2. Task Attempt Routes (`/api/task-attempts`)

### Create/Start Attempt

| Method | Path | Function | Description |
|--------|------|----------|-------------|
| `GET` | `/task-attempts` | `get_task_attempts` | Get attempts list |
| `POST` | `/task-attempts` | `create_task_attempt` | **Create new task attempt** |
| `POST` | `/task-attempts/{id}/follow-up` | `follow_up` | Send follow-up prompt to agent |
| `POST` | `/task-attempts/{id}/run-agent-setup` | `run_agent_setup` | Run agent setup |
| `POST` | `/task-attempts/{id}/stop` | `stop_task_attempt_execution` | Stop execution |

### Create Task Attempt Request
```typescript
interface CreateTaskAttemptBody {
  task_id: string;
  executor_profile_id: {
    type: 'claude-code' | 'anthropic' | 'openai' | 'custom';
    executor: string;
    config?: Record<string, any>;
  };
  base_branch: string;
}
```

### Create Task Attempt Response
```typescript
interface CreateTaskAttemptResponse {
  success: boolean;
  data: {
    id: string;
    task_id: string;
    container_ref?: string;
    branch: string;
    target_branch: string;
    executor: string;
    worktree_deleted: boolean;
    setup_completed_at?: string;
    created_at: string;
    updated_at: string;
  };
}
```

### Merge/PR Routes

| Method | Path | Function | Description |
|--------|------|----------|-------------|
| `POST` | `/task-attempts/{id}/merge` | `merge_task_attempt` | **Merge code to target branch** |
| `POST` | `/task-attempts/{id}/push` | `push_task_attempt_branch` | Push branch to GitHub |
| `POST` | `/task-attempts/{id}/push/force` | `force_push_task_attempt_branch` | Force push |
| `POST` | `/task-attempts/{id}/pr` | `create_github_pr` | Create Pull Request |
| `POST` | `/task-attempts/{id}/pr/attach` | `attach_existing_pr` | Attach existing PR |

### Create GitHub PR Request
```typescript
interface CreatePRRequest {
  title?: string;
  description?: string;
  draft?: boolean;
  auto_merge?: boolean;
}
```

### Rebase/Conflict Routes

| Method | Path | Function | Description |
|--------|------|----------|-------------|
| `POST` | `/task-attempts/{id}/rebase` | `rebase_task_attempt` | **Rebase branch** |
| `POST` | `/task-attempts/{id}/conflicts/abort` | `abort_conflicts_task_attempt` | **Abort conflicts (rebase/merge)** |
| `GET` | `/task-attempts/{id}/branch-status` | `get_task_attempt_branch_status` | Get status (conflicts, ahead/behind) |

### Rebase Request
```typescript
interface RebaseTaskAttemptRequest {
  old_base_branch?: string;
  new_base_branch?: string;
}
```

### Branch Status Response
```typescript
interface BranchStatus {
  commits_behind?: number;
  commits_ahead?: number;
  is_rebase_in_progress: boolean;
  conflict_op?: 'merge' | 'rebase';
  conflicted_files: string[];
  current_commit: string;
  target_commit?: string;
  has_uncommitted_changes: boolean;
}
```

### Branch Management

| Method | Path | Function | Description |
|--------|------|----------|-------------|
| `POST` | `/task-attempts/{id}/change-target-branch` | `change_target_branch` | Change target branch |
| `POST` | `/task-attempts/{id}/rename-branch` | `rename_branch` | Rename branch |
| `GET` | `/task-attempts/{id}/commit-compare` | `compare_commit_to_head` | Compare commits |
| `GET` | `/task-attempts/{id}/diff/ws` | `stream_task_attempt_diff_ws` | Stream diff via WebSocket |

### Scripts/Dev Server

| Method | Path | Function | Description |
|--------|------|----------|-------------|
| `POST` | `/task-attempts/{id}/start-dev-server` | `start_dev_server` | Start dev server |
| `POST` | `/task-attempts/{id}/run-setup-script` | `run_setup_script` | Run setup script |
| `POST` | `/task-attempts/{id}/run-cleanup-script` | `run_cleanup_script` | Run cleanup script |
| `POST` | `/task-attempts/{id}/gh-cli-setup` | `gh_cli_setup_handler` | Setup GitHub CLI |
| `POST` | `/task-attempts/{id}/open-editor` | `open_task_attempt_in_editor` | Open editor |

### Dev Server Request
```typescript
interface StartDevServerRequest {
  command?: string;
  env?: Record<string, string>;
  working_directory?: string;
}
```

---

## 3. Project Routes (`/api/projects`)

| Method | Path | Function | Description |
|--------|------|----------|-------------|
| `GET` | `/projects` | `get_projects` | Get projects list |
| `POST` | `/projects` | `create_project` | Create new project |
| `GET` | `/projects/{project_id}` | `get_project` | Get project details |
| `PUT` | `/projects/{project_id}` | `update_project` | Update project |
| `DELETE` | `/projects/{project_id}` | `delete_project` | Delete project |

### Create Project Request
```typescript
interface CreateProject {
  name: string;
  description?: string;
  git_repo_path?: string;
  setup_script?: string;
  dev_script?: string;
  cleanup_script?: string;
  copy_files?: string[];
  remote_project_id?: string;
}
```

---

## 4. Error Handling

### Git Operation Errors
```typescript
interface GitOperationError {
  type: 'MergeConflicts' | 'RebaseInProgress' | 'BranchNotFound' | 'RemoteError';
  message: string;
  op?: 'merge' | 'rebase';
  conflicted_files?: string[];
  details?: any;
}
```

### Common Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

---

## 5. WebSocket Events

### Task Stream Events
```typescript
// WebSocket: /api/tasks/stream/ws
interface TaskStreamEvent {
  type: 'task_created' | 'task_updated' | 'task_deleted';
  data: Task;
  timestamp: string;
}
```

### Attempt Stream Events
```typescript
// WebSocket: /api/task-attempts/{id}/stream/ws
interface AttemptStreamEvent {
  type: 'attempt_created' | 'attempt_updated' | 'attempt_completed' | 'attempt_failed';
  data: TaskAttempt;
  timestamp: string;
}
```

### Diff Stream Events
```typescript
// WebSocket: /api/task-attempts/{id}/diff/ws
interface DiffStreamEvent {
  type: 'diff_line' | 'file_changed' | 'diff_complete';
  data: {
    file?: string;
    line?: string;
    content?: string;
    hunks?: DiffHunk[];
  };
}
```

---

## 6. Main Workflow

1. **Create Task** → `POST /api/tasks` or `POST /api/tasks/create-and-start`
2. **Start Attempt** → `POST /api/task-attempts`
3. **Agent Works** → `POST /api/task-attempts/{id}/follow-up`
4. **Check Status** → `GET /api/task-attempts/{id}/branch-status`
5. **Rebase if Needed** → `POST /api/task-attempts/{id}/rebase`
6. **Resolve Conflicts** → Abort: `POST /api/task-attempts/{id}/conflicts/abort`
7. **Merge Code** → `POST /api/task-attempts/{id}/merge` (local) or `POST /api/task-attempts/{id}/pr` (GitHub PR)

---

## 7. Advanced Features

### Multi-Attempt Support
- Create multiple attempts for the same task
- Work in parallel on different approaches
- Compare results before merging

### Conflict Resolution
- Automatic conflict detection
- Manual conflict resolution tools
- Conflict visualization via diff streams

### Development Environment
- Automatic worktree creation
- Dev server management
- Editor integration
- Script execution support

### Collaboration
- Task sharing between users
- Real-time progress updates
- Code review integration
- PR management

---

## 8. Rate Limiting

Development environment currently has no rate limiting. Production may implement:
- 100 requests/minute per user
- 1000 requests/hour per IP
- Different limits for different endpoints

---

## 9. Examples

### Example 1: Create Task and Start Attempt
```bash
# Create task
curl -X POST "http://localhost:50027/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement new feature",
    "project_id": "project-uuid",
    "description": "Add new feature to application",
    "priority": "high",
    "estimated_hours": 8
  }'

# Start attempt
curl -X POST "http://localhost:50027/api/task-attempts" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "task-uuid",
    "executor_profile_id": {
      "type": "claude-code",
      "executor": "CLAUDE_CODE"
    },
    "base_branch": "main"
  }'
```

### Example 2: Monitor Branch Status
```bash
curl "http://localhost:50027/api/task-attempts/attempt-uuid/branch-status"
```

### Example 3: Rebase and Merge
```bash
# Rebase
curl -X POST "http://localhost:50027/api/task-attempts/attempt-uuid/rebase" \
  -H "Content-Type: application/json" \
  -d '{
    "new_base_branch": "develop"
  }'

# Merge
curl -X POST "http://localhost:50027/api/task-attempts/attempt-uuid/merge"
```

---

## 10. Best Practices

### Task Creation
- Use clear, descriptive titles
- Provide detailed descriptions
- Set realistic time estimates
- Use appropriate priority levels
- Add relevant tags for organization

### Attempt Management
- Create descriptive branch names
- Set up proper base branches
- Monitor progress regularly
- Handle conflicts promptly
- Clean up completed attempts

### Git Operations
- Rebase before merging to maintain clean history
- Resolve conflicts manually when needed
- Use descriptive commit messages
- Test changes before merging
- Use PRs for code review

---

## 11. Troubleshooting

### Common Issues
1. **Branch conflicts**: Use the abort endpoint and resolve manually
2. **Worktree issues**: Delete and recreate worktrees
3. **Agent setup failures**: Check configuration and dependencies
4. **Merge failures**: Verify branch relationships and permissions

### Debug Information
- Check branch status endpoint for conflicts
- Review attempt logs for errors
- Verify executor configuration
- Test Git commands manually

---

**Last Updated**: December 2024
**Version**: 1.0
**API Version**: v1