import { useState } from 'react';

export default function ImportPanel() {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const [lastFile, setLastFile] = useState('');

  const handleEcPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfLoading(true);
    setPdfMessage('');
    setLastFile(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/pdf-report/generate?format=ec', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let msg = 'PDF olusturma basarisiz oldu';
        try {
          const err = await res.json();
          msg = err.detail || msg;
        } catch {
          // ignore parse failure
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      const contentDisp = res.headers.get('Content-Disposition') || '';
      const match = contentDisp.match(/filename="?([^\"]+)"?/i);
      const filename = match?.[1] || `${file.name.replace(/\.xml$/i, '')}_EC_Report.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setPdfMessage('EC format PDF basariyla olusturuldu ve indirildi.');
    } catch (err) {
      setPdfMessage(`Hata: ${err.message}`);
    } finally {
      setPdfLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-[#dbe8ff] bg-gradient-to-br from-white via-[#f6faff] to-[#eaf3ff] p-6 shadow-[0_16px_36px_rgba(37,99,235,0.12)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(37,99,235,0.2)_0%,transparent_30%),radial-gradient(circle_at_6%_88%,rgba(14,165,233,0.14)_0%,transparent_28%)]" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
            EC Document Flow
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-[#12386f]">XML to EC PDF</h2>
          <p className="mt-1 text-sm text-[#5273a8]">VECTO XML dosyanizi secin, European Commission uyumlu PDF raporunu aninda indirin.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#dbe8ff] bg-white p-6 shadow-sm">
        <div className="rounded-2xl border-2 border-dashed border-[#c7dcff] bg-[#f8fbff] p-10 text-center transition hover:border-blue-400/60 hover:bg-[#f2f8ff]">
          <input
            type="file"
            accept=".xml"
            onChange={handleEcPdf}
            className="hidden"
            id="ec-pdf-upload"
            disabled={pdfLoading}
          />
          <label htmlFor="ec-pdf-upload" className="cursor-pointer">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M12 18v-6" />
                <path d="M9.5 14.5L12 12l2.5 2.5" />
              </svg>
            </div>
            <p className="text-sm font-bold text-[#10203f]">XML dosyasi secmek icin tiklayin</p>
            <p className="mt-1 text-xs text-[#6b86b3]">RSLT_CUSTOMER veya RSLT_MANUFACTURER uyumlu cikti dosyalari desteklenir.</p>
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-[#e3eeff] bg-[#f8fbff] px-4 py-3 text-xs text-[#5f78a7]">
          <div className="flex items-center justify-between gap-3">
            <span>Son secilen dosya:</span>
            <span className="font-mono text-[#10203f]">{lastFile || '—'}</span>
          </div>
        </div>

        {pdfLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
            <div className="h-4 w-4 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
            PDF olusturuluyor...
          </div>
        )}

        {!!pdfMessage && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${pdfMessage.startsWith('Hata:') ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {pdfMessage}
          </div>
        )}
      </div>
    </div>
  );
}
