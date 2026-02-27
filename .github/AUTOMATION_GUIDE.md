# 🏗️ Enterprise Workflow Automation Guide

> **Automation System Version:** 1.0.0  
> **Repository:** AppServicioshosteleria  
> **Last Updated:** 2026-02-27

---

## 📖 Overview

This repository includes a production-ready, enterprise-grade GitHub Actions automation system that:

- 🔍 **Detects** pending environment approvals automatically  
- ✅ **Auto-approves** allowed environments without manual intervention  
- 🚀 **Executes** workflows with retry logic and monitoring  
- 🏁 **Handles** workflow completion events and generates reports  
- 📋 **Logs** all actions in a structured audit trail  
- 🔄 **Recovers** from failures with exponential backoff and rollback  
- 🎛️ **Orchestrates** the entire pipeline from a central entry point  
- 📊 **Monitors** system health via an automated status dashboard  
- 🔒 **Validates** security before any auto-approval action  

---

## 🗂️ System Components

| File | Purpose |
|------|---------|
| [`workflow-auto-approval-handler.yml`](.github/workflows/workflow-auto-approval-handler.yml) | Detects and auto-approves environment approvals |
| [`workflow-executor.yml`](.github/workflows/workflow-executor.yml) | Triggers and monitors target workflows |
| [`workflow-completion-handler.yml`](.github/workflows/workflow-completion-handler.yml) | Handles workflow completion events |
| [`audit-logger.yml`](.github/workflows/audit-logger.yml) | Structured audit logging for all events |
| [`failure-recovery.yml`](.github/workflows/failure-recovery.yml) | Failure detection, retry, rollback, and alerting |
| [`orchestrator-main.yml`](.github/workflows/orchestrator-main.yml) | Central pipeline orchestrator with state machine |
| [`status-dashboard.yml`](.github/workflows/status-dashboard.yml) | Real-time metrics and health dashboard |
| [`security-validator.yml`](.github/workflows/security-validator.yml) | Security gate before any auto-approval |
| [`configuration/automation-rules.yml`](.github/configuration/automation-rules.yml) | Master configuration for the automation system |

---

## 🔄 Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DETECTION PHASE                                          │
│    - workflow_run event triggers auto-approval-handler      │
│    - Pending environment approval detected                  │
│    - Branch validated against allowlist                     │
│    - Audit event logged                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VALIDATION PHASE                                         │
│    - security-validator checks:                             │
│      * Branch in allowed list?                              │
│      * Dangerous patterns in code changes?                  │
│      * Workflow file integrity OK?                          │
│      * Risk level acceptable?                               │
│    - If HIGH risk → Block & Alert                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. AUTO-APPROVAL PHASE                                      │
│    - Automatically approve environment via GitHub API       │
│    - Log approval action with correlation ID                │
│    - Set status to "approved"                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. EXECUTION PHASE                                          │
│    - workflow-executor triggers target workflow             │
│    - Monitors execution progress with polling               │
│    - Retries up to 3 times with exponential backoff         │
│    - Updates status continuously                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. COMPLETION PHASE                                         │
│    - workflow-completion-handler fires on completion        │
│    - Verifies final status (success/failure/cancelled)      │
│    - Lists and inventories artifacts                        │
│    - Generates completion report                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. AUDIT & CLEANUP PHASE                                    │
│    - audit-logger records all actions with timestamps       │
│    - Metrics collected for dashboard                        │
│    - failure-recovery triggered if needed                   │
│    - Notifications sent                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Manual Trigger: Full Pipeline

```bash
gh workflow run orchestrator-main.yml \
  --field operation=full-pipeline \
  --field target_ref=main \
  --field priority=normal
```

### Manual Trigger: Execute a Specific Workflow

```bash
gh workflow run workflow-executor.yml \
  --field target_workflow=deploy.yml \
  --field target_ref=main \
  --field max_retries=3
```

### Manual Trigger: Security Validation Only

```bash
gh workflow run security-validator.yml \
  --field target_branch=main
```

### Manual Trigger: Recovery

```bash
gh workflow run failure-recovery.yml \
  --field failed_run_id=12345678 \
  --field failed_workflow=deploy.yml \
  --field recovery_strategy=retry
```

### Manual Trigger: Status Dashboard

```bash
gh workflow run status-dashboard.yml \
  --field lookback_hours=48
```

---

## ⚙️ Configuration

All automation behaviour is controlled via [`.github/configuration/automation-rules.yml`](.github/configuration/automation-rules.yml).

### Key Configuration Sections

| Section | Purpose |
|---------|---------|
| `general` | System name, log level, enable/disable |
| `branches` | Allowed branches for auto-approval |
| `auto_approval` | Which environments can be auto-approved |
| `retry` | Max attempts, backoff settings |
| `timeouts` | Per-workflow timeout values |
| `rate_limiting` | Concurrency and priority delays |
| `security` | Risk thresholds, dangerous pattern list |
| `failure_recovery` | Default strategy, excluded workflows |
| `dashboard` | Lookback period, health thresholds |
| `audit` | Log schema, audit identifiers |
| `notifications` | GitHub Issues, Step Summaries |

---

## 🔒 Security Model

### Principle of Least Privilege

Each workflow declares only the minimum permissions required:

