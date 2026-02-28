import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  GitPullRequest,
  FileText,
  Map,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  BarChart3,
  CalendarClock,
} from 'lucide-react';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

// ── Static progress data ─────────────────────────────────────────────────────

const START_DATE = new Date('2026-02-28T11:31:07Z');
const TOTAL_ESTIMATED_MINUTES = 90;

const PRS = [
  {
    id: 1,
    title: 'PR #1: Error Boundaries + Global Error Handling',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    barColor: 'bg-rose-500',
    tasks: [
      { label: 'Code generation', value: 100 },
      { label: 'Testing', value: 85 },
      { label: 'Documentation', value: 70 },
    ],
  },
  {
    id: 2,
    title: 'PR #2: Fix Infinite Loading',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    barColor: 'bg-amber-500',
    tasks: [
      { label: 'Code generation', value: 100 },
      { label: 'Testing', value: 60 },
      { label: 'Documentation', value: 40 },
    ],
  },
  {
    id: 3,
    title: 'PR #3: Update Dependencies + Security',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    barColor: 'bg-blue-500',
    tasks: [
      { label: 'Dependency analysis', value: 100 },
      { label: 'Updates', value: 75 },
      { label: 'Testing', value: 50 },
    ],
  },
];

const DOCS = [
  { label: 'ADR-001', value: 100 },
  { label: 'ADR-002', value: 80 },
  { label: 'SETUP_GUIDE.md', value: 65 },
  { label: 'CONTRIBUTING.md', value: 50 },
  { label: 'SECURITY_GUIDELINES.md', value: 40 },
  { label: 'PERFORMANCE_GUIDELINES.md', value: 25 },
];

const ROADMAP = [
  { label: 'Semana 1 planning', value: 100 },
  { label: 'Semana 2 planning', value: 75 },
  { label: 'Semana 3-4 planning', value: 40 },
  { label: 'Métricas y goals', value: 30 },
];

// ── Helper utilities ─────────────────────────────────────────────────────────

