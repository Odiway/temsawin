import { useState } from 'react';
import { api } from '../api';

export default function ImportPanel({ onImportComplete }) {
  const [importing, setImporting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const [result, setResult] = useState(null);
  const [dirPath, setDirPath] = useState('/app/vecto_files');
  const [mode, setMode] = useState('ec-pdf'); // 'ec-pdf' | 'directory' | 'upload'

  const handleDirectoryImport = async () => {
    setImporting(true);
    setResult(null);
    try {
      const data = await api.importDirectory(dirPath);
      setResult(data);
      if (onImportComplete) onImportComplete();
    } catch (e) {
      setResult({ error: e.message });
    }
    setImporting(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImporting(true);
    setResult(null);
    try {
      const data = await api.uploadXml(files);
      setResult(data);
      if (onImportComplete) onImportComplete();
    } catch (e) {
      setResult({ error: e.message });
    }
    setImporting(false);
  };

  const handleEcPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    setPdfMessage('');

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
          // no-op
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
      <div>
        <h2 className="text-xl font-bold text-slate-100">XML Dokuman Merkezi</h2>
        <p className="text-sm text-slate-500">XML dosyalarını EC PDF'e donusturun veya sisteme import edin</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('ec-pdf')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'ec-pdf' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'text-slate-500 border border-slate-800'
          }`}
        >
          🧾 XML → EC PDF
        </button>
        <button
          onClick={() => setMode('directory')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'directory' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'text-slate-500 border border-slate-800'
          }`}
        >
          📂 Dizin Import (Docker Volume)
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'upload' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'text-slate-500 border border-slate-800'
          }`}
        >
          📤 Dosya Yükle
        </button>
      </div>

      {/* Import form */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        {mode === 'ec-pdf' ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-blue-500/30 transition">
              <input
                type="file"
                accept=".xml"
                onChange={handleEcPdf}
                className="hidden"
                id="ec-pdf-upload"
                disabled={pdfLoading}
              />
              <label htmlFor="ec-pdf-upload" className="cursor-pointer">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm text-slate-300 font-semibold">European Commission PDF icin XML secin</p>
                <p className="text-xs text-slate-600 mt-1">Uyumlu VECTO result XML dosyasi olmalidir</p>
              </label>
            </div>

            {pdfLoading && (
              <div className="text-sm text-blue-400">PDF olusturuluyor...</div>
            )}
            {!!pdfMessage && (
              <div className={`text-sm ${pdfMessage.startsWith('Hata:') ? 'text-red-400' : 'text-emerald-400'}`}>
                {pdfMessage}
              </div>
            )}
          </div>
        ) : mode === 'directory' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Sunucu Dizin Yolu</label>
              <input
                type="text"
                value={dirPath}
                onChange={(e) => setDirPath(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1117] border border-slate-800 rounded-lg text-sm text-slate-300 font-mono focus:outline-none focus:border-blue-500/50"
              />
              <p className="text-xs text-slate-600 mt-1">
                Docker volume yolu. Varsayılan: /app/vecto_files
                (docker-compose.yml'deki ./vecto_files mount'u)
              </p>
            </div>
            <button
              onClick={handleDirectoryImport}
              disabled={importing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {importing ? 'İmport ediliyor...' : 'Dizini Import Et'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-blue-500/30 transition">
              <input
                type="file"
                multiple
                accept=".xml"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-3xl mb-2">📁</div>
                <p className="text-sm text-slate-400">XML dosyalarını seçin veya sürükleyin</p>
                <p className="text-xs text-slate-600 mt-1">Birden fazla dosya seçilebilir</p>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          {result.error ? (
            <div className="text-red-400 text-sm">
              <p className="font-semibold">Hata:</p>
              <p>{result.error}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-[#0d1117] rounded-lg">
                  <div className="text-2xl font-bold text-slate-300">{result.total_files}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Toplam Dosya</div>
                </div>
                <div className="text-center p-3 bg-[#0d1117] rounded-lg">
                  <div className="text-2xl font-bold text-emerald-400">{result.success_count}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Başarılı</div>
                </div>
                <div className="text-center p-3 bg-[#0d1117] rounded-lg">
                  <div className="text-2xl font-bold text-red-400">{result.error_count}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Hatalı</div>
                </div>
                <div className="text-center p-3 bg-[#0d1117] rounded-lg">
                  <div className="text-2xl font-bold text-slate-400">
                    {result.total_files - (result.success_count || 0) - (result.error_count || 0)}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">Atlanan</div>
                </div>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 uppercase tracking-wider">
                    <th className="pb-2">Dosya</th>
                    <th className="pb-2">Model</th>
                    <th className="pb-2">Durum</th>
                    <th className="pb-2">Detay</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  {(result.results || []).map((r, i) => (
                    <tr key={i} className="border-t border-slate-800/50">
                      <td className="py-2 font-mono">{r.filename}</td>
                      <td className="py-2">{r.vehicle_model || '-'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'success' ? 'bg-emerald-500/15 text-emerald-400' :
                          r.status === 'skipped' ? 'bg-slate-500/15 text-slate-400' :
                          'bg-red-500/15 text-red-400'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500">{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
