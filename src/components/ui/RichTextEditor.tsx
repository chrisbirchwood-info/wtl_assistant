"use client"

import { useEffect, useRef } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  toolbarClassName?: string
}

export default function RichTextEditor({ value, onChange, placeholder, className = '', toolbarClassName = '' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const savedRangeRef = useRef<Range | null>(null)

  // Apply external value only when it changes (avoid caret reset on typing)
  useEffect(() => {
    if (!editorRef.current) return
    const next = value || ''
    if (editorRef.current.innerHTML !== next) {
      editorRef.current.innerHTML = next
    }
  }, [value])

  const saveSelection = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const root = editorRef.current
    const node = sel.anchorNode
    if (root && node && root.contains(node)) {
      savedRangeRef.current = sel.getRangeAt(0)
    }
  }

  const restoreSelection = () => {
    const sel = window.getSelection()
    const range = savedRangeRef.current
    if (sel && range) {
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      editorRef.current?.focus()
    }
  }

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus()
    restoreSelection()
    const supported = document.queryCommandSupported?.(command)
    const ok = document.execCommand(command, false, value)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbg = (window as any).__RTE_DEBUG
      if (dbg) {
        // eslint-disable-next-line no-console
        console.debug('[RTE] exec', {
          command,
          value,
          supported,
          ok,
          state: document.queryCommandState?.(command),
          currentValue: document.queryCommandValue?.(command),
          selectionCollapsed: window.getSelection()?.isCollapsed
        })
      }
    } catch {}

    if (!ok && command === 'formatBlock' && value) {
      // Manual fallback for formatBlock
      try {
        const tag = String(value).replace(/[<>]/g, '').toUpperCase()
        const sel = window.getSelection()
        const root = editorRef.current
        if (sel && root && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          let container: Node | null = range.startContainer
          while (container && container !== root && (container as HTMLElement).nodeType === 3) container = container.parentNode
          let block = container as HTMLElement | null
          while (block && block !== root && block.nodeType === 1 && !/^(P|DIV|H1|H2|H3|LI)$/.test(block.tagName)) block = block.parentElement
          if (block && block !== root) {
            const newEl = document.createElement(tag)
            newEl.innerHTML = block.innerHTML
            block.replaceWith(newEl)
            const newRange = document.createRange()
            newRange.selectNodeContents(newEl)
            newRange.collapse(false)
            sel.removeAllRanges(); sel.addRange(newRange)
          }
        }
      } catch {}
    }

    onChange(editorRef.current?.innerHTML || '')
    saveSelection()
  }

  const setBlock = (tag: 'P' | 'H1' | 'H2' | 'H3') => {
    exec('formatBlock', `<${tag.toLowerCase()}>`)
    exec('formatBlock', tag)
  }

  const insertLink = () => {
    const url = prompt('Wprowadź URL')
    if (url) exec('createLink', url)
  }

  const clearFormatting = () => {
    editorRef.current?.focus()
    restoreSelection()
    // Unlink + inline marks
    document.execCommand('unlink')
    document.execCommand('removeFormat')
    // If inside list, toggle it off
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const root = editorRef.current
      let n: Node | null = sel.anchorNode
      let list: 'UL' | 'OL' | null = null
      let listEl: HTMLElement | null = null
      while (n && n !== root) {
        if ((n as HTMLElement).nodeType === 1) {
          const t = (n as HTMLElement).tagName
          if (t === 'UL' || t === 'OL') { list = t; listEl = n as HTMLElement; break }
        }
        n = (n as Node).parentNode
      }
      // Try command toggle
      if (list === 'UL') document.execCommand('insertUnorderedList')
      if (list === 'OL') document.execCommand('insertOrderedList')
      // Manual unwrap as fallback
      if (listEl && (listEl.parentElement === root || root?.contains(listEl))) {
        try {
          const frag = document.createDocumentFragment()
          const items = Array.from(listEl.children).filter(ch => (ch as HTMLElement).tagName === 'LI') as HTMLElement[]
          for (const li of items) {
            const p = document.createElement('p')
            p.innerHTML = li.innerHTML
            frag.appendChild(p)
          }
          listEl.replaceWith(frag)
        } catch {}
      }
    }
    // Normalize to paragraph
    exec('formatBlock', '<p>')
    exec('formatBlock', 'P')
  }

  return (
    <div className={`border rounded-md ${className}`}>
      <div className={`flex flex-wrap items-center gap-1 border-b px-2 py-1 bg-gray-50 ${toolbarClassName}`}>
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); setBlock('P')}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded">P</button>
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); setBlock('H1')}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded">H1</button>
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); setBlock('H2')}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded">H2</button>
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); setBlock('H3')}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded">H3</button>
        <span className="mx-1 h-4 w-px bg-gray-300" />
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); exec('bold')}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded font-semibold">B</button>
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); exec('italic')}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded italic">I</button>
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); exec('underline')}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded underline">U</button>
        <span className="mx-1 h-4 w-px bg-gray-300" />
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); exec('insertUnorderedList')}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded">• Lista</button>
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); exec('insertOrderedList')}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded">1. Lista</button>
        <span className="mx-1 h-4 w-px bg-gray-300" />
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); insertLink()}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded">Link</button>
        <button type="button" onMouseDown={(e)=>{e.preventDefault(); clearFormatting()}} className="px-2 py-1 text-xs hover:bg-gray-100 rounded">Wyczyść</button>
      </div>
      <div
        ref={editorRef}
        className="min-h-[120px] p-3 focus:outline-none max-w-none whitespace-pre-wrap rte-content"
        contentEditable
        dir="ltr"
        spellCheck
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  )
}
