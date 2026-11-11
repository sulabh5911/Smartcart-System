import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Inbox, AlertCircle } from 'lucide-react';

export default function DataTable({
  columns,
  data = [],
  loading = false,
  error = null,
  emptyMessage = 'No matching records found',
  itemsPerPageOptions = [5, 8, 10, 20],
  defaultPerPage = 8,
  rowIdKey = 'id'
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * perPage;
    return data.slice(startIndex, startIndex + perPage);
  }, [data, validCurrentPage, perPage]);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto min-h-[300px] flex-1">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading && (
              <>
                {[...Array(5)].map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse">
                    {columns.map((col, colIdx) => (
                      <td key={`skel-col-${colIdx}`} className="px-4 py-4">
                        <div className="h-3.5 bg-slate-200 rounded w-3/4"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-rose-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6" />
                    <p className="font-semibold text-xs">{error}</p>
                  </div>
                </td>
              </tr>
            )}

            {!loading && !error && paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-14 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 opacity-40" />
                    <p className="text-xs">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              paginatedData.map((row, idx) => (
                <tr key={row[rowIdKey] || idx} className="hover:bg-slate-50/80 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={`${row[rowIdKey] || idx}-${col.key}`}
                      className={`px-4 py-3.5 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && !error && totalItems > 0 && (
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{(validCurrentPage - 1) * perPage + 1}</strong> to{' '}
            <strong className="text-slate-800">{Math.min(validCurrentPage * perPage, totalItems)}</strong> of{' '}
            <strong className="text-slate-800">{totalItems}</strong> products
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                    validCurrentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
