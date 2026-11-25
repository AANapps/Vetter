import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Menu, Plus, Trash2, Users } from 'lucide-react';
import { CalEvent, CalendarConfig, calendarEvents } from '../../lib/deskApps';
import { DeskCtx, Modal, accent, btn, input, personName, primary } from './shared';

const DAY_MS = 86400000;
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const dayName = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
// The month beside the week, as calendars show it, with this week picked out
const MiniMonth: React.FC<{ month: Date; today: string; week: string[] }> = ({ month, today, week }) => {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(first.getTime() + (i - lead) * DAY_MS));
  return (
    <div className="text-[11px]">
      <div className="px-1 mb-1 text-[13px] font-medium">{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</div>
      <div className="grid grid-cols-7 text-center gap-y-0.5">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-[#70757a]">{d}</span>
        ))}
        {cells.map((d) => {
          const s = iso(d);
          return (
            <span key={s} className={`mx-auto w-6 h-6 grid place-items-center rounded-full ${s === today ? 'bg-[#1a73e8] text-white' : week.includes(s) ? 'bg-[#e8f0fe] text-[#1967d2]' : d.getUTCMonth() !== first.getUTCMonth() ? 'text-[#b0b3b8]' : ''}`}>
              {d.getUTCDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
};
const overlaps = (a: CalEvent, b: { date: string; start: string; end: string }) => a.date === b.date && mins(a.start) < mins(b.end) && mins(b.start) < mins(a.end);

// Outlook/Google-style calendar: the working week, the candidate's meetings and invitations (accept, tentative,
// decline), and new meetings with a scheduling view of each invitee's busy times, warning of clashes
export const CalendarApp: React.FC<{ ctx: DeskCtx; cfg: CalendarConfig }> = ({ ctx, cfg }) => {
  const work = ctx.state.desk?.calendar ?? {};
  const me = ctx.me.email.toLowerCase();
  const all = calendarEvents(cfg, work);
  const mine = all.filter((e) => !e.owner || e.owner.toLowerCase() === me || (e.attendees ?? []).some((a) => a.toLowerCase() === me));
  const [week, setWeek] = useState(0);
  const [draft, setDraft] = useState<CalEvent | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [h0, h1] = cfg.hours ?? [8, 18];
  const start = new Date(toDate(cfg.weekOf).getTime() + week * 7 * DAY_MS);
  const days = Array.from({ length: 5 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  const today = cfg.today ?? cfg.weekOf;
  const HOUR = 48;
  const made = (id: string) => (work.events ?? []).some((e) => e.id === id);
  const open = all.find((e) => e.id === openId);
  const save = (patch: Partial<typeof work>) => ctx.setWork('calendar', { ...work, ...patch });

  return (
    <div className="h-full flex flex-col text-[13px] text-[#3c4043]" data-ref="calendar" style={accent('#1a73e8', '#e8f0fe')}>
      <div className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-[#dadce0]">
        <Menu className="w-5 h-5 text-[#5f6368] mx-1" />
        <span className="w-8 h-8 rounded bg-[#1a73e8] grid place-items-center text-white text-[11px] font-bold">{toDate(today).getUTCDate()}</span>
        <span className="text-[20px] text-[#3c4043] mr-8">Calendar</span>
        <button className="h-9 px-4 rounded-full border border-[#dadce0] hover:bg-[#f1f3f4] text-[14px] font-medium" onClick={() => setWeek(0)}>
          Today
        </button>
        <button onClick={() => setWeek((w) => w - 1)} aria-label="Previous week" className="w-8 h-8 grid place-items-center rounded-full hover:bg-[#f1f3f4]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setWeek((w) => w + 1)} aria-label="Next week" className="w-8 h-8 grid place-items-center rounded-full hover:bg-[#f1f3f4]">
          <ChevronRight className="w-5 h-5" />
        </button>
        <span className="text-[22px] text-[#3c4043]">{start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
        <span className="ml-auto h-9 px-4 rounded-full border border-[#dadce0] text-[14px] grid place-items-center">Week</span>
      </div>
      <div className="flex-1 min-h-0 flex">
      <aside className="w-56 shrink-0 p-3 space-y-5 hidden md:block">
        <button
          className="h-14 pl-4 pr-6 rounded-2xl bg-white shadow-[0_1px_3px_rgba(60,64,67,.3),0_4px_8px_3px_rgba(60,64,67,.15)] hover:bg-[#f6fafe] inline-flex items-center gap-3 text-[14px] font-medium"
          onClick={() => setDraft({ id: '', title: '', date: today, start: '10:00', end: '10:30', attendees: [] })}
          data-ref="cal-new"
        >
          <Plus className="w-6 h-6 text-[#1a73e8]" />
          Create
        </button>
        <MiniMonth month={start} today={today} week={days.map(iso)} />
        <div className="text-[12px]">
          <div className="font-medium mb-1.5">My calendars</div>
          <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm bg-[#039be5]" />{ctx.me.name}</div>
          <div className="flex items-center gap-2 mt-1"><span className="w-3.5 h-3.5 rounded-sm bg-[#7986cb]" />Invitations</div>
        </div>
      </aside>
      <div className="flex-1 overflow-y-auto">
        <div className="grid sticky top-0 z-10 bg-white border-b border-slate-200" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
          <span />
          {days.map((d) => (
            <div key={iso(d)} className={`py-2 text-center ${iso(d) === today ? 'text-[#1a73e8]' : 'text-[#70757a]'}`}>
              <div className="text-[11px] font-medium uppercase">{d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}</div>
              <div className={`mx-auto mt-0.5 w-11 h-11 rounded-full grid place-items-center text-[24px] ${iso(d) === today ? 'bg-[#1a73e8] text-white' : 'text-[#3c4043]'}`}>{d.getUTCDate()}</div>
            </div>
          ))}
        </div>
        <div className="grid relative" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
          <div className="relative">
            {Array.from({ length: h1 - h0 }, (_, i) => (
              <div key={i} style={{ top: i * HOUR + 2 }} className="absolute right-2 text-[10.5px] text-slate-400">
                {hhmm((h0 + i) * 60)}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const date = iso(d);
            return (
              <div
                key={date}
                className="relative border-l border-slate-200"
                style={{ height: HOUR * (h1 - h0) }}
                onDoubleClick={(e) => {
                  const y = e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top;
                  const m = h0 * 60 + Math.floor(y / (HOUR / 2)) * 30;
                  setDraft({ id: '', title: '', date, start: hhmm(m), end: hhmm(m + 30), attendees: [] });
                }}
                title="Double-click to add a meeting"
              >
                {Array.from({ length: h1 - h0 }, (_, i) => (
                  <div key={i} style={{ top: i * HOUR, height: HOUR }} className="absolute inset-x-0 border-t border-slate-100" />
                ))}
                {mine
                  .filter((e) => e.date === date)
                  .map((e) => {
                    const top = ((mins(e.start) - h0 * 60) / 60) * HOUR;
                    const h = Math.max(((mins(e.end) - mins(e.start)) / 60) * HOUR, 18);
                    const r = work.responses?.[e.id];
                    return (
                      <button
                        key={e.id}
                        onClick={() => setOpenId(e.id)}
                        style={{ top, height: h }}
                        className={`absolute left-0.5 right-2 rounded-md px-2 py-0.5 text-left text-[12px] overflow-hidden ${
                          r === 'no' ? 'bg-white border border-[#dadce0] text-[#70757a] line-through' : made(e.id) ? 'bg-[#039be5] text-white' : 'bg-[#7986cb] text-white'
                        } ${r === 'maybe' ? 'bg-white !text-[#3c4043] border border-dashed border-[#7986cb]' : ''} ${!r && !made(e.id) ? 'ring-1 ring-white' : ''}`}
                      >
                        <div className="font-medium truncate">{e.title}</div>
                        <div className="truncate opacity-80">
                          {e.start}–{e.end}
                          {e.location ? ` · ${e.location}` : ''}
                        </div>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
      </div>
      {open && (
        <Modal
          title={open.title}
          onClose={() => setOpenId(null)}
          footer={
            made(open.id) ? (
              <>
                <button className={btn} onClick={() => (save({ events: (work.events ?? []).filter((e) => e.id !== open.id) }), setOpenId(null), ctx.toast('Meeting cancelled'))}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel meeting
                </button>
                <button className={primary} onClick={() => (setDraft(open), setOpenId(null))}>
                  Edit
                </button>
              </>
            ) : (
              <>
                {(['yes', 'maybe', 'no'] as const).map((r) => (
                  <button key={r} className={work.responses?.[open.id] === r ? primary : btn} onClick={() => (save({ responses: { ...(work.responses ?? {}), [open.id]: r } }), ctx.toast(r === 'yes' ? 'Accepted' : r === 'no' ? 'Declined' : 'Tentative'))}>
                    {r === 'yes' ? 'Accept' : r === 'no' ? 'Decline' : 'Tentative'}
                  </button>
                ))}
              </>
            )
          }
        >
          <p className="text-slate-700">
            {dayName(toDate(open.date))}, {open.start}–{open.end}
          </p>
          {open.location && (
            <p className="flex items-center gap-1.5 text-slate-600">
              <MapPin className="w-3.5 h-3.5" />
              {open.location}
            </p>
          )}
          {open.attendees?.length ? (
            <p className="flex items-start gap-1.5 text-slate-600">
              <Users className="w-3.5 h-3.5 mt-0.5" />
              {open.attendees.map((a) => personName(ctx.cfg, a)).join(', ')}
            </p>
          ) : null}
          {open.notes && <p className="whitespace-pre-wrap text-slate-800 border-t border-slate-100 pt-2">{open.notes}</p>}
        </Modal>
      )}
      {draft && (
        <EventEditor
          ctx={ctx}
          all={all}
          draft={draft}
          onClose={() => setDraft(null)}
          onSave={(e) => {
            const id = e.id || `ev-${Date.now().toString(36)}`;
            const ev = { ...e, id };
            save({ events: [...(work.events ?? []).filter((x) => x.id !== id), ev] });
            setDraft(null);
            ctx.toast(e.attendees?.length ? `Invitation sent to ${e.attendees.map((a) => personName(ctx.cfg, a)).join(', ')}` : 'Saved to your calendar');
            const diff = Math.floor((toDate(ev.date).getTime() - toDate(cfg.weekOf).getTime()) / (7 * DAY_MS));
            setWeek(diff);
          }}
        />
      )}
    </div>
  );
};

const EventEditor: React.FC<{ ctx: DeskCtx; all: CalEvent[]; draft: CalEvent; onClose: () => void; onSave: (e: CalEvent) => void }> = ({ ctx, all, draft, onClose, onSave }) => {
  const [e, setE] = useState(draft);
  const [who, setWho] = useState('');
  const people = [ctx.me.email, ...(e.attendees ?? [])];
  // Everyone's busy times that day: their own events and meetings they're in
  const busy = (email: string) => all.filter((x) => x.id !== e.id && x.date === e.date && ((x.owner ?? ctx.me.email).toLowerCase() === email.toLowerCase() || (x.attendees ?? []).some((a) => a.toLowerCase() === email.toLowerCase())));
  const clashes = people.filter((p) => busy(p).some((x) => overlaps(x, e)));
  const bad = !e.title.trim() || mins(e.end) <= mins(e.start);
  const add = () => {
    const email = (who.match(/<([^>]+)>/)?.[1] ?? who).trim();
    if (email && /@/.test(email) && !(e.attendees ?? []).includes(email)) setE({ ...e, attendees: [...(e.attendees ?? []), email] });
    setWho('');
  };
  const H0 = 8 * 60;
  const H1 = 18 * 60;
  return (
    <Modal
      title={draft.id ? 'Edit meeting' : 'New meeting'}
      onClose={onClose}
      wide
      footer={
        <>
          <button className={btn} onClick={onClose}>
            Discard
          </button>
          <button className={primary} disabled={bad} onClick={() => onSave({ ...e, title: e.title.trim() })} data-ref="cal-send">
            {e.attendees?.length ? 'Send' : 'Save'}
          </button>
        </>
      }
    >
      <input value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} placeholder="Add a title" className={`${input} !h-9 !text-[15px]`} data-ref="cal-title" autoFocus />
      <div className="flex flex-wrap gap-2">
        <input type="date" value={e.date} onChange={(x) => setE({ ...e, date: x.target.value })} className={`${input} !w-40`} aria-label="Date" />
        <input type="time" step={900} value={e.start} onChange={(x) => setE({ ...e, start: x.target.value })} className={`${input} !w-28`} aria-label="Start" />
        <span className="self-center">to</span>
        <input type="time" step={900} value={e.end} onChange={(x) => setE({ ...e, end: x.target.value })} className={`${input} !w-28`} aria-label="End" />
      </div>
      <div>
        <div className="flex gap-1">
          <input
            list="cal-contacts"
            value={who}
            onChange={(x) => setWho(x.target.value)}
            onKeyDown={(x) => x.key === 'Enter' && (x.preventDefault(), add())}
            placeholder="Invite attendees"
            className={input}
            data-ref="cal-attendee"
          />
          <button className={btn} onClick={add}>
            Add
          </button>
          <datalist id="cal-contacts">
            {ctx.cfg.contacts.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name} · {c.role}
              </option>
            ))}
          </datalist>
        </div>
      </div>
      {/* The scheduling view: each person's busy times that day, and the meeting over them */}
      <div className="border border-slate-200 rounded-md overflow-hidden">
        {people.map((p) => (
          <div key={p} className="flex items-center border-b border-slate-100 last:border-0">
            <span className="w-40 shrink-0 px-2 py-1.5 text-xs truncate flex items-center gap-1">
              {p !== ctx.me.email && (
                <button onClick={() => setE({ ...e, attendees: (e.attendees ?? []).filter((a) => a !== p) })} aria-label={`Remove ${p}`} className="text-slate-400 hover:text-rose-600">
                  ×
                </button>
              )}
              {p === ctx.me.email ? 'You' : personName(ctx.cfg, p)}
            </span>
            <span className="relative flex-1 h-6 bg-slate-50">
              {busy(p).map((x) => (
                <span key={x.id} title={`${x.title} ${x.start}–${x.end}`} className="absolute inset-y-1 bg-slate-400/70 rounded-sm" style={{ left: `${((mins(x.start) - H0) / (H1 - H0)) * 100}%`, width: `${((mins(x.end) - mins(x.start)) / (H1 - H0)) * 100}%` }} />
              ))}
              <span className="absolute inset-y-0 border-x-2 border-sky-600 bg-sky-500/15" style={{ left: `${((mins(e.start) - H0) / (H1 - H0)) * 100}%`, width: `${(Math.max(mins(e.end) - mins(e.start), 0) / (H1 - H0)) * 100}%` }} />
            </span>
          </div>
        ))}
        <div className="flex text-[10px] text-slate-400 pl-40">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="flex-1">
              {8 + i}:00
            </span>
          ))}
        </div>
      </div>
      {clashes.length > 0 && <p className="text-xs text-amber-700">Clashes with {clashes.map((p) => (p === ctx.me.email ? 'your calendar' : personName(ctx.cfg, p))).join(', ')}.</p>}
      <input value={e.location ?? ''} onChange={(x) => setE({ ...e, location: x.target.value })} placeholder="Location or call link" className={input} />
      <textarea value={e.notes ?? ''} onChange={(x) => setE({ ...e, notes: x.target.value })} rows={4} placeholder="Agenda" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md" />
    </Modal>
  );
};
