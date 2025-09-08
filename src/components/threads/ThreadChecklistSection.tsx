"use client"

import { useEffect, useMemo, useState } from 'react'
import CollapseHeader from '@/components/ui/CollapseHeader'
import type { ThreadChecklist, ThreadChecklistItem } from '@/types/thread-checklists'

type ViewerRole = 'teacher' | 'student' | 'admin' | 'superadmin'

interface ThreadChecklistSectionProps {
  threadId: string
  user?: { id: string; role?: string }
  defaultOpen?: boolean
  externalRefreshTrigger?: number
  onChecklistsCountChange?: (count: number) => void
  hideHeader?: boolean
  viewerRole?: ViewerRole
  openComposerSignal?: number
  onCancelNew?: () => void
}

export default function ThreadChecklistSection({
  threadId,
  user,
  defaultOpen = false,
  externalRefreshTrigger = 0,
  onChecklistsCountChange,
  hideHeader = false,
  viewerRole,
  openComposerSignal,
  onCancelNew,
}: ThreadChecklistSectionProps) {
  const [checklists, setChecklists] = useState<ThreadChecklist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(!!defaultOpen)
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingItems, setEditingItems] = useState<{ id?: string; label: string; position: number }[]>([])
  const [editDueAtLocal, setEditDueAtLocal] = useState('')

  // New checklist form
  const [newDueAt, setNewDueAt] = useState('')
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('private')
  const [checklistInputs, setChecklistInputs] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)

  // Ensure composer opens on signal when there is no checklist
  useEffect(() => {
    if (openComposerSignal != null && !loading && checklists.length === 0) {
      setComposerOpen(true)
    }
  }, [openComposerSignal, loading, checklists.length])

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
  const toLocalInput = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0,16)
  }

  const fetchChecklists = async () => {
    try {
      setLoading(true)
      const role = (viewerRole || (user as any)?.role || 'teacher') as string
      const visibilityFor = role === 'student' ? 'student' : 'teacher'
      const r = await fetch(`/api/threads/${threadId}/checklists?visibility_for=${visibilityFor}&include_items=true`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Błąd pobierania checklist')
      setChecklists(j.checklists || [])
      // Reset edit state on fresh load
      setEditing(false); setEditingItems([])
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    } finally { setLoading(false) }
  }

  // Do not fetch while composing a new checklist
  useEffect(() => {
    if (composerOpen) return
    void fetchChecklists()
  }, [threadId, externalRefreshTrigger, composerOpen])
  useEffect(() => { onChecklistsCountChange?.(checklists.length) }, [checklists.length])
  // Set default collapsed once after first load
  const [collapseInitialized, setCollapseInitialized] = useState(false)
  useEffect(() => {
    if (loading) return
    if (!collapseInitialized) {
      setCollapsed(checklists.length > 0)
      setCollapseInitialized(true)
    }
  }, [loading, checklists.length, collapseInitialized])

  const handleCreate = async () => {
    const items = checklistInputs
      .map((label, idx) => ({ label: String(label || '').trim(), position: idx }))
      .filter((x) => x.label.length > 0)
    if (items.length === 0) { setError('Dodaj przynajmniej jeden element'); return }
    try {
      setSaving(true); setError(null)
      const r = await fetch(`/api/threads/${threadId}/checklists?created_by=${encodeURIComponent(user?.id || '')}`, {
        method: 'POST', headers, body: JSON.stringify({ items, due_at: toIso(newDueAt), visibility: newVisibility })
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Błąd zapisu')
      setComposerOpen(false); setChecklistInputs(['']); setNewDueAt('')
      await fetchChecklists()
    } catch (e: any) { setError(e?.message || 'Wystąpił nieoczekiwany błąd') } finally { setSaving(false) }
  }

  const updateChecklist = async (checklistId: string, update: { visibility?: 'public' | 'private'; due_at?: string | null; status?: 'todo' | 'in_progress' | 'done' }) => {
    const body: any = {}
    if (update.visibility !== undefined) body.visibility = update.visibility
    if (update.due_at !== undefined) body.due_at = update.due_at
    if (update.status !== undefined) body.status = update.status
    const r = await fetch(`/api/threads/${threadId}/checklists/${checklistId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.error || 'Błąd aktualizacji')
  }

  const handleDelete = async (checklistId: string) => {
    if (!confirm('Usunąć checklistę?')) return
    const r = await fetch(`/api/threads/${threadId}/checklists/${checklistId}`, { method: 'DELETE', headers })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.error || 'Błąd usuwania')
    await fetchChecklists()
  }

  const startEditing = (c: ThreadChecklist) => {
    setEditing(true)
    const base: { id?: string; label: string; position: number }[] = (c.items || []).map((it, idx) => ({ id: it.id, label: it.label, position: it.position ?? idx }))
    if (base.length === 0) base.push({ label: '', position: 0 })
    setEditingItems(base)
    setEditDueAtLocal(toLocalInput(c.due_at || null))
  }
  const cancelEditing = () => { setEditing(false); setEditingItems([]) }
  const saveEditing = async (c: ThreadChecklist) => {
    try {
      const existingMap = new Map((c.items || []).map(it => [it.id, it]))
      // Update or create
      for (let i = 0; i < editingItems.length; i++) {
        const row = editingItems[i]
        const label = (row.label || '').trim()
        const position = i
        if (!row.id) {
          if (!label) continue
          await fetch(`/api/threads/${threadId}/checklists/${c.id}/items`, { method: 'POST', headers, body: JSON.stringify({ label, position }) })
        } else {
          const orig = existingMap.get(row.id)
          if (!orig) continue
          const changedLabel = label !== orig.label
          const changedPos = (position !== (orig.position ?? 0))
          if (changedLabel || changedPos) {
            await fetch(`/api/threads/${threadId}/checklists/${c.id}/items/${row.id}`, { method: 'PUT', headers, body: JSON.stringify({ label, position }) })
          }
          existingMap.delete(row.id)
        }
      }
      // Delete removed items
      for (const [id] of existingMap) {
        await fetch(`/api/threads/${threadId}/checklists/${c.id}/items/${id}`, { method: 'DELETE', headers })
      }
      // update due date
      await updateChecklist(c.id, { due_at: toIso(editDueAtLocal) })
      setEditing(false); setEditingItems([])
      await fetchChecklists()
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd podczas zapisu')
    }
  }

  const toggleItem = async (checklistId: string, item: ThreadChecklistItem) => {
    const next = !item.checked
    // optimistic toggle
    let updatedChecklist: ThreadChecklist | undefined
    setChecklists(arr => arr.map(c => {
      if (c.id !== checklistId) return c
      const items = (c.items || []).map(it => it.id === item.id ? { ...it, checked: next } : it)
      // derive status: all checked => done; any checked => in_progress; none => todo
      const total = items.length
      const checkedCount = items.filter(it => it.checked).length
      const derived: 'todo' | 'in_progress' | 'done' = checkedCount === 0 ? 'todo' : (checkedCount === total ? 'done' : 'in_progress')
      const c2 = { ...c, items, status: derived }
      updatedChecklist = c2
      return c2
    }))

    try {
      // 1) persist item toggle
      const r = await fetch(`/api/threads/${threadId}/checklists/${checklistId}/items/${item.id}`, { method: 'PUT', headers, body: JSON.stringify({ checked: next }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j?.error || 'Błąd zapisu pozycji')

      // 2) persist derived status if changed
      if (updatedChecklist) {
        const desired = updatedChecklist.status as 'todo' | 'in_progress' | 'done'
        await updateChecklist(checklistId, { status: desired })
      }
    } catch {
      // revert on failure
      setChecklists(arr => arr.map(c => {
        if (c.id !== checklistId) return c
        const items = (c.items || []).map(it => it.id === item.id ? { ...it, checked: item.checked } : it)
        // recompute to original status
        const total = items.length
        const checkedCount = items.filter(it => it.checked).length
        const derived: 'todo' | 'in_progress' | 'done' = checkedCount === 0 ? 'todo' : (checkedCount === total ? 'done' : 'in_progress')
        return { ...c, items, status: derived }
      }))
    }
  }

  const checklist = checklists[0]

  return (
    <div>
      {!hideHeader && (
        <CollapseHeader
          title={
            <span className="inline-flex items-center gap-2">Checklist</span>
          }
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
          ariaControls="checklist-section"
          className="mb-4"
          rightContent={
            <div className="flex items-center gap-3">
              {checklist?.due_at && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (new Date(checklist.due_at).getTime() < Date.now())
                      ? 'bg-red-100 text-red-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  Termin: {new Date(checklist.due_at).toLocaleString('pl-PL')}
                </span>
              )}
              {checklist && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (checklist.status || 'todo') === 'done'
                      ? 'bg-green-100 text-green-800'
                      : (checklist.status || 'todo') === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {(checklist.status || 'todo') === 'done' ? 'Zrobione' : (checklist.status || 'todo') === 'in_progress' ? 'W trakcie' : 'Do zrobienia'}
                </span>
              )}
              {checklist && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Mentor</span>
              )}
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (checklist) {
                      await updateChecklist(checklist.id, { visibility: checklist.visibility === 'private' ? 'public' : 'private' })
                      await fetchChecklists()
                    } else {
                      setNewVisibility(v => v === 'private' ? 'public' : 'private')
                    }
                  } catch {}
                }}
                className={`inline-flex items-center p-1 rounded ${((checklist?.visibility || newVisibility) === 'private') ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                title={(checklist?.visibility || newVisibility) === 'private' ? 'Prywatne' : 'Publiczne'}
                aria-label={(checklist?.visibility || newVisibility) === 'private' ? 'Prywatne' : 'Publiczne'}
              >
                {((checklist?.visibility || newVisibility) === 'private') ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1v-7a1 1 0 00-1-1h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clipRule="evenodd"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M5 8a5 5 0 0110 0v1h1a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V10a1 1 0 011-1h1V8zm2 1V8a3 3 0 016 0v1H7z" clipRule="evenodd"/></svg>
                )}
              </button>
              {/* icons for editing moved to body next to trash */}
            </div>
          }
        />
      )}

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      {/* Composer */}
      {!collapsed && composerOpen && checklists.length === 0 && (
        <div className="border rounded-md p-3 bg-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">Nowa checklista</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleCreate} disabled={saving} className="inline-flex items-center p-1 rounded text-indigo-600 hover:bg-indigo-50 disabled:text-gray-400" title="Zapisz" aria-label="Zapisz">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              </button>
              <button type="button" onClick={() => { onCancelNew?.(); setComposerOpen(false); setChecklistInputs(['']) }} className="inline-flex items-center p-1 rounded text-gray-600 hover:bg-gray-100" title="Anuluj" aria-label="Anuluj">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
              </button>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Termin</label>
            <div className="flex items-center gap-2">
              <input type="datetime-local" value={newDueAt} onChange={(e) => setNewDueAt(e.target.value)} className="flex-1 px-3 py-1.5 border rounded" />
              {newDueAt && (
                <button type="button" onClick={() => setNewDueAt('')} className="inline-flex items-center p-1 rounded text-gray-600 hover:bg-gray-100" title="Wyczyść termin" aria-label="Wyczyść termin">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pozycje checklisty</label>
            <div className="space-y-2">
              {checklistInputs.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input value={val} onChange={(e) => setChecklistInputs(arr => arr.map((v, i) => i === idx ? e.target.value : v))} className="flex-1 px-3 py-1.5 border rounded" placeholder={`Pozycja #${idx + 1}`} />
                  <button type="button" onClick={() => setChecklistInputs(arr => arr.filter((_, i) => i !== idx))} className="inline-flex items-center p-1 rounded text-red-600 hover:bg-red-50" title="Usuń" aria-label="Usuń">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-red-600"><path fillRule="evenodd" d="M9 3a1 1 0 00-.894.553L7.382 5H4a1 1 0 100 2h.293l.853 10.236A2 2 0 007.14 19h9.72a2 2 0 001.994-1.764L19.707 7H20a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0014 3H9zm2 6a1 1 0 00-1 1v7a1 1 0 102 0V10a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  </button>
                </div>
              ))}
              <button type="button" className="text-sm text-blue-600" onClick={() => setChecklistInputs(arr => [...arr, ''])}>+ Dodaj pozycję</button>
            </div>
          </div>

          {/* No bottom action buttons, actions are in header (icons) */}
        </div>
      )}

      {/* View */}
      {!collapsed && !composerOpen && (
        <div className="bg-white rounded-lg border">
          {loading ? (
            <div className="p-4 text-sm text-gray-600">Ładowanie...</div>
          ) : (checklists.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">Brak checklisty.</div>
          ) : (
            <div className="p-4">
              {checklist && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Dodano:</span> {new Date(checklist.created_at).toLocaleString('pl-PL')}
                      {checklist.updated_at && checklist.updated_at !== checklist.created_at && (
                        <span> · <span className="font-medium text-gray-600">Edytowano:</span> {new Date(checklist.updated_at).toLocaleString('pl-PL')}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {/* Status toggle */}
                      <div className="inline-flex rounded-md border overflow-hidden">
                        {(['todo','in_progress','done'] as const).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={async () => {
                              try {
                                await updateChecklist(checklist.id, { status: st })
                                setChecklists(arr => arr.map(c => c.id === checklist.id ? { ...c, status: st } : c))
                              } catch {}
                            }}
                            className={`px-2 py-0.5 text-xs ${(checklist.status || 'todo') === st ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                          >
                            {st === 'todo' ? 'Do zrobienia' : st === 'in_progress' ? 'W trakcie' : 'Zrobione'}
                          </button>
                        ))}
                      </div>
                      {editing ? (
                        <>
                          <button type="button" onClick={() => saveEditing(checklist)} className="inline-flex items-center p-1 rounded text-indigo-600 hover:bg-indigo-50" title="Zapisz" aria-label="Zapisz">
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                          </button>
                          <button type="button" onClick={cancelEditing} className="inline-flex items-center p-1 rounded text-gray-600 hover:bg-gray-100" title="Anuluj" aria-label="Anuluj">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEditing(checklist)} className="inline-flex items-center p-1 rounded text-indigo-600 hover:bg-indigo-50" title="Edytuj" aria-label="Edytuj">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M16.862 3.487a1.5 1.5 0 0 1 2.121 0l1.53 1.53a1.5 1.5 0 0 1 0 2.121l-9.9 9.9a1.5 1.5 0 0 1-.636.377l-4.07 1.163a.5.5 0 0 1-.62-.62l1.163-4.07a1.5 1.5 0 0 1 .377-.636l9.9-9.9Z"/><path d="M5 19.5h14a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1Z"/></svg>
                          </button>
                          <button type="button" onClick={() => handleDelete(checklist.id)} className="inline-flex items-center p-1 rounded text-red-600 hover:bg-red-50" title="Usuń" aria-label="Usuń">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-red-600"><path fillRule="evenodd" d="M9 3a1 1 0 00-.894.553L7.382 5H4a1 1 0 100 2h.293l.853 10.236A2 2 0 007.14 19h9.72a2 2 0 001.994-1.764L19.707 7H20a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0014 3H9zm2 6a1 1 0 00-1 1v7a1 1 0 102 0V10a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    {editing ? (
                      <div>
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Termin</label>
                          <div className="flex items-center gap-2">
                            <input type="datetime-local" value={editDueAtLocal} onChange={(e) => setEditDueAtLocal(e.target.value)} className="flex-1 px-3 py-1.5 border rounded" />
                            {editDueAtLocal && (
                              <button type="button" onClick={() => setEditDueAtLocal('')} className="inline-flex items-center p-1 rounded text-gray-600 hover:bg-gray-100" title="Wyczyść termin" aria-label="Wyczyść termin">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pozycje checklisty</label>
                        <div className="space-y-2">
                          {editingItems.map((row, idx) => (
                            <div key={row.id || `new-${idx}`} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                              <input
                                value={row.label}
                                onChange={(e) => setEditingItems(arr => arr.map((r, i) => i === idx ? { ...r, label: e.target.value } : r))}
                                className="flex-1 px-3 py-1.5 border rounded"
                                placeholder={`Pozycja #${idx + 1}`}
                              />
                              <button type="button" onClick={() => setEditingItems(arr => arr.filter((_, i) => i !== idx))} className="inline-flex items-center p-1 rounded text-red-600 hover:bg-red-50" title="Usuń" aria-label="Usuń">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M9 3a1 1 0 00-.894.553L7.382 5H4a1 1 0 100 2h.293l.853 10.236A2 2 0 007.14 19h9.72a2 2 0 001.994-1.764L19.707 7H20a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0014 3H9zm2 6a1 1 0 00-1 1v7a1 1 0 102 0V10a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                              </button>
                            </div>
                          ))}
                          <button type="button" className="text-sm text-blue-600" onClick={() => setEditingItems(arr => [...arr, { label: '', position: arr.length }])}>+ Dodaj pozycję</button>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {(checklist.items || []).map((it) => (
                          <li key={it.id} className="flex items-center gap-2">
                            <input type="checkbox" className="h-4 w-4" checked={!!it.checked} onChange={() => toggleItem(checklist.id, it)} aria-label={`Zaznacz ${it.label}`} />
                            <span className="text-sm text-gray-800">{it.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
