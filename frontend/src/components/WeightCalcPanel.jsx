import { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { useChartTheme, useTheme } from './ThemeContext';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ── Lucide-style inline SVG icons ──
const Icon = ({ d, size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{typeof d === 'string' ? <path d={d} /> : d}</svg>
);
const BusIcon = (p) => <Icon {...p} d={<><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></>} />;
const UsersIcon = (p) => <Icon {...p} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />;
const WeightIcon = (p) => <Icon {...p} d="M12 3a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1ZM5.6 5.6a1 1 0 0 1 1.4 0l1 1a1 1 0 1 1-1.4 1.4l-1-1a1 1 0 0 1 0-1.4ZM20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />;
const SettingsIcon = (p) => <Icon {...p} d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />;
const PlusIcon = (p) => <Icon {...p} d="M5 12h14M12 5v14" />;
const TrashIcon = (p) => <Icon {...p} d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />;
const AlertIcon = (p) => <Icon {...p} d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01" />;
const CheckIcon = (p) => <Icon {...p} d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />;
const MaximizeIcon = (p) => <Icon {...p} d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />;
const FileSheetIcon = (p) => <Icon {...p} d={<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></>} />;
const LayoutIcon = (p) => <Icon {...p} d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM3 9h18M9 21V9" />;
const PackageIcon = (p) => <Icon {...p} d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />;
const CpuIcon = (p) => <Icon {...p} d={<><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></>} />;
const LayersIcon = (p) => <Icon {...p} d={<><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></>} />;
const BoxIcon = (p) => <Icon {...p} d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7l8.7 5 8.7-5M12 22V12" />;
const BarChartIcon = (p) => <Icon {...p} d={<><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></>} />;
const ArrowLeftIcon = (p) => <Icon {...p} d="m12 19-7-7 7-7M19 12H5" />;
const InfoIcon = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>} />;

const WEIGHT_LIBRARY = [
  { id: 'l1', name: 'Klima Ünitesi (Ön)', weight: 180, category: 'Tavan' },
  { id: 'l2', name: 'Klima Ünitesi (Arka)', weight: 150, category: 'Tavan' },
  { id: 'l3', name: 'CNG Tüpü (Büyük)', weight: 120, category: 'Tavan' },
  { id: 'l4', name: 'CNG Tüpü (Küçük)', weight: 80, category: 'Tavan' },
  { id: 'l5', name: 'Elektrikli Motor', weight: 450, category: 'Powertrain' },
  { id: 'l6', name: 'Batarya Paketi (300kg)', weight: 300, category: 'Powertrain' },
  { id: 'l6b', name: 'Batarya Paketi (500kg)', weight: 500, category: 'Powertrain' },
  { id: 'l6c', name: 'Yüksek Kapasite Batarya', weight: 750, category: 'Powertrain' },
  { id: 'l7', name: 'Şanzıman', weight: 220, category: 'Powertrain' },
  { id: 'l8', name: 'Ön Aks Grubu', weight: 850, category: 'Mekanik' },
  { id: 'l9', name: 'Arka Aks Grubu', weight: 1100, category: 'Mekanik' },
  { id: 'l10', name: 'Direksiyon Kutusu', weight: 45, category: 'Mekanik' },
  { id: 'l11', name: 'Yan Panel (BIW)', weight: 35, category: 'Body in White' },
  { id: 'l12', name: 'Tavan Paneli (BIW)', weight: 50, category: 'Body in White' },
  { id: 'l13', name: 'Yolcu Koltuğu', weight: 15, category: 'İç Trim' },
  { id: 'l14', name: 'Sürücü Koltuğu', weight: 25, category: 'İç Trim' },
  { id: 'l15', name: 'Dış Dikiz Aynası', weight: 8, category: 'Dış Trim' },
  { id: 'l16', name: 'Ön Tampon', weight: 40, category: 'Dış Trim' },
];

function DraggableItem({ item, isDark = true }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`${isDark ? 'bg-[#1c2128] border-white/[0.06] text-slate-300' : 'bg-white border-slate-200 text-slate-700'} border p-2 rounded-lg text-[10px] font-bold cursor-grab active:cursor-grabbing hover:border-orange-500/50 transition-colors flex justify-between items-center`}>
      <span>{item.name}</span>
      <span className="text-orange-400 font-mono">{item.weight}kg</span>
    </div>
  );
}

