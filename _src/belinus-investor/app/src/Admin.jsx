// Administration of the investor area (Belinus and EVChargeking).
const adm = (action, body) => fn('bel-inv-admin', { action, ...(body || {}) });
const nameOf = (i) => i.company_name || [i.first_name, i.last_name].filter(Boolean).join(' ') || i.email;
function csvDownload(name, rows) {
  const safe = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const blob = new Blob(['﻿' + rows.map((r) => r.map(safe).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function useLoad(action, body) {
  const [data, set] = useState(null), [err, setErr] = useState('');
  const load = useCallback(() => adm(action, body).then(set).catch((x) => setErr(errText(x))), [action]);
  useEffect(() => { load(); }, [load]);
  return [data, load, err];
}
const Wait = ({ err }) => (err ? <Note kind="error">{err}</Note> : <div className="boot" style={{ minHeight: 200 }}><span className="spin" /></div>);
function AdmOverview() {
  const [d, , err] = useLoad('dashboard');
  if (!d) return <Wait err={err} />;
  const real = d.investors.filter((i) => !i.is_test);
  const list = real.length ? real : d.investors;
  const cnt = (f) => { const x = list.filter(f); return [x.length, x.reduce((n, i) => n + Number(i.invested), 0)]; };
  const T = [['Uitgenodigd', () => true], ['Account actief', (i) => i.status === 'active'], ['Keuze gemaakt', (i) => i.choice], ['Keuze A', (i) => i.choice?.choice === 'A'], ['Keuze B', (i) => i.choice?.choice === 'B'], ['Keuze C', (i) => i.choice?.choice === 'C'], ['Geen antwoord', (i) => !i.choice]];
  const plOf = (i) => d.tranches.find((t) => t.code === i.tranche)?.platform || 'winwinner';
  const stat = (x) => { const c = (k) => x.filter((i) => i.choice?.choice === k).length; return { n: x.length, s: x.reduce((n, i) => n + Number(i.invested), 0), act: x.filter((i) => i.status === 'active').length, A: c('A'), B: c('B'), C: c('C'), none: x.filter((i) => !i.choice).length }; };
  const plRow = (label, x, bold) => { const v = stat(x); return <tr key={label} style={bold ? { fontWeight: 700 } : undefined}><td data-l="Platform">{label}</td><td data-l="Investeerders" className="n">{v.n}</td><td data-l="Bedrag" className="n">{eur(v.s)}</td><td data-l="Account actief" className="n">{v.act}</td><td data-l="A" className="n">{v.A}</td><td data-l="B" className="n">{v.B}</td><td data-l="C" className="n">{v.C}</td><td data-l="Geen antwoord" className="n">{v.none}</td></tr>; };
  return <>
    <div className="page-head"><div><h1 className="page-title">Overzicht</h1><p className="page-sub">Uiterste datum: {dayNl(d.settings.deadline)}{!real.length && d.investors.length ? ' · enkel testinvesteerders geladen' : ''}</p></div></div>
    <div className="tiles">{T.map(([l, f]) => { const [n, s] = cnt(f); return <div className="tile" key={l}><b>{n}</b><span>{l} · {eur(s)}</span></div>; })}</div>
    <div className="card"><h2>Per platform</h2><div className="tblw"><table className="tbl cards"><thead><tr><th>Platform</th><th className="n">Investeerders</th><th className="n">Bedrag</th><th className="n">Account actief</th><th className="n">A</th><th className="n">B</th><th className="n">C</th><th className="n">Geen antwoord</th></tr></thead><tbody>
      {Object.keys(PLATFORMS).map((k) => plRow(PLATFORMS[k], list.filter((i) => plOf(i) === k)))}{plRow('Totaal', list, true)}
    </tbody></table></div></div>
    <div className="card"><h2>Per tranche</h2><div className="tblw"><table className="tbl cards"><thead><tr><th>Tranche</th><th className="n">Investeerders</th><th className="n">Bedrag</th><th className="n">A</th><th className="n">B</th><th className="n">C</th><th className="n">Geen antwoord</th></tr></thead><tbody>
      {d.tranches.map((t) => { const inT = list.filter((i) => i.tranche === t.code), c = (k) => inT.filter((i) => i.choice?.choice === k).length; return <tr key={t.code}><td data-l="Tranche">{t.name}</td><td data-l="Investeerders" className="n">{inT.length}</td><td data-l="Bedrag" className="n">{eur(inT.reduce((n, i) => n + Number(i.invested), 0))}</td><td data-l="A" className="n">{c('A')}</td><td data-l="B" className="n">{c('B')}</td><td data-l="C" className="n">{c('C')}</td><td data-l="Geen antwoord" className="n">{inT.filter((i) => !i.choice).length}</td></tr>; })}
    </tbody></table></div></div></>;
}
function AdmInvestors() {
  const [d, load, err] = useLoad('dashboard');
  const [pl, setPl] = useState(''), [q, setQ] = useState(''), [tr, setTr] = useState(''), [ch, setCh] = useState(''), [open, setOpen] = useState(null);
  if (!d) return <Wait err={err} />;
  const plCode = (c) => d.tranches.find((t) => t.code === c)?.platform || 'winwinner';
  const rows = d.investors.filter((i) => (!pl || plCode(i.tranche) === pl) && (!tr || i.tranche === tr) && (!ch || (ch === 'none' ? !i.choice : i.choice?.choice === ch)) && (!q || (nameOf(i) + ' ' + i.email).toLowerCase().includes(q.toLowerCase())));
  const trName = (c) => d.tranches.find((t) => t.code === c)?.name || c;
  const exp = () => csvDownload('investeerders.csv', [['Naam', 'Bedrijf', 'E-mail', 'Platform', 'Tranche', 'Bedrag', 'Keuze', 'Datum keuze', 'Reden C', 'Wensen B', 'Status account', 'Addendum'], ...rows.map((i) => [[i.first_name, i.last_name].filter(Boolean).join(' '), i.company_name, i.email, platformName(plCode(i.tranche)), trName(i.tranche), i.invested, i.choice?.choice, i.choice?.confirmed_at, i.choice?.reason, i.choice?.wish, i.status, i.choice?.addendum_status])]);
  return <>
    <div className="page-head"><div><h1 className="page-title">Investeerders</h1><p className="page-sub">{rows.length} van {d.investors.length}</p></div>{d.role === 'belinus' && <button className="btn ghost sm" onClick={exp}>Exporteer CSV</button>}</div>
    <div className="card"><div className="grid2" style={{ marginBottom: 14 }}><input type="search" placeholder="Zoek op naam of e-mail" value={q} onChange={(e) => setQ(e.target.value)} /><div className="row"><select value={pl} onChange={(e) => setPl(e.target.value)}><option value="">Alle platformen</option>{Object.keys(PLATFORMS).map((k) => <option key={k} value={k}>{PLATFORMS[k]}</option>)}</select><select value={tr} onChange={(e) => setTr(e.target.value)}><option value="">Alle tranches</option>{d.tranches.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select><select value={ch} onChange={(e) => setCh(e.target.value)}><option value="">Alle keuzes</option><option>A</option><option>B</option><option>C</option><option value="none">Geen antwoord</option></select></div></div>
      <div className="tblw"><table className="tbl cards"><thead><tr><th>Investeerder</th><th>Platform</th><th>Tranche</th><th className="n">Bedrag</th><th>Keuze</th><th>Account</th><th>Laatst aangemeld</th></tr></thead><tbody>{rows.map((i) => <tr key={i.id} className="click" onClick={() => setOpen(i.id)}><td data-l="Investeerder"><b>{nameOf(i)}</b>{i.is_test && <span className="chip warn" style={{ marginLeft: 6 }}>test</span>}<br /><span className="hint">{i.email}</span></td><td data-l="Platform">{platformName(plCode(i.tranche))}</td><td data-l="Tranche">{trName(i.tranche)}</td><td data-l="Bedrag" className="n">{eur(i.invested)}</td><td data-l="Keuze">{i.choice ? <span className="chip info">{i.choice.choice}</span> : <span className="chip warn">—</span>}</td><td data-l="Account"><span className={'chip ' + (i.status === 'active' ? 'ok' : '')}>{i.status === 'active' ? 'actief' : 'uitgenodigd'}</span></td><td data-l="Laatst aangemeld">{i.last_login_at ? dayNl(i.last_login_at) : '—'}</td></tr>)}</tbody></table></div></div>
    {open && <InvDetail id={open} onClose={() => { setOpen(null); load(); }} />}</>;
}
function InvDetail({ id, onClose }) {
  const [d, setD] = useState(null), [c, setC] = useState(''), [note, setNote] = useState(''), [reason, setReason] = useState(''), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const load = () => adm('detail', { id }).then(setD).catch((x) => setErr(errText(x)));
  useEffect(() => { load(); }, [id]);
  async function rec() { setErr(''); setMsg(''); try { await adm('record_choice', { id, choice: c, note, reason }); setMsg('Keuze geregistreerd.'); setC(''); setNote(''); load(); } catch (x) { setErr(errText(x)); } }
  async function invite() { setErr(''); setMsg(''); try { await adm('resend_invite', { id }); setMsg('Uitnodiging verstuurd.'); } catch (x) { setErr(errText(x)); } }
  return <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="modal stack">{!d ? <Wait err={err} /> : <>
    <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ fontSize: 21 }}>{nameOf(d.investor)}</h2><button className="btn ghost sm" onClick={onClose}>Sluiten</button></div>
    <p style={{ margin: 0 }}>{d.investor.email}{d.investor.phone ? ' · ' + d.investor.phone : ''}{d.investor.iban_masked ? ' · ' + d.investor.iban_masked : ''}</p>
    <Note kind="ok">{msg}</Note><Note kind="error">{err}</Note>
    <Schedule rows={d.schedule.filter((r) => r.scenario === 'original')} />
    <div><h3 style={{ fontSize: 16, marginBottom: 8 }}>Geschiedenis van keuzes</h3>{d.log.length ? d.log.map((l) => <p key={l.id} style={{ margin: '0 0 4px', fontSize: 14 }}><b>{l.choice}</b> · {whenNl(l.created_at)}{l.by_admin ? ' · door beheerder: ' + l.note : ''}{l.reason ? ' · ' + l.reason : ''}</p>) : <p className="hint">Nog geen keuze.</p>}</div>
    <div className="stack"><h3 style={{ fontSize: 16 }}>Keuze registreren (ontvangen per telefoon of e-mail)</h3><div className="grid2"><select value={c} onChange={(e) => setC(e.target.value)}><option value="">Kies…</option><option>A</option><option>B</option><option>C</option></select><input placeholder="Notitie (verplicht)" value={note} onChange={(e) => setNote(e.target.value)} /></div>{c === 'C' && <input placeholder="Reden (verplicht)" value={reason} onChange={(e) => setReason(e.target.value)} />}<div className="row"><Btn kind="ghost" disabled={!c || !note.trim()} onClick={rec}>Registreren</Btn><Btn kind="ghost" onClick={invite}>Uitnodiging opnieuw sturen</Btn></div></div></>}</div></div>;
}
function AdmFollow() {
  const [d, load, err] = useLoad('dashboard');
  if (!d) return <Wait err={err} />;
  const inv = new Map(d.investors.map((i) => [i.id, i]));
  const save = (id, patch) => adm('followup', { id, ...patch }).then(load);
  const rows = (d.followups || []).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  return <><div className="page-head"><div><h1 className="page-title">Opvolging</h1><p className="page-sub">Keuze B: terugbetalingsvoorstel. Keuze C: contact binnen 5 werkdagen.</p></div></div>
    <div className="card">{!rows.length ? <p style={{ margin: 0 }}>Nog niets op te volgen.</p> : <div className="tblw"><table className="tbl cards"><thead><tr><th>Investeerder</th><th>Keuze</th><th>Uiterlijk</th><th>Toelichting</th><th>Status</th><th>Notitie</th></tr></thead><tbody>{rows.map((f) => { const i = inv.get(f.investor_id); return <tr key={f.id}><td data-l="Investeerder"><b>{nameOf(i)}</b><br /><span className="hint">{eur(i.invested)}</span></td><td data-l="Keuze"><span className="chip info">{f.kind}</span></td><td data-l="Uiterlijk">{dayNl(f.due_date)}</td><td data-l="Toelichting">{i.choice?.reason || i.choice?.wish || '—'}</td><td data-l="Status"><select defaultValue={f.status} onChange={(e) => save(f.id, { status: e.target.value })}><option value="open">Open</option><option value="contacted">Gecontacteerd</option>{f.kind === 'B' && <option value="published">Voorstel bezorgd</option>}<option value="resolved">Afgerond</option></select></td><td data-l="Notitie"><input defaultValue={f.notes || ''} onBlur={(e) => e.target.value !== (f.notes || '') && save(f.id, { notes: e.target.value })} /></td></tr>; })}</tbody></table></div>}</div></>;
}
function AdmBookings() {
  const [d, load, err] = useLoad('bookings');
  const [f, setF] = useState('upcoming');
  if (!d) return <Wait err={err} />;
  const now = new Date();
  const rows = d.bookings.filter((b) => (f === 'upcoming' ? new Date(b.ends_at) > now && b.status === 'confirmed' : f === 'past' ? new Date(b.ends_at) <= now : true));
  const st = { confirmed: ['bevestigd', 'ok'], cancelled: ['geannuleerd', 'bad'], held: ['gehouden', 'info'], no_show: ['niet opgedaagd', 'warn'] };
  const upd = (id, status) => adm('booking_update', { id, status, notify: status === 'cancelled', message: '' }).then(load);
  const exp = () => csvDownload('afspraken.csv', [['Datum', 'Type', 'Investeerdersdag', 'Aankomst', 'Investeerder', 'E-mail', 'Telefoon', 'Personen', 'Onderwerp', 'Bericht', 'Status'], ...rows.map((b) => [whenNl(b.starts_at), KIND[b.kind], b.inv_events?.title, b.arrival, nameOf(b.inv_investors), b.inv_investors.email, b.phone || b.inv_investors.phone, b.persons, b.topic, b.message, b.status])]);
  return <><div className="page-head"><div><h1 className="page-title">Afspraken</h1><p className="page-sub">{rows.length} afspraken</p></div><div className="row"><select style={{ width: 'auto' }} value={f} onChange={(e) => setF(e.target.value)}><option value="upcoming">Komend</option><option value="past">Voorbij</option><option value="all">Alle</option></select><button className="btn ghost sm" onClick={exp}>CSV</button></div></div>
    <div className="card">{!rows.length ? <p style={{ margin: 0 }}>Geen afspraken.</p> : <div className="tblw"><table className="tbl cards"><thead><tr><th>Wanneer</th><th>Type</th><th>Investeerder</th><th>Telefoon</th><th>Onderwerp</th><th>Status</th><th /></tr></thead><tbody>{rows.map((b) => <tr key={b.id}><td data-l="Wanneer">{whenNl(b.starts_at)}{b.arrival ? ' · ' + b.arrival : ''}</td><td data-l="Type">{KIND[b.kind]}{b.kind === 'visit' ? ' (' + b.persons + ')' : ''}</td><td data-l="Investeerder"><b>{nameOf(b.inv_investors)}</b><br /><span className="hint">{eur(b.inv_investors.invested)} · keuze {b.inv_investors.inv_choices?.choice || '—'}</span></td><td data-l="Telefoon">{b.phone || b.inv_investors.phone || '—'}</td><td data-l="Onderwerp">{TOPIC[b.topic] || b.topic}{b.message ? ': ' + b.message : ''}</td><td data-l="Status"><span className={'chip ' + st[b.status][1]}>{st[b.status][0]}</span></td><td data-l="">{b.status === 'confirmed' && <div className="row"><button className="btn ghost sm" onClick={() => upd(b.id, 'held')}>Gehouden</button><button className="btn ghost sm" onClick={() => upd(b.id, 'no_show')}>Niet opgedaagd</button><button className="btn danger sm" onClick={() => upd(b.id, 'cancelled')}>Annuleren</button></div>}</td></tr>)}</tbody></table></div>}</div></>;
}
const WD = ['', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
function AdmAvail() {
  const [d, load, err] = useLoad('availability');
  const [w, setW] = useState(null), [cfg, setCfg] = useState(null), [day, setDay] = useState(''), [msg, setMsg] = useState(''), [e2, setE2] = useState('');
  useEffect(() => { if (d) { setW(d.windows.map((x) => ({ weekday: x.weekday, start_time: x.start_time.slice(0, 5), end_time: x.end_time.slice(0, 5), kinds: x.kinds }))); setCfg(d.settings.booking); } }, [d]);
  if (!d || !w || !cfg) return <Wait err={err} />;
  const set = (i, p) => setW(w.map((x, n) => (n === i ? { ...x, ...p } : x)));
  const kindOf = (x) => (x.kinds.length === 2 ? 'both' : x.kinds[0]);
  const run = async (p) => { setMsg(''); setE2(''); try { await p; setMsg('Opgeslagen. Bestaande afspraken blijven behouden.'); load(); } catch (x) { setE2(errText(x)); } };
  return <><div className="page-head"><div><h1 className="page-title">Beschikbaarheid</h1><p className="page-sub">Investeerders zien enkel vrije momenten binnen deze uren.</p></div></div><Note kind="ok">{msg}</Note><Note kind="error">{e2}</Note><div style={{ height: 12 }} />
    <div className="card stack"><h2>Wekelijkse uren</h2>{w.map((x, i) => <div className="row" key={i} style={{ flexWrap: 'nowrap' }}><select value={x.weekday} onChange={(e) => set(i, { weekday: Number(e.target.value) })}>{WD.slice(1).map((n, k) => <option key={k} value={k + 1}>{n}</option>)}</select><input type="time" value={x.start_time} onChange={(e) => set(i, { start_time: e.target.value })} /><input type="time" value={x.end_time} onChange={(e) => set(i, { end_time: e.target.value })} /><select value={kindOf(x)} onChange={(e) => set(i, { kinds: e.target.value === 'both' ? ['video', 'callback'] : [e.target.value] })}><option value="both">Beide</option><option value="video">Video</option><option value="callback">Terugbellen</option></select><button className="btn danger sm" onClick={() => setW(w.filter((_, n) => n !== i))}>×</button></div>)}<div className="row"><Btn kind="ghost" onClick={() => setW([...w, { weekday: 1, start_time: '14:00', end_time: '17:00', kinds: ['video', 'callback'] }])}>Uren toevoegen</Btn><Btn onClick={() => run(adm('availability_save', { windows: w }))}>Opslaan</Btn></div></div>
    <div className="card stack"><h2>Instellingen van de afspraken</h2><div className="grid2"><Field label="Duur van een afspraak"><select value={cfg.slot_minutes} onChange={(e) => setCfg({ ...cfg, slot_minutes: Number(e.target.value) })}>{[10, 15, 20, 30].map((n) => <option key={n} value={n}>{n} minuten</option>)}</select></Field><Field label="Pauze tussen afspraken (min)"><input type="number" min="0" max="15" value={cfg.buffer_minutes} onChange={(e) => setCfg({ ...cfg, buffer_minutes: Number(e.target.value) })} /></Field><Field label="Minimale voorafgaande termijn (uren)"><input type="number" min="0" value={cfg.notice_hours} onChange={(e) => setCfg({ ...cfg, notice_hours: Number(e.target.value) })} /></Field><Field label="Boeken tot (dagen vooruit)"><input type="number" min="1" value={cfg.horizon_days} onChange={(e) => setCfg({ ...cfg, horizon_days: Number(e.target.value) })} /></Field></div><div><Btn onClick={() => run(adm('settings_save', { key: 'booking', value: cfg }))}>Opslaan</Btn></div></div>
    <div className="card stack"><h2>Geblokkeerde dagen</h2><div className="row" style={{ flexWrap: 'nowrap' }}><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /><Btn kind="ghost" disabled={!day} onClick={() => run(adm('blocked', { day }))}>Blokkeren</Btn></div>{d.blocked.map((b) => <div className="row" key={b.day}><span>{dayNl(b.day + 'T12:00:00Z')}</span><button className="link" onClick={() => run(adm('blocked', { day: b.day, remove: true }))}>Verwijderen</button></div>)}</div>
    <div className="card stack"><h2>Investeerdersdagen</h2>{d.events.map((e) => <EventRow key={e.id} e={e} run={run} />)}</div></>;
}
function EventRow({ e, run }) {
  const [cap, setCap] = useState(e.capacity), [slots, setSlots] = useState(e.arrival_slots.join(', '));
  return <div className="stack"><b>{e.title}</b><div className="grid2"><Field label="Capaciteit (personen)"><input type="number" min="0" value={cap} onChange={(x) => setCap(x.target.value)} /></Field><Field label="Aankomsturen"><input value={slots} onChange={(x) => setSlots(x.target.value)} /></Field></div><div><Btn kind="ghost" onClick={() => run(adm('event_save', { id: e.id, capacity: cap, active: e.active, arrival_slots: slots.split(',').map((s) => s.trim()) }))}>Opslaan</Btn></div></div>;
}
function AdmSettings() {
  const [d, load, err] = useLoad('availability');
  const [v, setV] = useState(null), [msg, setMsg] = useState(''), [e2, setE2] = useState('');
  useEffect(() => { if (d) setV({ deadline: String(d.settings.deadline || '').slice(0, 16), interest_only_date: d.settings.interest_only_date || '', video_url: d.settings.video_url || '', notify_email: d.settings.notify_email || 'erwin@evchargeking.com', gift: d.settings.gift || { title: '', text: '' } }); }, [d]);
  if (!d || !v) return <Wait err={err} />;
  const save = async (key, value) => { setMsg(''); setE2(''); try { await adm('settings_save', { key, value }); setMsg('Opgeslagen.'); load(); } catch (x) { setE2(errText(x)); } };
  return <><div className="page-head"><div><h1 className="page-title">Instellingen</h1></div></div><Note kind="ok">{msg}</Note><Note kind="error">{e2}</Note><div style={{ height: 12 }} />
    <div className="card stack"><Field label="Uiterste datum voor de keuze (Brusselse tijd)"><input type="datetime-local" value={v.deadline} onChange={(e) => setV({ ...v, deadline: e.target.value })} /></Field><div><Btn kind="ghost" onClick={() => save('deadline', v.deadline + ':00+01:00')}>Opslaan</Btn></div>
      <Field label="Datum van de interestbetaling (binnen drie maanden)"><input type="date" value={v.interest_only_date} onChange={(e) => setV({ ...v, interest_only_date: e.target.value })} /></Field><div><Btn kind="ghost" onClick={() => save('interest_only_date', v.interest_only_date || null)}>Opslaan</Btn></div></div>
    <div className="card stack"><Field label="Link voor videogesprekken" hint="Deze link staat in de bevestiging van elk videogesprek."><input value={v.video_url} onChange={(e) => setV({ ...v, video_url: e.target.value })} /></Field><div><Btn kind="ghost" onClick={() => save('video_url', v.video_url || null)}>Opslaan</Btn></div><Field label="Meldingen van afspraken naar"><input type="email" value={v.notify_email} onChange={(e) => setV({ ...v, notify_email: e.target.value })} /></Field><div><Btn kind="ghost" onClick={() => save('notify_email', v.notify_email)}>Opslaan</Btn></div></div>
    <div className="card stack"><h2>Welkomstgeschenk</h2><Field label="Titel"><input value={v.gift.title} onChange={(e) => setV({ ...v, gift: { ...v.gift, title: e.target.value } })} /></Field><Field label="Tekst" hint="Zichtbaar na keuze A of B zodra hier tekst staat."><textarea value={v.gift.text} onChange={(e) => setV({ ...v, gift: { ...v.gift, text: e.target.value } })} /></Field><div><Btn kind="ghost" onClick={() => save('gift', v.gift)}>Opslaan</Btn></div></div></>;
}
