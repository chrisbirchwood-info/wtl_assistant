'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { useFeatureFlagsStore } from '@/store/feature-flags-store'

type Crumb = {
  href: string
  label: string
  isCurrent: boolean
}

const STATIC_LABELS: Record<string, string> = {
  'wtl': 'Dashboard',
  'profile': 'Mój profil',
  'admin': 'Panel Admina',
  'users': 'Użytkownicy',
  'user': 'Użytkownik',
  'lessons': 'Lekcje',
  'lesson': 'Lekcja',
  'courses': 'Kursy',
  'course': 'Kurs',
  'teacher': 'Nauczyciel',
  'teachers': 'Nauczyciele',
  'students': 'Studenci',
  'student': 'Uczeń',
  'threads': 'Wątki',
  'thread': 'Wątek',
  'features': 'Feature toggles',
  'auth': 'Autoryzacja',
  'login': 'Logowanie',
  'add': 'Dodaj',
  'edit': 'Edycja',
  'debug': 'Debug',
}

function isLikelyId(segment: string): boolean {
  if (!segment) return false
  // uuid v4-ish
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuid.test(segment)) return true
  // numeric or short hash-like
  if (/^[0-9]+$/.test(segment)) return true
  if (/^[0-9a-z]{10,}$/i.test(segment)) return true
  return false
}

function shortenId(id: string): string {
  if (!id) return ''
  if (id.length <= 8) return id
  return `${id.slice(0, 6)}…`
}

function humanize(segment: string): string {
  if (!segment) return ''
  // Replace dashes/underscores and capitalize first letter
  const s = segment.replace(/[-_]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function labelForSegment(segment: string, index: number, all: string[]): string {
  const lower = segment.toLowerCase()
  if (STATIC_LABELS[lower]) return STATIC_LABELS[lower]

  // Heuristics for id-like segments based on previous segment
  const prev = all[index - 1]?.toLowerCase()
  if (isLikelyId(segment)) {
    switch (prev) {
      case 'teacher':
      case 'teachers':
        return `Nauczyciel ${shortenId(segment)}`
      case 'student':
      case 'students':
        return `Uczeń ${shortenId(segment)}`
      case 'user':
      case 'users':
        return `Użytkownik ${shortenId(segment)}`
      case 'course':
      case 'courses':
        return `Kurs ${shortenId(segment)}`
      case 'lesson':
      case 'lessons':
        return `Lekcja ${shortenId(segment)}`
      case 'thread':
      case 'threads':
        return `Wątek ${shortenId(segment)}`
      default:
        return `ID ${shortenId(segment)}`
    }
  }

  return humanize(segment)
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const breadcrumbsEnabled = useFeatureFlagsStore((s) => s.flags.breadcrumbsEnabled)

  const crumbs = useMemo<Crumb[]>(() => {
    if (!pathname) return []

    // Hide breadcrumbs on auth pages and on the root
    if (pathname === '/' || pathname.startsWith('/auth')) return []

    const segments = pathname.split('/').filter(Boolean)
    const items: Crumb[] = []

    // Home/dashboard anchor
    items.push({ href: '/wtl', label: 'Start', isCurrent: segments.length === 0 })

    let acc = ''
    segments.forEach((seg, idx) => {
      acc += `/${seg}`
      items.push({
        href: acc,
        label: labelForSegment(seg, idx, segments),
        isCurrent: idx === segments.length - 1,
      })
    })

    // Remove duplicate when first segment is 'wtl' (Start already links there)
    const dedup = items.reduce<Crumb[]>((arr, c, i) => {
      if (i === 1 && c.href === '/wtl') return arr // drop duplicate
      arr.push(c)
      return arr
    }, [])

    return dedup
  }, [pathname])

  if (!breadcrumbsEnabled || !crumbs.length) return null

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2" aria-label="Okruszki" role="navigation">
        <ol className="flex items-center gap-2 text-sm text-gray-600">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex items-center">
              {i > 0 && (
                <span className="mx-2 text-gray-300" aria-hidden>
                  /
                </span>
              )}
              {c.isCurrent ? (
                <span aria-current="page" className="font-medium text-gray-800">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-gray-900 hover:underline">
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
