import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const API = '/api/v1/auth';

export default function AdminPanel() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);

  // Form state
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role_id: 1 });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        fetch(`${API}/users`, { headers }).then(r => r.json()),
        fetch(`${API}/roles`, { headers }).then(r => r.json()),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setRoles(Array.isArray(r) ? r : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/users`, { method: 'POST', headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      flash('Kullanıcı oluşturuldu');
      setShowCreate(false);
      setForm({ username: '', email: '', full_name: '', password: '', role_id: 1 });
      loadData();
    } catch (e) { flash(e.message, 'error'); }
  };

  const handleUpdate = async (userId, updates) => {
    try {
      const res = await fetch(`${API}/users/${userId}`, { method: 'PUT', headers, body: JSON.stringify(updates) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      flash('Kullanıcı güncellendi');
      setEditId(null);
      loadData();
    } catch (e) { flash(e.message, 'error'); }
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`"${username}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`${API}/users/${userId}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      flash('Kullanıcı silindi');
      loadData();
    } catch (e) { flash(e.message, 'error'); }
  };

  const handleResetPw = async (userId, username) => {
    if (!confirm(`"${username}" şifresi "temsa2026" olarak sıfırlanacak. Devam?`)) return;
    try {
      const res = await fetch(`${API}/users/${userId}/reset-password`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      flash('Şifre sıfırlandı: temsa2026');
    } catch (e) { flash(e.message, 'error'); }
  };

  const roleColor = (name) => {
    const map = { admin: '#E30613', manager: '#3b82f6', analyst: '#10b981', viewer: '#8b949e' };
    return map[name] || '#8b949e';
  };

  const roleName = (name) => {
    const map = { admin: 'Yönetici', manager: 'Müdür', analyst: 'Analist', viewer: 'İzleyici' };
    return map[name] || name;
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 text-red-500/40 mb-4">
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h2 className="text-lg font-bold text-slate-200">Erişim Engellendi</h2>
        <p className="text-sm text-slate-500 mt-2">Bu sayfayı görüntülemek için yönetici yetkisi gereklidir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Yönetim Paneli</h1>
          <p className="text-sm text-slate-500 mt-1">Kullanıcı ve rol yönetimi</p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditId(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E30613] text-white text-sm font-semibold hover:bg-[#c00510] transition-all"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
          Yeni Kullanıcı
        </button>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
          msg.type === 'error' ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20' : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
        }`}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
            {msg.type === 'error' ? (
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
            ) : (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
            )}
          </svg>
          {msg.text}
        </div>
      )}

      {/* Create user form */}
      {showCreate && (
        <div className="admin-card">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Yeni Kullanıcı Oluştur</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kullanıcı Adı</label>
              <input type="text" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="admin-input" placeholder="kullanici_adi" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">E-posta</label>
              <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="admin-input" placeholder="email@temsa.com" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Ad Soyad</label>
              <input type="text" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="admin-input" placeholder="Ad Soyad" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Şifre</label>
              <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="admin-input" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rol</label>
              <select value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: parseInt(e.target.value) }))} className="admin-input">
                {roles.map(r => <option key={r.id} value={r.id}>{roleName(r.name)} — {r.description}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition">Oluştur</button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition">İptal</button>
            </div>
          </form>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Kullanıcı', value: users.length, color: '#3b82f6' },
          { label: 'Aktif', value: users.filter(u => u.is_active).length, color: '#10b981' },
          { label: 'Devre Dışı', value: users.filter(u => !u.is_active).length, color: '#ef4444' },
          { label: 'Roller', value: roles.length, color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="admin-stat" style={{ '--as-c': s.color }}>
            <div className="text-2xl font-bold text-slate-100">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="admin-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Kullanıcılar</h3>
          <span className="text-xs text-slate-500">{users.length} kayıt</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Son Giriş</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: roleColor(u.role_name) }}>
                          {(u.full_name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">{u.full_name}</div>
                          <div className="text-xs text-slate-500">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-slate-400">{u.email}</td>
                    <td>
                      {editId === u.id ? (
                        <select
                          defaultValue={u.role_id}
                          onChange={e => handleUpdate(u.id, { role_id: parseInt(e.target.value) })}
                          className="admin-input !py-1 !text-xs"
                        >
                          {roles.map(r => <option key={r.id} value={r.id}>{roleName(r.name)}</option>)}
                        </select>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${roleColor(u.role_name)}15`, color: roleColor(u.role_name), border: `1px solid ${roleColor(u.role_name)}30` }}>
                          {roleName(u.role_name)}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleUpdate(u.id, { is_active: !u.is_active })}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                          u.is_active ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                        }`}
                      >
                        {u.is_active ? 'Aktif' : 'Devre Dışı'}
                      </button>
                    </td>
                    <td className="text-xs text-slate-500">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditId(editId === u.id ? null : u.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition"
                          title="Rol düzenle"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                        </button>
                        <button
                          onClick={() => handleResetPw(u.id, u.username)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                          title="Şifre sıfırla"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" /></svg>
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(u.id, u.username)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Kullanıcı sil"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roles section */}
      <div className="admin-card">
        <div className="px-5 py-4 border-b border-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-200">Roller & İzinler</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5">
          {roles.map(r => (
            <div key={r.id} className="p-4 rounded-xl bg-slate-800/50 ring-1 ring-slate-700/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: roleColor(r.name) }}>
                  {roleName(r.name).charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">{roleName(r.name)}</div>
                  <div className="text-xs text-slate-500">{r.description}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(r.permissions || []).map((p, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-400">
                    {p === '*' ? 'Tüm İzinler' : p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