| Workflow | Permissions |
|----------|------------|
| `workflow-auto-approval-handler` | `actions: write`, `deployments: write`, `contents: read` |
| `workflow-executor` | `actions: write`, `contents: read` |
| `workflow-completion-handler` | `actions: write`, `contents: read` |
| `audit-logger` | `actions: read`, `contents: read` |
| `failure-recovery` | `actions: write`, `contents: read`, `issues: write` |
| `orchestrator-main` | `actions: write`, `contents: read` |
| `status-dashboard` | `actions: read`, `contents: read` |
| `security-validator` | `actions: read`, `contents: read`, `pull-requests: read` |

### Branch Allowlist

Auto-approval is restricted to branches defined in `automation-rules.yml`:
```yaml
branches:
  allowed_for_auto_approval:
    - main
    - develop
    - staging
```

### Environment Restrictions

The following environments **always require manual approval** regardless of automation settings:
- `production`
- `prod`

### Security Checks (security-validator)

1. Branch membership in allowlist  
2. Dangerous shell pattern scan in code diffs  
3. Environment variable validation  
4. Workflow file integrity check  
5. Risk level assessment (LOW / MEDIUM / HIGH)  
6. Final gate decision — blocks on HIGH risk  

---

## 📊 Observability

### Correlation IDs

Every workflow generates a unique **Correlation ID** (e.g., `auto-approve-20260227150000-123456`) that propagates through the entire pipeline, making it possible to trace a single automation event across all workflow runs.

### Structured Audit Logs

Every workflow emits a JSON audit entry at completion:

```json
{
  "schema_version": "1.0",
  "timestamp": "2026-02-27T15:00:00Z",
  "epoch": 1740664800,
  "correlation_id": "auto-approve-20260227150000-123456",
  "event_type": "workflow_run.completed",
  "workflow": {
    "name": "Deploy to Firebase Hosting",
    "run_id": "12345678",
    "branch": "main",
    "status": "completed",
    "conclusion": "success"
  },
  "actor": {
    "login": "github-actions[bot]",
    "type": "automated"
  },
  "repository": "joseluiscarrizo/AppServicioshosteleria",
  "automator": "audit-logger"
}
```

### GitHub Step Summaries

All workflows write human-readable summaries to the **GitHub Actions Step Summary** UI, providing real-time dashboards without external tooling.

### Status Dashboard

The `status-dashboard.yml` workflow runs every 6 hours and generates:
- Total / Success / Failure / Cancelled / In-Progress counts  
- Success rate percentage  
- Per-automation-workflow breakdown  
- System health indicator: 🟢 HEALTHY / 🟡 DEGRADED / 🔴 UNHEALTHY  

---

## 🔄 Error Handling & Recovery

### Exponential Backoff

```
Attempt 1: immediate
Attempt 2: 5s delay  (1² × 5)
Attempt 3: 20s delay (2² × 5)
```

### Recovery Strategies

| Strategy | Behaviour |
|----------|-----------|
| `retry` | Re-trigger failed jobs via GitHub API with backoff |
| `rollback` | Identify last successful SHA and log rollback target |
| `notify` | Create a GitHub Issue with failure details |

### Circuit Breaker (via orchestrator)

The orchestrator validates all required workflow dependencies before executing the pipeline. If critical workflows are missing, it degrades gracefully and logs a warning.

---

## 📋 Patterns Implemented

| Pattern | Where Used |
|---------|-----------|
| **State Machine** | `orchestrator-main.yml` — INITIALIZING → COMPLETED/FAILED |
| **Saga / Compensation** | `failure-recovery.yml` — rollback on failure |
| **Retry with Exponential Backoff** | `workflow-executor.yml`, `failure-recovery.yml` |
| **Observer (Event-Driven)** | All `workflow_run` triggers |
| **Circuit Breaker** | `orchestrator-main.yml` dependency validation |
| **Command** | `workflow-executor.yml` workflow dispatch |
| **Audit Trail** | `audit-logger.yml` structured JSON logging |
| **Rate Limiting** | `orchestrator-main.yml` priority-based delays |
| **Least Privilege** | Per-workflow minimal permission declarations |
| **Correlation ID** | Propagated across all workflows for tracing |

---

## 🐛 Troubleshooting

### Auto-approval not triggering

1. Check that the source branch is in `branches.allowed_for_auto_approval` in `automation-rules.yml`.
2. Verify the environment name is not in `auto_approval.require_manual_environments`.
3. Review the `workflow-auto-approval-handler` run logs for the `Detect Pending Environment Approvals` step.

### Security validator blocking

1. Check the `security-validator` run summary for the failing check.
2. If the branch is not allowed, add it to the `branches.allowed_for_auto_approval` list.
3. If dangerous patterns were detected, review the code diff and remove or refactor the flagged lines.

### Workflow executor timing out

1. Increase `timeouts.workflow_monitoring_minutes` in `automation-rules.yml`.
2. Check the target workflow's own timeout settings.
3. Verify the `target_workflow` input matches the exact filename (e.g., `deploy.yml`).

### Recovery not working

1. Ensure the failed run ID is correct.
2. Verify the failed workflow is not in `failure_recovery.excluded_workflows`.
3. Check that the `GITHUB_TOKEN` has `actions: write` permission.

---

## 📝 Contributing

When adding new workflows to the automation system:

1. Follow the existing pattern of emitting an audit event as the final step.
2. Generate a correlation ID at the start and propagate it through all steps.
3. Use `::group::` / `::endgroup::` to organize log output.
4. Write a step summary entry using `$GITHUB_STEP_SUMMARY`.
5. Declare only the minimum permissions required for the workflow.
6. Add the workflow to the relevant section of this guide.
