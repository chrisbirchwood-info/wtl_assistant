"use client"

import React from 'react'

interface CollapseHeaderProps {
  title: React.ReactNode
  collapsed: boolean
  onToggle: () => void
  ariaControls?: string
  className?: string
  rightContent?: React.ReactNode
}

export default function CollapseHeader({ title, collapsed, onToggle, ariaControls, className = '', rightContent }: CollapseHeaderProps) {
  return (
    <div className={`mb-4 flex items-center justify-between ${className}`}>
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      <div className="flex items-center gap-2">
        {rightContent}
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800"
          aria-expanded={!collapsed}
          aria-controls={ariaControls}
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
          {collapsed ? 'Rozwiń' : 'Zwiń'}
        </button>
      </div>
    </div>
  )
}
