"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, CheckCircle2, Circle, Clock, Bell } from "lucide-react"
import { getTasks, addTask, updateTask, deleteTask, getReminders, deleteReminder, type Task, type Reminder } from "@/lib/tasks"

const PRIORITY_COLORS = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-green-500' }
const PRIORITY_LABELS = { high: 'Hoog', medium: 'Gemiddeld', low: 'Laag' }

type Filter = 'all' | 'open' | 'done'
type SortBy = 'priority' | 'dueDate' | 'created'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('priority')
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setTasks(await getTasks())
      setReminders(await getReminders())
    } catch {}
  }

  async function handleAdd() {
    if (!newTitle.trim()) return
    await addTask({ title: newTitle.trim(), priority: newPriority })
    setNewTitle('')
    load()
  }

  async function handleToggle(task: Task) {
    await updateTask({ ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : undefined })
    load()
  }

  async function handleDelete(id: string) {
    await deleteTask(id)
    load()
  }

  async function handleDeleteReminder(id: string) {
    await deleteReminder(id)
    load()
  }

  const filtered = tasks
    .filter(t => filter === 'all' ? true : filter === 'open' ? !t.completed : t.completed)
    .sort((a, b) => {
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (sortBy === 'dueDate') return (a.dueDate || 'z').localeCompare(b.dueDate || 'z')
      return b.createdAt.localeCompare(a.createdAt)
    })

  const upcoming = reminders.filter(r => !r.fired).sort((a, b) => a.triggerAt.localeCompare(b.triggerAt))
  const past = reminders.filter(r => r.fired)

  return (
    <div className="min-h-full px-4 py-6 md:px-8 md:py-10 max-w-2xl mx-auto">
      <div className="animate-fade-in mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">✅ Taken</h1>
      </div>

      {/* Quick add */}
      <div className="flex gap-2 mb-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Voeg taak toe..."
          className="flex-1 rounded-xl border border-border/50 bg-card/50 px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary/50"
        />
        <select
          value={newPriority}
          onChange={e => setNewPriority(e.target.value as any)}
          className="rounded-xl border border-border/50 bg-card/50 px-3 py-2.5 text-sm"
        >
          <option value="low">🟢</option>
          <option value="medium">🟡</option>
          <option value="high">🔴</option>
        </select>
        <button onClick={handleAdd} className="rounded-xl bg-accent-primary text-white px-4 py-2.5 hover:bg-accent-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex rounded-xl bg-muted/30 border border-border/50 p-0.5">
          {([['all', 'Alles'], ['open', 'Open'], ['done', 'Klaar']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === k ? 'bg-accent-primary/20 text-accent-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          className="ml-auto text-xs rounded-lg border border-border/50 bg-card/50 px-2 py-1.5"
        >
          <option value="priority">Prioriteit</option>
          <option value="dueDate">Deadline</option>
          <option value="created">Nieuwste</option>
        </select>
      </div>

      {/* Task list */}
      <div className="space-y-2 mb-8 animate-fade-in" style={{ animationDelay: '150ms' }}>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">Geen taken. Vraag je AI om er een aan te maken!</p>
          </div>
        )}
        {filtered.map(task => (
          <div
            key={task.id}
            className={`flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3 transition-all ${task.completed ? 'opacity-50' : ''}`}
          >
            <button onClick={() => handleToggle(task)} className="shrink-0">
              {task.completed
                ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                : <Circle className="h-5 w-5 text-muted-foreground hover:text-accent-primary transition-colors" />
              }
            </button>
            <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`} title={PRIORITY_LABELS[task.priority]} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
              {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
              {task.dueDate && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <button onClick={() => handleDelete(task.id)} className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Reminders */}
      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4" /> Herinneringen
        </h2>
        {upcoming.length === 0 && past.length === 0 && (
          <p className="text-sm text-muted-foreground">Geen herinneringen. Vraag je AI: &ldquo;Herinner me over 30 minuten aan...&rdquo;</p>
        )}
        {upcoming.map(r => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3 mb-2">
            <span className="text-lg">⏰</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{r.message}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(r.triggerAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button onClick={() => handleDeleteReminder(r.id)} className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {past.map(r => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3 mb-2 opacity-40">
            <span className="text-lg">✅</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{r.message}</p>
              <p className="text-[11px] text-muted-foreground">Afgevuurd</p>
            </div>
            <button onClick={() => handleDeleteReminder(r.id)} className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
