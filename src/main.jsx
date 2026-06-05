import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { CalendarDays, Plus, Printer, Trash2, Edit3, X, ChevronLeft, ChevronRight, Users, ListChecks } from 'lucide-react';
import './styles.css';

const PEOPLE = [
  { name: 'Chris', color: 'red', hex: '#ef4444' },
  { name: 'Sam', color: 'orange', hex: '#f97316' },
  { name: 'Taylor', color: 'purple', hex: '#a855f7' },
  { name: 'Aiden', color: 'green', hex: '#22c55e' },
  { name: 'Family', color: 'slate', hex: '#64748b' },
];

const SAMPLE_EVENTS = [
  { id: crypto.randomUUID(), person: 'Taylor', title: 'Soccer Away', date: '2026-06-07', start_time: '09:30', end_time: '', location: 'WL', notes: 'Game 10:00' },
  { id: crypto.randomUUID(), person: 'Aiden', title: 'Lightning Warriors Bike/Run', date: '2026-06-07', start_time: '14:30', end_time: '16:00', location: 'Heckscher - Field 4', notes: '' },
  { id: crypto.randomUUID(), person: 'Aiden', title: 'Swim', date: '2026-06-08', start_time: '18:30', end_time: '20:00', location: 'YMCA Roe', notes: '' },
  { id: crypto.randomUUID(), person: 'Taylor', title: 'NRG', date: '2026-06-08', start_time: '19:30', end_time: '20:30', location: '', notes: '' },
  { id: crypto.randomUUID(), person: 'Chris', title: 'Rapid Rinse', date: '2026-06-08', start_time: '20:00', end_time: '', location: '', notes: '' },
  { id: crypto.randomUUID(), person: 'Family', title: 'Leave for Maryland', date: '2026-06-12', start_time: '16:00', end_time: '', location: '', notes: '' },
];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function isoDate(date) { return date.toISOString().slice(0, 10); }
function prettyRange(start) {
  const end = addDays(start, 6);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}
