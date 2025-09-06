"use client"

import { useState } from 'react'
import RichTextEditor from '@/components/ui/RichTextEditor'

interface ThreadNoteComposerProps {
  threadId: string
  user?: { id: string }
  onSaved?: () => void
  onCancel?: () => void
}

export default function ThreadNoteComposer({ threadId, user, onSaved, onCancel }: ThreadNoteComposerProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!content || content.replace(/<[^>]*>/g, '').trim().length === 0) {
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
          'Authorization': `Bearer ${user?.id || 'local'}`
        },
        body: JSON.stringify({ content_html: content })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Błąd zapisu')
      onSaved?.()
      setContent('')
    } catch (e: any) {
      setError(e?.message || 'Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="mb-2 font-medium text-gray-700 text-sm">Nowa notatka</div>
      {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
      <RichTextEditor value={content} onChange={setContent} placeholder="Wpisz treść notatki..." />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? 'Zapisuję...' : 'Zapisz'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300">
          Anuluj
        </button>
      </div>
    </div>
  )
}

