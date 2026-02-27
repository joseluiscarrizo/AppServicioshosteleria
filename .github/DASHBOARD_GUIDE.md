# Dashboard Guide

The **AppServicioshosteleria Automation Dashboard** is a GitHub Pages site that provides
real-time visibility into all CI/CD workflows.

---

## 🌐 Dashboard URL

```
https://joseluiscarrizo.github.io/AppServicioshosteleria
```

---

## 📊 KPIs Displayed

| KPI | Description |
|---|---|
| Total Workflows | Total automation runs recorded |
| Success Rate | Percentage of successful runs |
| Avg Execution Time | Average workflow duration in minutes |
| SLA Compliance | % of runs completing within 5 minutes |

---

## 📈 Interactive Charts (Chart.js)

| Chart | Type | Description |
|---|---|---|
| Workflow Count by Hour | Area chart | Volume over time |
| Success vs Failure Trend | Line chart | Pass/fail rates |
| Execution Latency | Bar chart | Duration per run |
| Run Status Distribution | Pie chart | Success/Failure split |

---

## 🚨 Alert Sections

- **Last failure** with timestamp
- **Failed workflows** count
- **SLA violations** detected
- **Anomalies** (>2 std deviations above mean)

---

## 🗂️ Audit Trail

The bottom of the dashboard shows the **last 50 workflow runs** with:
- Run ID
- Workflow name
- Branch
- Actor (who triggered it)
- Status / conclusion
- Timestamp

---

## ⚙️ Dashboard Features

| Feature | Details |
|---|---|
| 🔄 Auto-refresh | Every 30 seconds |
| 📤 Export | Download data as JSON |
| 🌙 Dark mode | Toggle with the button in the header |
| 📱 Responsive | Optimised for mobile and desktop |
| 💾 Offline cache | Last data cached in `localStorage` |

---

## 🗃️ Data File: `docs/data.json`

The dashboard reads from `docs/data.json`, which is automatically updated by the
**Dashboard Generator** workflow every 30 minutes.

Schema:

```json
{
  "updated_at": "2026-02-27T10:00:00Z",
  "latest": {
    "collected_at": "2026-02-27T10:00:00Z",
    "window": "last_50_runs",
    "totals": {
      "total_runs": 150,
      "successes": 145,
      "failures": 5,
      "success_rate_pct": 96.67
    },
    "performance": {
      "avg_execution_ms": 72000,
      "avg_execution_min": 1.2,
      "sla_compliance_pct": 98.0
    },
    "recent_runs": []
  },
  "history": []
}
```

---

## 🛠️ Local Development

To preview the dashboard locally:

```bash
cd docs
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## 📋 Workflow Files

| File | Purpose |
|---|---|
| `.github/workflows/metrics-collector.yml` | Collects raw metrics each hour |
| `.github/workflows/metrics-analyzer.yml` | Analyses trends and detects anomalies |
| `.github/workflows/dashboard-generator.yml` | Merges metrics and updates `docs/data.json` |
| `.github/workflows/slack-notifier.yml` | Sends Slack notifications |
| `.github/workflows/discord-notifier.yml` | Sends Discord embeds |
| `.github/workflows/notification-scheduler.yml` | Weekly summary reports |
