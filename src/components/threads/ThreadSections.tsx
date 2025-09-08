"use client"

import { useEffect, useMemo, useState } from 'react'
import RichTextEditor from '@/components/ui/RichTextEditor'

type ViewerRole = 'teacher' | 'student' | 'admin' | 'superadmin'
type SectionType = 'note_task' | 'checklist_task'

interface ChecklistItem {
  id: string
  section_id: string
  label: string
  position?: number
  created_at?: string
}

interface SectionProgress {
  id: string
  section_id: string
  user_id: string
  status: 'todo' | 'in_progress' | 'done'
  started_at?: string | null
  completed_at?: string | null
}

interface LessonSection {
  id: string
  lesson_id: string
  type: SectionType
  title: string
  content_html?: string | null
  position?: number | null
  due_at?: string | null
  visibility?: 'public' | 'private'
  created_at: string
  updated_at: string
  items?: ChecklistItem[]
  progress?: SectionProgress | null
}

interface LessonOption { id: string; title: string }

interface ThreadConnectionRef { lesson_id: string }

interface ThreadSectionsProps {
  lessons: LessonOption[]
  connections?: ThreadConnectionRef[]
  teacherId: string
  studentId: string
  user?: { id: string; role?: ViewerRole } | null
  viewerRole?: ViewerRole
}

