import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  getBuses, createBus, updateBus, deleteBus,
  getTasks, createTask, updateTask, deleteTask,
  checkBottleneck, getCalendarExcelUrl, getCalendarPdfUrl,
  getSubTasks, createSubTask, updateSubTask, deleteSubTask,
  getFollowUps, createFollowUp, updateFollowUp, deleteFollowUp,
  getCosts, createCost, updateCost, deleteCost, getCostSummary,
  getAuditLogs, createAuditLog,
} from './bomApi';

const TASK_COLORS = {
  PRODUCTION: '#f97316', 'RLD/FT': '#3b82f6', HOMOLOGATION: '#a855f7',
  'P/T-PIR': '#ec4899', NVH: '#14b8a6', CST: '#eab308', WT: '#6366f1',
  'MC VI': '#ef4444', SO: '#22c55e', 'GSR UP': '#06b6d4', IT: '#8b5cf6',
  D: '#f43f5e', DEFAULT: '#3b82f6',
};

const PRESET_COLORS = [
  '#f97316','#3b82f6','#a855f7','#ec4899','#14b8a6',
  '#eab308','#6366f1','#ef4444','#22c55e','#06b6d4',
  '#8b5cf6','#f43f5e','#0ea5e9','#84cc16','#d946ef',
];

const MONTHS = ['','Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
const STATUS_COLORS = { planned:'#64748b', in_progress:'#3b82f6', completed:'#22c55e', blocked:'#ef4444' };
const STATUS_LABELS = { planned:'Planli', in_progress:'Devam Ediyor', completed:'Tamamlandi', blocked:'Engellendi' };
const PRIORITY_LABELS = { 1:'Kritik', 2:'Yuksek', 3:'Orta' };
const PRIORITY_COLORS = { 1:'#ef4444', 2:'#f59e0b', 3:'#3b82f6' };

function getISOWeekDate(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  return mon;
}

function getCurrentWeek() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const doy = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
  const w = Math.ceil((doy + (jan4.getDay() || 7) - 1) / 7);
  return { year: now.getFullYear(), week: Math.min(w, 52) };
}

function generateWeeks(startYear, startWeek, count) {
  const weeks = [];
  let y = startYear, w = startWeek;
  for (let i = 0; i < count; i++) {
    weeks.push({ year: y, week: w });
    w++; if (w > 52) { w = 1; y++; }
  }
  return weeks;
}

function weekKey(y, w) { return y * 100 + w; }

const CELL_W = 54, LABEL_W = 200;
const D_CELL = 22, D_LABEL = 240, D_ROW = 20, D_BAR = 15, D_PARENT_ROW = 22;

