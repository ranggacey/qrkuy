import { History, Trash2, Search, XCircle, Download, X } from "lucide-react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type HistoryItem = { text: string; date: string; [key: string]: unknown }

export default function HistoryTab({
  history,
  onPick,
  onClear,
  onDeleteItem,
}: {
  history: HistoryItem[]
  onPick: (item: HistoryItem) => void
  onClear: () => void
  onDeleteItem?: (index: number) => void
}) {
  const [query, setQuery] = useState("")
  const filtered = query.trim()
    ? history.filter((h) => h.text.toLowerCase().includes(query.trim().toLowerCase()))
    : history

  return (
    <Card className="shadow-[4px_4px_0px_0px_#fee440]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <History size={16} /> Riwayat QR
        </CardTitle>
        {history.length > 0 && (
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "qrkuy-history.json"; a.click();
            }}
            className="flex items-center gap-1 border-2 border-black bg-[#a0e3ff] px-3 py-1.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] mr-2"
            aria-label="Export riwayat"
          >
            <Download size={12} /> JSON
          </button>
        )}
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 border-2 border-black bg-[#ff6b6b] px-3 py-1.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            aria-label="Hapus semua riwayat"
          >
            <Trash2 size={12} /> Hapus Semua
          </button>
        )}
      </CardHeader>
      <CardContent>
        {history.length > 0 && (
          <div className="mb-3 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari riwayat..."
              aria-label="Cari riwayat QR"
              className="w-full border-2 border-black bg-white pl-9 pr-9 py-2 text-sm font-bold placeholder:text-black/30 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black transition-colors"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        )}
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((item, i) => (
              <div key={i} className="flex items-center border-2 border-black bg-white hover:bg-[#fee440] transition-colors shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000]">
                <button
                  onClick={() => onPick(item)}
                  className="flex-1 flex items-center justify-between px-4 py-3 text-left"
                  aria-label={`Gunakan teks: ${item.text}`}
                >
                  <span className="flex-1 truncate font-bold text-sm">{item.text}</span>
                  <span className="ml-3 shrink-0 text-xs font-bold text-black/40 border-2 border-black bg-[#e0e0e0] px-2 py-0.5">{item.date}</span>
                </button>
                {onDeleteItem && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteItem(i) }}
                    className="p-3 border-l-2 border-black text-black/30 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/20 transition-colors"
                    aria-label="Hapus item riwayat"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-black/20">
            <History size={48} className="mx-auto mb-3" />
            <p className="font-black uppercase">{history.length > 0 ? "Tidak ditemukan" : "Riwayat kosong"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