function average(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

function prTotal(pr) {
  return average(pr.tasks.map((t) => t.value));
}

function overallProgress(prs, docs, roadmap) {
  const prAvg = average(prs.map(prTotal));
  const docAvg = average(docs.map((d) => d.value));
  const roadmapAvg = average(roadmap.map((r) => r.value));
  return average([prAvg, docAvg, roadmapAvg]);
}

function formatMinutes(mins) {
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}min`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, colorClass }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <motion.div
        className={`h-full rounded-full ${colorClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

function TaskRow({ label, value, colorClass }) {
  const statusIcon =
    value === 100 ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
    ) : value > 0 ? (
      <Loader2 className="w-4 h-4 text-amber-500 flex-shrink-0 animate-spin" />
    ) : (
      <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
    );

  return (
    <div className="flex items-center gap-3">
      {statusIcon}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-slate-600 truncate">{label}</span>
          <span className="text-sm font-semibold text-slate-800 ml-2 flex-shrink-0">{value}%</span>
        </div>
        <ProgressBar value={value} colorClass={colorClass} />
      </div>
    </div>
  );
}

function PRCard({ pr }) {
  const total = prTotal(pr);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`p-5 border ${pr.border} ${pr.bg}`}>
        <div className="flex items-center gap-2 mb-4">
          <GitPullRequest className={`w-5 h-5 ${pr.color}`} />
          <h3 className={`font-semibold ${pr.color} text-sm`}>{pr.title}</h3>
        </div>

        <div className="space-y-3 mb-4">
          {pr.tasks.map((task) => (
            <div key={task.label} className="pl-4 border-l-2 border-slate-200">
              <TaskRow label={`├─ ${task.label}`} value={task.value} colorClass={pr.barColor} />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">└─ Total</span>
          <div className="flex items-center gap-3 flex-1 ml-4">
            <ProgressBar value={total} colorClass={pr.barColor} />
            <span className="text-sm font-bold text-slate-800 flex-shrink-0">{total}%</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function SectionCard({ title, icon: Icon, items, colorClass, barColorClass, borderClass, bgClass }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`p-5 border ${borderClass} ${bgClass}`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <h3 className={`font-semibold ${colorClass} text-sm`}>{title}</h3>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.label} className="pl-4 border-l-2 border-slate-200">
              <TaskRow
                label={`${idx < items.length - 1 ? '├─' : '└─'} ${item.label}`}
                value={item.value}
                colorClass={barColorClass}
              />
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ProgressReport() {
  const [elapsedMinutes, setElapsedMinutes] = useState(
    () => Math.max(0, differenceInMinutes(new Date(), START_DATE))
  );

  // Align timer to the next minute boundary to avoid unnecessary re-renders
  useEffect(() => {
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      setElapsedMinutes(Math.max(0, differenceInMinutes(new Date(), START_DATE)));
      const interval = setInterval(() => {
        setElapsedMinutes(Math.max(0, differenceInMinutes(new Date(), START_DATE)));
      }, 60_000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);
    return () => clearTimeout(timeout);
  }, []);

  const overall = overallProgress(PRS, DOCS, ROADMAP);
  const remaining = Math.max(0, TOTAL_ESTIMATED_MINUTES - elapsedMinutes);
  const eta = addMinutes(START_DATE, TOTAL_ESTIMATED_MINUTES);

  const statusBadge =
    overall === 100
      ? { label: 'Completado', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
      : overall > 50
      ? { label: 'En progreso', className: 'bg-amber-100 text-amber-700 border-amber-200' }
      : { label: 'Iniciado', className: 'bg-blue-100 text-blue-700 border-blue-200' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 p-4 md:p-8 pb-24">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-7 h-7 text-orange-600" />
          <h1 className="text-2xl font-bold text-slate-800">Reporte en Vivo de Progreso</h1>
          <Badge className={`border text-xs font-semibold ${statusBadge.className}`}>
            {statusBadge.label}
          </Badge>
        </div>
        <p className="text-sm text-slate-500">
          Progreso detallado en tiempo real · Inicio:{' '}
          {format(START_DATE, "d MMM yyyy · HH:mm", { locale: es })}
        </p>
      </motion.div>

      {/* Overall Progress */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Card className="p-6 border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-bold text-slate-700">PROGRESO GENERAL</span>
            <span className="text-3xl font-extrabold text-orange-600">{overall}%</span>
          </div>
          <ProgressBar value={overall} colorClass="bg-gradient-to-r from-orange-400 to-amber-500" />
          <p className="mt-2 text-xs text-slate-500">
            Promedio ponderado de PRs, documentación y roadmap
          </p>
        </Card>
      </motion.div>

      {/* PRs */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <GitPullRequest className="w-4 h-4" /> Pull Requests
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PRS.map((pr) => (
            <PRCard key={pr.id} pr={pr} />
          ))}
        </div>
      </section>

      {/* Documentation + Roadmap */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <SectionCard
          title="DOCUMENTACIÓN"
          icon={FileText}
          items={DOCS}
          colorClass="text-violet-600"
          barColorClass="bg-violet-500"
          borderClass="border-violet-200"
          bgClass="bg-violet-50"
        />
        <SectionCard
          title="ROADMAP"
          icon={Map}
          items={ROADMAP}
          colorClass="text-teal-600"
          barColorClass="bg-teal-500"
          borderClass="border-teal-200"
          bgClass="bg-teal-50"
        />
      </div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="p-5 border border-slate-200 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-700 text-sm">TIMELINE</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TimelineItem
              icon={<Clock className="w-4 h-4 text-slate-400" />}
              label="Inicio"
              value={format(START_DATE, 'yyyy-MM-dd HH:mm')}
            />
            <TimelineItem
              icon={<Loader2 className="w-4 h-4 text-amber-500 animate-spin" />}
              label="Tiempo transcurrido"
              value={formatMinutes(elapsedMinutes)}
            />
            <TimelineItem
              icon={<Clock className="w-4 h-4 text-blue-400" />}
              label="Tiempo estimado restante"
              value={formatMinutes(remaining)}
            />
            <TimelineItem
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              label="Finalización estimada"
              value={format(eta, 'yyyy-MM-dd HH:mm')}
              highlight
            />
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function TimelineItem({ icon, label, value, highlight }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${highlight ? 'text-emerald-700' : 'text-slate-700'}`}>
        {value}
      </p>
    </div>
  );
}
