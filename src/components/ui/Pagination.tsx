"use client"
import React from 'react'

type Props = {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className={`mt-4 flex items-center justify-between ${className || ''}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Na stronę:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10) || pageSize)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={!canPrev}
          className={`px-3 py-1 rounded-md text-sm ${
            canPrev
              ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Poprzednia
        </button>
        <span className="text-sm text-gray-700">
          Strona {page} z {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={!canNext}
          className={`px-3 py-1 rounded-md text-sm ${
            canNext
              ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Następna
        </button>
      </div>
    </div>
  )
}