export default function CalendarPanel() {
  const [activeTab, setActiveTab] = useState('gantt');
  const [buses, setBuses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allSubTasks, setAllSubTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [weekCount, setWeekCount] = useState(52);
  const current = getCurrentWeek();
  const [viewStartYear, setViewStartYear] = useState(current.year);
  const [viewStartWeek, setViewStartWeek] = useState(1);
  const [busModal, setBusModal] = useState({ open: false });
  const [taskModal, setTaskModal] = useState({ open: false });
  const [subTaskModal, setSubTaskModal] = useState({ open: false });
  const [warnings, setWarnings] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, t, st] = await Promise.all([getBuses(), getTasks(), getSubTasks()]);
      setBuses(b.data); setTasks(t.data); setAllSubTasks(st.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const weeks = useMemo(() => generateWeeks(viewStartYear, viewStartWeek, weekCount), [viewStartYear, viewStartWeek, weekCount]);
  const visibleBuses = useMemo(() => selectedBusId === null ? buses : buses.filter(b => b.id === selectedBusId), [buses, selectedBusId]);

  const monthGroups = useMemo(() => {
    const g = []; let prev = '';
    weeks.forEach(w => { const d = getISOWeekDate(w.year, w.week); const l = MONTHS[d.getMonth()+1]+' '+d.getFullYear(); if (l===prev) g[g.length-1].span++; else { g.push({label:l,span:1}); prev=l; } });
    return g;
  }, [weeks]);

  const quarterGroups = useMemo(() => {
    const g = []; let prev = '';
    weeks.forEach(w => { const d = getISOWeekDate(w.year, w.week); const q = Math.ceil((d.getMonth()+1)/3); const l = 'Q'+q+' '+d.getFullYear(); if (l===prev) g[g.length-1].span++; else { g.push({label:l,span:1}); prev=l; } });
    return g;
  }, [weeks]);

  const todayIdx = useMemo(() => { const c = getCurrentWeek(); return weeks.findIndex(w => w.year===c.year && w.week===c.week); }, [weeks]);

  const getTasksForBus = useCallback((busId) => tasks.filter(t => t.bus_id === busId), [tasks]);

  const getTaskPosition = useCallback((task) => {
    const sk = weekKey(task.start_year, task.start_week);
    const ek = weekKey(task.end_year, task.end_week);
    const si0 = weeks.findIndex(w => weekKey(w.year,w.week) >= sk);
    const ei0 = weeks.findIndex(w => weekKey(w.year,w.week) > ek);
    const si = si0 === -1 ? (sk < weekKey(weeks[0].year,weeks[0].week) ? 0 : -1) : si0;
    const ei = ei0 === -1 ? weeks.length : ei0;
    if (si === -1) return null;
    return { start: si, span: Math.max(1, ei - si) };
  }, [weeks]);

  const scrollLeft = () => { let y=viewStartYear, w=viewStartWeek-4; if(w<1){w+=52;y--;} setViewStartYear(y); setViewStartWeek(w); };
  const scrollRight = () => { let y=viewStartYear, w=viewStartWeek+4; if(w>52){w-=52;y++;} setViewStartYear(y); setViewStartWeek(w); };
  const goToToday = () => { const c=getCurrentWeek(); setViewStartYear(c.year); setViewStartWeek(Math.max(1,c.week-4)); };

  const handleSaveBus = async (data, id) => {
    if (!window.confirm(id ? 'Otobüs güncellensin mi?' : 'Yeni otobüs eklensin mi?')) return;
    try { if (id) await updateBus(id, data); else await createBus(data); setBusModal({open:false}); load(); }
    catch (e) { alert('Otobus kaydedilemedi'); }
  };
  const handleDeleteBus = async (id) => {
    if (!window.confirm('Bu otobüs silinsin mi? Bu işlem geri alınamaz.')) return;
    try { await deleteBus(id); setDeleteConfirm(null); if(selectedBusId===id) setSelectedBusId(null); load(); }
    catch (e) { alert('Silinemedi'); }
  };
  const handleSaveTask = async (data, id) => {
    if (!window.confirm(id ? 'Görev güncellensin mi?' : 'Yeni görev eklensin mi?')) return;
    try { let res; if (id) res=await updateTask(id,data); else res=await createTask(data); if(res.data.warnings?.length) setWarnings(res.data.warnings); setTaskModal({open:false}); load(); }
    catch (e) { alert('Gorev kaydedilemedi'); }
  };
  const handleDeleteTask = async (id) => {
    if (!window.confirm('Bu görev silinsin mi? Bu işlem geri alınamaz.')) return;
    try { await deleteTask(id); setDeleteConfirm(null); load(); }
    catch (e) { alert('Silinemedi'); }
  };
  const handleSaveSubTask = async (data, id) => {
    if (!window.confirm(id ? 'Alt görev güncellensin mi?' : 'Yeni alt görev eklensin mi?')) return;
    try { if (id) await updateSubTask(id, data); else await createSubTask(data); setSubTaskModal({open:false}); load(); }
    catch (e) { alert('Alt gorev kaydedilemedi'); }
  };
  const handleDeleteSubTask = async (id) => {
    if (!window.confirm('Bu alt görev silinsin mi? Bu işlem geri alınamaz.')) return;
    try { await deleteSubTask(id); setDeleteConfirm(null); load(); }
    catch (e) { alert('Silinemedi'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /><span className="text-slate-400 text-sm">Takvim yukleniyor...</span></div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">📅 Entegrasyon Test Takvimi</h1>
          <p className="text-sm text-slate-400 mt-1">Haftalik test plani • Master ve Detay Gantt gorunumu</p>
        </div>
        <div className="flex items-center gap-3">
          {buses.length > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <a href={getCalendarExcelUrl()} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/30 flex items-center gap-1.5 transition-all">📊 Excel</a>
              <a href={getCalendarPdfUrl()} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 border border-red-500/20 text-red-400 hover:bg-red-600/30 flex items-center gap-1.5 transition-all">📄 PDF</a>
            </div>
          )}
          <button onClick={() => setBusModal({open:true})} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center gap-1.5">🚌 Yeni Otobus</button>
          <button onClick={() => setTaskModal({open:true})} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1.5" disabled={buses.length===0}>➕ Yeni Gorev</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
        {[
          { key:'gantt', label:'Master Takvim', icon:'📅' },
          { key:'detail', label:'Detay Takvim', icon:'🔍' },
          { key:'followups', label:'Takip Listesi', icon:'📋' },
          { key:'costs', label:'Maliyet Takibi', icon:'💰' },
          { key:'audit', label:'Değişiklikler', icon:'📝' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab===t.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Controls bar — Master: year nav + bus filter; Detail: scroll, week count */}
      {(activeTab === 'gantt' || activeTab === 'detail') && (
        <div className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.06] rounded-xl px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtre:</span>
            <button onClick={() => setSelectedBusId(null)} className={'px-3 py-1 rounded-lg text-xs font-medium transition-all '+(selectedBusId===null?'bg-blue-600 text-white':'text-slate-400 hover:text-white hover:bg-white/[0.06]')}>Tumu</button>
            {buses.map(b => (
              <button key={b.id} onClick={() => setSelectedBusId(b.id)} className={'px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 '+(selectedBusId===b.id?'text-white':'text-slate-400 hover:text-white hover:bg-white/[0.06]')} style={selectedBusId===b.id?{backgroundColor:b.color}:{}}>
                <span className="w-2 h-2 rounded-full" style={{backgroundColor:b.color}} />{b.name}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          {activeTab === 'gantt' && (
            <div className="flex items-center gap-2">
              <button onClick={() => setViewStartYear(y => y - 1)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">◀</button>
              <span className="text-sm font-bold text-white min-w-[50px] text-center">{viewStartYear}</span>
              <button onClick={() => setViewStartYear(y => y + 1)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">▶</button>
            </div>
          )}
          {activeTab === 'detail' && (
            <>
              <div className="flex items-center gap-2">
                <button onClick={scrollLeft} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">◀</button>
                <button onClick={goToToday} className="px-3 py-1 rounded-lg text-xs font-medium bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-all border border-cyan-500/20">BUGUN</button>
                <button onClick={scrollRight} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">▶</button>
              </div>
              <select value={weekCount} onChange={e => setWeekCount(Number(e.target.value))} className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-slate-300 outline-none">
                <option value={20}>20 Hafta</option><option value={30}>30 Hafta</option><option value={40}>40 Hafta</option><option value={52}>52 Hafta (Tam Yil)</option><option value={78}>78 Hafta (1.5 Yil)</option><option value={104}>104 Hafta (2 Yil)</option>
              </select>
            </>
          )}
        </div>
      )}

      {/* TAB: Main Gantt */}
      {activeTab === 'gantt' && (
        <>
          {buses.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-16 text-center">
              <span className="text-5xl block mb-4">🚌</span>
              <h2 className="text-xl font-semibold text-white mb-2">Henuz otobus programi eklenmedi</h2>
              <p className="text-slate-400 text-sm mb-6">Yeni Otobus butonuna tiklayarak baslayin</p>
              <button onClick={() => setBusModal({open:true})} className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all">Otobus Ekle</button>
            </div>
          ) : (
            <MasterOverview
              buses={visibleBuses} tasks={tasks} allSubTasks={allSubTasks}
              year={viewStartYear}
              getTasksForBus={getTasksForBus}
              onClickTask={(task, busId) => setTaskModal({open:true, task, busId})}
              onAddTask={(busId) => setTaskModal({open:true, busId})}
              onEditBus={(bus) => setBusModal({open:true, bus})}
              onDeleteBus={(id) => setDeleteConfirm({type:'bus',id})}
              onPostpone={async (items, weeksDelta) => {
                if (!window.confirm(`${items.length} öğeyi ${weeksDelta > 0 ? '+' : ''}${weeksDelta} hafta ertelemek istediğinize emin misiniz?\n\nBu değişiklik kaydedilecektir.`)) return;
                for (const item of items) {
                  let newSW = item.start_week + weeksDelta;
                  let newSY = item.start_year;
                  let newEW = item.end_week + weeksDelta;
                  let newEY = item.end_year;
                  while (newSW > 52) { newSW -= 52; newSY++; }
                  while (newSW < 1)  { newSW += 52; newSY--; }
                  while (newEW > 52) { newEW -= 52; newEY++; }
                  while (newEW < 1)  { newEW += 52; newEY--; }
                  const upd = { start_week: newSW, start_year: newSY, end_week: newEW, end_year: newEY };
                  if (item.parent_task_id) await updateSubTask(item.id, upd);
                  else await updateTask(item.id, upd);
                  try { await createAuditLog({ user_name: 'Kullanıcı', action: 'postpone', entity_type: item.parent_task_id ? 'subtask' : 'task', entity_id: item.id, entity_name: item.name, details: `${weeksDelta > 0 ? '+' : ''}${weeksDelta} hafta ertelendi (Master)`, old_values: JSON.stringify({ start_week: item.start_week, start_year: item.start_year, end_week: item.end_week, end_year: item.end_year }), new_values: JSON.stringify(upd) }); } catch(e) { console.error('audit log err', e); }
                }
                load();
              }}
            />
          )}
          {tasks.length > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-5 py-3">
              <span className="text-xs text-slate-500 font-medium mr-4">Gorev Tipleri:</span>
              <div className="inline-flex flex-wrap gap-3 mt-1">
                {Array.from(new Set(tasks.map(t => t.name))).map(name => {
                  const c = tasks.find(t => t.name === name)?.color || '#3b82f6';
                  return <div key={name} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{backgroundColor:c}} /><span className="text-[11px] text-slate-400">{name}</span></div>;
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: Detail Gantt */}
      {activeTab === 'detail' && (
        <DetailCalendar
          buses={visibleBuses} tasks={tasks} allSubTasks={allSubTasks}
          weeks={weeks} monthGroups={monthGroups} quarterGroups={quarterGroups} todayIdx={todayIdx}
          getTasksForBus={getTasksForBus} getTaskPosition={getTaskPosition}
          onAddSubTask={(parentId) => setSubTaskModal({open:true, parentTaskId: parentId})}
          onEditSubTask={(st) => setSubTaskModal({open:true, subtask: st, parentTaskId: st.parent_task_id})}
          onDeleteSubTask={(id) => setDeleteConfirm({type:'subtask',id})}
          onAddTask={(busId) => setTaskModal({open:true, busId})}
          onPostpone={async (items, weeksDelta) => {
            if (!window.confirm(`${items.length} öğeyi ${weeksDelta > 0 ? '+' : ''}${weeksDelta} hafta ertelemek istediğinize emin misiniz?\n\nBu değişiklik kaydedilecektir.`)) return;
            for (const item of items) {
              let newSW = item.start_week + weeksDelta;
              let newSY = item.start_year;
              let newEW = item.end_week + weeksDelta;
              let newEY = item.end_year;
              while (newSW > 52) { newSW -= 52; newSY++; }
              while (newSW < 1)  { newSW += 52; newSY--; }
              while (newEW > 52) { newEW -= 52; newEY++; }
              while (newEW < 1)  { newEW += 52; newEY--; }
              const upd = { start_week: newSW, start_year: newSY, end_week: newEW, end_year: newEY };
              if (item.parent_task_id) await updateSubTask(item.id, upd);
              else await updateTask(item.id, upd);
              try { await createAuditLog({ user_name: 'Kullanıcı', action: 'postpone', entity_type: item.parent_task_id ? 'subtask' : 'task', entity_id: item.id, entity_name: item.name, details: `${weeksDelta > 0 ? '+' : ''}${weeksDelta} hafta ertelendi (Detay)`, old_values: JSON.stringify({ start_week: item.start_week, start_year: item.start_year, end_week: item.end_week, end_year: item.end_year }), new_values: JSON.stringify(upd) }); } catch(e) { console.error('audit log err', e); }
            }
            load();
          }}
        />
      )}

      {/* TAB: Follow-Ups */}
      {activeTab === 'followups' && <FollowUpTab buses={buses} />}

      {/* TAB: Costs */}
      {activeTab === 'costs' && <CostTab buses={buses} />}

      {/* TAB: Audit Log */}
      {activeTab === 'audit' && <AuditTab />}

      {/* Modals */}
      {busModal.open && <BusModal bus={busModal.bus} onClose={() => setBusModal({open:false})} onSave={handleSaveBus} />}
      {taskModal.open && <TaskModal task={taskModal.task} busId={taskModal.busId} buses={buses} allTasks={tasks} onClose={() => setTaskModal({open:false})} onSave={handleSaveTask} />}
      {subTaskModal.open && <SubTaskModal subtask={subTaskModal.subtask} parentTaskId={subTaskModal.parentTaskId} onClose={() => setSubTaskModal({open:false})} onSave={handleSaveSubTask} />}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-900/90 border border-amber-500/30 rounded-xl p-4 max-w-md shadow-2xl">
          <div className="flex items-center justify-between mb-2"><span className="text-amber-400 font-semibold text-sm">⚠️ Darboğaz Uyarısı</span><button onClick={() => setWarnings([])} className="text-slate-400 hover:text-white text-lg">×</button></div>
          {warnings.map((w,i) => <p key={i} className="text-xs text-amber-200/80 mb-1">"{w.task_name}" ({w.bus_name}) — {w.overlap_weeks.length} hafta cakisma</p>)}
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-[#0c1222] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-400 mb-3">🗑️ Silme Onayi</h3>
            <p className="text-sm text-slate-400 mb-5">{deleteConfirm.type==='bus'?'Bu otobus programi ve tum gorevleri silinecek.':deleteConfirm.type==='subtask'?'Bu alt gorev silinecek.':'Bu gorev silinecek.'}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-lg bg-white/[0.06] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-all">Iptal</button>
              <button onClick={() => {
                if (deleteConfirm.type==='bus') handleDeleteBus(deleteConfirm.id);
                else if (deleteConfirm.type==='subtask') handleDeleteSubTask(deleteConfirm.id);
                else handleDeleteTask(deleteConfirm.id);
              }} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-all">Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MASTER OVERVIEW — full-year Gantt with bars, NO scroll   */
/* ══════════════════════════════════════════════════════════ */

function MasterOverview({ buses, tasks, allSubTasks, year, getTasksForBus, onClickTask, onAddTask, onEditBus, onDeleteBus, onPostpone }) {
  const masterWeeks = useMemo(() => generateWeeks(year, 1, 52), [year]);
  const current = getCurrentWeek();
  const todayIdx = (current.year === year) ? current.week - 1 : -1;
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ width: 0 });

  // Postpone state
  const [postponeModal, setPostponeModal] = useState(null);
  const [postponeWeeks, setPostponeWeeks] = useState(1);
  const [postponeScope, setPostponeScope] = useState('bar');
  const [postponeSelected, setPostponeSelected] = useState([]);

  const openPostpone = (bus, task) => {
    setPostponeModal({ bus, task });
    setPostponeWeeks(1);
    setPostponeScope(task ? 'bar' : 'project');
    setPostponeSelected([]);
  };

  const executePostpone = () => {
    if (!postponeModal || !onPostpone) return;
    const { bus, task } = postponeModal;
    let items = [];
    if (postponeScope === 'project') {
      const busTasks = getTasksForBus(bus.id);
      items = [...busTasks, ...busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id))];
    } else if (postponeScope === 'bar' && task) {
      const busTasks = getTasksForBus(bus.id);
      const sk = weekKey(task.start_year, task.start_week);
      items.push(task);
      items.push(...allSubTasks.filter(s => s.parent_task_id === task.id));
      busTasks.forEach(t => {
        if (t.id === task.id) return;
        const tsk = weekKey(t.start_year, t.start_week);
        if (tsk >= sk) {
          items.push(t);
          items.push(...allSubTasks.filter(s => s.parent_task_id === t.id));
        }
      });
    } else if (postponeScope === 'single') {
      const busTasks = getTasksForBus(bus.id);
      const allItems = [...busTasks, ...busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id))];
      items = allItems.filter(i => postponeSelected.includes(i.id));
    }
    if (items.length > 0) onPostpone(items, postponeWeeks);
    setPostponeModal(null);
  };

  const getPostponeItems = () => {
    if (!postponeModal) return [];
    const { bus, task } = postponeModal;
    const busTasks = getTasksForBus(bus.id);
    if (task) return [task, ...allSubTasks.filter(s => s.parent_task_id === task.id)];
    return [...busTasks, ...busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id))];
  };

  // Month spans for header colspan
  const monthSpans = useMemo(() => {
    const spans = [];
    let prevM = -1;
    masterWeeks.forEach((w, i) => {
      const d = getISOWeekDate(w.year, w.week);
      const m = d.getMonth() + 1;
      if (m !== prevM) { spans.push({ month: m, start: i, count: 1 }); prevM = m; }
      else { spans[spans.length - 1].count++; }
    });
    return spans;
  }, [masterWeeks]);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setDims({ width: e.contentRect.width });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const M_LABEL = 130;
  const gridW = Math.max(dims.width - M_LABEL - 10, 52);
  const cellW = gridW / 52;

  // Task positions in week index space
  const getPos = useCallback((task) => {
    const sk = weekKey(task.start_year, task.start_week);
    const ek = weekKey(task.end_year, task.end_week);
    const si0 = masterWeeks.findIndex(w => weekKey(w.year, w.week) >= sk);
    const ei0 = masterWeeks.findIndex(w => weekKey(w.year, w.week) > ek);
    const si = si0 === -1 ? (sk < weekKey(masterWeeks[0].year, masterWeeks[0].week) ? 0 : -1) : si0;
    const ei = ei0 === -1 ? masterWeeks.length : ei0;
    if (si === -1) return null;
    return { start: si, span: Math.max(1, ei - si) };
  }, [masterWeeks]);

  // Build bus sections with packed rows
  const busSections = useMemo(() => {
    return buses.map(bus => {
      const busTasks = getTasksForBus(bus.id);
      const rows = [];
      busTasks.forEach(task => {
        const pos = getPos(task);
        if (!pos) return;
        let placed = false;
        for (const row of rows) {
          if (row.every(([, p]) => pos.start >= p.start + p.span || pos.start + pos.span <= p.start)) {
            row.push([task, pos]); placed = true; break;
          }
        }
        if (!placed) rows.push([[task, pos]]);
      });
      return { bus, busTasks, rows };
    });
  }, [buses, getTasksForBus, getPos]);

  // Dependency arrows data
  const depArrows = useMemo(() => {
    const arrows = [];
    const taskPosMap = new Map();
    let yOff = 0;
    busSections.forEach(({ bus, rows }, busIdx) => {
      if (busIdx > 0) yOff += 3; // separator height
      const headerH = 40; // bus label row 
      rows.forEach((row, ri) => {
        row.forEach(([task, pos]) => {
          const cx = pos.start * cellW + pos.span * cellW / 2;
          const cy = yOff + headerH + ri * 32 + 16;
          const endX = (pos.start + pos.span) * cellW;
          const startX = pos.start * cellW;
          taskPosMap.set(task.id, { cx, cy, startX, endX, top: yOff + headerH + ri * 32 + 4, h: 24 });
        });
      });
      yOff += headerH + Math.max(1, rows.length) * 32 + 8;
    });
    // Build arrows from depends_on
    tasks.forEach(task => {
      if (!task.depends_on) return;
      const from = taskPosMap.get(task.depends_on);
      const to = taskPosMap.get(task.id);
      if (from && to) arrows.push({ from, to, fromId: task.depends_on, toId: task.id });
    });
    return { arrows, totalH: yOff, taskPosMap };
  }, [busSections, tasks, cellW]);

  const MONTH_COLORS = {
    1:'#ef4444',2:'#f97316',3:'#eab308',4:'#22c55e',5:'#14b8a6',6:'#06b6d4',
    7:'#3b82f6',8:'#6366f1',9:'#a855f7',10:'#ec4899',11:'#f43f5e',12:'#ef4444',
  };
  const ROW_H = 32;
  const BUS_HEADER_H = 40;

  return (
    <>
    <div ref={containerRef} className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Month header row */}
      <div className="flex border-b border-white/[0.08]" style={{ background: '#0f1419' }}>
        <div style={{ width: M_LABEL, minWidth: M_LABEL }} className="shrink-0 px-3 py-1.5 border-r border-white/[0.06] text-[9px] font-bold text-slate-500 uppercase">Otobus</div>
        <div className="flex-1 flex">
          {monthSpans.map((ms, i) => (
            <div key={i} style={{ width: ms.count * cellW, minWidth: ms.count * cellW, color: MONTH_COLORS[ms.month] || '#94a3b8' }}
              className="text-center py-1.5 text-[9px] font-bold uppercase tracking-wide border-l border-white/[0.06]">
              {MONTHS[ms.month]}
            </div>
          ))}
        </div>
      </div>

      {/* Week number header */}
      <div className="flex border-b border-white/[0.1]" style={{ background: '#0f1419' }}>
        <div style={{ width: M_LABEL, minWidth: M_LABEL }} className="shrink-0 px-3 py-0.5 border-r border-white/[0.06] text-[7px] text-slate-600">Hafta →</div>
        <div className="flex-1 flex">
          {masterWeeks.map((w, i) => (
            <div key={i} style={{ width: cellW, minWidth: cellW }}
              className={`text-center py-0.5 text-[6px] font-mono border-l border-white/[0.04] ${i === todayIdx ? 'bg-cyan-600/30 text-cyan-300 font-bold' : 'text-slate-600'}`}>
              {w.week}
            </div>
          ))}
        </div>
      </div>

      {/* Bus rows with Gantt bars */}
      <div className="relative">
        {busSections.map(({ bus, busTasks, rows }, busIdx) => {
          const rowCount = Math.max(1, rows.length);
          return (
            <div key={bus.id}>
              {/* Blue separator between buses */}
              {busIdx > 0 && (
                <div style={{ height: 3, background: 'linear-gradient(to right, #3b82f6, #60a5fa 30%, #3b82f6 60%, transparent 95%)', boxShadow: '0 0 8px rgba(59,130,246,0.3)' }} />
              )}
              <div className="flex border-b border-white/[0.04] group hover:bg-white/[0.015] transition-colors">
                {/* Bus label */}
                <div style={{ width: M_LABEL, minWidth: M_LABEL, minHeight: BUS_HEADER_H + rowCount * ROW_H, background: '#0f1419' }}
                  className="shrink-0 px-2 py-2 border-r border-white/[0.06] flex flex-col justify-center gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: bus.color }} />
                    <span className="text-[10px] font-bold text-white truncate">{bus.name}</span>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <button onClick={() => onEditBus(bus)} className="text-[7px] text-slate-600 hover:text-blue-400 transition-colors">duzenle</button>
                    <span className="text-slate-700 text-[7px]">·</span>
                    <button onClick={() => onDeleteBus(bus.id)} className="text-[7px] text-slate-600 hover:text-red-400 transition-colors">sil</button>
                    <span className="text-slate-700 text-[7px]">·</span>
                    <button onClick={() => onAddTask(bus.id)} className="text-[7px] text-slate-600 hover:text-emerald-400 transition-colors">+ gorev</button>
                    <span className="text-slate-700 text-[7px]">·</span>
                    <button onClick={() => openPostpone(bus, null)} className="text-[7px] text-slate-600 hover:text-blue-400 transition-colors">⏩ ertele</button>
                  </div>
                </div>
                {/* Grid + bars */}
                <div className="relative flex-1" style={{ minHeight: BUS_HEADER_H + rowCount * ROW_H }}>
                  {/* Grid columns */}
                  <div className="absolute inset-0 flex">
                    {masterWeeks.map((_, i) => (
                      <div key={i} style={{ width: cellW, minWidth: cellW }} className={'border-l border-white/[0.03] ' + (i === todayIdx ? 'bg-cyan-600/10' : '')} />
                    ))}
                  </div>
                  {/* Today line */}
                  {todayIdx >= 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-500 z-20" style={{ left: todayIdx * cellW + cellW / 2 }} />}
                  {/* Task bars */}
                  {rows.map((row, ri) => row.map(([task, pos]) => {
                    const barL = pos.start * cellW + 1;
                    const barW = pos.span * cellW - 2;
                    const barT = 4 + ri * ROW_H;
                    const barH = ROW_H - 8;
                    const isRoutine = task.is_routine;
                    const isDone = task.status === 'completed';
                    return (
                      <div key={task.id} data-taskid={task.id}
                        className="absolute rounded-[4px] cursor-pointer hover:brightness-110 hover:z-30 transition-all shadow-md group/bar overflow-hidden"
                        style={{ left: barL, width: barW, top: barT, height: barH, backgroundColor: isDone ? '#22c55e' : task.color, opacity: isRoutine ? 0.55 : 1 }}
                        onClick={() => onClickTask(task, bus.id)}
                        onContextMenu={(e) => { e.preventDefault(); openPostpone(bus, task); }}
                        title={`${task.name}${task.notes ? '\n' + task.notes : ''}\nW${task.start_week}→W${task.end_week}\nSag tik: Ertele`}>
                        <div className="px-1 h-full flex items-center overflow-hidden">
                          <span className="text-[8px] font-bold text-white truncate leading-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                            {task.name}
                          </span>
                        </div>
                        {isDone && <span className="absolute right-0.5 top-0.5 text-[7px] text-white/80">✓</span>}
                      </div>
                    );
                  }))}

                  {/* SVG dependency arrows for this bus's tasks */}
                  <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: BUS_HEADER_H + rowCount * ROW_H, overflow: 'visible', zIndex: 25 }}>
                    <defs>
                      <marker id={`mArrow-${bus.id}`} markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                        <path d="M0,0 L6,2 L0,4 Z" fill="#fbbf24" />
                      </marker>
                    </defs>
                    {rows.flatMap((row, ri) => row.map(([task, pos]) => {
                      if (!task.depends_on) return null;
                      // Find the dependency task within the same bus
                      const depTask = busTasks.find(t => t.id === task.depends_on);
                      if (!depTask) return null;
                      const depPos = getPos(depTask);
                      if (!depPos) return null;
                      // Find which row the dep task is in
                      let depRi = 0;
                      rows.forEach((r, rri) => r.forEach(([t]) => { if (t.id === depTask.id) depRi = rri; }));
                      // From end of depTask to start of task
                      const x1 = (depPos.start + depPos.span) * cellW - 2;
                      const y1 = 4 + depRi * ROW_H + (ROW_H - 8) / 2;
                      const x2 = pos.start * cellW + 2;
                      const y2 = 4 + ri * ROW_H + (ROW_H - 8) / 2;
                      // Curved path
                      const dx = x2 - x1;
                      const dy = y2 - y1;
                      const cx1 = x1 + Math.max(12, dx * 0.3);
                      const cy1 = y1;
                      const cx2 = x2 - Math.max(12, dx * 0.3);
                      const cy2 = y2;
                      return (
                        <path key={`dep-${task.id}`}
                          d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
                          fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.7"
                          markerEnd={`url(#mArrow-${bus.id})`} />
                      );
                    }))}
                  </svg>
                </div>
              </div>
            </div>
          );
        })}

        {/* Cross-bus dependency arrows (SVG overlay) */}
        {(() => {
          // Compute absolute Y offsets for each bus section
          const busOffsets = new Map();
          let yOff = 0;
          busSections.forEach(({ bus, rows }, busIdx) => {
            if (busIdx > 0) yOff += 3;
            busOffsets.set(bus.id, yOff);
            yOff += BUS_HEADER_H + Math.max(1, rows.length) * ROW_H;
          });
          // Map task id -> { x, y, busId, rowIdx }
          const taskXY = new Map();
          busSections.forEach(({ bus, rows }) => {
            const off = busOffsets.get(bus.id);
            rows.forEach((row, ri) => row.forEach(([task, pos]) => {
              taskXY.set(task.id, {
                endX: (pos.start + pos.span) * cellW - 2,
                startX: pos.start * cellW + 2,
                y: off + 4 + ri * ROW_H + (ROW_H - 8) / 2,
                busId: bus.id,
              });
            }));
          });
          const crossArrows = tasks.filter(t => {
            if (!t.depends_on) return false;
            const from = taskXY.get(t.depends_on);
            const to = taskXY.get(t.id);
            return from && to && from.busId !== to.busId;
          });
          if (crossArrows.length === 0) return null;
          return (
            <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: gridW, height: yOff, overflow: 'visible', zIndex: 26, marginLeft: M_LABEL }}>
              <defs>
                <marker id="mArrowCross" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <path d="M0,0 L6,2 L0,4 Z" fill="#f87171" />
                </marker>
              </defs>
              {crossArrows.map(task => {
                const from = taskXY.get(task.depends_on);
                const to = taskXY.get(task.id);
                const x1 = from.endX, y1 = from.y;
                const x2 = to.startX, y2 = to.y;
                const dx = x2 - x1;
                const midX = x1 + dx / 2;
                return (
                  <path key={`xdep-${task.id}`}
                    d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                    fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.6"
                    markerEnd="url(#mArrowCross)" />
                );
              })}
            </svg>
          );
        })()}
      </div>
    </div>

    {/* ── Postpone Modal (same as GanttChart) ── */}
    {postponeModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={() => setPostponeModal(null)}>
        <div className="bg-[#1a1f2e] border border-white/[0.1] rounded-2xl shadow-2xl w-[460px] max-h-[80vh] overflow-hidden"
          onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
            <span className="text-lg">⏩</span>
            <div>
              <h3 className="text-white font-bold text-sm">Gorev Erteleme</h3>
              <p className="text-slate-500 text-[10px] mt-0.5">{postponeModal.bus.name}{postponeModal.task ? ` › ${postponeModal.task.name}` : ''}</p>
            </div>
            <button onClick={() => setPostponeModal(null)} className="ml-auto text-slate-500 hover:text-white text-lg transition-colors">×</button>
          </div>
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">Erteleme Suresi</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setPostponeWeeks(n)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (postponeWeeks === n ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.1]')}>
                  {n} Hafta
                </button>
              ))}
              <input type="number" min={1} max={52} value={postponeWeeks}
                onChange={e => setPostponeWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-xs text-center" />
            </div>
          </div>
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">Erteleme Kapsami</label>
            <div className="space-y-1.5">
              <label className={'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ' + (postponeScope === 'project' ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]')}
                onClick={() => setPostponeScope('project')}>
                <input type="radio" checked={postponeScope === 'project'} onChange={() => setPostponeScope('project')} className="accent-blue-500" />
                <div><span className="text-[11px] font-semibold text-white">Tum Projeyi Ertele</span><p className="text-[9px] text-slate-500">"{postponeModal.bus.name}" altindaki tum gorevleri erteler</p></div>
              </label>
              {postponeModal.task && (
                <label className={'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ' + (postponeScope === 'bar' ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]')}
                  onClick={() => setPostponeScope('bar')}>
                  <input type="radio" checked={postponeScope === 'bar'} onChange={() => setPostponeScope('bar')} className="accent-blue-500" />
                  <div><span className="text-[11px] font-semibold text-white">Bu Cizgiyi Ertele</span><p className="text-[9px] text-slate-500">"{postponeModal.task.name}" ve sonrasindaki tum gorevleri erteler</p></div>
                </label>
              )}
              <label className={'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ' + (postponeScope === 'single' ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]')}
                onClick={() => setPostponeScope('single')}>
                <input type="radio" checked={postponeScope === 'single'} onChange={() => setPostponeScope('single')} className="accent-blue-500" />
                <div><span className="text-[11px] font-semibold text-white">Secili Gorevleri Ertele</span><p className="text-[9px] text-slate-500">Asagidan ertelenecek gorevleri secin</p></div>
              </label>
            </div>
          </div>
          {postponeScope === 'single' && (
            <div className="px-5 py-3 border-b border-white/[0.06] max-h-[200px] overflow-y-auto">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">Gorev Sec ({postponeSelected.length} secili)</label>
              <div className="space-y-1">
                {getPostponeItems().map(item => {
                  const isSub = !!item.parent_task_id;
                  const checked = postponeSelected.includes(item.id);
                  return (
                    <label key={`${isSub ? 's' : 't'}${item.id}`}
                      className={'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ' + (checked ? 'bg-blue-600/10' : 'hover:bg-white/[0.03]')}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setPostponeSelected(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])}
                        className="accent-blue-500 shrink-0" />
                      <span className={'w-2 h-2 rounded-sm shrink-0 ' + (isSub ? 'rounded-full' : '')} style={{ backgroundColor: item.color || '#3b82f6' }} />
                      <span className="text-[10px] text-slate-300 truncate">{item.name}</span>
                      <span className="text-[8px] text-slate-600 ml-auto shrink-0">W{item.start_week}-W{item.end_week}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-[9px] text-slate-600">
              {postponeScope === 'project' && `Tum proje ${postponeWeeks} hafta ertelenecek`}
              {postponeScope === 'bar' && `Secilenlerden sonraki tum gorevler ${postponeWeeks} hafta ertelenecek`}
              {postponeScope === 'single' && `${postponeSelected.length} oge ${postponeWeeks} hafta ertelenecek`}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPostponeModal(null)} className="px-4 py-1.5 rounded-lg text-[11px] text-slate-400 bg-white/[0.05] hover:bg-white/[0.1] transition-colors">Iptal</button>
              <button onClick={executePostpone}
                disabled={postponeScope === 'single' && postponeSelected.length === 0}
                className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg">Ertele</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}


/* ══════════════════════════════════════════════════════════ */
/*  GANTT CHART (main overview)                              */
/* ══════════════════════════════════════════════════════════ */
function GanttChart({ buses, tasks, allSubTasks, weeks, monthGroups, quarterGroups, todayIdx, getTasksForBus, getTaskPosition, onClickTask, onEditTask, onAddTask, onEditBus, onDeleteBus, onPostpone }) {
  const [postponeModal, setPostponeModal] = useState(null);
  const [postponeWeeks, setPostponeWeeks] = useState(1);
  const [postponeScope, setPostponeScope] = useState('bar');
  const [postponeSelected, setPostponeSelected] = useState([]);

  const openPostpone = (bus, task) => {
    setPostponeModal({ bus, task });
    setPostponeWeeks(1);
    setPostponeScope(task ? 'bar' : 'project');
    setPostponeSelected([]);
  };

  const executePostpone = () => {
    if (!postponeModal) return;
    const { bus, task } = postponeModal;
    let items = [];
    if (postponeScope === 'project') {
      const busTasks = getTasksForBus(bus.id);
      items = [...busTasks, ...busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id))];
    } else if (postponeScope === 'bar' && task) {
      const busTasks = getTasksForBus(bus.id);
      const taskPos = getTaskPosition(task);
      if (taskPos) {
        items.push(task);
        items.push(...allSubTasks.filter(s => s.parent_task_id === task.id));
        busTasks.forEach(t => {
          if (t.id === task.id) return;
          const pos = getTaskPosition(t);
          if (pos && pos.start >= taskPos.start) {
            items.push(t);
            items.push(...allSubTasks.filter(s => s.parent_task_id === t.id));
          }
        });
      }
    } else if (postponeScope === 'single') {
      const busTasks = getTasksForBus(bus.id);
      const allItems = [...busTasks, ...busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id))];
      items = allItems.filter(i => postponeSelected.includes(i.id));
    }
    if (items.length > 0) onPostpone(items, postponeWeeks);
    setPostponeModal(null);
  };

  const getPostponeItems = () => {
    if (!postponeModal) return [];
    const { bus, task } = postponeModal;
    const busTasks = getTasksForBus(bus.id);
    if (task) return [task, ...allSubTasks.filter(s => s.parent_task_id === task.id)];
    return [...busTasks, ...busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id))];
  };

  return (
    <>
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="overflow-x-auto" style={{ position: 'relative' }}>
        <div style={{ minWidth: LABEL_W + weeks.length * CELL_W + 20 }}>
          {/* Quarter header */}
          <div className="flex border-b border-white/[0.06]" style={{ position: 'sticky', top: 0, zIndex: 20, background: '#0f1419' }}>
            <div style={{width:LABEL_W,minWidth:LABEL_W,position:'sticky',left:0,zIndex:25,background:'#0f1419'}} className="shrink-0 border-r border-white/[0.06]" />
            {quarterGroups.map((g,i) => <div key={i} style={{width:g.span*CELL_W}} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest py-1 border-l border-white/[0.04]">{g.label}</div>)}
          </div>
          {/* Month header */}
          <div className="flex border-b border-white/[0.06]" style={{ position: 'sticky', top: 26, zIndex: 20, background: '#0f1419' }}>
            <div style={{width:LABEL_W,minWidth:LABEL_W,position:'sticky',left:0,zIndex:25,background:'#0f1419'}} className="shrink-0 px-4 flex items-center border-r border-white/[0.06]"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Otobus Programi</span></div>
            {monthGroups.map((g,i) => <div key={i} style={{width:g.span*CELL_W}} className="text-center text-[11px] font-semibold text-slate-400 py-1.5 border-l border-white/[0.04]">{g.label}</div>)}
          </div>
          {/* Week header */}
          <div className="flex border-b border-white/[0.08]" style={{ position: 'sticky', top: 55, zIndex: 20, background: '#0f1419' }}>
            <div style={{width:LABEL_W,minWidth:LABEL_W,position:'sticky',left:0,zIndex:25,background:'#0f1419'}} className="shrink-0 border-r border-white/[0.06]" />
            {weeks.map((w,i) => <div key={i} style={{width:CELL_W}} className={'text-center text-[10px] py-1.5 border-l border-white/[0.04] font-mono '+(i===todayIdx?'bg-cyan-600/20 text-cyan-400 font-bold':'text-slate-500')}>W{w.week}</div>)}
          </div>
          {/* Bus rows */}
          {buses.map((bus, busIdx) => {
            const busTasks = getTasksForBus(bus.id);
            const taskRows = [];
            busTasks.forEach(task => {
              const pos = getTaskPosition(task);
              if (!pos) return;
              let row = taskRows.find(r => r.every(t => { const p=getTaskPosition(t); if(!p)return true; return pos.start>=p.start+p.span||pos.start+pos.span<=p.start; }));
              if (!row) { row=[]; taskRows.push(row); }
              row.push(task);
            });
            const rowCount = Math.max(1, taskRows.length);
            return (
              <div key={bus.id}>
                {/* Blue separator between buses */}
                {busIdx > 0 && (
                  <div style={{ height: 3, background: 'linear-gradient(to right, #3b82f6, #60a5fa 30%, #3b82f6 60%, transparent 95%)', boxShadow: '0 0 8px rgba(59,130,246,0.3)' }} />
                )}
                <div className="flex border-b border-white/[0.04] group hover:bg-white/[0.02] transition-colors">
                  <div style={{width:LABEL_W,minWidth:LABEL_W,minHeight:rowCount*36+16,position:'sticky',left:0,zIndex:15,background:'#0f1419'}} className="shrink-0 px-3 py-2 border-r border-white/[0.06] flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor:bus.color}} /><span className="text-sm font-semibold text-white truncate">{bus.name}</span></div>
                    <div className="flex gap-1 ml-5">
                      <button onClick={() => onEditBus(bus)} className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors">duzenle</button>
                      <span className="text-slate-700">·</span>
                      <button onClick={() => onDeleteBus(bus.id)} className="text-[10px] text-slate-500 hover:text-red-400 transition-colors">sil</button>
                      <span className="text-slate-700">·</span>
                      <button onClick={() => onAddTask(bus.id)} className="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors">+ gorev</button>
                      <span className="text-slate-700">·</span>
                      <button onClick={() => openPostpone(bus, null)} className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors">⏩ ertele</button>
                    </div>
                  </div>
                  <div className="relative flex-1" style={{minHeight:rowCount*36+16}}>
                    <div className="absolute inset-0 flex">
                      {weeks.map((_,i) => <div key={i} style={{width:CELL_W}} className={'border-l border-white/[0.03] '+(i===todayIdx?'bg-cyan-600/10':'')} />)}
                    </div>
                    {todayIdx >= 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-500 z-20" style={{left:todayIdx*CELL_W+CELL_W/2}} />}
                    {taskRows.map((row,ri) => row.map(task => {
                      const pos = getTaskPosition(task); if (!pos) return null;
                      const subCount = allSubTasks.filter(s => s.parent_task_id === task.id).length;
                      return (
                        <div key={task.id} className="absolute rounded-md cursor-pointer hover:brightness-110 hover:scale-[1.02] transition-all shadow-lg group/task"
                          style={{ left:pos.start*CELL_W+2, width:pos.span*CELL_W-4, top:ri*36+8, height:28, backgroundColor:task.color }}
                          onClick={() => onClickTask(task, bus)}
                          onContextMenu={(e) => { e.preventDefault(); openPostpone(bus, task); }}
                          title={`${task.name}${task.notes?'\n'+task.notes:''}${subCount?'\n'+subCount+' alt gorev':''}\nDetay icin tiklayin · Sag tik: Ertele`}>
                          <div className="px-2 h-full flex items-center gap-1.5 overflow-hidden">
                            <span className="text-[11px] font-semibold text-white truncate">{task.name}</span>
                            {subCount > 0 && <span className="shrink-0 w-4 h-4 rounded-full bg-white/20 text-[9px] font-bold text-white flex items-center justify-center">{subCount}</span>}
                          </div>
                          <button className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-700 border border-white/20 text-white text-[10px] hidden group-hover/task:flex items-center justify-center"
                            onClick={e => { e.stopPropagation(); onEditTask(task, bus.id); }}>✎</button>
                        </div>
                      );
                    }))}
                    {/* SVG dependency arrows within this bus */}
                    <svg className="absolute inset-0 pointer-events-none" style={{ width: weeks.length * CELL_W, height: rowCount * 36 + 16, overflow: 'visible', zIndex: 25 }}>
                      <defs>
                        <marker id={`gArrow-${bus.id}`} markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                          <path d="M0,0 L7,2.5 L0,5 Z" fill="#fbbf24" />
                        </marker>
                      </defs>
                      {busTasks.filter(t => t.depends_on).map(task => {
                        const depTask = busTasks.find(t => t.id === task.depends_on);
                        if (!depTask) return null;
                        const pos = getTaskPosition(task);
                        const depPos = getTaskPosition(depTask);
                        if (!pos || !depPos) return null;
                        let depRi = 0, taskRi = 0;
                        taskRows.forEach((r, rr) => r.forEach(t => { if(t.id===depTask.id) depRi=rr; if(t.id===task.id) taskRi=rr; }));
                        const x1 = (depPos.start + depPos.span) * CELL_W - 2;
                        const y1 = depRi * 36 + 8 + 14;
                        const x2 = pos.start * CELL_W + 2;
                        const y2 = taskRi * 36 + 8 + 14;
                        const dx = x2 - x1;
                        const cx1 = x1 + Math.max(15, dx * 0.35);
                        const cx2 = x2 - Math.max(15, dx * 0.35);
                        return (
                          <path key={`gdep-${task.id}`}
                            d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`}
                            fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.7"
                            markerEnd={`url(#gArrow-${bus.id})`} />
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* ── Postpone Modal ── */}
    {postponeModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={() => setPostponeModal(null)}>
        <div className="bg-[#1a1f2e] border border-white/[0.1] rounded-2xl shadow-2xl w-[460px] max-h-[80vh] overflow-hidden"
          onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
            <span className="text-lg">⏩</span>
            <div>
              <h3 className="text-white font-bold text-sm">Gorev Erteleme</h3>
              <p className="text-slate-500 text-[10px] mt-0.5">{postponeModal.bus.name}{postponeModal.task ? ` › ${postponeModal.task.name}` : ''}</p>
            </div>
            <button onClick={() => setPostponeModal(null)} className="ml-auto text-slate-500 hover:text-white text-lg transition-colors">×</button>
          </div>
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">Erteleme Suresi</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setPostponeWeeks(n)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
                    (postponeWeeks === n ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.1]')}>
                  {n} Hafta
                </button>
              ))}
              <input type="number" min={1} max={52} value={postponeWeeks}
                onChange={e => setPostponeWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-xs text-center" />
            </div>
          </div>
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">Erteleme Kapsami</label>
            <div className="space-y-1.5">
              <label className={'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ' +
                (postponeScope === 'project' ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]')}
                onClick={() => setPostponeScope('project')}>
                <input type="radio" checked={postponeScope === 'project'} onChange={() => setPostponeScope('project')} className="accent-blue-500" />
                <div>
                  <span className="text-[11px] font-semibold text-white">Tum Projeyi Ertele</span>
                  <p className="text-[9px] text-slate-500">"{postponeModal.bus.name}" altindaki tum gorev ve alt gorevleri erteler</p>
                </div>
              </label>
              {postponeModal.task && (
                <label className={'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ' +
                  (postponeScope === 'bar' ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]')}
                  onClick={() => setPostponeScope('bar')}>
                  <input type="radio" checked={postponeScope === 'bar'} onChange={() => setPostponeScope('bar')} className="accent-blue-500" />
                  <div>
                    <span className="text-[11px] font-semibold text-white">Bu Cizgiyi Ertele</span>
                    <p className="text-[9px] text-slate-500">"{postponeModal.task.name}" ve sonrasindaki tum gorevleri erteler</p>
                  </div>
                </label>
              )}
              <label className={'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ' +
                (postponeScope === 'single' ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]')}
                onClick={() => setPostponeScope('single')}>
                <input type="radio" checked={postponeScope === 'single'} onChange={() => setPostponeScope('single')} className="accent-blue-500" />
                <div>
                  <span className="text-[11px] font-semibold text-white">Secili Gorevleri Ertele</span>
                  <p className="text-[9px] text-slate-500">Asagidan ertelenecek gorevleri secin</p>
                </div>
              </label>
            </div>
          </div>
          {postponeScope === 'single' && (
            <div className="px-5 py-3 border-b border-white/[0.06] max-h-[200px] overflow-y-auto">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">
                Gorev Sec ({postponeSelected.length} secili)
              </label>
              <div className="space-y-1">
                {getPostponeItems().map(item => {
                  const isSub = !!item.parent_task_id;
                  const checked = postponeSelected.includes(item.id);
                  return (
                    <label key={`${isSub ? 's' : 't'}${item.id}`}
                      className={'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ' +
                        (checked ? 'bg-blue-600/10' : 'hover:bg-white/[0.03]')}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setPostponeSelected(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])}
                        className="accent-blue-500 shrink-0" />
                      <span className={'w-2 h-2 rounded-sm shrink-0 ' + (isSub ? 'rounded-full' : '')}
                        style={{ backgroundColor: item.color || '#3b82f6' }} />
                      <span className="text-[10px] text-slate-300 truncate">{item.name}</span>
                      <span className="text-[8px] text-slate-600 ml-auto shrink-0">W{item.start_week}-W{item.end_week}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-[9px] text-slate-600">
              {postponeScope === 'project' && `Tum proje ${postponeWeeks} hafta ertelenecek`}
              {postponeScope === 'bar' && `Secilenlerden sonraki tum gorevler ${postponeWeeks} hafta ertelenecek`}
              {postponeScope === 'single' && `${postponeSelected.length} oge ${postponeWeeks} hafta ertelenecek`}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPostponeModal(null)}
                className="px-4 py-1.5 rounded-lg text-[11px] text-slate-400 bg-white/[0.05] hover:bg-white/[0.1] transition-colors">Iptal</button>
              <button onClick={executePostpone}
                disabled={postponeScope === 'single' && postponeSelected.length === 0}
                className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg">Ertele</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  DETAIL VIEW — Excel-style grid with small colored boxes  */
/* ══════════════════════════════════════════════════════════ */
const DC = 50;   // detail cell width per week
const DL = 140;  // detail label column
const DR_TASK = 38; // row height for packed task bars
const DR_SUB = 30;  // row height for packed sub-task bars

/* Pack items into minimal non-overlapping rows */
function packRows(items, getPos) {
  const rows = [];
  items.forEach(item => {
    const pos = getPos(item);
    if (!pos) return;
    let placed = false;
    for (const row of rows) {
      if (row.every(([, p]) => pos.start >= p.start + p.span || pos.start + pos.span <= p.start)) {
        row.push([item, pos]);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([[item, pos]]);
  });
  return rows;
}

/* Slightly lighten/darken a hex color for sub-task variation */
function tintColor(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const t = amount > 0 ? 255 : 0, a = Math.abs(amount);
  return `rgb(${Math.round(r + (t - r) * a)},${Math.round(g + (t - g) * a)},${Math.round(b + (t - b) * a)})`;
}

function DetailCalendar({ buses, tasks, allSubTasks, weeks, monthGroups, quarterGroups, todayIdx, getTasksForBus, getTaskPosition, onAddSubTask, onEditSubTask, onDeleteSubTask, onAddTask, onPostpone }) {

  const [postponeModal, setPostponeModal] = useState(null); // { bus, task?, sub? }
  const [postponeWeeks, setPostponeWeeks] = useState(1);
  const [postponeScope, setPostponeScope] = useState('task'); // 'project' | 'bar' | 'single'
  const [postponeSelected, setPostponeSelected] = useState([]); // ids for 'single' scope

  // Dynamic cell width — fills available space like MasterOverview
  const detailRef = useRef(null);
  const [detailW, setDetailW] = useState(0);
  useEffect(() => {
    if (!detailRef.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setDetailW(w);
    });
    ro.observe(detailRef.current);
    return () => ro.disconnect();
  }, []);
  // Shadow outer DC constant with dynamic value
  const DC = detailW > 0 ? Math.max(8, Math.floor((detailW - DL) / weeks.length)) : 50;
  const isCompact = DC < 20;

  if (buses.length === 0) return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-16 text-center">
      <span className="text-5xl block mb-4">🔍</span>
      <h2 className="text-xl font-semibold text-white mb-2">Detay gorunumu icin otobus programi ekleyin</h2>
      <p className="text-slate-400 text-sm">Master takvimde otobus ve gorev ekleyerek baslayin</p>
    </div>
  );

  /* Build bus sections data */
  const busSections = buses.map(bus => {
    const busTasks = getTasksForBus(bus.id);
    const taskPacked = packRows(busTasks, getTaskPosition);
    const subSections = busTasks.map(task => {
      const subs = allSubTasks.filter(s => s.parent_task_id === task.id);
      const subPacked = packRows(subs, getTaskPosition);
      return { task, subs, subPacked };
    });
    const allBusSubs = busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id));
    const globalSubPacked = packRows(allBusSubs, getTaskPosition);
    return { bus, busTasks, taskPacked, subSections, globalSubPacked, allBusSubs };
  });

  /* Open postpone modal */
  const openPostpone = (bus, task, sub) => {
    setPostponeModal({ bus, task, sub });
    setPostponeWeeks(1);
    setPostponeScope(sub ? 'single' : task ? 'bar' : 'project');
    setPostponeSelected([]);
  };

  /* Execute postpone */
  const executePostpone = () => {
    if (!postponeModal) return;
    const { bus, task } = postponeModal;
    let items = [];

    if (postponeScope === 'project') {
      // All tasks + sub-tasks of this bus
      const busTasks = getTasksForBus(bus.id);
      items = [...busTasks, ...busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id))];
    } else if (postponeScope === 'bar' && task) {
      // The parent task + all its sub-tasks, PLUS any tasks/subs that start AFTER this task in the same bus
      const busTasks = getTasksForBus(bus.id);
      const taskPos = getTaskPosition(task);
      if (taskPos) {
        // This task and its subs
        items.push(task);
        items.push(...allSubTasks.filter(s => s.parent_task_id === task.id));
        // Also push all tasks (and their subs) that start at or after this task's start
        busTasks.forEach(t => {
          if (t.id === task.id) return;
          const pos = getTaskPosition(t);
          if (pos && pos.start >= taskPos.start) {
            items.push(t);
            items.push(...allSubTasks.filter(s => s.parent_task_id === t.id));
          }
        });
      }
    } else if (postponeScope === 'single') {
      // Only selected items
      const busTasks = getTasksForBus(bus.id);
      const allItems = [...busTasks, ...busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id))];
      items = allItems.filter(i => postponeSelected.includes(i.id));
    }

    if (items.length > 0) {
      onPostpone(items, postponeWeeks);
    }
    setPostponeModal(null);
  };

  /* Get items for single-select list */
  const getPostponeItems = () => {
    if (!postponeModal) return [];
    const { bus, task } = postponeModal;
    const busTasks = getTasksForBus(bus.id);
    if (task) {
      // Show sub-tasks of this task + the task itself
      return [task, ...allSubTasks.filter(s => s.parent_task_id === task.id)];
    }
    // Show all tasks + subs of bus
    return [...busTasks, ...busTasks.flatMap(t => allSubTasks.filter(s => s.parent_task_id === t.id))];
  };

  return (
    <div className="space-y-3">
      <div ref={detailRef} className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
        <div style={{ position: 'relative' }}>
          <div>

            {/* ── Month header ── */}
            <div className="flex border-b border-white/[0.06]" style={{ position: 'sticky', top: 0, zIndex: 20, background: '#0f1419' }}>
              <div style={{ width: DL, minWidth: DL }} className="shrink-0 px-3 border-r border-white/[0.08] flex items-center">
                <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">Otobüs Programı</span>
              </div>
              {monthGroups.map((g, i) => (
                <div key={i} style={{ width: g.span * DC, fontSize: isCompact ? '7px' : '10px' }}
                  className="text-center font-bold text-slate-400 uppercase tracking-wider py-1.5 border-l border-white/[0.06]">
                  {isCompact ? g.label.replace(/\d{4}/, '').trim().substring(0, 3) : g.label}
                </div>
              ))}
            </div>

            {/* ── Week header ── */}
            <div className="flex border-b border-white/[0.08]" style={{ position: 'sticky', top: 29, zIndex: 20, background: '#0f1419' }}>
              <div style={{ width: DL, minWidth: DL }} className="shrink-0 px-3 border-r border-white/[0.08] flex items-center">
                <span className="text-[7px] text-slate-600">Hafta →</span>
              </div>
              {weeks.map((w, i) => (
                <div key={i} style={{ width: DC, fontSize: isCompact ? '6px' : '9px' }}
                  className={'text-center py-1 border-l border-white/[0.06] font-bold font-mono ' +
                    (i === todayIdx ? 'bg-emerald-600/25 text-emerald-300' : 'text-slate-500')}>
                  {isCompact ? w.week : `W${w.week}`}
                </div>
              ))}
            </div>

            {/* ── Bus sections ── */}
            {busSections.map(({ bus, busTasks, taskPacked, subSections, globalSubPacked, allBusSubs }, busIdx) => {
              const subRowCount = Math.max(0, globalSubPacked.length);
              const taskDone = allBusSubs.filter(s => s.status === 'completed').length;
              const taskTotal = allBusSubs.length;
              const subParentMap = {};
              subSections.forEach(({ task, subs }) => subs.forEach(s => { subParentMap[s.id] = task; }));

              return (
                <div key={bus.id}>
                  {/* ── Bold bus separator ── */}
                  {busIdx > 0 && (
                    <div style={{ height: 3, background: `linear-gradient(to right, #3b82f6, #60a5fa 30%, #3b82f6 60%, transparent 95%)`, boxShadow: '0 0 8px rgba(59,130,246,0.3)' }} />
                  )}

                  {/* ── Bus title bar ── */}
                  <div className="flex border-b border-white/[0.06]" style={{ background: bus.color + '18' }}>
                    <div style={{ width: DL, minWidth: DL }}
                      className="shrink-0 px-3 py-1.5 border-r border-white/[0.08] flex items-center gap-2">
                      <span className={`rounded-full shrink-0 shadow ${isCompact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}`} style={{ backgroundColor: bus.color }} />
                      <span className={`font-extrabold text-white tracking-tight truncate ${isCompact ? 'text-[10px]' : 'text-[12px]'}`}>{bus.name}</span>
                      {taskTotal > 0 && (
                        <span className="text-[9px] text-slate-500 ml-auto shrink-0">{taskDone}/{taskTotal}</span>
                      )}
                      <button onClick={() => openPostpone(bus, null, null)}
                        className="text-[9px] text-blue-400/50 hover:text-blue-400 ml-1 shrink-0 transition-colors" title="Ertele">⏩</button>
                    </div>
                    <div className="flex flex-1 relative" style={{ height: 28 }}>
                      {weeks.map((_, i) => (
                        <div key={i} style={{ width: DC }} className={'border-l border-white/[0.04] ' + (i === todayIdx ? 'bg-emerald-500/10' : '')} />
                      ))}
                      {todayIdx >= 0 && (
                        <div className="absolute top-0 bottom-0 z-10" style={{ left: todayIdx * DC + DC / 2, width: 2, background: 'repeating-linear-gradient(to bottom, #22c55e 0 4px, transparent 4px 8px)' }} />
                      )}
                    </div>
                  </div>

                  {/* ── Parent task rows (packed) ── */}
                  {taskPacked.map((row, ri) => (
                    <div key={`tr${ri}`} className="flex border-b border-white/[0.04]">
                      <div style={{ width: DL, minWidth: DL, height: DR_TASK }}
                        className="shrink-0 px-3 border-r border-white/[0.08] flex items-center">
                        {ri === 0 && <span className={`text-slate-600 uppercase tracking-wider font-semibold ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>Ana Gorevler</span>}
                      </div>
                      <div className="relative flex-1" style={{ height: DR_TASK }}>
                        <div className="absolute inset-0 flex">
                          {weeks.map((_, i) => (
                            <div key={i} style={{ width: DC }}
                              className={'border-l border-white/[0.04] ' + (i === todayIdx ? 'bg-emerald-500/5' : '')} />
                          ))}
                        </div>
                        {todayIdx >= 0 && (
                          <div className="absolute top-0 bottom-0 z-10"
                            style={{ left: todayIdx * DC + DC / 2, width: 2, background: 'repeating-linear-gradient(to bottom, #22c55e 0 4px, transparent 4px 8px)' }} />
                        )}
                        {row.map(([task, pos]) => (
                          <div key={task.id}
                            className="absolute rounded-[3px] flex items-center justify-center overflow-hidden cursor-pointer shadow-sm hover:brightness-110 hover:shadow-md transition-all group"
                            style={{
                              left: pos.start * DC + 2,
                              width: pos.span * DC - 4,
                              top: 3,
                              height: DR_TASK - 6,
                              backgroundColor: task.color,
                            }}
                            title={`${task.name}\nW${task.start_week}/${task.start_year} → W${task.end_week}/${task.end_year}\nSag tikla: Ertele`}
                            onContextMenu={(e) => { e.preventDefault(); openPostpone(bus, task, null); }}>
                            <span className={`font-bold text-white text-center leading-tight px-1 uppercase tracking-wide ${isCompact ? 'text-[6px]' : 'text-[8px]'}`}
                              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                              {task.name}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); openPostpone(bus, task, null); }}
                              className="absolute top-0.5 right-0.5 text-[7px] text-white/0 group-hover:text-white/60 hover:!text-white transition-colors"
                              title="Ertele">⏩</button>
                          </div>
                        ))}
                        {/* Dependency arrows for parent tasks in detail view */}
                        <svg className="absolute inset-0 pointer-events-none" style={{ width: weeks.length * DC, height: DR_TASK, overflow: 'visible', zIndex: 25 }}>
                          <defs>
                            <marker id={`dArrow-${bus.id}-${ri}`} markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                              <path d="M0,0 L6,2 L0,4 Z" fill="#fbbf24" />
                            </marker>
                          </defs>
                          {row.filter(([task]) => task.depends_on).map(([task, pos]) => {
                            // Find dep in same row or any packed row
                            let depPos = null, depRi = ri;
                            taskPacked.forEach((r, rri) => r.forEach(([t, p]) => { if (t.id === task.depends_on) { depPos = p; depRi = rri; } }));
                            if (!depPos) return null;
                            const x1 = (depPos.start + depPos.span) * DC - 2;
                            const y1 = (depRi - ri) * DR_TASK + DR_TASK / 2;
                            const x2 = pos.start * DC + 2;
                            const y2 = DR_TASK / 2;
                            const dx = x2 - x1;
                            const cx1 = x1 + Math.max(12, dx * 0.35);
                            const cx2 = x2 - Math.max(12, dx * 0.35);
                            return (
                              <path key={`ddep-${task.id}`}
                                d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`}
                                fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.7"
                                markerEnd={`url(#dArrow-${bus.id}-${ri})`} />
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  ))}

                  {/* ── Sub-task rows ── */}
                  {allBusSubs.length > 0 && subRowCount > 0 && (
                    <>
                      {globalSubPacked.map((row, ri) => (
                        <div key={`sr${ri}`} className="flex border-b border-white/[0.04]">
                          <div style={{ width: DL, minWidth: DL, height: DR_SUB }}
                            className="shrink-0 px-3 border-r border-white/[0.08] flex items-center gap-1.5">
                            {ri === 0 && (
                              <>
                                <span className="text-[8px] text-slate-600 uppercase tracking-wider font-semibold">Alt Gorevler</span>
                                <button onClick={() => { const first = busTasks[0]; if(first) onAddSubTask(first.id); }}
                                  className="text-[8px] text-emerald-500/50 hover:text-emerald-400 ml-auto transition-colors">+</button>
                              </>
                            )}
                          </div>
                          <div className="relative flex-1" style={{ height: DR_SUB }}>
                            <div className="absolute inset-0 flex">
                              {weeks.map((_, i) => (
                                <div key={i} style={{ width: DC }}
                                  className={'border-l border-white/[0.03] ' + (i === todayIdx ? 'bg-emerald-500/5' : '')} />
                              ))}
                            </div>
                            {todayIdx >= 0 && (
                              <div className="absolute top-0 bottom-0 z-10"
                                style={{ left: todayIdx * DC + DC / 2, width: 2, background: 'repeating-linear-gradient(to bottom, #22c55e 0 4px, transparent 4px 8px)' }} />
                            )}
                            {row.map(([sub, pos]) => {
                              const parentTask = subParentMap[sub.id];
                              const baseColor = parentTask?.color || '#3b82f6';
                              const isDone = sub.status === 'completed';
                              const isBlocked = sub.status === 'blocked';
                              const boxBg = isDone ? tintColor(baseColor, 0.55) : isBlocked ? '#fca5a5' : tintColor(baseColor, 0.45);
                              const boxBorder = isDone ? tintColor(baseColor, 0.3) : isBlocked ? '#dc2626' : tintColor(baseColor, 0.2);
                              const textColor = isDone ? '#334155' : isBlocked ? '#7f1d1d' : '#0f172a';

                              return (
                                <div key={sub.id}
                                  className="absolute rounded-[3px] flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:brightness-95 hover:z-20 transition-all"
                                  style={{
                                    left: pos.start * DC + 1,
                                    width: pos.span * DC - 2,
                                    top: 2,
                                    height: DR_SUB - 4,
                                    backgroundColor: boxBg,
                                    border: `1.5px solid ${boxBorder}`,
                                  }}
                                  onClick={() => onEditSubTask(sub)}
                                  title={`${sub.name}\nDurum: ${STATUS_LABELS[sub.status] || sub.status}\nOncelik: ${PRIORITY_LABELS[sub.priority] || '-'}${sub.responsible ? '\nSorumlu: ' + sub.responsible : ''}${sub.notes ? '\n' + sub.notes : ''}\nW${sub.start_week}/${sub.start_year} → W${sub.end_week}/${sub.end_year}`}>
                                  <span className={`font-bold text-center leading-[1.15] px-0.5 truncate w-full ${isCompact ? 'text-[6px]' : 'text-[8px]'}`}
                                    style={{ color: textColor }}>
                                    {sub.name}
                                  </span>
                                  {isDone && <span className={isCompact ? 'text-[6px]' : 'text-[8px]'} style={{ color: textColor, opacity: 0.6 }}>✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Detail / status row */}
                      <div className="flex border-b border-white/[0.06]">
                        <div style={{ width: DL, minWidth: DL, height: 22 }}
                          className="shrink-0 px-3 border-r border-white/[0.08] flex items-center">
                          <span className="text-[7px] text-slate-700 uppercase tracking-wider">Detay</span>
                        </div>
                        <div className="relative flex-1" style={{ height: 22 }}>
                          <div className="absolute inset-0 flex">
                            {weeks.map((_, i) => (
                              <div key={i} style={{ width: DC }}
                                className={'border-l border-white/[0.02] ' + (i === todayIdx ? 'bg-emerald-500/5' : '')} />
                            ))}
                          </div>
                          {todayIdx >= 0 && (
                            <div className="absolute top-0 bottom-0 z-10"
                              style={{ left: todayIdx * DC + DC / 2, width: 2, background: 'repeating-linear-gradient(to bottom, #22c55e 0 4px, transparent 4px 8px)' }} />
                          )}
                          {allBusSubs.map(sub => {
                            const pos = getTaskPosition(sub);
                            if (!pos) return null;
                            return (
                              <div key={sub.id} className="absolute flex items-center justify-center overflow-hidden"
                                style={{ left: pos.start * DC, width: pos.span * DC, top: 1, height: 20 }}>
                                <span className="text-[7px] text-slate-500 truncate text-center font-medium px-0.5">
                                  {sub.responsible ? sub.responsible.split(' ')[0] : (STATUS_LABELS[sub.status] || '')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Empty state */}
                  {busTasks.length === 0 && (
                    <div className="flex border-b border-white/[0.06]">
                      <div style={{ width: DL, minWidth: DL }}
                        className="shrink-0 px-3 py-3 border-r border-white/[0.08]">
                        <button onClick={() => onAddTask(bus.id)}
                          className="text-[10px] text-slate-600 hover:text-emerald-400 italic transition-colors">
                          + Gorev ekle...
                        </button>
                      </div>
                      <div className="flex-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Postpone Modal ── */}
      {postponeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setPostponeModal(null)}>
          <div className="bg-[#1a1f2e] border border-white/[0.1] rounded-2xl shadow-2xl w-[460px] max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
              <span className="text-lg">⏩</span>
              <div>
                <h3 className="text-white font-bold text-sm">Gorev Erteleme</h3>
                <p className="text-slate-500 text-[10px] mt-0.5">{postponeModal.bus.name}{postponeModal.task ? ` › ${postponeModal.task.name}` : ''}</p>
              </div>
              <button onClick={() => setPostponeModal(null)} className="ml-auto text-slate-500 hover:text-white text-lg transition-colors">×</button>
            </div>

            {/* Week selector */}
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">Erteleme Suresi</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setPostponeWeeks(n)}
                    className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
                      (postponeWeeks === n ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.1]')}>
                    {n} Hafta
                  </button>
                ))}
                <input type="number" min={1} max={52} value={postponeWeeks}
                  onChange={e => setPostponeWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                  className="w-16 px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-xs text-center" />
              </div>
            </div>

            {/* Scope selector */}
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">Erteleme Kapsami</label>
              <div className="space-y-1.5">
                <label className={'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ' +
                  (postponeScope === 'project' ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]')}
                  onClick={() => setPostponeScope('project')}>
                  <input type="radio" checked={postponeScope === 'project'} onChange={() => setPostponeScope('project')}
                    className="accent-blue-500" />
                  <div>
                    <span className="text-[11px] font-semibold text-white">Tum Projeyi Ertele</span>
                    <p className="text-[9px] text-slate-500">"{postponeModal.bus.name}" altindaki tum gorev ve alt gorevleri erteler</p>
                  </div>
                </label>
                {postponeModal.task && (
                  <label className={'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ' +
                    (postponeScope === 'bar' ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]')}
                    onClick={() => setPostponeScope('bar')}>
                    <input type="radio" checked={postponeScope === 'bar'} onChange={() => setPostponeScope('bar')}
                      className="accent-blue-500" />
                    <div>
                      <span className="text-[11px] font-semibold text-white">Bu Cizgiyi Ertele</span>
                      <p className="text-[9px] text-slate-500">"{postponeModal.task.name}" ve sonrasindaki tum gorevleri erteler</p>
                    </div>
                  </label>
                )}
                <label className={'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ' +
                  (postponeScope === 'single' ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]')}
                  onClick={() => setPostponeScope('single')}>
                  <input type="radio" checked={postponeScope === 'single'} onChange={() => setPostponeScope('single')}
                    className="accent-blue-500" />
                  <div>
                    <span className="text-[11px] font-semibold text-white">Secili Gorevleri Ertele</span>
                    <p className="text-[9px] text-slate-500">Asagidan ertelenecek gorevleri secin</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Task picker for 'single' scope */}
            {postponeScope === 'single' && (
              <div className="px-5 py-3 border-b border-white/[0.06] max-h-[200px] overflow-y-auto">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">
                  Gorev Sec ({postponeSelected.length} secili)
                </label>
                <div className="space-y-1">
                  {getPostponeItems().map(item => {
                    const isSub = !!item.parent_task_id;
                    const checked = postponeSelected.includes(item.id);
                    return (
                      <label key={`${isSub ? 's' : 't'}${item.id}`}
                        className={'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ' +
                          (checked ? 'bg-blue-600/10' : 'hover:bg-white/[0.03]')}>
                        <input type="checkbox" checked={checked}
                          onChange={() => {
                            setPostponeSelected(prev =>
                              prev.includes(item.id)
                                ? prev.filter(x => x !== item.id)
                                : [...prev, item.id]
                            );
                          }}
                          className="accent-blue-500 shrink-0" />
                        <span className={'w-2 h-2 rounded-sm shrink-0 ' + (isSub ? 'rounded-full' : '')}
                          style={{ backgroundColor: item.color || '#3b82f6' }} />
                        <span className="text-[10px] text-slate-300 truncate">{item.name}</span>
                        <span className="text-[8px] text-slate-600 ml-auto shrink-0">
                          W{item.start_week}-W{item.end_week}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-[9px] text-slate-600">
                {postponeScope === 'project' && `${getTasksForBus(postponeModal.bus.id).length + allSubTasks.filter(s => getTasksForBus(postponeModal.bus.id).some(t => t.id === s.parent_task_id)).length} ogeyi ${postponeWeeks} hafta ertelenecek`}
                {postponeScope === 'bar' && `Secilenlerden sonraki tum gorevler ${postponeWeeks} hafta ertelenecek`}
                {postponeScope === 'single' && `${postponeSelected.length} oge ${postponeWeeks} hafta ertelenecek`}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPostponeModal(null)}
                  className="px-4 py-1.5 rounded-lg text-[11px] text-slate-400 bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
                  Iptal
                </button>
                <button onClick={executePostpone}
                  disabled={postponeScope === 'single' && postponeSelected.length === 0}
                  className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg">
                  Ertele
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Legend bar ── */}
      <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2">
        <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Gorevler:</span>
        {Array.from(new Set(tasks.map(t => t.name))).map(name => {
          const c = tasks.find(t => t.name === name)?.color || '#3b82f6';
          return (
            <div key={name} className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-[2px]" style={{ backgroundColor: c }} />
              <span className="text-[9px] text-slate-400">{name}</span>
            </div>
          );
        })}
        <span className="text-slate-700">|</span>
        <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Durum:</span>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[k] }} />
            <span className="text-[10px] text-slate-400">{v}</span>
          </div>
        ))}
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1">
          <div style={{ width: 2, height: 12, background: 'repeating-linear-gradient(to bottom, #22c55e 0 3px, transparent 3px 6px)' }} />
          <span className="text-[10px] text-emerald-400">Bugun</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  FOLLOW-UP TAB                                            */
/* ══════════════════════════════════════════════════════════ */
function FollowUpTab({ buses }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState({ open: false });

  const load = async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? null : filter;
      const res = await getFollowUps(null, status);
      setItems(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const handleSave = async (data, id) => {
    try { if (id) await updateFollowUp(id, data); else await createFollowUp(data); setModal({open:false}); load(); }
    catch (e) { alert('Kayit basarisiz'); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Silmek istediginize emin misiniz?')) return;
    try { await deleteFollowUp(id); load(); } catch (e) { alert('Silinemedi'); }
  };

  const openCount = items.filter(i => i.status === 'open').length;
  const closedCount = items.filter(i => i.status === 'closed').length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Toplam', value: items.length, color:'#3b82f6' },
          { label:'Acik', value: openCount, color:'#f59e0b' },
          { label:'Kapali', value: closedCount, color:'#22c55e' },
        ].map(k => (
          <div key={k.label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:k.color+'22'}}><span className="text-lg font-bold" style={{color:k.color}}>{k.value}</span></div>
            <span className="text-sm text-slate-400">{k.label}</span>
          </div>
        ))}
      </div>

      {/* Filter + Add */}
      <div className="flex items-center gap-3">
        {['all','open','closed','info'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter===f?'bg-blue-600 text-white':'text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}>
            {f==='all'?'Tumu':f==='open'?'Acik':f==='closed'?'Kapali':'Bilgi'}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setModal({open:true})} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all">+ Yeni Takip</button>
      </div>

      {/* Table */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['#','Oncelik','Arac Grubu','Kaynak','Durum','Konu','Sorumlu','Hedef Tarih',''].map(h => (
                <th key={h} className="px-4 py-3 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-500 text-sm">Yukleniyor...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-500 text-sm">Kayit bulunamadi</td></tr>
            ) : items.map((item, idx) => (
              <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-xs text-slate-400">{idx+1}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{backgroundColor:(PRIORITY_COLORS[item.priority]||'#666')+'22', color:PRIORITY_COLORS[item.priority]}}>{PRIORITY_LABELS[item.priority]||item.priority}</span></td>
                <td className="px-4 py-3 text-xs text-white">{item.vehicle_group}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{item.source}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status==='open'?'bg-amber-500/20 text-amber-400':item.status==='closed'?'bg-emerald-500/20 text-emerald-400':'bg-blue-500/20 text-blue-400'}`}>{item.status==='open'?'Acik':item.status==='closed'?'Kapali':'Bilgi'}</span></td>
                <td className="px-4 py-3 text-xs text-white max-w-[300px] truncate">{item.subject}</td>
                <td className="px-4 py-3 text-xs text-slate-300">{item.responsible}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{item.target_date ? new Date(item.target_date).toLocaleDateString('tr-TR') : '-'}</td>
                <td className="px-4 py-3 flex gap-1">
                  <button onClick={() => setModal({open:true, item})} className="text-[10px] text-blue-400 hover:text-blue-300">duzenle</button>
                  <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-400 hover:text-red-300">sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && <FollowUpModal item={modal.item} buses={buses} onClose={() => setModal({open:false})} onSave={handleSave} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  COST TAB                                                 */
/* ══════════════════════════════════════════════════════════ */
function CostTab({ buses }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false });

  const load = async () => {
    setLoading(true);
    try {
      const [res, sum] = await Promise.all([getCosts(), getCostSummary()]);
      setItems(res.data); setSummary(sum.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (data, id) => {
    try { if (id) await updateCost(id, data); else await createCost(data); setModal({open:false}); load(); }
    catch (e) { alert('Kayit basarisiz'); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Silmek istediginize emin misiniz?')) return;
    try { await deleteCost(id); load(); } catch (e) { alert('Silinemedi'); }
  };

  const fmt = (v) => v?.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0';

  return (
    <div className="space-y-4">
      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Toplam EUR</p>
            <p className="text-xl font-bold text-white">€{fmt(summary.total_eur)}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Toplam TRY</p>
            <p className="text-xl font-bold text-white">₺{fmt(summary.total_try)}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Test Kalemi</p>
            <p className="text-xl font-bold text-white">{summary.total_items}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Faz Dagilimi</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(summary.by_phase||[]).map(p => (
                <span key={p.phase} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">{p.phase}: €{fmt(p.total_eur)}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={() => setModal({open:true})} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all">+ Yeni Maliyet</button>
      </div>

      {/* Table */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Test Adi','Faz','Adet','Birim EUR','Birim TRY','Toplam EUR','Toplam TRY','Aciklama',''].map(h => (
                <th key={h} className="px-4 py-3 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-500 text-sm">Yukleniyor...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-500 text-sm">Maliyet kalemi bulunamadi</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-xs text-white font-medium">{item.test_name}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">{item.phase || '-'}</span></td>
                <td className="px-4 py-3 text-xs text-slate-300">{item.quantity}</td>
                <td className="px-4 py-3 text-xs text-slate-300">€{fmt(item.cost_eur)}</td>
                <td className="px-4 py-3 text-xs text-slate-300">₺{fmt(item.cost_try)}</td>
                <td className="px-4 py-3 text-xs text-emerald-400 font-semibold">€{fmt(item.cost_eur * item.quantity)}</td>
                <td className="px-4 py-3 text-xs text-emerald-400 font-semibold">₺{fmt(item.cost_try * item.quantity)}</td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">{item.description || '-'}</td>
                <td className="px-4 py-3 flex gap-1">
                  <button onClick={() => setModal({open:true, item})} className="text-[10px] text-blue-400 hover:text-blue-300">duzenle</button>
                  <button onClick={() => handleDelete(item.id)} className="text-[10px] text-red-400 hover:text-red-300">sil</button>
                </td>
              </tr>
            ))}
            {items.length > 0 && (
              <tr className="bg-white/[0.04] font-semibold">
                <td className="px-4 py-3 text-xs text-white" colSpan={5}>TOPLAM</td>
                <td className="px-4 py-3 text-xs text-emerald-400">€{fmt(items.reduce((s,i) => s + i.cost_eur*i.quantity, 0))}</td>
                <td className="px-4 py-3 text-xs text-emerald-400">₺{fmt(items.reduce((s,i) => s + i.cost_try*i.quantity, 0))}</td>
                <td colSpan={2}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.open && <CostModal item={modal.item} buses={buses} onClose={() => setModal({open:false})} onSave={handleSave} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MODALS                                                   */
/* ══════════════════════════════════════════════════════════ */
const Overlay = ({ children, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-[#0c1222] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

/* ── Bus Modal ── */
function BusModal({ bus, onClose, onSave }) {
  const [name, setName] = useState(bus?.name || '');
  const [color, setColor] = useState(bus?.color || '#f97316');
  const [sortOrder, setSortOrder] = useState(bus?.sort_order || 0);
  return (
    <Overlay onClose={onClose}>
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">{bus ? '🚌 Otobus Duzenle' : '🚌 Yeni Otobus Programi'}</h3>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Program Adi</label><input value={name} onChange={e => setName(e.target.value)} placeholder="orn: MAR/AP-1" className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50 transition-colors" /></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Renk</label><div className="flex flex-wrap gap-2">{PRESET_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={'w-7 h-7 rounded-lg transition-all '+(color===c?'ring-2 ring-white scale-110':'hover:scale-105')} style={{backgroundColor:c}} />)}</div></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Sira</label><input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-20 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50 transition-colors" /></div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/[0.06] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-all">Iptal</button>
          <button onClick={() => name.trim() && onSave({name:name.trim(),color,sort_order:sortOrder},bus?.id)} disabled={!name.trim()} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all disabled:opacity-40">{bus ? 'Guncelle' : 'Olustur'}</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Task Modal ── */
function TaskModal({ task, busId, buses, allTasks, onClose, onSave }) {
  const current = getCurrentWeek();
  const [data, setData] = useState({
    bus_id: task?.bus_id || busId || buses[0]?.id || 0,
    name: task?.name || '', category: task?.category || '',
    start_year: task?.start_year || current.year, start_week: task?.start_week || current.week,
    end_year: task?.end_year || current.year, end_week: task?.end_week || Math.min(52, current.week + 4),
    color: task?.color || '#3b82f6', depends_on: task?.depends_on || null, notes: task?.notes || '',
  });
  const [previewWarnings, setPreviewWarnings] = useState([]);
  const [checking, setChecking] = useState(false);
  const set = (f, v) => setData(p => ({...p, [f]: v}));
  const handleNameChange = (name) => {
    const upper = name.toUpperCase();
    setData(prev => ({...prev, name, ...(TASK_COLORS[upper]?{color:TASK_COLORS[upper]}:{}), ...(!prev.category?{category:upper}:{})}));
  };
  const doCheck = async () => {
    if (!data.category || !data.bus_id) return;
    setChecking(true);
    try { const res = await checkBottleneck(data, task?.id); setPreviewWarnings(res.data); } catch {}
    setChecking(false);
  };
  const depTasks = allTasks.filter(t => t.id !== task?.id);

  return (
    <Overlay onClose={onClose}>
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">{task ? '✏️ Gorev Duzenle' : '➕ Yeni Gorev'}</h3>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Otobus Programi</label>
          <select value={data.bus_id} onChange={e => set('bus_id',Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-[#1a2236] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50">{buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Gorev Adi</label>
          <input value={data.name} onChange={e => handleNameChange(e.target.value)} placeholder="orn: PRODUCTION, RLD/FT" className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" />
          <div className="flex flex-wrap gap-1.5 mt-2">{Object.keys(TASK_COLORS).filter(k=>k!=='DEFAULT').map(n => <button key={n} onClick={() => setData(p=>({...p,name:n,category:n,color:TASK_COLORS[n]}))} className="px-2 py-0.5 rounded text-[10px] font-medium text-white/80 hover:text-white transition-all hover:scale-105" style={{backgroundColor:TASK_COLORS[n]+'40',borderColor:TASK_COLORS[n],borderWidth:1}}>{n}</button>)}</div></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Kategori <span className="text-slate-600">(bottleneck icin)</span></label>
          <input value={data.category} onChange={e => set('category',e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Baslangic</label><div className="flex gap-2"><input type="number" value={data.start_year} onChange={e => set('start_year',Number(e.target.value))} className="w-20 px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /><div className="flex items-center gap-1"><span className="text-slate-500 text-xs">W</span><input type="number" min={1} max={52} value={data.start_week} onChange={e => set('start_week',Number(e.target.value))} className="w-16 px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /></div></div></div>
          <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Bitis</label><div className="flex gap-2"><input type="number" value={data.end_year} onChange={e => set('end_year',Number(e.target.value))} className="w-20 px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /><div className="flex items-center gap-1"><span className="text-slate-500 text-xs">W</span><input type="number" min={1} max={52} value={data.end_week} onChange={e => set('end_week',Number(e.target.value))} className="w-16 px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /></div></div></div>
        </div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Renk</label><div className="flex flex-wrap gap-2">{PRESET_COLORS.map(c => <button key={c} onClick={() => set('color',c)} className={'w-6 h-6 rounded-lg transition-all '+(data.color===c?'ring-2 ring-white scale-110':'hover:scale-105')} style={{backgroundColor:c}} />)}</div></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Bagimlilik <span className="text-slate-600">(opsiyonel)</span></label>
          <select value={data.depends_on||''} onChange={e => set('depends_on',e.target.value?Number(e.target.value):null)} className="w-full px-3 py-2 rounded-lg bg-[#1a2236] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50">
            <option value="">Bagimlilik yok</option>
            {depTasks.map(t => { const bn=buses.find(b=>b.id===t.bus_id)?.name||''; return <option key={t.id} value={t.id}>{bn} — {t.name} (W{t.start_week}-W{t.end_week})</option>; })}
          </select></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Notlar</label>
          <textarea value={data.notes} onChange={e => set('notes',e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50 resize-none" /></div>
        <button type="button" onClick={doCheck} disabled={checking} className="w-full py-2 rounded-lg bg-yellow-600/20 border border-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-600/30 transition-all flex items-center justify-center gap-2">{checking?'⏳ Kontrol ediliyor...':'⚠️ Bottleneck Kontrol Et'}</button>
        {previewWarnings.length > 0 && <div className="space-y-2">{previewWarnings.map((w,i) => <div key={i} className="bg-yellow-500/[0.08] border border-yellow-500/20 rounded-lg p-2.5 text-xs"><span className="text-yellow-400 font-medium">⚠️ {w.bus_name} — {w.task_name}</span><span className="text-yellow-400/60 block mt-0.5">Cakisma: {w.overlap_weeks.join(', ')}</span></div>)}</div>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/[0.06] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-all">Iptal</button>
          <button onClick={() => { if(!data.name.trim()||!data.bus_id)return; onSave(data,task?.id); }} disabled={!data.name.trim()||!data.bus_id} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-40">{task?'Guncelle':'Olustur'}</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── SubTask Modal ── */
function SubTaskModal({ subtask, parentTaskId, onClose, onSave }) {
  const current = getCurrentWeek();
  const [name, setName] = useState(subtask?.name || '');
  const [category, setCategory] = useState(subtask?.category || '');
  const [sy, setSy] = useState(subtask?.start_year || current.year);
  const [sw, setSw] = useState(subtask?.start_week || current.week);
  const [ey, setEy] = useState(subtask?.end_year || current.year);
  const [ew, setEw] = useState(subtask?.end_week || Math.min(52, current.week + 2));
  const [color, setColor] = useState(subtask?.color || '#60a5fa');
  const [status, setStatus] = useState(subtask?.status || 'planned');
  const [responsible, setResponsible] = useState(subtask?.responsible || '');
  const [notes, setNotes] = useState(subtask?.notes || '');

  return (
    <Overlay onClose={onClose}>
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">{subtask ? '✏️ Alt Gorev Duzenle' : '➕ Yeni Alt Gorev'}</h3>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Alt Gorev Adi</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Orn: Vehicle Check" className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Kategori</label>
          <input value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        <div className="grid grid-cols-4 gap-3">
          <div><label className="text-xs text-slate-400 font-medium block mb-1">Bas.Yil</label><input type="number" value={sy} onChange={e => setSy(Number(e.target.value))} className="w-full px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /></div>
          <div><label className="text-xs text-slate-400 font-medium block mb-1">Bas.Hft</label><input type="number" min={1} max={52} value={sw} onChange={e => setSw(Number(e.target.value))} className="w-full px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /></div>
          <div><label className="text-xs text-slate-400 font-medium block mb-1">Bit.Yil</label><input type="number" value={ey} onChange={e => setEy(Number(e.target.value))} className="w-full px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /></div>
          <div><label className="text-xs text-slate-400 font-medium block mb-1">Bit.Hft</label><input type="number" min={1} max={52} value={ew} onChange={e => setEw(Number(e.target.value))} className="w-full px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /></div>
        </div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Durum</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#1a2236] border border-white/[0.08] text-white text-sm outline-none">
            <option value="planned">Planli</option><option value="in_progress">Devam Ediyor</option>
            <option value="completed">Tamamlandi</option><option value="blocked">Engellendi</option>
          </select></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Sorumlu</label>
          <input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Isim Soyisim" className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Renk</label><div className="flex flex-wrap gap-2">{PRESET_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={'w-6 h-6 rounded-lg transition-all '+(color===c?'ring-2 ring-white scale-110':'hover:scale-105')} style={{backgroundColor:c}} />)}</div></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Notlar</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50 resize-none" /></div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/[0.06] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-all">Iptal</button>
          <button onClick={() => name.trim() && onSave({parent_task_id:parentTaskId, name:name.trim(), category, start_year:sy, start_week:sw, end_year:ey, end_week:ew, color, status, responsible, notes}, subtask?.id)} disabled={!name.trim()} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all disabled:opacity-40">Kaydet</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── FollowUp Modal ── */
function FollowUpModal({ item, buses, onClose, onSave }) {
  const [priority, setPriority] = useState(item?.priority || 1);
  const [vehicleGroup, setVehicleGroup] = useState(item?.vehicle_group || '');
  const [source, setSource] = useState(item?.source || '');
  const [status, setStatus] = useState(item?.status || 'open');
  const [subject, setSubject] = useState(item?.subject || '');
  const [actions, setActions] = useState(item?.actions || '');
  const [team, setTeam] = useState(item?.team || '');
  const [responsible, setResponsible] = useState(item?.responsible || '');
  const [targetDate, setTargetDate] = useState(item?.target_date?.split('T')[0] || '');

  return (
    <Overlay onClose={onClose}>
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">{item ? '📋 Takip Duzenle' : '📋 Yeni Takip'}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Oncelik</label>
            <select value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-[#1a2236] border border-white/[0.08] text-white text-sm outline-none">
              <option value={1}>1-Kritik</option><option value={2}>2-Yuksek</option><option value={3}>3-Orta</option>
            </select></div>
          <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Durum</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#1a2236] border border-white/[0.08] text-white text-sm outline-none">
              <option value="open">Acik</option><option value="closed">Kapali</option><option value="info">Bilgi</option>
            </select></div>
        </div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Arac Grubu</label>
          <input value={vehicleGroup} onChange={e => setVehicleGroup(e.target.value)} placeholder="Orn: TS35 & TS45" className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Kaynak</label>
          <input value={source} onChange={e => setSource(e.target.value)} placeholder="Orn: Takip Toplantilari" className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Konu</label>
          <textarea value={subject} onChange={e => setSubject(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50 resize-none" /></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Aksiyonlar</label>
          <textarea value={actions} onChange={e => setActions(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50 resize-none" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Ekip</label>
            <input value={team} onChange={e => setTeam(e.target.value)} placeholder="Orn: Ar&Ge Tasarim" className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
          <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Sorumlu</label>
            <input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Isim Soyisim" className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        </div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Hedef Tarih</label>
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/[0.06] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-all">Iptal</button>
          <button onClick={() => subject.trim() && onSave({priority,vehicle_group:vehicleGroup,source,status,subject,actions,team,responsible,target_date:targetDate||null}, item?.id)} disabled={!subject.trim()} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all disabled:opacity-40">Kaydet</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Cost Modal ── */
function CostModal({ item, buses, onClose, onSave }) {
  const [testName, setTestName] = useState(item?.test_name || '');
  const [phase, setPhase] = useState(item?.phase || '');
  const [costEur, setCostEur] = useState(item?.cost_eur || 0);
  const [costTry, setCostTry] = useState(item?.cost_try || 0);
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [description, setDescription] = useState(item?.description || '');

  return (
    <Overlay onClose={onClose}>
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">{item ? '💰 Maliyet Duzenle' : '💰 Yeni Maliyet'}</h3>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Test Adi</label>
          <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="Orn: Durability Test" className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Faz</label>
          <select value={phase} onChange={e => setPhase(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#1a2236] border border-white/[0.08] text-white text-sm outline-none">
            <option value="">Sec...</option><option value="ALPHA">ALPHA</option><option value="BETA1">BETA 1</option>
            <option value="BETA2">BETA 2</option><option value="BENCH">BENCH</option><option value="PILOT">PILOT</option>
          </select></div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-xs text-slate-400 font-medium block mb-1">Birim EUR</label><input type="number" min={0} value={costEur} onChange={e => setCostEur(Number(e.target.value))} className="w-full px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /></div>
          <div><label className="text-xs text-slate-400 font-medium block mb-1">Birim TRY</label><input type="number" min={0} value={costTry} onChange={e => setCostTry(Number(e.target.value))} className="w-full px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /></div>
          <div><label className="text-xs text-slate-400 font-medium block mb-1">Adet</label><input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full px-2 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none" /></div>
        </div>
        <div className="bg-white/[0.04] rounded-lg p-3 grid grid-cols-2 gap-2">
          <div><span className="text-[10px] text-slate-500 block">Toplam EUR</span><p className="text-sm font-bold text-emerald-400">€{(costEur * quantity).toLocaleString('tr-TR')}</p></div>
          <div><span className="text-[10px] text-slate-500 block">Toplam TRY</span><p className="text-sm font-bold text-emerald-400">₺{(costTry * quantity).toLocaleString('tr-TR')}</p></div>
        </div>
        <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Aciklama</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Dis hizmet / dahili vs." className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none focus:border-blue-500/50" /></div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/[0.06] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-all">Iptal</button>
          <button onClick={() => testName.trim() && onSave({test_name:testName,phase,cost_eur:costEur,cost_try:costTry,quantity,description}, item?.id)} disabled={!testName.trim()} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all disabled:opacity-40">Kaydet</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ───────────── AuditTab ───────────── */
function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const PAGE_SIZE = 30;

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs(PAGE_SIZE, page * PAGE_SIZE);
      const arr = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setLogs(arr);
      setTotal(res.data?.total ?? arr.length);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const actionLabels = { create: 'Oluşturma', update: 'Güncelleme', delete: 'Silme', postpone: 'Erteleme' };
  const actionColors = { create: 'bg-emerald-500/20 text-emerald-400', update: 'bg-blue-500/20 text-blue-400', delete: 'bg-red-500/20 text-red-400', postpone: 'bg-amber-500/20 text-amber-400' };
  const entityLabels = { task: 'Görev', subtask: 'Alt Görev', bus: 'Otobüs', followup: 'Takip', cost: 'Maliyet' };

  const filtered = logs.filter(l => {
    if (filterAction && l.action !== filterAction) return false;
    if (filterEntity && l.entity_type !== filterEntity) return false;
    return true;
  });

  const fmtDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('tr-TR') + ' ' + dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderChanges = (old_values, new_values) => {
    if (!old_values && !new_values) return null;
    const ov = typeof old_values === 'string' ? JSON.parse(old_values) : (old_values || {});
    const nv = typeof new_values === 'string' ? JSON.parse(new_values) : (new_values || {});
    const keys = [...new Set([...Object.keys(ov), ...Object.keys(nv)])];
    if (!keys.length) return null;
    return (
      <div className="mt-1 space-y-0.5">
        {keys.map(k => (
          <div key={k} className="text-[11px] flex gap-1 items-center">
            <span className="text-slate-500 font-medium min-w-[80px]">{k}:</span>
            {ov[k] !== undefined && <span className="text-red-400/70 line-through">{String(ov[k])}</span>}
            {ov[k] !== undefined && nv[k] !== undefined && <span className="text-slate-600">→</span>}
            {nv[k] !== undefined && <span className="text-emerald-400/80">{String(nv[k])}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-400 font-medium">Filtrele:</span>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs outline-none focus:border-blue-500/50">
          <option value="">Tüm İşlemler</option>
          {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs outline-none focus:border-blue-500/50">
          <option value="">Tüm Türler</option>
          {Object.entries(entityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={load} className="ml-auto px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-300 text-xs hover:bg-white/[0.1] transition-all">
          🔄 Yenile
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">Henüz değişiklik kaydı yok.</div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/[0.04] text-slate-400 text-left">
                <th className="px-3 py-2.5 font-medium">Tarih</th>
                <th className="px-3 py-2.5 font-medium">Kullanıcı</th>
                <th className="px-3 py-2.5 font-medium">İşlem</th>
                <th className="px-3 py-2.5 font-medium">Tür</th>
                <th className="px-3 py-2.5 font-medium">Öğe</th>
                <th className="px-3 py-2.5 font-medium">Detay</th>
                <th className="px-3 py-2.5 font-medium">Değişiklikler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.id || i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                  <td className="px-3 py-2 text-white font-medium">{l.user_name || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${actionColors[l.action] || 'bg-slate-500/20 text-slate-400'}`}>
                      {actionLabels[l.action] || l.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{entityLabels[l.entity_type] || l.entity_type}</td>
                  <td className="px-3 py-2 text-white">{l.entity_name || '-'}</td>
                  <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate" title={l.details}>{l.details || '-'}</td>
                  <td className="px-3 py-2">{renderChanges(l.old_values, l.new_values)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-300 text-xs hover:bg-white/[0.1] transition-all disabled:opacity-30">
            ‹ Önceki
          </button>
          <span className="text-xs text-slate-500">Sayfa {page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-300 text-xs hover:bg-white/[0.1] transition-all disabled:opacity-30">
            Sonraki ›
          </button>
        </div>
      )}
    </div>
  );
}
