import { useState, useEffect } from 'react';
import { api } from '../api';

export default function VehicleList({ onSelectVariant }) {
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    api.getVehicles(filter || null).then(setVehicles).catch(console.error);
  }, [filter]);

  const toggleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
      setVariants([]);
      return;
    }
    setExpanded(id);
    try {
      const data = await api.getVehicle(id);
      setVariants(data.variants || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Araç Modelleri</h2>
          <p className="text-sm text-slate-500">{vehicles.length} model bulundu</p>
        </div>
        <div className="flex gap-2">
          {['', 'coach', 'city', 'ev', 'diesel'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition ${
                filter === cat
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat || 'Tümü'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {vehicles.map((v) => (
          <div key={v.id} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleExpand(v.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition"
            >
              <div className="flex items-center gap-4">
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  v.category === 'coach' ? 'bg-blue-500/15 text-blue-400' :
                  v.category === 'city' ? 'bg-emerald-500/15 text-emerald-400' :
                  v.category === 'ev' ? 'bg-purple-500/15 text-purple-400' :
                  'bg-amber-500/15 text-amber-400'
                }`}>
                  {v.category}
                </div>
                <span className="font-semibold text-slate-200">{v.model_name}</span>
                <span className="text-xs text-slate-500">{v.manufacturer}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{v.variant_count} varyant</span>
                <span className="text-slate-600">{expanded === v.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {expanded === v.id && (
              <div className="border-t border-slate-800 px-5 py-3 bg-[#0d1117]">
                {variants.length === 0 ? (
                  <p className="text-slate-600 text-sm py-2">Loading...</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider">
                        <th className="pb-2">Varyant Kodu</th>
                        <th className="pb-2">Motor</th>
                        <th className="pb-2">Hacim (cc)</th>
                        <th className="pb-2">Güç (kW)</th>
                        <th className="pb-2">Tork (Nm)</th>
                        <th className="pb-2">GVW (kg)</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((vr) => (
                        <tr key={vr.id} className="border-t border-slate-800/50 text-slate-400">
                          <td className="py-2 font-mono text-xs text-slate-300">{vr.variant_code}</td>
                          <td className="py-2 text-xs">{vr.engine_model || '-'}</td>
                          <td className="py-2 text-xs">{vr.displacement_cc || '-'}</td>
                          <td className="py-2 text-xs">{vr.rated_power_w ? Math.round(vr.rated_power_w / 1000) : '-'}</td>
                          <td className="py-2 text-xs">{vr.max_torque_nm || '-'}</td>
                          <td className="py-2 text-xs">{vr.max_laden_mass_kg || '-'}</td>
                          <td className="py-2">
                            <button
                              onClick={() => onSelectVariant(vr.id)}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Detay →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}

        {vehicles.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <p>Henüz araç yok. Önce VECTO dosyalarını import edin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