function dateLabel(date) { return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date); }
function dayNum(date) { return new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(date); }
function timeText(e) {
  if (!e.start_time) return '';
  const clean = t => {
    const [h, m] = t.split(':');
    const hour = Number(h);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${suffix}`;
  };
  return e.end_time ? `${clean(e.start_time)} - ${clean(e.end_time)}` : clean(e.start_time);
}
function personMeta(person) { return PEOPLE.find(p => p.name === person) || PEOPLE[4]; }

function App() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activePeople, setActivePeople] = useState(PEOPLE.map(p => p.name));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekStartIso = isoDate(weekStart);
  const weekEndIso = isoDate(addDays(weekStart, 6));

  useEffect(() => { loadEvents(); }, [weekStartIso]);

  async function loadEvents() {
    setLoading(true);
    if (supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', weekStartIso)
        .lte('date', weekEndIso)
        .order('date')
        .order('start_time');
      if (!error) setEvents(data || []);
    } else {
      const saved = JSON.parse(localStorage.getItem('family-events') || 'null') || SAMPLE_EVENTS;
      localStorage.setItem('family-events', JSON.stringify(saved));
      setEvents(saved.filter(e => e.date >= weekStartIso && e.date <= weekEndIso));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('events-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [weekStartIso]);

  async function saveEvent(payload) {
    const clean = { ...payload, end_time: payload.end_time || null, start_time: payload.start_time || null };
    if (supabase) {
      if (editing?.id) await supabase.from('events').update(clean).eq('id', editing.id);
      else await supabase.from('events').insert([{ ...clean }]);
    } else {
      const all = JSON.parse(localStorage.getItem('family-events') || '[]');
      const next = editing?.id ? all.map(e => e.id === editing.id ? { ...e, ...clean } : e) : [...all, { id: crypto.randomUUID(), ...clean }];
      localStorage.setItem('family-events', JSON.stringify(next));
    }
    setFormOpen(false); setEditing(null); loadEvents();
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    if (supabase) await supabase.from('events').delete().eq('id', id);
    else {
      const all = JSON.parse(localStorage.getItem('family-events') || '[]');
      localStorage.setItem('family-events', JSON.stringify(all.filter(e => e.id !== id)));
    }
    loadEvents();
  }

  const filteredEvents = events.filter(e => activePeople.includes(e.person));
  const upcoming = [...filteredEvents].sort((a,b)=> `${a.date}${a.start_time||''}`.localeCompare(`${b.date}${b.start_time||''}`));

  return <div className="app">
    <header className="topbar no-print">
      <div className="brand"><div className="logo"><CalendarDays size={24}/></div><div><h1>Family Command Center</h1><p>Chris • Sam • Taylor • Aiden</p></div></div>
      <button className="primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={18}/> Add Event</button>
    </header>

    <section className="controls no-print">
      <button onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={18}/> Last Week</button>
      <button onClick={() => setWeekStart(startOfWeek(new Date()))}>This Week</button>
      <button onClick={() => setWeekStart(addDays(weekStart, 7))}>Next Week <ChevronRight size={18}/></button>
      <button onClick={() => window.print()}><Printer size={18}/> Print</button>
      <div className="filters">
        {PEOPLE.map(p => <button key={p.name} className={activePeople.includes(p.name) ? 'chip on' : 'chip'} style={{'--person': p.hex}} onClick={() => setActivePeople(prev => prev.includes(p.name) ? prev.filter(x => x !== p.name) : [...prev, p.name])}>{p.name}</button>)}
      </div>
    </section>

    <main className="layout">
      <section className="calendar-card">
        <div className="print-title"><h2>{prettyRange(weekStart)}</h2><span>Weekly Family Schedule</span></div>
        <div className="week-grid">
          {weekDays.map(day => {
            const dayIso = isoDate(day);
            const dayEvents = filteredEvents.filter(e => e.date === dayIso).sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''));
            return <div className="day" key={dayIso}>
              <div className="day-head"><span>{dateLabel(day)}</span><strong>{dayNum(day)}</strong></div>
              <div className="event-stack">
                {dayEvents.map(e => <EventCard key={e.id} event={e} onEdit={() => { setEditing(e); setFormOpen(true); }} onDelete={() => deleteEvent(e.id)} />)}
              </div>
            </div>
          })}
        </div>
      </section>

      <aside className="side no-print">
        <h3><Users size={18}/> People</h3>
        <div className="person-list">{PEOPLE.slice(0,4).map(p => <div className="person" key={p.name}><span style={{background:p.hex}}></span>{p.name}</div>)}</div>
        <h3><ListChecks size={18}/> This Week</h3>
        <div className="agenda">{loading ? 'Loading...' : upcoming.map(e => <div className="agenda-item" key={e.id}><b>{e.title}</b><small>{e.person} • {e.date} • {timeText(e)}</small></div>)}</div>
        {!supabase && <div className="offline-note">Demo mode: this uses your browser storage. Connect Supabase for live shared updates on every phone.</div>}
      </aside>
    </main>

    {formOpen && <EventForm initial={editing} defaultDate={weekStartIso} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={saveEvent} />}
  </div>;
}

function EventCard({ event, onEdit, onDelete }) {
  const p = personMeta(event.person);
  return <article className="event" style={{'--person': p.hex}}>
    <div className="event-top"><span>{event.person}</span><div className="event-actions no-print"><button onClick={onEdit}><Edit3 size={14}/></button><button onClick={onDelete}><Trash2 size={14}/></button></div></div>
    <h4>{event.title}</h4>
    {timeText(event) && <p>{timeText(event)}</p>}
    {event.location && <p>{event.location}</p>}
    {event.notes && <small>{event.notes}</small>}
  </article>
}

function EventForm({ initial, defaultDate, onClose, onSave }) {
  const [form, setForm] = useState(initial || { person: 'Taylor', title: '', date: defaultDate, start_time: '', end_time: '', location: '', notes: '' });
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  return <div className="modal-backdrop"><div className="modal">
    <div className="modal-head"><h2>{initial ? 'Edit Event' : 'Add Event'}</h2><button onClick={onClose}><X/></button></div>
    <label>Person<select value={form.person} onChange={e=>set('person',e.target.value)}>{PEOPLE.map(p=><option key={p.name}>{p.name}</option>)}</select></label>
    <label>Event Title<input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Swim, NRG, Karate, Travel..."/></label>
    <div className="two"><label>Date<input type="date" value={form.date} onChange={e=>set('date',e.target.value)}/></label><label>Start<input type="time" value={form.start_time || ''} onChange={e=>set('start_time',e.target.value)}/></label></div>
    <div className="two"><label>End<input type="time" value={form.end_time || ''} onChange={e=>set('end_time',e.target.value)}/></label><label>Location<input value={form.location || ''} onChange={e=>set('location',e.target.value)} placeholder="Sachem East"/></label></div>
    <label>Notes<textarea value={form.notes || ''} onChange={e=>set('notes',e.target.value)} placeholder="Game 10:00, bring gear, etc."/></label>
    <button className="primary wide" disabled={!form.title || !form.date} onClick={() => onSave(form)}>{initial ? 'Save Changes' : 'Add Event'}</button>
  </div></div>
}

createRoot(document.getElementById('root')).render(<App />);
