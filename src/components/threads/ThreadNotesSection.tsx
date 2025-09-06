"use client"

import { useEffect, useState } from 'react'
import RichTextEditor from '@/components/ui/RichTextEditor'
import type { ThreadNote } from '@/types/threads'
import CollapseHeader from '@/components/ui/CollapseHeader'

interface ThreadNotesSectionProps {
  threadId: string
  user?: { id: string; role?: string }
  defaultOpen?: boolean
  hideComposerControls?: boolean
  externalRefreshTrigger?: number
  allowOnlyOne?: boolean
  onNotesCountChange?: (count: number) => void
  hideHeader?: boolean
  teacherId?: string
  studentId?: string
  viewerRole?: 'teacher' | 'student' | 'admin' | 'superadmin'
}

export default function ThreadNotesSection({
  threadId,
  user,
  defaultOpen = false,
  hideComposerControls = false,
  externalRefreshTrigger = 0,
  allowOnlyOne = false,
  onNotesCountChange,
  hideHeader = false,
  teacherId,
  studentId,
  viewerRole,
}: ThreadNotesSectionProps) {
  const [notes, setNotes] = useState<ThreadNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(!!defaultOpen)
  const [newContent, setNewContent] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({})
  const [contentMap, setContentMap] = useState<Record<string, string | undefined>>({})
  const [contentLoading, setContentLoading] = useState<Record<string, boolean>>({})
  const [contentError, setContentError] = useState<Record<string, string | undefined>>({})

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const role = (viewerRole || (user as any)?.role || 'teacher') as string
      const visibilityFor = role === 'student' ? 'student' : 'teacher'
      const resp = await fetch(`/api/threads/${threadId}/notes?visibility_for=${visibilityFor}`, { cache: 'no-store' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Błąd pobierania notatek')
      setNotes(data.notes || [])
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, externalRefreshTrigger])

  // Notify parent about count changes
  useEffect(() => {
    onNotesCountChange?.(notes.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length])

  const handleCreate = async () => {
    if (!newContent || newContent.replace(/<[^>]*>/g, '').trim().length === 0) {
      setError('Treść notatki jest wymagana')
      return
    }
    try {
      setSaving(true)
      setError(null)
      const resp = await fetch(`/api/threads/${threadId}/notes?created_by=${encodeURIComponent(user?.id || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || 'local'}`,
        },
        body: JSON.stringify({ content_html: newContent }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Błąd zapisu')
      setNewContent('')
      setComposerOpen(false)
      fetchNotes()
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (n: ThreadNote) => {
    setEditingId(n.id)
    setEditContent((contentMap[n.id] ?? (n as any).content_html) || '')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleUpdate = async () => {
    if (!editingId) return
    if (!editContent || editContent.replace(/<[^>]*>/g, '').trim().length === 0) {
      setError('Treść notatki jest wymagana')
      return
    }
    try {
      setUpdating(true)
      setError(null)
      const resp = await fetch(`/api/threads/${threadId}/notes/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || 'local'}`,
        },
        body: JSON.stringify({ content_html: editContent }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error((data as any)?.error || 'Błąd aktualizacji')
      setEditingId(null)
      setEditContent('')
      setContentMap((m) => ({ ...m, [editingId]: editContent }))
      fetchNotes()
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    } finally {
      setUpdating(false)
    }
  }

  const ensureNoteLoaded = async (noteId: string) => {
    if (contentMap[noteId] != null || contentLoading[noteId]) return
    try {
      setContentLoading((m) => ({ ...m, [noteId]: true }))
      setContentError((m) => ({ ...m, [noteId]: undefined }))
      const resp = await fetch(`/api/threads/${threadId}/notes/${noteId}`)
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Błąd pobierania notatki')
      setContentMap((m) => ({ ...m, [noteId]: data.note?.content_html || '' }))
    } catch (e: any) {
      setContentError((m) => ({ ...m, [noteId]: e?.message || 'Błąd pobierania notatki' }))
    } finally {
      setContentLoading((m) => ({ ...m, [noteId]: false }))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć notatkę?')) return
    try {
      const resp = await fetch(`/api/threads/${threadId}/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.id || 'local'}` },
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error((data as any)?.error || 'Błąd usuwania')
      fetchNotes()
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    }
  }

  // Visibility and display helpers
  const canShowComposerControls = !hideComposerControls && (!allowOnlyOne || notes.length === 0)
  const displayedNotes = allowOnlyOne
    ? (notes.length > 0
        ? [
            [...notes].sort(
              (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime(),
            )[0],
          ]
        : [])
    : notes

  return (
    <div>
      {!hideHeader && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Notatki</h3>
          {canShowComposerControls && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setComposerOpen((v) => !v)}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
              >
                {composerOpen ? 'Anuluj' : 'Dodaj notatkę'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      {canShowComposerControls && composerOpen && (
        <div className="mb-4">
          <RichTextEditor value={newContent} onChange={setNewContent} placeholder="Wpisz treść notatki..." />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Zapisuję...' : 'Zapisz notatkę'}
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerOpen(false)
                setNewContent('')
              }}
              className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="text-sm text-gray-500">Ładowanie notatek...</div>
        ) : displayedNotes.length === 0 ? (
          <div className="text-sm text-gray-500">Brak notatek.</div>
        ) : (
          displayedNotes.map((n, index) => {
            const collapsed = (collapsedMap[n.id] ?? true)
            const toggle = () => {
              const next = !collapsed
              setCollapsedMap((m) => ({ ...m, [n.id]: next }))
              if (next === false) {
                void ensureNoteLoaded(n.id)
              }
            }
            const role = n.created_by
              ? (n.created_by === teacherId
                  ? 'mentor'
                  : (n.created_by === studentId ? 'student' : 'inny'))
              : undefined
            const badgeClass = role === 'mentor'
              ? 'bg-blue-100 text-blue-800'
              : role === 'student'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
            const badgeLabel = role === 'mentor' ? 'Mentor' : role === 'student' ? 'Student' : '-'
            const canToggleVisibility = (user as any)?.role === 'superadmin' || (user?.id && user?.id === teacherId)
            const isPrivate = (n as any).visibility === 'private'

            const wrapperClass = index === 0 ? '' : 'mt-6 border-t pt-4'
            return (
              <div key={n.id} className={wrapperClass}>
                <CollapseHeader
                  title={
                    'Notatka'
                  }
                  collapsed={collapsed}
                  onToggle={toggle}
                  ariaControls={`note-${n.id}`}
                  className="mb-2"
                  rightContent={
                    <div className="flex items-center gap-2">
                      {(role === 'mentor' || role === 'student') && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                      )}
                      {canToggleVisibility && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const next = isPrivate ? 'public' : 'private'
                            try {
                              await fetch(`/api/threads/${threadId}/notes/${n.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.id || 'local'}` },
                                body: JSON.stringify({ visibility: next })
                              })
                              // Optimistic UI update
                              setNotes((arr) => arr.map((item) => item.id === n.id ? ({ ...item, visibility: next as any }) : item))
                            } catch {}
                          }}
                          className={`inline-flex items-center p-1 rounded ${isPrivate ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={isPrivate ? 'Prywatna (tylko mentor)' : 'Widoczna dla wszystkich'}
                          aria-label={isPrivate ? 'Prywatna' : 'Publiczna'}
                        >
                          {isPrivate ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1v-7a1 1 0 00-1-1h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clipRule="evenodd"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M5 8a5 5 0 1110 0v1h1a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V10a1 1 0 011-1h1V8zm2 1V8a3 3 0 016 0v1H7z" clipRule="evenodd"/></svg>
                          )}
                        </button>
                      )}
                    </div>
                  }
                />
                {!collapsed && (
                  <div id={`note-${n.id}`} className="bg-gray-50 p-4 rounded-lg">
                    <div className="bg-white p-4 rounded border">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium text-gray-600">Dodano:</span> {new Date(n.created_at).toLocaleString('pl-PL')}
                          {n.updated_at && n.updated_at !== n.created_at && (
                            <span> • <span className="font-medium text-gray-600">Edytowano:</span> {new Date(n.updated_at).toLocaleString('pl-PL')}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          {editingId === n.id ? (
                            <>
                              <button
                                type="button"
                                onClick={handleUpdate}
                                disabled={updating}
                                className="inline-flex items-center p-1 rounded text-indigo-600 hover:bg-indigo-50 disabled:text-gray-400"
                                title="Zapisz"
                                aria-label="Zapisz"
                              >
                                {updating ? (
                                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="inline-flex items-center p-1 rounded text-gray-600 hover:bg-gray-100"
                                title="Anuluj"
                                aria-label="Anuluj"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditing(n)}
                                className="inline-flex items-center p-1 rounded text-indigo-600 hover:bg-indigo-50"
                                title="Edytuj"
                                aria-label="Edytuj"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path d="M17.414 2.586a2 2 0 00-2.828 0L6 11.172V14h2.828l8.586-8.586a2 2 0 000-2.828z"/><path fillRule="evenodd" d="M4 16a2 2 0 002 2h8a2 2 0 002-2v-5a1 1 0 112 0v5a4 4 0 01-4 4H6a4 4 0 01-4-4V8a4 4 0 014-4h5a1 1 0 110 2H6a2 2 0 00-2 2v8z" clipRule="evenodd"/></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(n.id)}
                                className="inline-flex items-center p-1 rounded text-red-600 hover:bg-red-50"
                                title="Usuń"
                                aria-label="Usuń"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 100 2h.293l.853 10.236A2 2 0 007.14 18h5.72a2 2 0 001.994-1.764L15.707 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0010 2H9zm1 5a1 1 0 00-1 1v7a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {editingId === n.id ? (
                          <RichTextEditor value={editContent} onChange={setEditContent} />
                        ) : contentLoading[n.id] ? (
                          <div className="text-sm text-gray-500">Ładowanie notatki...</div>
                        ) : contentError[n.id] ? (
                          <div className="text-sm text-red-600">{contentError[n.id]}</div>
                        ) : (
                          <div className="max-w-none rte-view" dangerouslySetInnerHTML={{ __html: (contentMap[n.id] ?? (n as any).content_html ?? '') }} />
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