export default function WeightCalcPanel() {
  const ct = useChartTheme();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('analysis');

  // Vehicle Geometry
  const [wheelbase, setWheelbase] = useState(6000);
  const [jointFromAxle1, setJointFromAxle1] = useState(9000);
  const [axle3FromJoint, setAxle3FromJoint] = useState(3500);
  const [totalLength, setTotalLength] = useState(18000);
  const [busWidth, setBusWidth] = useState(2550);
  const [overhangFront, setOverhangFront] = useState(2500);
  const [overhangRear, setOverhangRear] = useState(3000);
  const [jointWidth, setJointWidth] = useState(1600);

  // Axle Loads & Capacities
  const [axles, setAxles] = useState([
    { emptyLoad: 4500, capacity: 7500 },
    { emptyLoad: 5000, capacity: 11500 },
    { emptyLoad: 4000, capacity: 13000 },
  ]);

  const [seats, setSeats] = useState([
    { id: '1', name: 'Tekli Koltuk', position: 1200, section: 'front', multiplier: 1 },
    { id: '2', name: 'Çift Koltuk', position: 4500, section: 'front', multiplier: 2 },
    { id: '3', name: 'Arka 5-li', position: 12500, section: 'rear', multiplier: 5 },
  ]);

  const [standing, setStanding] = useState([
    { id: 'front', area: 8.5, cog: 4500 },
    { id: 'rear', area: 6.0, cog: 10500 },
  ]);

  const [batteries, setBatteries] = useState(
    Array.from({ length: 8 }).map((_, i) => ({
      id: `bat-${i}`, name: `Batarya ${i + 1}`, weight: 450, position: 2000 + i * 1500, enabled: true
    }))
  );

  const [targetBatteryCount, setTargetBatteryCount] = useState(4);
  const [standingCounts, setStandingCounts] = useState({ front: 0, rear: 0 });
  const [pWeight, setPWeight] = useState(75);
  const [gvwLimit, setGvwLimit] = useState(28000);
  const [gvwScenarios, setGvwScenarios] = useState([
    { limit: 28000, axle1Cap: 7500, axle2Cap: 11500, axle3Cap: 13000 },
    { limit: 29000, axle1Cap: 7500, axle2Cap: 11500, axle3Cap: 13000 },
    { limit: 30000, axle1Cap: 7500, axle2Cap: 11500, axle3Cap: 13000 },
    { limit: 32000, axle1Cap: 7500, axle2Cap: 11500, axle3Cap: 13000 },
  ]);

  const [emptyWeightTabs, setEmptyWeightTabs] = useState({ main: 'core', core: 'biw' });

  const [components, setComponents] = useState({
    roof: [], options: [], biw: [], powertrain: [], mechanical: [], interior: [], exterior: []
  });

  const calculateAxleImpact = (w, x) => {
    let r1 = 0, r2 = 0, r3 = 0;
    if (x <= jointFromAxle1) {
      const load2 = (w * x) / wheelbase;
      r1 = w - load2; r2 = load2;
    } else {
      const xRelJoint = x - jointFromAxle1;
      const load3 = (w * xRelJoint) / axle3FromJoint;
      const loadJoint = w - load3;
      const load2 = (loadJoint * jointFromAxle1) / wheelbase;
      r1 = loadJoint - load2; r2 = load2; r3 = load3;
    }
    return { r1, r2, r3 };
  };

  const axleCapacitiesStr = axles.map(a => a.capacity).join(',');
  const axleCapacities = useMemo(() => axles.map(a => a.capacity), [axleCapacitiesStr]);

  const batteryAnalysis = useMemo(() => {
    const MAX_COMBINATIONS = 1000;
    const allCombinations = (arr, k) => {
      const results = [];
      const helper = (start, current) => {
        if (results.length >= MAX_COMBINATIONS) return;
        if (current.length === k) { results.push([...current]); return; }
        for (let i = start; i < arr.length; i++) { current.push(arr[i]); helper(i + 1, current); current.pop(); }
      };
      helper(0, []);
      return results;
    };
    const combos = allCombinations(batteries, targetBatteryCount);
    let bestConfig = { keepIds: [], maxPassengers: 0, loads: [], totalWeight: 0, optimizedEmptyLoads: [0, 0, 0], limited: combos.length >= MAX_COMBINATIONS };
    const otherComponents = Object.values(components).flat().filter(c => c.enabled);
    let baseR1 = 0, baseR2 = 0, baseR3 = 0;
    otherComponents.forEach(c => { const impact = calculateAxleImpact(c.weight, c.position); baseR1 += impact.r1; baseR2 += impact.r2; baseR3 += impact.r3; });
    const seatedFront = seats.filter(s => s.section === 'front').reduce((sum, s) => sum + s.multiplier, 0);
    const seatedRear = seats.filter(s => s.section === 'rear').reduce((sum, s) => sum + s.multiplier, 0);
    const seatedFrontWeight = seatedFront * pWeight;
    const seatedFrontMoment = seats.filter(s => s.section === 'front').reduce((sum, s) => sum + s.multiplier * pWeight * (wheelbase - s.position), 0);
    const seatedRearWeight = seatedRear * pWeight;
    const seatedRearMoment = seats.filter(s => s.section === 'rear').reduce((sum, s) => sum + s.multiplier * pWeight * (s.position - jointFromAxle1), 0);
    const maxF = Math.floor(standing[0].area * 8);
    const maxR = Math.floor(standing[1].area * 8);

    combos.forEach(combo => {
      const keepIds = combo.map(b => b.id);
      let r1 = baseR1, r2 = baseR2, r3 = baseR3;
      combo.forEach(c => { const impact = calculateAxleImpact(c.weight, c.position); r1 += impact.r1; r2 += impact.r2; r3 += impact.r3; });
      const tempAxles = [
        { emptyLoad: Math.round(r1), capacity: axleCapacities[0] },
        { emptyLoad: Math.round(r2), capacity: axleCapacities[1] },
        { emptyLoad: Math.round(r3), capacity: axleCapacities[2] },
      ];
      let currentMax = 0; let currentLoads = [];
      const step = combos.length > 500 ? 10 : (combos.length > 100 ? 5 : 2);
      for (let f = maxF; f >= 0; f -= step) {
        for (let r = maxR; r >= 0; r -= step) {
          const deltaW_Rear = seatedRearWeight + (r * pWeight);
          const rearMoment2 = seatedRearMoment + (r * pWeight * (standing[1].cog - jointFromAxle1));
          const deltaAxle3 = rearMoment2 / axle3FromJoint;
          const deltaJoint = deltaW_Rear - deltaAxle3;
          const deltaW_Front = seatedFrontWeight + (f * pWeight);
          const frontMomentAboutAxle2 = seatedFrontMoment + (f * pWeight * (wheelbase - standing[0].cog));
          const jointDistFromAxle2 = jointFromAxle1 - wheelbase;
          const deltaAxle1 = (frontMomentAboutAxle2 - deltaJoint * jointDistFromAxle2) / wheelbase;
          const deltaAxle2 = (deltaW_Front + deltaJoint) - deltaAxle1;
          const l = [tempAxles[0].emptyLoad + deltaAxle1, tempAxles[1].emptyLoad + deltaAxle2, tempAxles[2].emptyLoad + deltaAxle3];
          const totalW = l.reduce((a, b) => a + b, 0);
          if (l[0] <= tempAxles[0].capacity && l[1] <= tempAxles[1].capacity && l[2] <= tempAxles[2].capacity && totalW <= gvwLimit) {
            if (f + r + seatedFront + seatedRear > currentMax) { currentMax = f + r + seatedFront + seatedRear; currentLoads = l; }
            break;
          }
        }
      }
      if (currentMax > bestConfig.maxPassengers) {
        bestConfig = { ...bestConfig, keepIds, maxPassengers: currentMax, loads: currentLoads, totalWeight: currentLoads.reduce((a, b) => a + b, 0), optimizedEmptyLoads: [Math.round(r1), Math.round(r2), Math.round(r3)] };
      }
    });
    return bestConfig;
  }, [batteries, targetBatteryCount, components, axleCapacities, seats, standing, gvwLimit, pWeight, wheelbase, jointFromAxle1, axle3FromJoint]);

  const fileInputRef = useRef(null);
  const componentFileInputRef = useRef(null);

  const handleExcelImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const genSheet = wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('genel') || n.toLowerCase().includes('general')) || ''];
      if (genSheet) {
        const genData = XLSX.utils.sheet_to_json(genSheet);
        genData.forEach(row => {
          const key = (row.Parametre || row.Parameter || '').toLowerCase();
          const val = Number(row.Deger || row.Value || 0);
          if (key.includes('wheelbase')) setWheelbase(val);
          if (key.includes('koruk') || key.includes('joint')) setJointFromAxle1(val);
          if (key.includes('arka') || key.includes('rear')) setAxle3FromJoint(val);
          if (key.includes('gvw')) setGvwLimit(val);
          if (key.includes('yolcu') || key.includes('passenger')) setPWeight(val);
          if (key.includes('uzunluk') || key.includes('length')) setTotalLength(val);
          if (key.includes('genislik') || key.includes('width')) setBusWidth(val);
          if (key.includes('on uzanti') || key.includes('front overhang')) setOverhangFront(val);
          if (key.includes('arka uzanti') || key.includes('rear overhang')) setOverhangRear(val);
          if (key.includes('koruk genisligi') || key.includes('joint width')) setJointWidth(val);
        });
      }
      const axleSheet = wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('akslar') || n.toLowerCase().includes('axles')) || ''];
      if (axleSheet) {
        const axleData = XLSX.utils.sheet_to_json(axleSheet);
        const newAxles = [...axles];
        axleData.forEach(row => {
          const idx = Number(row.Aks || row.Axle || 0) - 1;
          if (idx >= 0 && idx < 3) newAxles[idx] = { emptyLoad: Number(row.Bos || row.Empty || 0), capacity: Number(row.Kapasite || row.Capacity || 0) };
        });
        setAxles(newAxles);
      }
      const seatSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('koltuk') || n.toLowerCase().includes('seats'));
      if (seatSheetName) {
        const seatData = XLSX.utils.sheet_to_json(wb.Sheets[seatSheetName]);
        const importedSeats = seatData.map((row, index) => ({
          id: Math.random().toString(36).substr(2, 9), name: row.Ad || row.Name || `Koltuk ${index + 1}`,
          position: Number(row.Konum || row.Position || 0),
          section: ((row.Bolum || row.Section || 'front').toLowerCase().includes('arka') || (row.Bolum || row.Section || '').toLowerCase() === 'rear' ? 'rear' : 'front'),
          multiplier: Number(row.Carpan || row.Multiplier || 1)
        })).filter(s => s.multiplier > 0 || s.position !== 0);
        if (importedSeats.length > 0) setSeats(importedSeats);
      }
      const standSheet = wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('ayakta') || n.toLowerCase().includes('standing')) || ''];
      if (standSheet) {
        const standData = XLSX.utils.sheet_to_json(standSheet);
        const newStanding = [...standing];
        standData.forEach(row => {
          const section = (row.Bolum || row.Section || '').toLowerCase();
          const idx = section.includes('arka') || section === 'rear' ? 1 : 0;
          newStanding[idx] = { ...newStanding[idx], area: Number(row.Alan || row.Area || 0), cog: Number(row.Konum || row.Position || 0) };
        });
        setStanding(newStanding);
      }
      const scenarioSheet = wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('senaryo') || n.toLowerCase().includes('scenario')) || ''];
      if (scenarioSheet) {
        const scenarioData = XLSX.utils.sheet_to_json(scenarioSheet);
        const newScenarios = scenarioData.map(row => ({ limit: Number(row.Limit || row.GVW || 0), axle1Cap: Number(row.Aks1 || row.Axle1 || 0), axle2Cap: Number(row.Aks2 || row.Axle2 || 0), axle3Cap: Number(row.Aks3 || row.Axle3 || 0) })).filter(s => s.limit > 0);
        if (newScenarios.length > 0) setGvwScenarios(newScenarios.slice(0, 4));
      }
      const compSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('bileşen') || n.toLowerCase().includes('component'));
      if (compSheetName) {
        const compData = XLSX.utils.sheet_to_json(wb.Sheets[compSheetName]);
        const newComponents = { roof: [], options: [], biw: [], powertrain: [], mechanical: [], interior: [], exterior: [] };
        const catMap = { 'tavan': 'roof', 'roof': 'roof', 'opsiyon': 'options', 'option': 'options', 'biw': 'biw', 'body': 'biw', 'powertrain': 'powertrain', 'güç': 'powertrain', 'mekanik': 'mechanical', 'mechanical': 'mechanical', 'iç': 'interior', 'interior': 'interior', 'dış': 'exterior', 'exterior': 'exterior' };
        compData.forEach(row => {
          const rawCat = (row.Kategori || row.Category || '').toLowerCase();
          let targetCat = null;
          for (const [key, val] of Object.entries(catMap)) { if (rawCat.includes(key)) { targetCat = val; break; } }
          if (targetCat) {
            newComponents[targetCat].push({ id: Math.random().toString(36).substr(2, 9), name: row.Ad || row.Name || 'Adsız Bileşen', weight: Number(row.Agirlik || row.Weight || 0), position: Number(row.Konum || row.Position || 0), enabled: true });
          }
        });
        setComponents(newComponents);
      }
      const batSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('batarya') || n.toLowerCase().includes('batteries'));
      if (batSheetName) {
        const batData = XLSX.utils.sheet_to_json(wb.Sheets[batSheetName]);
        const importedBatteries = batData.map((row, index) => ({ id: `bat-${index}`, name: row.Ad || row.Name || `Batarya ${index + 1}`, weight: Number(row.Agirlik || row.Weight || 450), position: Number(row.Konum || row.Position || (2000 + index * 1500)), enabled: true }));
        if (importedBatteries.length > 0) setBatteries(importedBatteries);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto axle update from components
  useEffect(() => {
    const all = Object.values(components).flat();
    const enabledComponents = all.filter(c => c.enabled);
    let r1 = 0, r2 = 0, r3 = 0;
    enabledComponents.forEach(c => { const impact = calculateAxleImpact(c.weight, c.position); r1 += impact.r1; r2 += impact.r2; r3 += impact.r3; });
    setAxles(prev => {
      const nr1 = Math.round(r1), nr2 = Math.round(r2), nr3 = Math.round(r3);
      if (prev[0].emptyLoad === nr1 && prev[1].emptyLoad === nr2 && prev[2].emptyLoad === nr3) return prev;
      return [{ ...prev[0], emptyLoad: nr1 }, { ...prev[1], emptyLoad: nr2 }, { ...prev[2], emptyLoad: nr3 }];
    });
  }, [components, wheelbase, jointFromAxle1, axle3FromJoint]);

  const calculateLoads = (stCounts) => {
    const rearItems = [
      ...seats.filter(s => s.section === 'rear').map(s => ({ w: pWeight * s.multiplier, x: s.position - jointFromAxle1 })),
      { w: stCounts.rear * pWeight, x: standing[1].cog - jointFromAxle1 }
    ];
    const deltaW_Rear = rearItems.reduce((sum, i) => sum + i.w, 0);
    const rearMoment = rearItems.reduce((sum, i) => sum + i.w * i.x, 0);
    const deltaAxle3 = rearMoment / axle3FromJoint;
    const deltaJoint = deltaW_Rear - deltaAxle3;
    const frontItems = [
      ...seats.filter(s => s.section === 'front').map(s => ({ w: pWeight * s.multiplier, x: s.position })),
      { w: stCounts.front * pWeight, x: standing[0].cog }
    ];
    const deltaW_Front = frontItems.reduce((sum, i) => sum + i.w, 0);
    let momentAboutAxle2 = 0;
    frontItems.forEach(i => { momentAboutAxle2 += i.w * (wheelbase - i.x); });
    const jointDistFromAxle2 = jointFromAxle1 - wheelbase;
    const deltaAxle1 = (momentAboutAxle2 - deltaJoint * jointDistFromAxle2) / wheelbase;
    const deltaAxle2 = (deltaW_Front + deltaJoint) - deltaAxle1;
    return [
      { load: axles[0].emptyLoad + deltaAxle1, capacity: axles[0].capacity },
      { load: axles[1].emptyLoad + deltaAxle2, capacity: axles[1].capacity },
      { load: axles[2].emptyLoad + deltaAxle3, capacity: axles[2].capacity },
    ];
  };

  const currentLoads = useMemo(() => calculateLoads(standingCounts), [wheelbase, jointFromAxle1, axle3FromJoint, axles, seats, standing, standingCounts, pWeight]);

  const calculateMaxForLimit = (limit, caps) => {
    const maxF = Math.floor(standing[0].area * 8);
    const maxR = Math.floor(standing[1].area * 8);
    let best = { f: 0, r: 0, total: 0, loads: [], totalW: 0, limitingFactor: '' };
    const currentCaps = caps || { a1: axles[0].capacity, a2: axles[1].capacity, a3: axles[2].capacity };
    for (let f = 0; f <= maxF; f++) {
      for (let r = 0; r <= maxR; r++) {
        const loads = calculateLoads({ front: f, rear: r });
        const totalWeight = loads.reduce((sum, l) => sum + l.load, 0);
        const withinAxleLimits = loads[0].load <= currentCaps.a1 && loads[1].load <= currentCaps.a2 && loads[2].load <= currentCaps.a3;
        if (withinAxleLimits && totalWeight <= limit) {
          if (f + r > best.total) best = { f, r, total: f + r, loads, totalW: totalWeight, limitingFactor: '' };
        }
      }
    }
    if (best.total === maxF + maxR) { best.limitingFactor = "Alan Kapasitesi"; }
    else {
      const checkReason = (f2, r2) => {
        if (f2 > maxF || r2 > maxR) return "Alan Kapasitesi";
        const loads = calculateLoads({ front: f2, rear: r2 });
        const tw = loads.reduce((sum, l) => sum + l.load, 0);
        if (tw > limit) return "GVW Limiti";
        if (loads[0].load > currentCaps.a1) return "Aks 1 Kapasitesi";
        if (loads[1].load > currentCaps.a2) return "Aks 2 Kapasitesi";
        if (loads[2].load > currentCaps.a3) return "Aks 3 Kapasitesi";
        return null;
      };
      const reasonF = best.f < maxF ? checkReason(best.f + 1, best.r) : "Alan Kapasitesi";
      const reasonR = best.r < maxR ? checkReason(best.f, best.r + 1) : "Alan Kapasitesi";
      if (reasonF === reasonR) { best.limitingFactor = reasonF || "Bilinmiyor"; }
      else {
        const reasons = [reasonF, reasonR].filter(Boolean);
        best.limitingFactor = reasons.some(r => r?.includes('Aks')) ? (reasons.find(r => r?.includes('Aks')) || "Aks Limiti") : (reasons[0] || "Limitli");
      }
    }
    return best;
  };

  const scenarioResults = useMemo(() => {
    return gvwScenarios.map(s => ({ ...s, ...calculateMaxForLimit(s.limit, { a1: s.axle1Cap, a2: s.axle2Cap, a3: s.axle3Cap }) }));
  }, [gvwScenarios, wheelbase, jointFromAxle1, axle3FromJoint, axles, seats, standing, pWeight]);

  const findMax = () => {
    const best = calculateMaxForLimit(gvwLimit);
    setStandingCounts({ front: best.f, rear: best.r });
  };

  const addSeat = (section, type) => {
    const multiplier = type === 'single' ? 1 : type === 'double' ? 2 : 5;
    const typeName = type === 'single' ? 'Tekli' : type === 'double' ? 'Çift' : '5-li';
    const defaultPos = section === 'front' ? 1000 : jointFromAxle1 + 1000;
    setSeats([...seats, { id: Math.random().toString(36).substr(2, 9), name: `${typeName} Koltuk`, position: defaultPos, section, multiplier }]);
  };

  const totalWeight = currentLoads.reduce((s, l) => s + l.load, 0);
  const isOver = currentLoads.some(l => l.load > l.capacity) || totalWeight > gvwLimit;

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && over.id === 'drop-zone') {
      const item = WEIGHT_LIBRARY.find(i => i.id === active.id);
      if (item) {
        const targetSection = emptyWeightTabs.main === 'core' ? emptyWeightTabs.core : emptyWeightTabs.main;
        setComponents(prev => ({ ...prev, [targetSection]: [...prev[targetSection], { id: Math.random().toString(36).substr(2, 9), name: item.name, weight: item.weight, position: 1000, enabled: true }] }));
      }
    }
  };

  function DroppableZone({ children }) {
    const { isOver: isOverDrop, setNodeRef } = useDroppable({ id: 'drop-zone' });
    return (
      <div ref={setNodeRef} className={cn("flex-1 min-h-[400px] rounded-3xl border-2 border-dashed transition-colors p-6", isOverDrop ? "border-orange-500 bg-orange-500/5" : isDark ? "border-white/[0.06] bg-[#161b22]" : "border-slate-300 bg-white")}>{children}</div>
    );
  }

  const calculateEmptyWeightStats = () => {
    const all = [...components.roof, ...components.options, ...components.biw, ...components.powertrain, ...components.mechanical, ...components.interior, ...components.exterior];
    const enabledOnly = all.filter(c => c.enabled);
    const total = enabledOnly.reduce((sum, c) => sum + c.weight, 0);
    const moment = enabledOnly.reduce((sum, c) => sum + c.weight * c.position, 0);
    const cog = total > 0 ? moment / total : 0;
    return { total, cog };
  };

  const emptyStats = calculateEmptyWeightStats();

  // ── Theme-aware input styling ──
  const inputCls = `w-full ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-xl p-3 font-mono text-sm focus:outline-none focus:ring-2 ring-orange-500/50`;
  const inputSmCls = `w-full ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg p-2 font-mono text-xs focus:outline-none focus:ring-1 ring-orange-500/50`;
  const cardCls = `${isDark ? 'bg-[#161b22] border-white/[0.06]' : 'bg-white border-slate-200 shadow-sm'} border rounded-3xl`;
  const labelCls = `text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-600'} block mb-1`;

  return (
    <div className="text-slate-200">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <BusIcon size={24} className="text-orange-500" /> Körüklü Otobüs Analizörü
            </h1>
            <p className="text-[10px] font-mono text-slate-600">AXLE LOAD OPTIMIZER / ARTICULATED UNIT</p>
          </div>
          <nav className="flex bg-[#161b22] p-1 rounded-xl border border-white/[0.06]">
            {[
              { id: 'analysis', label: 'Aks Analizi' },
              { id: 'empty-weight', label: 'Boş Ağırlık Hesabı' },
              { id: 'seat-layout', label: 'Koltuk Yerleşimi' },
              { id: 'battery-analysis', label: 'Batarya Analizi' },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === t.id ? "bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white shadow-lg shadow-orange-500/20" : isDark ? "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300" : "text-slate-500 hover:bg-white hover:text-slate-700")}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className={`flex items-center gap-4 ${isDark ? 'bg-[#161b22] border-white/[0.06]' : 'bg-white border-slate-200 shadow-sm'} p-2 rounded-2xl border`}>
          <div className={`px-4 border-r ${isDark ? 'border-white/[0.06]' : 'border-slate-200'} text-right`}>
            <p className={`text-[9px] font-mono uppercase ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>Toplam Ağırlık / GVW</p>
            <p className={cn("text-xl font-black font-mono", isOver ? "text-red-400" : "text-emerald-400")}>
              {Math.round(totalWeight).toLocaleString()} / {gvwLimit.toLocaleString()} kg
            </p>
          </div>
          {activeTab === 'analysis' ? (
            <button onClick={findMax} className="bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white px-6 py-3 rounded-xl font-bold text-sm hover:from-[#fb923c] hover:to-[#f97316] transition flex items-center gap-2 shadow-lg shadow-orange-500/20">
              <MaximizeIcon size={16} /> Optimize Et
            </button>
          ) : (
            <div className="px-4 text-right">
              <p className={`text-[9px] font-mono uppercase ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>Hesaplanan Boş Ağırlık</p>
              <p className="text-xl font-black font-mono text-orange-400">{Math.round(emptyStats.total).toLocaleString()} kg</p>
            </div>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* ═══════════════ AKS ANALİZİ ═══════════════ */}
        {activeTab === 'analysis' && (
          <motion.div key="analysis" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Inputs */}
            <div className="lg:col-span-4 space-y-6">
              <section className={cn(cardCls, "p-6")}>
                <h2 className="text-xs font-black uppercase mb-4 flex items-center gap-2 text-slate-400"><SettingsIcon size={14}/> Araç Geometrisi</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Wheelbase (Aks 1-2)', val: wheelbase, set: setWheelbase, unit: 'mm' },
                    { label: 'Körük Konumu (Aks 1\'den)', val: jointFromAxle1, set: setJointFromAxle1, unit: 'mm' },
                    { label: 'Arka Aks (Körükten)', val: axle3FromJoint, set: setAxle3FromJoint, unit: 'mm' },
                    { label: 'Yolcu Ağırlığı', val: pWeight, set: setPWeight, unit: 'kg' },
                  ].map((item, i) => (
                    <div key={i}>
                      <label className={labelCls}>{item.label} ({item.unit})</label>
                      <input type="number" value={item.val} onChange={e => item.set(Number(e.target.value))} className={inputCls} />
                    </div>
                  ))}
                </div>
              </section>

              <section className={cn(cardCls, "p-6")}>
                <h2 className="text-xs font-black uppercase mb-4 flex items-center gap-2 text-slate-400"><WeightIcon size={14}/> Boş Ağırlık & Kapasite</h2>
                <div className="space-y-4">
                  <div className="mb-4 pb-4 border-b border-white/[0.06]">
                    <label className={labelCls}>Azami Yüklü Ağırlık (GVW) (kg)</label>
                    <input type="number" value={gvwLimit} onChange={e => setGvwLimit(Number(e.target.value))} className={inputCls} />
                  </div>
                  {axles.map((axle, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Aks {i+1} Boş (kg)</label>
                        <input type="number" value={axle.emptyLoad} onChange={e => { const n = [...axles]; n[i] = { ...n[i], emptyLoad: Number(e.target.value) }; setAxles(n); }} className={inputSmCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Kapasite (kg)</label>
                        <input type="number" value={axle.capacity} onChange={e => { const n = [...axles]; n[i] = { ...n[i], capacity: Number(e.target.value) }; setAxles(n); }} className={inputSmCls} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={cn(cardCls, "p-6")}>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xs font-black uppercase flex items-center gap-2 text-slate-400"><UsersIcon size={14}/> Koltuklar</h2>
                    <button onClick={() => fileInputRef.current?.click()} className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md font-bold hover:bg-emerald-500/20 flex items-center gap-1 border border-emerald-500/20">
                      <FileSheetIcon size={12} /> Excel'den Yükle
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleExcelImport} accept=".xlsx, .xls" className="hidden" />
                  </div>
                  <p className="text-[7px] text-slate-600 mb-3 leading-tight italic">* Excel Sayfaları: Genel, Akslar, Koltuklar, Ayakta, Bileşenler</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[8px] font-bold uppercase text-slate-600">Ön Araç Ekle</p>
                      <div className="flex gap-1">
                        {['single','double','five'].map(t => (
                          <button key={t} onClick={() => addSeat('front', t)} className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-bold hover:bg-blue-500/20 border border-blue-500/20">{t === 'single' ? 'Tek' : t === 'double' ? 'Çift' : "5'li"}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-bold uppercase text-slate-600">Arka Araç Ekle</p>
                      <div className="flex gap-1">
                        {['single','double','five'].map(t => (
                          <button key={t} onClick={() => addSeat('rear', t)} className="text-[8px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded font-bold hover:bg-purple-500/20 border border-purple-500/20">{t === 'single' ? 'Tek' : t === 'double' ? 'Çift' : "5'li"}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {seats.map(seat => (
                    <div key={seat.id} className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-xl group border border-white/[0.04]">
                      <div className={cn("w-2 h-2 rounded-full", seat.section === 'front' ? "bg-blue-400" : "bg-purple-400")} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <input value={seat.name} onChange={e => setSeats(seats.map(s => s.id === seat.id ? {...s, name: e.target.value} : s))} className="bg-transparent border-none text-[9px] font-bold p-0 text-slate-300 focus:outline-none" />
                        <span className="text-[7px] uppercase text-slate-600 font-black">{seat.multiplier} Yolcu | Aks 1'den</span>
                      </div>
                      <input type="number" value={seat.position} onChange={e => setSeats(seats.map(s => s.id === seat.id ? {...s, position: Number(e.target.value)} : s))} className="bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono w-16 p-1 rounded-md text-slate-300" />
                      <button onClick={() => setSeats(seats.filter(s => s.id !== seat.id))} className="ml-auto opacity-0 group-hover:opacity-100 text-red-400"><TrashIcon size={12}/></button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Visualization */}
            <div className="lg:col-span-8 space-y-6">
              <div className={cn(cardCls, "p-8 rounded-[2rem]")}>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className={`text-xl font-black uppercase flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}><BarChartIcon size={20} className="text-orange-500" /> Aks Yükü Analizi</h2>
                    <p className={`text-[10px] font-mono uppercase mt-1 ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>Yolcu dağılımı ve teknik çıkarımlar</p>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentLoads.map((l, i) => ({ name: `Aks ${i+1}`, load: Math.round(l.load), cap: l.capacity }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ct.isDark ? 'rgba(255,255,255,0.04)' : '#e2e8f0'} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 800, fill: ct.isDark ? '#8b949e' : '#64748b'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontFamily: 'monospace', fill: ct.isDark ? '#8b949e' : '#64748b'}} />
                      <Tooltip cursor={{fill: ct.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)'}} content={({active, payload}) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          return <div className={`${ct.isDark ? 'bg-black text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'} p-4 rounded-2xl text-xs font-mono border`}><p className="font-black mb-2">{d.name}</p><p>Yük: {d.load} kg</p><p className="opacity-50">Limit: {d.cap} kg</p></div>;
                        }
                        return null;
                      }} />
                      <Bar dataKey="load" radius={[12, 12, 0, 0]} barSize={60}>
                        {currentLoads.map((l, i) => <Cell key={i} fill={l.load > l.capacity ? '#EF4444' : '#f97316'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                  {currentLoads.map((l, i) => (
                    <div key={i} className={cn("p-6 rounded-3xl border transition-all", l.load > l.capacity ? "bg-red-500/10 border-red-500/30" : "bg-white/[0.03] border-white/[0.06]")}>
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Aks {i+1} Durumu</p>
                      <p className="text-2xl font-black font-mono text-slate-200">{Math.round(l.load).toLocaleString()}<span className="text-xs ml-1 text-slate-600">kg</span></p>
                      <div className="w-full h-1.5 bg-white/[0.06] rounded-full mt-3 overflow-hidden">
                        <div className={cn("h-full transition-all duration-500", l.load > l.capacity ? "bg-red-500" : "bg-[#f97316]")} style={{width: `${Math.min(100, (l.load/l.capacity)*100)}%`}} />
                      </div>
                      <p className="text-[9px] font-bold mt-2 text-slate-600">Kapasite: {l.capacity.toLocaleString()} kg</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className={cn(cardCls, "p-6")}>
                  <h3 className="text-xs font-black uppercase mb-4 text-slate-400">Ayakta Yolcu Kontrolü</h3>
                  {standing.map(area => (
                    <div key={area.id} className="mb-6 last:mb-0">
                      <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                        <span className="text-slate-400">{area.id === 'front' ? 'Ön Araç' : 'Arka Araç'}</span>
                        <span className="text-orange-400">{standingCounts[area.id]} / {Math.floor(area.area * 8)}</span>
                      </div>
                      <input type="range" min="0" max={Math.floor(area.area * 8)} value={standingCounts[area.id]} onChange={e => setStandingCounts({...standingCounts, [area.id]: Number(e.target.value)})} className="w-full accent-[#f97316]" />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="text-[8px] font-bold text-slate-600 uppercase">Alan (m²)</label>
                          <input type="number" step="0.1" value={area.area} onChange={e => setStanding(standing.map(s => s.id === area.id ? {...s, area: Number(e.target.value)} : s))} className={inputSmCls} />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-600 uppercase">Aks 1 CoG (mm)</label>
                          <input type="number" value={area.cog} onChange={e => setStanding(standing.map(s => s.id === area.id ? {...s, cog: Number(e.target.value)} : s))} className={inputSmCls} />
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                <section className={cn("p-8 rounded-[2rem] flex flex-col justify-center border", isOver ? "bg-red-500/20 text-white border-red-500/50" : "bg-emerald-500/20 text-white border-emerald-500/50")}>
                  <div className="flex items-center gap-4 mb-4">
                    {isOver ? <AlertIcon size={32} /> : <CheckIcon size={32} />}
                    <h3 className="text-xl font-black uppercase leading-none">{isOver ? "Aşırı Yük!" : "Sınırlar Dahilinde"}</h3>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs font-bold uppercase opacity-80"><span>Koltuk Yolcu</span><span>{seats.reduce((sum, s) => sum + s.multiplier, 0)}</span></div>
                    <div className="flex justify-between text-xs font-bold uppercase opacity-80"><span>Ayakta Yolcu</span><span>{standingCounts.front + standingCounts.rear}</span></div>
                    <div className="h-px bg-white/20 my-2" />
                    <div className="flex justify-between text-sm font-black uppercase"><span>Toplam Yolcu</span><span>{seats.reduce((sum, s) => sum + s.multiplier, 0) + standingCounts.front + standingCounts.rear}</span></div>
                  </div>
                  <p className="text-[10px] opacity-70 leading-snug">
                    {isOver ? (totalWeight > gvwLimit ? "Toplam ağırlık (GVW) limitini aşıyor!" : "Bir veya daha fazla aks kapasitesini aşıyor.") + " Lütfen yolcu sayısını azaltın veya optimize butonunu kullanın." : "Mevcut konfigürasyon güvenli. Maksimum ayakta yolcu kapasitesi için optimizasyon yapabilirsiniz."}
                  </p>
                </section>

                {/* GVW Scenario Analysis */}
                <section className={cn(cardCls, "p-6 md:col-span-2")}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xs font-black uppercase flex items-center gap-2 text-slate-400"><LayoutIcon size={14}/> GVW Senaryo Analizi</h2>
                    <p className="text-[9px] font-mono text-slate-600 uppercase">Farklı limitler için otomatik optimizasyon</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {scenarioResults.map((res, idx) => (
                      <div key={idx} className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] flex flex-col">
                        <div className="mb-3">
                          <label className="text-[8px] font-bold uppercase text-slate-600 block mb-1">Limit {idx + 1} (kg)</label>
                          <input type="number" value={res.limit} onChange={e => { const n = [...gvwScenarios]; n[idx] = { ...n[idx], limit: Number(e.target.value) }; setGvwScenarios(n); }} className={inputSmCls} />
                        </div>
                        <div className="grid grid-cols-3 gap-1 mb-3">
                          {[['Aks 1','axle1Cap'],['Aks 2','axle2Cap'],['Aks 3','axle3Cap']].map(([lbl, key]) => (
                            <div key={key}>
                              <label className="text-[7px] font-bold uppercase text-slate-600 block">{lbl}</label>
                              <input type="number" value={res[key]} onChange={e => { const n = [...gvwScenarios]; n[idx] = { ...n[idx], [key]: Number(e.target.value) }; setGvwScenarios(n); }} className="w-full bg-white/[0.04] border border-white/[0.06] rounded p-1 font-mono text-[9px] text-slate-300" />
                            </div>
                          ))}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-end"><span className="text-[9px] font-bold text-slate-600 uppercase">Ayakta</span><span className="text-lg font-black text-orange-400 font-mono">{res.total}</span></div>
                          <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase"><span>Ön/Arka</span><span>{res.f} / {res.r}</span></div>
                          <div className="h-px bg-white/[0.06] my-1" />
                          <div className="flex justify-between text-[9px] font-bold"><span className="text-slate-600 uppercase">Toplam Yolcu</span><span className="text-slate-300">{seats.reduce((sum, s) => sum + s.multiplier, 0) + res.total}</span></div>
                          <div className="flex justify-between text-[9px] font-bold"><span className="text-slate-600 uppercase">Toplam Ağırlık</span><span className={cn(res.totalW > res.limit ? "text-red-400" : "text-emerald-400")}>{Math.round(res.totalW).toLocaleString()} kg</span></div>
                          <div className="mt-2 pt-2 border-t border-white/[0.06]">
                            <div className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-orange-500" /><span className="text-[8px] font-black uppercase text-slate-600">Kısıtlayıcı Faktör</span></div>
                            <p className="text-[10px] font-bold text-orange-400 mt-0.5">{res.limitingFactor}</p>
                          </div>
                        </div>
                        <button onClick={() => { setGvwLimit(res.limit); setStandingCounts({ front: res.f, rear: res.r }); setAxles([{ ...axles[0], capacity: res.axle1Cap }, { ...axles[1], capacity: res.axle2Cap }, { ...axles[2], capacity: res.axle3Cap }]); }}
                          className="mt-4 w-full bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white py-2 rounded-xl text-[9px] font-black uppercase hover:from-[#fb923c] hover:to-[#f97316] transition-colors">
                          Bu Senaryoyu Uygula
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════ BOŞ AĞIRLIK HESABI ═══════════════ */}
        {activeTab === 'empty-weight' && (
          <motion.div key="empty-weight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <DndContext onDragEnd={handleDragEnd}>
              <div className="lg:col-span-3 space-y-6">
                <section className={cn(cardCls, "p-6 h-[calc(100vh-200px)] flex flex-col")}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-black uppercase flex items-center gap-2 text-slate-400"><PackageIcon size={14}/> Ağırlık Kütüphanesi</h2>
                    <button onClick={() => componentFileInputRef.current?.click()} className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition border border-emerald-500/20" title="Bileşenleri Excel'den Yükle">
                      <FileSheetIcon size={14} />
                    </button>
                    <input type="file" ref={componentFileInputRef} onChange={handleExcelImport} accept=".xlsx, .xls" className="hidden" />
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {['Tavan', 'Powertrain', 'Mekanik', 'Body in White', 'İç Trim', 'Dış Trim'].map(cat => (
                      <div key={cat}>
                        <p className="text-[8px] font-black uppercase text-slate-600 mb-2">{cat}</p>
                        <div className="space-y-1">{WEIGHT_LIBRARY.filter(i => i.category === cat).map(item => <DraggableItem key={item.id} item={item} isDark={isDark} />)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="lg:col-span-9 space-y-6">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {[{ id: 'roof', label: 'Tavan Yerleşimi', Icon: LayersIcon }, { id: 'options', label: 'Opsiyonlar', Icon: BoxIcon }, { id: 'core', label: 'Temel Bileşenler', Icon: CpuIcon }].map(tab => (
                    <button key={tab.id} onClick={() => setEmptyWeightTabs(prev => ({ ...prev, main: tab.id }))}
                      className={cn("flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap", emptyWeightTabs.main === tab.id ? "bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white shadow-xl shadow-orange-500/20" : isDark ? "bg-[#161b22] border border-white/[0.06] text-slate-400 hover:bg-white/[0.04]" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50")}>
                      <tab.Icon size={14} /> {tab.label}
                    </button>
                  ))}
                </div>

                {emptyWeightTabs.main === 'core' && (
                  <div className={`flex gap-1 mb-4 ${isDark ? 'bg-[#161b22] border-white/[0.06]' : 'bg-slate-100 border-slate-200'} p-1 rounded-xl border inline-flex`}>
                    {[{ id: 'biw', label: 'Body in White' }, { id: 'powertrain', label: 'Powertrain' }, { id: 'mechanical', label: 'Mekanik' }, { id: 'interior', label: 'İç Trim' }, { id: 'exterior', label: 'Dış Trim' }].map(tab => (
                      <button key={tab.id} onClick={() => setEmptyWeightTabs(prev => ({ ...prev, core: tab.id }))}
                        className={cn("px-4 py-2 rounded-lg text-[10px] font-bold transition-all", emptyWeightTabs.core === tab.id ? "bg-orange-500 text-white" : isDark ? "text-slate-500 hover:bg-white/[0.04]" : "text-slate-500 hover:bg-white")}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                <DroppableZone>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black uppercase flex items-center gap-2 text-slate-300">
                      {emptyWeightTabs.main === 'core' ? `Temel Bileşenler > ${emptyWeightTabs.core.toUpperCase()}` : emptyWeightTabs.main.toUpperCase()}
                    </h3>
                    <div className="text-right">
                      <p className="text-[8px] font-bold uppercase text-slate-600">Bölüm Ağırlığı</p>
                      <p className="text-lg font-black font-mono text-slate-200">{components[emptyWeightTabs.main === 'core' ? emptyWeightTabs.core : emptyWeightTabs.main].reduce((s, c) => s + c.weight, 0)} kg</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {components[emptyWeightTabs.main === 'core' ? emptyWeightTabs.core : emptyWeightTabs.main].length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-white/[0.06] rounded-2xl">
                        <PlusIcon size={24} className="mb-2 opacity-20" />
                        <p className="text-[10px] font-bold uppercase opacity-40">Bileşenleri buraya sürükleyin</p>
                      </div>
                    ) : (
                      components[emptyWeightTabs.main === 'core' ? emptyWeightTabs.core : emptyWeightTabs.main].map(comp => {
                        const section = emptyWeightTabs.main === 'core' ? emptyWeightTabs.core : emptyWeightTabs.main;
                        return (
                          <div key={comp.id} className="flex items-center gap-4 bg-white/[0.03] p-3 rounded-2xl group border border-white/[0.04]">
                            <button onClick={() => setComponents(prev => ({ ...prev, [section]: prev[section].map(c => c.id === comp.id ? { ...c, enabled: !c.enabled } : c) }))}
                              className={cn("w-10 h-5 rounded-full transition-colors relative", comp.enabled ? "bg-orange-500" : "bg-slate-700")}>
                              <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", comp.enabled ? "left-6" : "left-1")} />
                            </button>
                            <div className={cn("w-8 h-8 bg-white/[0.06] rounded-lg flex items-center justify-center", !comp.enabled && "opacity-40")}>
                              <PackageIcon size={16} className="text-orange-500" />
                            </div>
                            <div className={cn("flex-1", !comp.enabled && "opacity-40")}>
                              <p className="text-[11px] font-black uppercase text-slate-300">{comp.name}</p>
                              <p className="text-[9px] font-bold text-slate-600">Bileşen</p>
                            </div>
                            <div className={cn("flex gap-4", !comp.enabled && "opacity-40")}>
                              <div>
                                <label className="text-[8px] font-bold text-slate-600 uppercase block">Ağırlık (kg)</label>
                                <input type="number" value={comp.weight} disabled={!comp.enabled} onChange={e => setComponents(prev => ({ ...prev, [section]: prev[section].map(c => c.id === comp.id ? { ...c, weight: Number(e.target.value) } : c) }))} className="bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono w-20 p-1 rounded-md text-slate-300" />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-slate-600 uppercase block">Konum (mm)</label>
                                <input type="number" value={comp.position} disabled={!comp.enabled} onChange={e => setComponents(prev => ({ ...prev, [section]: prev[section].map(c => c.id === comp.id ? { ...c, position: Number(e.target.value) } : c) }))} className="bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono w-20 p-1 rounded-md text-slate-300" />
                              </div>
                            </div>
                            <button onClick={() => setComponents(prev => ({ ...prev, [section]: prev[section].filter(c => c.id !== comp.id) }))} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon size={14} /></button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </DroppableZone>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={cn(cardCls, "p-6")}>
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Ağırlık Dağılımı</p>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[
                            { name: 'Tavan', value: components.roof.filter(c => c.enabled).reduce((s, c) => s + c.weight, 0) },
                            { name: 'Opsiyonlar', value: components.options.filter(c => c.enabled).reduce((s, c) => s + c.weight, 0) },
                            { name: 'Temel', value: [...components.biw, ...components.powertrain, ...components.mechanical, ...components.interior, ...components.exterior].filter(c => c.enabled).reduce((s, c) => s + c.weight, 0) },
                          ]} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                            <Cell key="roof" fill="#F97316" /><Cell key="options" fill="#3B82F6" /><Cell key="core" fill="#10B981" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={`md:col-span-2 ${isDark ? 'bg-[#0d1117] text-white border-white/[0.06]' : 'bg-slate-50 text-slate-900 border-slate-200'} p-8 rounded-[2rem] flex flex-col justify-between relative overflow-hidden border`}>
                    <div className="relative z-10">
                      <h4 className="text-xl font-black uppercase mb-2">Özet Rapor</h4>
                      <div className="grid grid-cols-2 gap-8 mt-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-500">Toplam Boş Ağırlık</p>
                          <p className="text-3xl font-black font-mono text-slate-200">{Math.round(emptyStats.total).toLocaleString()} kg</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-500">Ağırlık Merkezi (CoG)</p>
                          <p className="text-3xl font-black font-mono text-slate-200">{Math.round(emptyStats.cog).toLocaleString()} mm</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 p-8 opacity-5"><BusIcon size={120} /></div>
                    <div className="mt-8 bg-white/[0.04] border border-white/[0.06] p-4 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Durum</p>
                      <p className="text-xs font-bold text-emerald-400 flex items-center gap-2"><CheckIcon size={14} /> Değişiklikler otomatik olarak aks analizine uygulanmaktadır.</p>
                    </div>
                  </div>
                </div>
              </div>
            </DndContext>
          </motion.div>
        )}

        {/* ═══════════════ KOLTUK YERLEŞİMİ ═══════════════ */}
        {activeTab === 'seat-layout' && (
          <motion.div key="seat-layout" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <section className={cn(cardCls, "p-8 rounded-[3rem] overflow-hidden")}>
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-xl font-black uppercase flex items-center gap-2"><BusIcon size={20} className="text-emerald-500"/> Araç Yerleşim Görünümü</h2>
                  <p className="text-[10px] font-mono text-slate-600 uppercase mt-1">Koltuk ve Ayakta Yolcu Dağılımı</p>
                </div>
                <div className="bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                  <p className="text-[8px] font-bold uppercase text-emerald-400 opacity-60">Toplam Yolcu</p>
                  <p className="text-xl font-black font-mono text-emerald-400">{seats.reduce((sum, s) => sum + s.multiplier, 0) + standingCounts.front + standingCounts.rear}</p>
                </div>
              </div>

              <div className="relative h-80 w-full bg-white/[0.02] rounded-[2rem] border border-white/[0.06] flex items-center justify-center p-8 overflow-x-auto">
                <div className={`absolute top-4 left-8 flex items-center gap-2 text-[8px] font-black uppercase ${isDark ? 'text-slate-600' : 'text-slate-500'}`}><ArrowLeftIcon size={10} /> Ön Taraf</div>
                <div className="relative h-48 flex items-center" style={{ width: '1200px' }}>
                  {/* Front Section */}
                  <div className="absolute h-32 bg-[#1c2128] border-4 border-slate-700 rounded-l-[3rem] rounded-r-lg shadow-sm flex items-center justify-center"
                    style={{ left: 0, width: `${((overhangFront + jointFromAxle1) / totalLength) * 1200}px`, zIndex: 10 }}>
                    <div className="absolute -top-6 left-4 text-[8px] font-black uppercase text-slate-600">Ön Ünite</div>
                    {seats.filter(s => s.section === 'front').map(seat => {
                      const posFromBumper = seat.position + overhangFront;
                      return (
                        <div key={seat.id} className="absolute flex flex-col gap-1" style={{ left: `${(posFromBumper / (overhangFront + jointFromAxle1)) * 100}%`, top: '15%', transform: 'translateX(-50%)' }}>
                          <div className="flex gap-0.5">
                            {Array.from({ length: seat.multiplier }).map((_, i) => (
                              <div key={i} className="w-3 h-4 rounded-t-md border border-emerald-600/20 shadow-sm flex items-center justify-center bg-emerald-500 rotate-[-90deg]">
                                <div className="w-1.5 h-0.5 bg-white/30 rounded-full mt-auto mb-0.5" />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {standingCounts.front > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 text-[8px] font-black text-emerald-400 uppercase">{standingCounts.front} Ayakta</div>
                      </div>
                    )}
                  </div>
                  {/* Joint */}
                  <div className="absolute h-28 bg-slate-600 w-10 z-20 flex flex-col justify-around py-2" style={{ left: `${((overhangFront + jointFromAxle1) / totalLength) * 1200}px`, transform: 'translateX(-50%)' }}>
                    {[1,2,3,4,5].map(i => <div key={i} className="h-0.5 bg-slate-700 w-full" />)}
                  </div>
                  {/* Rear Section */}
                  <div className={`absolute h-32 ${isDark ? 'bg-[#1c2128] border-slate-700' : 'bg-slate-100 border-slate-300'} border-4 rounded-r-[3rem] rounded-l-lg shadow-sm flex items-center justify-center`}
                    style={{ left: `${((overhangFront + jointFromAxle1) / totalLength) * 1200}px`, width: `${((totalLength - (overhangFront + jointFromAxle1)) / totalLength) * 1200}px`, zIndex: 10 }}>
                    <div className="absolute -top-6 right-4 text-[8px] font-black uppercase text-slate-600">Arka Ünite</div>
                    {seats.filter(s => s.section === 'rear').map(seat => {
                      const posFromJoint = (seat.position + overhangFront) - (overhangFront + jointFromAxle1);
                      const rearSectionLength = totalLength - (overhangFront + jointFromAxle1);
                      return (
                        <div key={seat.id} className="absolute flex flex-col gap-1" style={{ left: `${(posFromJoint / rearSectionLength) * 100}%`, top: '15%', transform: 'translateX(-50%)' }}>
                          <div className="flex gap-0.5">
                            {Array.from({ length: seat.multiplier }).map((_, i) => (
                              <div key={i} className="w-3 h-4 rounded-t-md border border-orange-600/20 shadow-sm flex items-center justify-center bg-orange-500 rotate-[-90deg]">
                                <div className="w-1.5 h-0.5 bg-white/30 rounded-full mt-auto mb-0.5" />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {standingCounts.rear > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30 text-[8px] font-black text-orange-400 uppercase">{standingCounts.rear} Ayakta</div>
                      </div>
                    )}
                  </div>
                  {/* Axles */}
                  <div className="absolute bottom-[-20px] w-full pointer-events-none z-30">
                    {[
                      { pos: overhangFront, label: 'AKS 1' },
                      { pos: overhangFront + wheelbase, label: 'AKS 2' },
                      { pos: overhangFront + jointFromAxle1 + axle3FromJoint, label: 'AKS 3' },
                    ].map(a => (
                      <div key={a.label} className="flex flex-col items-center absolute" style={{ left: `${(a.pos / totalLength) * 100}%` }}>
                        <div className="w-10 h-5 bg-slate-300 rounded-t-lg" />
                        <span className="text-[7px] font-bold mt-1 text-slate-400">{a.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                {[
                  { title: 'Ön Ünite Dağılımı', section: 'front', color: 'emerald' },
                  { title: 'Arka Ünite Dağılımı', section: 'rear', color: 'orange' },
                ].map(u => (
                  <div key={u.section} className="bg-white/[0.03] p-6 rounded-3xl border border-white/[0.06]">
                    <h3 className="text-[10px] font-black uppercase text-slate-600 mb-4">{u.title}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Oturarak</span><span className="text-sm font-black font-mono text-slate-300">{seats.filter(s => s.section === u.section).reduce((sum, s) => sum + s.multiplier, 0)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Ayakta</span><span className="text-sm font-black font-mono text-slate-300">{standingCounts[u.section]}</span></div>
                      <div className="h-px bg-white/[0.06] my-2" />
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-black uppercase text-${u.color}-400`}>Toplam</span>
                        <span className={`text-lg font-black font-mono text-${u.color}-400`}>{seats.filter(s => s.section === u.section).reduce((sum, s) => sum + s.multiplier, 0) + standingCounts[u.section]}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className={`${isDark ? 'bg-[#0d1117] text-white border-white/[0.06]' : 'bg-slate-50 text-slate-800 border-slate-200'} p-6 rounded-3xl border`}>
                  <h3 className="text-[10px] font-black uppercase text-slate-600 mb-4">Genel Toplam</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Toplam Oturan</span><span className="text-sm font-black font-mono">{seats.reduce((sum, s) => sum + s.multiplier, 0)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Toplam Ayakta</span><span className="text-sm font-black font-mono">{standingCounts.front + standingCounts.rear}</span></div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between items-center text-emerald-400"><span className="text-xs font-black uppercase">Kapasite</span><span className="text-2xl font-black font-mono">{seats.reduce((sum, s) => sum + s.multiplier, 0) + standingCounts.front + standingCounts.rear}</span></div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <section className={cn(cardCls, "p-8 rounded-[3rem] lg:col-span-2")}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-black uppercase flex items-center gap-2 text-slate-400"><SettingsIcon size={14}/> Koltuk Listesi</h2>
                  <div className="flex gap-2">
                    <button onClick={() => addSeat('front', 'single')} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500/20 border border-emerald-500/20">+ Ön Koltuk</button>
                    <button onClick={() => addSeat('rear', 'single')} className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-xl text-[10px] font-black uppercase hover:bg-orange-500/20 border border-orange-500/20">+ Arka Koltuk</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                  {seats.map(seat => (
                    <div key={seat.id} className="flex items-center gap-4 bg-white/[0.03] p-3 rounded-2xl border border-white/[0.04] group">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", seat.section === 'front' ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400")}><UsersIcon size={18} /></div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-slate-300">{seat.name}</p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase">{seat.section === 'front' ? 'Ön Ünite' : 'Arka Ünite'}</p>
                      </div>
                      <div className="flex gap-4">
                        <div><label className="text-[7px] font-bold text-slate-600 uppercase block">Konum</label><input type="number" value={seat.position} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, position: Number(e.target.value) } : s))} className="bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono w-16 p-1 rounded text-slate-300" /></div>
                        <div><label className="text-[7px] font-bold text-slate-600 uppercase block">Yolcu</label><input type="number" value={seat.multiplier} onChange={e => setSeats(seats.map(s => s.id === seat.id ? { ...s, multiplier: Number(e.target.value) } : s))} className="bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono w-12 p-1 rounded text-slate-300" /></div>
                      </div>
                      <button onClick={() => setSeats(seats.filter(s => s.id !== seat.id))} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon size={14} /></button>
                    </div>
                  ))}
                </div>
              </section>

              <section className={cn(cardCls, "p-8 rounded-[3rem]")}>
                <h2 className="text-xs font-black uppercase flex items-center gap-2 text-slate-400 mb-6"><MaximizeIcon size={14}/> Araç Ölçüleri</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Toplam Uzunluk (mm)', val: totalLength, set: setTotalLength },
                    { label: 'Genişlik (mm)', val: busWidth, set: setBusWidth },
                    { label: 'Ön Sarkıntı (mm)', val: overhangFront, set: setOverhangFront },
                    { label: 'Arka Sarkıntı (mm)', val: overhangRear, set: setOverhangRear },
                  ].map((item, i) => (
                    <div key={i}>
                      <label className="text-[9px] font-black uppercase text-slate-600 block mb-1">{item.label}</label>
                      <input type="number" value={item.val} onChange={e => item.set(Number(e.target.value))} className={inputCls} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-600 block mb-1">Körük Genişliği (mm)</label>
                    <input type="number" value={jointWidth} onChange={e => setJointWidth(Number(e.target.value))} className={inputCls} />
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        )}

        {/* ═══════════════ BATARYA ANALİZİ ═══════════════ */}
        {activeTab === 'battery-analysis' && (
          <motion.div key="battery-analysis" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <section className={cn(cardCls, "p-8 rounded-[3rem]")}>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-black uppercase flex items-center gap-2"><CpuIcon size={20} className="text-blue-400"/> Batarya Konfigürasyon Analizi</h2>
                  <p className="text-[10px] font-mono text-slate-600 uppercase mt-1">{batteries.length} Bataryadan {targetBatteryCount} Bataryaya Düşüş Optimizasyonu</p>
                  <div className="mt-4 bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                    <InfoIcon size={16} className="text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-300 leading-relaxed">
                      <strong>Bağımsız Analiz:</strong> Bu sekmedeki optimizasyon sonuçları ana "Aks Analizi" sayfasını etkilemez.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="bg-white/[0.03] px-4 py-2 rounded-2xl border border-white/[0.06]">
                    <p className="text-[8px] font-bold uppercase text-slate-600 mb-1">Hedef Batarya Sayısı</p>
                    <select value={targetBatteryCount} onChange={e => setTargetBatteryCount(Number(e.target.value))} className="bg-transparent border-none font-black font-mono text-lg p-0 text-slate-200 cursor-pointer focus:outline-none">
                      {Array.from({ length: batteries.length }).map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                    </select>
                  </div>
                  <div className="bg-blue-500/10 px-4 py-2 rounded-2xl border border-blue-500/20">
                    <p className="text-[8px] font-bold uppercase text-blue-400 opacity-60">Maksimum Yolcu ({targetBatteryCount} Batarya ile)</p>
                    <p className="text-xl font-black font-mono text-blue-300">{batteryAnalysis.maxPassengers}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-600 mb-4">Mevcut Bataryalar ({batteries.length} Adet)</h3>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {batteries.map(bat => (
                      <div key={bat.id} className={cn("p-4 rounded-2xl border transition-all", batteryAnalysis.keepIds.includes(bat.id) ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/5 border-red-500/20 opacity-60")}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase text-slate-300">{bat.name}</span>
                          {batteryAnalysis.keepIds.includes(bat.id) ? <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">TUTULAN</span> : <span className="text-[8px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">ÇIKARILAN</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><p className="text-[7px] font-bold text-slate-600 uppercase">Ağırlık</p><input type="number" value={bat.weight} onChange={e => setBatteries(batteries.map(b => b.id === bat.id ? { ...b, weight: Number(e.target.value) } : b))} className="w-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono p-1 rounded text-slate-300" /></div>
                          <div><p className="text-[7px] font-bold text-slate-600 uppercase">Konum</p><input type="number" value={bat.position} onChange={e => setBatteries(batteries.map(b => b.id === bat.id ? { ...b, position: Number(e.target.value) } : b))} className="w-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono p-1 rounded text-slate-300" /></div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-1">
                          {(() => { const impact = calculateAxleImpact(bat.weight, bat.position); return ['r1','r2','r3'].map((k, i) => (
                            <div key={k} className="text-center"><p className="text-[6px] font-bold text-slate-600 uppercase">Aks {i+1}</p><p className="text-[9px] font-mono font-bold text-slate-400">{Math.round(impact[k])}</p></div>
                          )); })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-8">
                  <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/[0.06]">
                    <h3 className="text-[10px] font-black uppercase text-slate-600 mb-6">Optimum Konfigürasyon Görünümü</h3>
                    <div className="relative h-48 w-full bg-[#161b22] rounded-2xl border border-white/[0.06] flex items-center px-12">
                      <div className="absolute inset-x-8 h-24 border-2 border-slate-700 rounded-xl pointer-events-none" />
                      <div className="relative w-full h-full flex items-center">
                        {batteries.map(bat => (
                          <div key={bat.id} className={cn("absolute w-8 h-12 rounded-lg border-2 flex flex-col items-center justify-center transition-all",
                            batteryAnalysis.keepIds.includes(bat.id) ? "bg-emerald-500 border-emerald-600 shadow-lg scale-110 z-20" : "bg-slate-800 border-slate-700 opacity-20 z-10")}
                            style={{ left: `${(bat.position / totalLength) * 100}%`, transform: 'translateX(-50%)' }}>
                            <CpuIcon size={12} className={batteryAnalysis.keepIds.includes(bat.id) ? "text-white" : "text-slate-500"} />
                            <span className={cn("text-[6px] font-bold mt-1", batteryAnalysis.keepIds.includes(bat.id) ? "text-white" : "text-slate-600")}>B{bat.id.split('-')[1]}</span>
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-4 inset-x-12">
                        {[{ pos: overhangFront, label: '1' }, { pos: overhangFront + wheelbase, label: '2' }, { pos: overhangFront + jointFromAxle1 + axle3FromJoint, label: '3' }].map(a => (
                          <div key={a.label} className="absolute flex flex-col items-center" style={{ left: `${(a.pos / totalLength) * 100}%` }}><div className="w-6 h-3 bg-slate-500 rounded-t-sm" /></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-slate-600">Mevcut Durum ({batteries.length} Batarya)</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {axles.map((axle, i) => (
                          <div key={i} className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06]"><p className="text-[8px] font-bold text-slate-600 uppercase mb-1">Aks {i + 1}</p><p className="text-sm font-black font-mono text-slate-300">{Math.round(axle.emptyLoad).toLocaleString()} kg</p></div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-emerald-400">Optimize Durum ({targetBatteryCount} Batarya)</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {batteryAnalysis.loads.map((load, i) => (
                          <div key={i} className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20"><p className="text-[8px] font-bold text-emerald-400 uppercase mb-1">Aks {i + 1}</p><p className="text-sm font-black font-mono text-emerald-300">{Math.round(load).toLocaleString()} kg</p></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {batteryAnalysis.loads.map((load, i) => (
                      <div key={i} className={cn(cardCls, "p-6")}>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black uppercase text-slate-500">Aks {i + 1} Yükü</span>
                          <span className={cn("text-[8px] font-bold px-2 py-0.5 rounded-full", load <= axles[i].capacity ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>{load <= axles[i].capacity ? 'UYGUN' : 'AŞIM'}</span>
                        </div>
                        <p className="text-2xl font-black font-mono text-slate-200">{Math.round(load).toLocaleString()} kg</p>
                        <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all", load <= axles[i].capacity ? "bg-emerald-500" : "bg-red-500")} style={{ width: `${Math.min(100, (load / axles[i].capacity) * 100)}%` }} />
                        </div>
                        <p className="text-[8px] font-bold text-slate-600 mt-1 uppercase text-right">Kapasite: {axles[i].capacity.toLocaleString()} kg</p>
                      </div>
                    ))}
                  </div>

                  <div className={`${isDark ? 'bg-[#0d1117] text-white border-white/[0.06]' : 'bg-slate-50 text-slate-800 border-slate-200'} p-8 rounded-[2rem] flex items-center justify-between border`}>
                    <div>
                      <h4 className="text-sm font-black uppercase mb-1">Analiz Sonucu</h4>
                      <p className="text-xs text-slate-500 max-w-md">
                        {batteries.length} bataryadan seçilen {targetBatteryCount} batarya, aracın ağırlık merkezini optimize ederek GVW ve aks limitleri dahilinde
                        <span className="text-emerald-400 font-bold mx-1">maksimum {batteryAnalysis.maxPassengers} yolcu</span>
                        taşınmasına olanak sağlar.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Toplam Ağırlık (Dolu)</p>
                      <p className="text-3xl font-black font-mono text-emerald-400">{Math.round(batteryAnalysis.totalWeight).toLocaleString()} kg</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
