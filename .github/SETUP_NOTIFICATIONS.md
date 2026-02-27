# Setup Slack & Discord Notifications

This guide explains how to configure real-time Slack and Discord notifications for the
**AppServicioshosteleria** automation workflows.

---

## 📨 SLACK SETUP

### 1. Create a Slack App

1. Go to <https://api.slack.com/apps>
2. Click **"Create New App"** → **"From scratch"**
3. Name: `AppServicioshosteleria Automation`
4. Select your workspace → click **Create App**

### 2. Enable Incoming Webhooks

1. In the left sidebar, click **"Incoming Webhooks"**
2. Toggle **Activate Incoming Webhooks** to **On**
3. Click **"Add New Webhook to Workspace"**
4. Select the channel `#automation` (create it first if it doesn't exist)
5. Click **Allow**

### 3. Copy the Webhook URL

Copy the generated URL that looks like:

```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 💬 DISCORD SETUP

### 1. Open Server Settings

1. Open the Discord server where you want notifications
2. Click the server name → **"Server Settings"**

### 2. Create a Webhook

1. Click **"Integrations"** → **"Webhooks"**
2. Click **"New Webhook"**
3. Name: `AppServicioshosteleria Automation`
4. Select the channel `#automation` (create it first if it doesn't exist)
5. Click **"Copy Webhook URL"**

The URL looks like:

```
https://discord.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 🔐 SAVE SECRETS IN GITHUB

Go to your repository:  
**Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `SLACK_WEBHOOK_URL` | The Slack webhook URL from step 3 above |
| `DISCORD_WEBHOOK_URL` | The Discord webhook URL from step 2 above |

> **Note:** Both secrets are optional. If a secret is not set, the corresponding
> notifier silently skips the notification without failing the workflow.

---

## 📊 GITHUB PAGES SETUP (Dashboard)

1. Go to **Settings → Pages**
2. Under **Source**, select **"Deploy from a branch"**
3. Branch: `main` | Folder: `/docs`
4. Click **Save**

After a few minutes the dashboard will be available at:

```
https://joseluiscarrizo.github.io/AppServicioshosteleria
```

---

## 🔔 NOTIFICATION TYPES

| Event | Colour | Emoji | Critical mention |
|---|---|---|---|
| Workflow success | 🟢 Green | ✅ | No |
| Workflow failure | 🔴 Red | ❌ | Yes |
| Warning / SLA risk | 🟡 Yellow | ⚠️ | Yes |
| Info / scheduled | 🔵 Blue | 🔄 | No |

---

## 🗓️ NOTIFICATION SCHEDULE

| Workflow | When |
|---|---|
| `slack-notifier.yml` | Called by other workflows on every event |
| `discord-notifier.yml` | Called by other workflows on every event |
| `metrics-collector.yml` | Every hour + on each CI completion |
| `metrics-analyzer.yml` | Daily at 08:00 UTC |
| `dashboard-generator.yml` | Every 30 minutes + after metrics collection |
| `notification-scheduler.yml` | Every Monday at 09:00 UTC (weekly summary) |

---

## 🧪 TEST YOUR SETUP

Trigger the scheduler manually once you have configured the secrets:

1. Go to **Actions → Notification Scheduler**
2. Click **"Run workflow"**
3. Select `weekly` as report type and click **Run**
4. Check your Slack `#automation` channel and Discord channel for the test message.
