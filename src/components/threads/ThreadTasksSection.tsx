"use client"

import { useEffect, useMemo, useState } from 'react'
import CollapseHeader from '@/components/ui/CollapseHeader'
import RichTextEditor from '@/components/ui/RichTextEditor'
import type { ThreadTask } from '@/types/thread-tasks'

type ViewerRole = 'teacher' | 'student' | 'admin' | 'superadmin'

interface ThreadTasksSectionProps {
  threadId: string
  user?: { id: string; role?: string }
  defaultOpen?: boolean
  externalRefreshTrigger?: number
  onTasksCountChange?: (count: number) => void
  hideHeader?: boolean
  viewerRole?: ViewerRole
  openComposerSignal?: number
  onLoaded?: () => void
}

export default function ThreadTasksSection({
  threadId,
  user,
  defaultOpen = false,
  externalRefreshTrigger = 0,
  onTasksCountChange,
  hideHeader = false,
  viewerRole,
  openComposerSignal,
  onLoaded,
}: ThreadTasksSectionProps) {
  const [tasks, setTasks] = useState<ThreadTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(!!defaultOpen)
  const [collapsed, setCollapsed] = useState(false)

  // New task form
  const [newContent, setNewContent] = useState('')
  const [newDueAt, setNewDueAt] = useState('')
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('private')
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editDueAt, setEditDueAt] = useState('')
  const [updating, setUpdating] = useState(false)

  // Single-task rule: open composer only when signaled AND no task exists
  // Open composer only when data is loaded and there is no task
  useEffect(() => {
    if (openComposerSignal != null && !loading && tasks.length === 0) {
      setComposerOpen(true)
    }
  }, [openComposerSignal, loading, tasks.length])

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (user?.id) h['Authorization'] = `Bearer ${user.id}`
    return h
  }, [user?.id])

  const toIso = (local: string) => {
    if (!local) return null
    const d = new Date(local)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const role = (viewerRole || (user as any)?.role || 'teacher') as string
      const visibilityFor = role === 'student' ? 'student' : 'teacher'
      const r = await fetch(`/api/threads/${threadId}/tasks?visibility_for=${visibilityFor}`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Błąd pobierania zadań')
      setTasks(j.tasks || [])
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    } finally { setLoading(false) }
  }

  useEffect(() => { void fetchTasks() }, [threadId, externalRefreshTrigger])
  useEffect(() => { onTasksCountChange?.(tasks.length) }, [tasks.length])
  // notify parent once initial load finished
  const [loadedNotified, setLoadedNotified] = useState(false)
  useEffect(() => {
    if (!loading && !loadedNotified) {
      onLoaded?.()
      setLoadedNotified(true)
    }
  }, [loading, loadedNotified, onLoaded])
  // Ensure composer visibility follows the one-task-per-thread rule, but only after loading finishes
  useEffect(() => { if (!loading) setComposerOpen(tasks.length === 0) }, [tasks.length, loading])
  // Collapse by default when an existing task is present; expand when none
  useEffect(() => {
    if (!loading) setCollapsed(tasks.length > 0)
  }, [tasks.length, loading])

  const handleCreate = async () => {
    const plain = newContent.replace(/<[^>]*>/g, '').trim()
    if (!plain) { setError('Treść zadania jest wymagana'); return }
    try {
      setSaving(true); setError(null)
      const r = await fetch(`/api/threads/${threadId}/tasks?created_by=${encodeURIComponent(user?.id || '')}`, {
        method: 'POST', headers, body: JSON.stringify({ content_html: newContent, due_at: toIso(newDueAt), visibility: newVisibility })
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Błąd zapisu')
      setComposerOpen(false); setNewContent(''); setNewDueAt('')
      await fetchTasks()
    } catch (e: any) { setError(e?.message || 'Wystąpił nieoczekiwany błąd') } finally { setSaving(false) }
  }

  const updateTask = async (taskId: string, update: Partial<ThreadTask>) => {
    const body: any = {}
    if (update.content_html !== undefined) body.content_html = update.content_html
    if (update.due_at !== undefined) body.due_at = update.due_at
    if (update.status !== undefined) body.status = update.status
    if (update.visibility !== undefined) body.visibility = update.visibility
    const r = await fetch(`/api/threads/${threadId}/tasks/${taskId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.error || 'Błąd aktualizacji')
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Usunąć zadanie?')) return
    const r = await fetch(`/api/threads/${threadId}/tasks/${taskId}`, { method: 'DELETE', headers })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.error || 'Błąd usuwania')
    await fetchTasks()
  }

  const startEditing = (t: ThreadTask) => { setEditingId(t.id); setEditContent(t.content_html); setEditDueAt(t.due_at ? new Date(t.due_at).toISOString().slice(0,16) : '') }
  const cancelEditing = () => { setEditingId(null); setEditContent(''); setEditDueAt('') }
  const saveEditing = async () => {
    if (!editingId) return
    const plain = editContent.replace(/<[^>]*>/g, '').trim()
    if (!plain) { setError('Treść zadania jest wymagana'); return }
    try { setUpdating(true); await updateTask(editingId, { content_html: editContent, due_at: toIso(editDueAt) }); setEditingId(null); await fetchTasks() }
    catch (e: any) { setError(e?.message || 'Wystąpił nieoczekiwany błąd') } finally { setUpdating(false) }
  }

  const task = tasks[0]

  return (
    <div>
      {!hideHeader && (
        <CollapseHeader
          title={
            <span className="inline-flex items-center gap-2">Zadanie</span>
          }
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
          ariaControls="task-section"
          className="mb-4"
          rightContent={
            <div className="flex items-center gap-3">
              {task?.due_at && task.status !== 'done' && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (new Date(task.due_at).getTime() < Date.now())
                      ? 'bg-red-100 text-red-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  Termin: {new Date(task.due_at).toLocaleString('pl-PL')}
                </span>
              )}
              {task && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    task.status === 'done'
                      ? 'bg-green-100 text-green-800'
                      : task.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {task.status === 'done' ? 'Zrobione' : task.status === 'in_progress' ? 'W trakcie' : 'Do zrobienia'}
                </span>
              )}
              {/* Autor zadania */}
              {task && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Mentor</span>
              )}
              {/* Status switch moved to task details; header no longer shows it */}
              {/* Kłódka przeniesiona na prawą stronę (obok zwijania) */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (task) { await updateTask(task.id, { visibility: task.visibility === 'private' ? 'public' : 'private' }); await fetchTasks() }
                    else { setNewVisibility(v => v === 'private' ? 'public' : 'private') }
                  } catch {}
                }}
                className={`inline-flex items-center p-1 rounded ${((task?.visibility || newVisibility) === 'private') ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                title={(task?.visibility || newVisibility) === 'private' ? 'Prywatne' : 'Publiczne'}
                aria-label={(task?.visibility || newVisibility) === 'private' ? 'Prywatne' : 'Publiczne'}
              >
                {((task?.visibility || newVisibility) === 'private') ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1v-7a1 1 0 00-1-1h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clipRule="evenodd"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M5 8a5 5 0 0110 0v1h1a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V10a1 1 0 011-1h1V8zm2 1V8a3 3 0 016 0v1H7z" clipRule="evenodd"/></svg>
                )}
              </button>
            </div>
          }
        />
      )}

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      {!collapsed && !loading && composerOpen && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="bg-white p-4 rounded border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">Nowe zadanie</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleCreate} disabled={saving} className="inline-flex items-center p-1 rounded text-indigo-600 hover:bg-indigo-50 disabled:text-gray-400" title="Zapisz" aria-label="Zapisz">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                </button>
                <button type="button" onClick={() => { setComposerOpen(false); setNewContent(''); setNewDueAt('') }} className="inline-flex items-center p-1 rounded text-gray-600 hover:bg-gray-100" title="Anuluj" aria-label="Anuluj">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Termin</label>
              <input type="datetime-local" value={newDueAt} onChange={(e) => setNewDueAt(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <RichTextEditor value={newContent} onChange={setNewContent} placeholder="tutaj tekst" />
          </div>
        </div>
      )}

      {!collapsed && (
      <div id="task-section" className="space-y-4">
        {loading ? (
          <div className="text-sm text-gray-500">Ładowanie zadań...</div>
        ) : !task ? (
          composerOpen ? null : <div className="text-sm text-gray-500">Brak zadań.</div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="bg-white p-4 rounded border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Dodano:</span> {new Date(task.created_at).toLocaleString('pl-PL')}
                  {task.updated_at && task.updated_at !== task.created_at && (
                    <span> • <span className="font-medium text-gray-600">Edytowano:</span> {new Date(task.updated_at).toLocaleString('pl-PL')}</span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  {/* Przełącznik statusu przeniesiony do detali zadania */}
                  <div className="inline-flex rounded-md border overflow-hidden">
                    {(['todo','in_progress','done'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={async () => {
                          try {
                            await updateTask(task.id, { status: st })
                            setTasks(arr => arr.map(x => x.id === task.id ? { ...x, status: st } : x))
                          } catch {}
                        }}
                        className={`px-2 py-0.5 text-xs ${task.status === st ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                      >
                        {st === 'todo' ? 'Do zrobienia' : st === 'in_progress' ? 'W trakcie' : 'Zrobione'}
                      </button>
                    ))}
                  </div>
                  {editingId === task.id ? (
                    <>
                      <button type="button" onClick={saveEditing} disabled={updating} className="inline-flex items-center p-1 rounded text-indigo-600 hover:bg-indigo-50 disabled:text-gray-400" title="Zapisz" aria-label="Zapisz">
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      </button>
                      <button type="button" onClick={cancelEditing} className="inline-flex items-center p-1 rounded text-gray-600 hover:bg-gray-100" title="Anuluj" aria-label="Anuluj">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEditing(task)} className="inline-flex items-center p-1 rounded text-indigo-600 hover:bg-indigo-50" title="Edytuj" aria-label="Edytuj">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-indigo-600"><path d="M16.862 3.487a1.5 1.5 0 0 1 2.121 0l1.53 1.53a1.5 1.5 0 0 1 0 2.121l-9.9 9.9a1.5 1.5 0 0 1-.636.377l-4.07 1.163a.5.5 0 0 1-.62-.62l1.163-4.07a1.5 1.5 0 0 1 .377-.636l9.9-9.9Z"/><path d="M5 19.5h14a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1Z"/></svg>
                      </button>
                      <button type="button" onClick={() => handleDelete(task.id)} className="inline-flex items-center p-1 rounded text-red-600 hover:bg-red-50" title="Usuń" aria-label="Usuń">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-red-600"><path fillRule="evenodd" d="M9 3a1 1 0 00-.894.553L7.382 5H4a1 1 0 100 2h.293l.853 10.236A2 2 0 007.14 19h9.72a2 2 0 001.994-1.764L19.707 7H20a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0014 3H9zm2 6a1 1 0 00-1 1v7a1 1 0 102 0V10a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === task.id ? (
                <div className="mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Termin</label>
                      <input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} className="w-full px-2 py-1.5 border rounded" />
                    </div>
                  </div>
                  <RichTextEditor value={editContent} onChange={setEditContent} />
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="max-w-none rte-view" dangerouslySetInnerHTML={{ __html: task.content_html || '' }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
