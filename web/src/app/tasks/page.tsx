'use client';

import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Plus, RefreshCw, Calendar, Tag, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { RecordatoriosTask } from '@/types/assistant';
import toast from '@/lib/toast';

export default function TasksPage() {
  const [tasks, setTasks] = useState<RecordatoriosTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedList, setSelectedList] = useState('Todas');
  const [connected, setConnected] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ellen_recordatorios_token') : null;
      const res = await fetch('/api/recordatorios', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setConnected(Boolean(data.connected));
      setTasks(data.tasks || []);
    } catch {
      toast.error('No se pudo conectar a Recordatorios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTasks();
  }, []);

  const handleToggle = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    toast.success('Estado actualizado');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: RecordatoriosTask = {
      id: `local-${Date.now()}`,
      title: newTaskTitle.trim(),
      list: selectedList === 'Todas' ? 'General' : selectedList,
      completed: false,
      priority: 'normal',
      due: null,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
    toast.success('Recordatorio creado');
  };

  const lists = ['Todas', ...Array.from(new Set(tasks.map((t) => t.list || 'General')))];
  const filteredTasks = tasks.filter((t) => selectedList === 'Todas' || (t.list || 'General') === selectedList);

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Agenda & Recordatorios
            </h1>
            {connected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3 h-3" /> Sincronizado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                <ShieldAlert className="w-3 h-3" /> Modo Local
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {pendingCount} pendientes · {completedCount} completadas hoy
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTasks}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleAddTask} className="flex items-center gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Añadir nuevo recordatorio o tarea..."
          className="flex-1 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-xs"
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-xs disabled:opacity-40 transition"
        >
          <Plus className="w-4 h-4" />
          Añadir
        </button>
      </form>

      {/* List Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-hide">
        {lists.map((list) => (
          <button
            key={list}
            type="button"
            onClick={() => setSelectedList(list)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedList === list
                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                : 'bg-white/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            {list}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
            <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No hay tareas pendientes en esta lista</p>
            <p className="text-xs text-slate-400 mt-0.5">¡Todo al día!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleToggle(task.id)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/70 dark:border-slate-800 hover:border-cyan-500/50 transition cursor-pointer shadow-xs group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  className="text-slate-400 group-hover:text-cyan-500 transition shrink-0"
                >
                  {task.completed ? (
                    <CheckSquare className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="min-w-0">
                  <p
                    className={`text-xs sm:text-sm font-medium truncate ${
                      task.completed
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.list && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-semibold mt-0.5">
                      <Tag className="w-2.5 h-2.5" />
                      {task.list}
                    </span>
                  )}
                </div>
              </div>

              {task.due && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                  <Calendar className="w-3 h-3" />
                  {task.due}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