export default function ThreadSections({ lessons, connections = [], teacherId, studentId, user, viewerRole = 'teacher' }: ThreadSectionsProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')
  const [sections, setSections] = useState<LessonSection[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState<boolean>(false)
  const [newType, setNewType] = useState<SectionType>('note_task')
  const [newTitle, setNewTitle] = useState<string>('')
  const [newContent, setNewContent] = useState<string>('')
  const [newDueAtLocal, setNewDueAtLocal] = useState<string>('')
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('private')
  const [checklistInputs, setChecklistInputs] = useState<string[]>([''])
  const [saving, setSaving] = useState<boolean>(false)

  const connectedLessonIds = useMemo(() => new Set((connections || []).map(c => c.lesson_id)), [connections])
  const lessonOptions = useMemo(() => {
    const all = (lessons || []).filter(l => !connections?.length || connectedLessonIds.has(l.id))
    return all
  }, [lessons, connections, connectedLessonIds])

  useEffect(() => {
    if (!selectedLessonId) {
      const first = lessonOptions[0]?.id
      if (first) setSelectedLessonId(first)
    }
  }, [lessonOptions, selectedLessonId])

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (user?.id) headers['Authorization'] = `Bearer ${user.id}`
    return headers
  }, [user?.id])

  const toIso = (localValue: string): string | null => {
    if (!localValue) return null
    const d = new Date(localValue)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  }

  const fetchSections = async (lessonId: string) => {
    if (!lessonId) return
    try {
      setLoading(true)
      setError(null)
      const visibilityFor = viewerRole === 'student' ? 'student' : 'teacher'
      const resp = await fetch(`/api/lessons/${lessonId}/sections?include_items=true&include_progress_for=${encodeURIComponent(studentId)}&visibility_for=${visibilityFor}`, { cache: 'no-store' })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Błąd pobierania sekcji')
      setSections(data.sections || [])
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedLessonId) void fetchSections(selectedLessonId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLessonId, studentId])

  const resetForm = () => {
    setNewType('note_task')
    setNewTitle('')
    setNewContent('')
    setNewDueAtLocal('')
    setNewVisibility('private')
    setChecklistInputs([''])
  }

  const handleCreate = async () => {
    if (!selectedLessonId) { setError('Wybierz lekcję'); return }
    if (!newTitle.trim()) { setError('Tytuł jest wymagany'); return }
    try {
      setSaving(true)
      setError(null)
      const body: any = {
        type: newType,
        title: newTitle.trim(),
        content_html: newType === 'note_task' ? newContent : null,
        due_at: toIso(newDueAtLocal),
        visibility: newVisibility,
      }
      if (newType === 'checklist_task') {
        const items = checklistInputs.map((l, idx) => ({ label: l, position: idx })).filter(it => it.label.trim().length > 0)
        body.items = items
      }
      const url = `/api/lessons/${selectedLessonId}/sections?created_by=${encodeURIComponent(user?.id || '')}`
      const resp = await fetch(url, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.error || 'Błąd tworzenia sekcji')
      resetForm()
      setCreating(false)
      await fetchSections(selectedLessonId)
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  const toggleVisibility = async (section: LessonSection) => {
    try {
      const next = section.visibility === 'public' ? 'private' : 'public'
      const resp = await fetch(`/api/lessons/${section.lesson_id}/sections/${section.id}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ visibility: next }) })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.error || 'Błąd aktualizacji widoczności')
      setSections(arr => arr.map(s => s.id === section.id ? { ...s, visibility: next } : s))
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    }
  }

  const updateNoteStatus = async (section: LessonSection, status: 'todo' | 'in_progress' | 'done') => {
    try {
      const resp = await fetch(`/api/sections/${section.id}/progress?user_id=${encodeURIComponent(studentId)}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status, user_id: studentId }) })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Błąd zapisu statusu')
      setSections(arr => arr.map(s => s.id === section.id ? { ...s, progress: data.progress } : s))
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    }
  }

  const [localChecked, setLocalChecked] = useState<Record<string, Record<string, boolean>>>({})

  const toggleChecklistItem = async (sectionId: string, item: ChecklistItem) => {
    try {
      const resp = await fetch(`/api/sections/${sectionId}/checklist-items/${item.id}/progress`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ user_id: studentId }) })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Błąd aktualizacji checklisty')
      setSections(arr => arr.map(s => s.id === sectionId ? { ...s, progress: data.progress } : s))
      setLocalChecked(map => ({ ...map, [sectionId]: { ...(map[sectionId] || {}), [item.id]: !(map[sectionId]?.[item.id]) } }))
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    }
  }

  const statusBadge = (status?: 'todo' | 'in_progress' | 'done') => {
    switch (status) {
      case 'done': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Zrobione</span>
      case 'in_progress': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">W trakcie</span>
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Do zrobienia</span>
    }
  }

  const VisibilityButton = ({ section }: { section: LessonSection }) => (
    <button
      type="button"
      onClick={() => toggleVisibility(section)}
      className={`inline-flex items-center p-1 rounded ${section.visibility === 'private' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
      title={section.visibility === 'private' ? 'Prywatna (tylko mentor)' : 'Widoczna dla wszystkich'}
      aria-label={section.visibility === 'private' ? 'Prywatna' : 'Publiczna'}
    >
      {section.visibility === 'private' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1v-7a1 1 0 00-1-1h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clipRule="evenodd"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M5 8a5 5 0 0110 0v1h1a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V10a1 1 0 011-1h1V8zm2 1V8a3 3 0 016 0v1H7z" clipRule="evenodd"/></svg>
      )}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Zadania i checklisty</h2>
          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className="px-2 py-1 border rounded-md text-sm"
          >
            {lessonOptions.map(l => (<option key={l.id} value={l.id}>{l.title}</option>))}
          </select>
        </div>
        <div>
          <button type="button" onClick={() => setCreating(v => !v)} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50">{creating ? 'Anuluj' : 'Dodaj sekcję'}</button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {creating && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as SectionType)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="note_task">Zadanie (notatka)</option>
                <option value="checklist_task">Checklist</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Widoczność</label>
              <select value={newVisibility} onChange={(e) => setNewVisibility(e.target.value as 'public' | 'private')} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="private">Prywatna (mentor)</option>
                <option value="public">Publiczna</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Termin</label>
              <input type="datetime-local" value={newDueAtLocal} onChange={(e) => setNewDueAtLocal(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tytuł</label>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Np. Zadanie domowe #1" />
          </div>

          {newType === 'note_task' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treść</label>
              <RichTextEditor value={newContent} onChange={setNewContent} placeholder="Zadanie do wykonania..." />
            </div>
          )}

          {newType === 'checklist_task' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pozycje checklisty</label>
              <div className="space-y-2">
                {checklistInputs.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input value={val} onChange={(e) => setChecklistInputs(arr => arr.map((v, i) => i === idx ? e.target.value : v))} className="flex-1 px-3 py-2 border border-gray-300 rounded-md" placeholder={`Pozycja #${idx + 1}`} />
                    <button type="button" className="px-2 rounded border" onClick={() => setChecklistInputs(arr => arr.filter((_, i) => i !== idx))}>Usuń</button>
                  </div>
                ))}
                <button type="button" className="text-sm text-blue-600" onClick={() => setChecklistInputs(arr => [...arr, ''])}>+ Dodaj pozycję</button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { resetForm(); setCreating(false) }} className="px-4 py-2 rounded-md border">Anuluj</button>
            <button type="button" disabled={saving} onClick={handleCreate} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">{saving ? 'Zapisywanie...' : 'Zapisz sekcję'}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-gray-600">Ładowanie sekcji...</div>
        ) : sections.length === 0 ? (
          <div className="text-sm text-gray-600">Brak sekcji.</div>
        ) : (
          sections.map((s) => (
            <div key={s.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{s.title}</h3>
                    {statusBadge(s.progress?.status)}
                    {s.due_at && ((s.progress?.status ?? 'todo') !== 'done') && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (new Date(s.due_at).getTime() < Date.now() && ((s.progress?.status ?? 'todo') !== 'done'))
                            ? 'bg-red-100 text-red-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        Termin: {new Date(s.due_at).toLocaleString('pl-PL')}
                      </span>
                    )}
                  </div>
                  {s.type === 'note_task' && s.content_html && (
                    <div className="mt-2 prose max-w-none rte-view" dangerouslySetInnerHTML={{ __html: s.content_html || '' }} />
                  )}
                </div>
                <div className="ml-3"><VisibilityButton section={s} /></div>
              </div>

              {s.type === 'note_task' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <div className="inline-flex rounded-md border overflow-hidden">
                    {(['todo','in_progress','done'] as const).map((st) => (
                      <button key={st} type="button" onClick={() => updateNoteStatus(s, st)} className={`px-3 py-1 text-xs ${s.progress?.status === st ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                        {st === 'todo' ? 'Do zrobienia' : st === 'in_progress' ? 'W trakcie' : 'Zrobione'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {s.type === 'checklist_task' && (
                <div className="mt-3">
                  <ul className="space-y-2">
                    {(s.items || []).map((it) => {
                      const checked = !!localChecked[s.id]?.[it.id]
                      return (
                        <li key={it.id} className="flex items-center gap-2">
                          <input type="checkbox" checked={checked} onChange={() => toggleChecklistItem(s.id, it)} className="h-4 w-4" aria-label={`Zaznacz ${it.label}`} />
                          <span className="text-sm text-gray-800">{it.label}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
