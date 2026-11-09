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
const isCompany = (i) => !!String(i.company_name || '').trim();
function AdmInvestors() {
  const [d, load, err] = useLoad('dashboard');
  const [pl, setPl] = useState(''), [q, setQ] = useState(''), [tr, setTr] = useState(''), [ch, setCh] = useState(''), [open, setOpen] = useState(null);
  if (!d) return <Wait err={err} />;
  const plCode = (c) => d.tranches.find((t) => t.code === c)?.platform || 'winwinner';
  const rows = d.investors.filter((i) => (!pl || plCode(i.tranche) === pl) && (!tr || i.tranche === tr) && (!ch || (ch === 'none' ? !i.choice : i.choice?.choice === ch)) && (!q || (nameOf(i) + ' ' + i.email).toLowerCase().includes(q.toLowerCase())));
  const trName = (c) => d.tranches.find((t) => t.code === c)?.name || c;
  const exp = () => csvDownload('investeerders.csv', [['Naam', 'Bedrijf', 'Type', 'E-mail', 'Platform', 'Tranche', 'Bedrag', 'Keuze', 'Datum keuze', 'Reden C', 'Wensen B', 'Status account', 'Addendum'], ...rows.filter((i) => !i.is_demo).map((i) => [[i.first_name, i.last_name].filter(Boolean).join(' '), i.company_name, isCompany(i) ? 'Bedrijf' : 'Privé', i.email, platformName(plCode(i.tranche)), trName(i.tranche), i.invested, i.choice?.choice, i.choice?.confirmed_at, i.choice?.reason, i.choice?.wish, i.status, i.choice?.addendum_status])]);
  return <>
    <div className="page-head"><div><h1 className="page-title">Investeerders</h1><p className="page-sub">{rows.length} van {d.investors.length}</p></div><div className="row">{d.investors.some((i) => i.is_demo) && <button className="btn ghost sm" onClick={() => viewAs(d.investors.find((i) => i.is_demo).id)}>Open demo-investeerder</button>}<button className="btn ghost sm" onClick={exp}>Exporteer CSV</button></div></div>
    <div className="card"><div className="grid2" style={{ marginBottom: 14 }}><input type="search" placeholder="Zoek op naam of e-mail" value={q} onChange={(e) => setQ(e.target.value)} /><div className="row"><select value={pl} onChange={(e) => setPl(e.target.value)}><option value="">Alle platformen</option>{Object.keys(PLATFORMS).map((k) => <option key={k} value={k}>{PLATFORMS[k]}</option>)}</select><select value={tr} onChange={(e) => setTr(e.target.value)}><option value="">Alle tranches</option>{d.tranches.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select><select value={ch} onChange={(e) => setCh(e.target.value)}><option value="">Alle keuzes</option><option>A</option><option>B</option><option>C</option><option value="none">Geen antwoord</option></select></div></div>
      <div className="tblw"><table className="tbl cards"><thead><tr><th>Investeerder</th><th>Type</th><th>Platform</th><th>Tranche</th><th className="n">Bedrag</th><th>Keuze</th><th>Account</th><th>Laatst aangemeld</th></tr></thead><tbody>{rows.map((i) => <tr key={i.id} className="click" onClick={() => { location.hash = '#/investeerders/' + i.id; }}><td data-l="Investeerder"><b>{nameOf(i)}</b>{d.unread?.[i.id] ? <span className="chip info" style={{ marginLeft: 6 }}>{d.unread[i.id]} nieuw bericht{d.unread[i.id] > 1 ? 'en' : ''}</span> : null}{i.is_demo ? <span className="chip info" style={{ marginLeft: 6 }}>demo</span> : i.is_test && <span className="chip warn" style={{ marginLeft: 6 }}>test</span>}<br /><span className="hint">{i.email}</span> <button className="link" style={{ fontSize: 13 }} onClick={(e) => { e.stopPropagation(); viewAs(i.id); }}>Bekijk als</button></td><td data-l="Type">{isCompany(i) ? 'Bedrijf' : 'Privé'}</td><td data-l="Platform">{platformName(plCode(i.tranche))}</td><td data-l="Tranche">{trName(i.tranche)}</td><td data-l="Bedrag" className="n">{eur(i.invested)}</td><td data-l="Keuze">{i.choice ? <span className="chip info">{i.choice.choice}</span> : <span className="chip warn">—</span>}</td><td data-l="Account"><span className={'chip ' + (i.status === 'active' ? 'ok' : i.invited_at ? 'info' : '')}>{i.status === 'active' ? 'actief' : i.invited_at ? 'uitgenodigd ' + dayNl(i.invited_at) : 'nog niet uitgenodigd'}</span></td><td data-l="Laatst aangemeld">{i.last_login_at ? dayNl(i.last_login_at) : '—'}</td></tr>)}</tbody></table></div></div>
    {open && <InvDetail id={open} onClose={() => { setOpen(null); load(); }} />}</>;
}
// Shows the personal invitation exactly as the investor will receive it (sender, subject and the rendered mail).
function InvitePreview({ id, onClose }) {
  const [p, setP] = useState(null), [err, setErr] = useState('');
  useEffect(() => { adm('invite_preview', id ? { id } : {}).then(setP).catch((x) => setErr(errText(x))); }, [id]);
  return <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="modal stack preview-modal">
    <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ fontSize: 20, margin: 0 }}>Persoonlijke uitnodiging</h2><button className="btn ghost sm" onClick={onClose}>Sluiten</button></div>
    {!p ? <Wait err={err} /> : <><div className="mail-meta"><span>Van</span><b>{p.from}</b><span>Aan</span><b>{p.to}</b>{p.cc && <><span>Cc</span><b>{p.cc} (alleen bij de eerste uitnodiging)</b></>}<span>Onderwerp</span><b>{p.subject}</b></div>
      <iframe className="mail-frame" title="Voorbeeld van de uitnodiging" sandbox="" srcDoc={p.html} />
      <p className="hint" style={{ margin: 0 }}>Exact zoals verstuurd, met de gegevens van deze investeerder. De knop in dit voorbeeld werkt niet: elke investeerder krijgt een eigen persoonlijke link.</p></>}
  </div></div>;
}
// Mass send of the personal invitation (Belinus only). Test accounts are never included; they get it from their own detail.
function AsBanner({ d, reload }) {
  const demo = d.as.mode === 'demo', i = d.investor, who = i.company_name || [i.first_name, i.last_name].filter(Boolean).join(' ');
  const [sure, setSure] = useState(false), [pw, setPw] = useState(''), [open, setOpen] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function run(body, ok) { setBusy(true); setErr(''); setMsg(''); try { await fn('bel-inv', body); setMsg(ok); await reload(); } catch (x) { setErr(errText(x)); } setBusy(false); }
  return <div className="as-banner">
    <div className="as-top"><p><b>{demo ? 'Demo-investeerder' : 'U kijkt mee als'}: {who}</b><br /><span className="hint">{demo ? 'Alle e-mails van deze sessie gaan naar ' + d.as.admin_email + '.' : 'Alleen lezen: u kunt niets wijzigen en er worden geen e-mails verstuurd.'}</span></p>
      <div className="row">{demo && (sure ? <><button className="btn danger sm" disabled={busy} onClick={() => run({ action: 'demo_reset' }, 'De demo-investeerder is teruggezet.').then(() => setSure(false))}>Ja, wis alles</button><button className="btn ghost sm" onClick={() => setSure(false)}>Annuleren</button></> : <button className="btn ghost sm" onClick={() => setSure(true)}>Demo resetten</button>)}{demo && <button className="btn ghost sm" onClick={() => setOpen(!open)}>Demo-wachtwoord</button>}<button className="btn ghost sm" onClick={stopAs}>Stoppen</button></div></div>
    {sure && <p className="hint" style={{ margin: '10px 0 0' }}>Dit wist de keuze, afspraken, opvolging en historiek van de demo-investeerder.</p>}
    {demo && open && <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); run({ action: 'demo_password', password: pw }, 'Het wachtwoord is ingesteld.').then(() => { setPw(''); setOpen(false); }); }}><div style={{ flex: '1 1 240px' }}><PwInput autoComplete="new-password" placeholder="Wachtwoord voor de demo-login" value={pw} onChange={(e) => setPw(e.target.value)} /></div><button className="btn ghost sm" disabled={busy || !pw} type="submit">Instellen</button></form>}
    {msg && <div style={{ marginTop: 10 }}><Note kind="ok">{msg}</Note></div>}{err && <div style={{ marginTop: 10 }}><Note kind="error">{err}</Note></div>}
  </div>;
}
function InvDetail({ id, onClose }) {
  const [d, setD] = useState(null), [c, setC] = useState(''), [note, setNote] = useState(''), [reason, setReason] = useState(''), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const load = () => adm('detail', { id }).then(setD).catch((x) => setErr(errText(x)));
  useEffect(() => { load(); }, [id]);
  async function rec() { setErr(''); setMsg(''); try { await adm('record_choice', { id, choice: c, note, reason }); setMsg('Keuze geregistreerd.'); setC(''); setNote(''); load(); } catch (x) { setErr(errText(x)); } }
  async function invite() { setErr(''); setMsg(''); try { if (d.investor.status === 'invited') { await adm('invite', { id }); setMsg('Persoonlijke uitnodiging verstuurd naar ' + d.investor.email + '.'); } else { await adm('resend_invite', { id }); setMsg('Link om het wachtwoord te wijzigen verstuurd.'); } } catch (x) { setErr(errText(x)); } }
  return <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="modal stack">{!d ? <Wait err={err} /> : <>
    <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ fontSize: 21 }}>{nameOf(d.investor)}</h2><button className="btn ghost sm" onClick={onClose}>Sluiten</button></div>
    <p style={{ margin: 0 }}>{d.investor.email}{d.investor.phone ? ' · ' + d.investor.phone : ''}</p>
    <Note kind="ok">{msg}</Note><Note kind="error">{err}</Note>
    <Schedule rows={d.schedule.filter((r) => r.scenario === 'original')} />
    <div><h3 style={{ fontSize: 16, marginBottom: 8 }}>Geschiedenis van keuzes</h3>{d.log.length ? d.log.map((l) => <p key={l.id} style={{ margin: '0 0 4px', fontSize: 14 }}><b>{l.choice}</b> · {whenNl(l.created_at)}{l.by_admin ? ' · door beheerder: ' + l.note : ''}{l.reason ? ' · ' + l.reason : ''}</p>) : <p className="hint">Nog geen keuze.</p>}</div>
    <div className="stack"><h3 style={{ fontSize: 16 }}>Keuze registreren (ontvangen per telefoon of e-mail)</h3><div className="grid2"><select value={c} onChange={(e) => setC(e.target.value)}><option value="">Kies…</option><option>A</option><option>B</option><option>C</option></select><input placeholder="Notitie (verplicht)" value={note} onChange={(e) => setNote(e.target.value)} /></div>{c === 'C' && <input placeholder="Reden (verplicht)" value={reason} onChange={(e) => setReason(e.target.value)} />}<div className="row"><Btn kind="ghost" disabled={!c || !note.trim()} onClick={rec}>Registreren</Btn><Btn kind="ghost" onClick={invite}>{d.investor.status === 'invited' ? 'Stuur persoonlijke uitnodiging' : 'Stuur link nieuw wachtwoord'}</Btn></div></div></>}</div></div>;
}
// Messaging list: one row per investor, showing the last message received. Opening a row goes to the investor page with the full history and reply.
function AdmMessages() {
  const [d, setD] = useState(null), [err, setErr] = useState(''), [q, setQ] = useState(''), [f, setF] = useState('all');
  useEffect(() => { adm('messages_all').then(setD).catch((x) => setErr(errText(x))); }, []);
  if (!d) return <Wait err={err} />;
  // Messages come newest first: the first message per investor is the last one received.
  const threads = new Map();
  for (const m of d.messages) {
    if (!threads.has(m.investor_id)) threads.set(m.investor_id, { id: m.investor_id, name: nameOf(m.inv_investors || {}), email: m.inv_investors?.email, last: m, unread: 0, count: 0 });
    const t = threads.get(m.investor_id); t.count++; if (m.direction === 'in' && !m.read_at) t.unread++;
  }
  const stateOf = (t) => t.unread ? 'new' : t.last.direction === 'in' ? 'wait' : t.last.mail_status === 'failed' ? 'failed' : 'answered';
  const ST = { new: ['Nieuw bericht', 'warn'], wait: ['Wacht op antwoord', 'info'], failed: ['Mail mislukt', 'warn'], answered: ['Beantwoord', 'ok'] };
  const needle = q.trim().toLowerCase();
  let list = [...threads.values()]
    .filter((t) => (f === 'all' || (f === 'new' && t.unread > 0) || (f === 'wait' && t.last.direction === 'in')))
    .filter((t) => !needle || (t.name + ' ' + (t.email || '')).toLowerCase().includes(needle));
  // Most recent message on top.
  list.sort((x, y) => new Date(y.last.created_at) - new Date(x.last.created_at));
  const open = (t) => { if (t.unread) adm('message_read', { id: t.id }).catch(() => {}); location.hash = '#/investeerders/' + t.id; };
  const snippet = (m) => (m.direction === 'in' ? '' : 'EVChargeking: ') + String(m.body || '').replace(/\s+/g, ' ').slice(0, 140);
  return <div className="card stack"><h2 style={{ margin: 0 }}>Berichten van investeerders</h2>
    <div className="row" style={{ flexWrap: 'wrap' }}><input type="search" placeholder="Zoek op naam of e-mail" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 240px' }} />
      <div className="seg" role="tablist">{[['all', 'Alle'], ['new', 'Nieuw'], ['wait', 'Wacht op antwoord']].map(([k, l]) => <button key={k} role="tab" aria-selected={f === k} className={'seg-b' + (f === k ? ' on' : '')} onClick={() => setF(k)}>{l}</button>)}</div></div>
    {!list.length ? <p className="hint" style={{ margin: 0 }}>{threads.size ? 'Geen berichten die aan deze selectie voldoen.' : 'Nog geen berichten.'}</p> :
    <div className="tblw"><table className="tbl cards"><thead><tr><th>Investeerder</th><th>Laatste bericht</th><th>Ontvangen</th><th>Status</th><th className="n">Berichten</th></tr></thead><tbody>
      {list.map((t) => <tr key={t.id} className="click" style={{ cursor: 'pointer' }} onClick={() => open(t)}>
        <td data-l="Investeerder"><b>{t.name}</b><br /><span className="hint">{t.email}</span></td>
        <td data-l="Laatste bericht">{snippet(t.last)}</td>
        <td data-l="Ontvangen">{new Date(t.last.created_at).toLocaleString('nl-BE')}</td>
        <td data-l="Status"><span className={'chip ' + ST[stateOf(t)][1]}>{ST[stateOf(t)][0]}</span>{t.unread > 0 && <span className="chip warn" style={{ marginLeft: 6 }}>{t.unread}</span>}</td>
        <td data-l="Berichten" className="n">{t.count}</td></tr>)}</tbody></table></div>}
    <Note kind="error">{err}</Note></div>;
}
function AdmFollow() {
  const [d, load, err] = useLoad('dashboard');
  if (!d) return <Wait err={err} />;
  const inv = new Map(d.investors.map((i) => [i.id, i]));
  const save = (id, patch) => adm('followup', { id, ...patch }).then(load);
  const rows = (d.followups || []).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  return <><div className="page-head"><div><h1 className="page-title">Messaging</h1><p className="page-sub">Opvolging van keuzes B en C, en alle berichten van investeerders.</p></div></div>
    <div className="card">{!rows.length ? <p style={{ margin: 0 }}>Nog niets op te volgen.</p> : <div className="tblw"><table className="tbl cards"><thead><tr><th>Investeerder</th><th>Keuze</th><th>Uiterlijk</th><th>Toelichting</th><th>Status</th><th>Notitie</th></tr></thead><tbody>{rows.map((f) => { const i = inv.get(f.investor_id); return <tr key={f.id}><td data-l="Investeerder"><b>{nameOf(i)}</b><br /><span className="hint">{eur(i.invested)}</span></td><td data-l="Keuze"><span className="chip info">{f.kind}</span></td><td data-l="Uiterlijk">{dayNl(f.due_date)}</td><td data-l="Toelichting">{i.choice?.reason || i.choice?.wish || '—'}</td><td data-l="Status"><select defaultValue={f.status} onChange={(e) => save(f.id, { status: e.target.value })}><option value="open">Open</option><option value="contacted">Gecontacteerd</option>{f.kind === 'B' && <option value="published">Voorstel bezorgd</option>}<option value="resolved">Afgerond</option></select></td><td data-l="Notitie"><input defaultValue={f.notes || ''} onBlur={(e) => e.target.value !== (f.notes || '') && save(f.id, { notes: e.target.value })} /></td></tr>; })}</tbody></table></div>}</div><div style={{ height: 16 }} /><AdmMessages /></>;
}
// Appointments for Belinus and EVChargeking: list, day, month, and per investor day (attendees in arrival order).
const bxDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date(d));
const bxTime = (b) => (b.kind === 'visit' && b.arrival ? b.arrival : timeNl(b.starts_at));
const bxShort = { visit: 'Bezoek', video: 'Video', callback: 'Terugbellen' };
const BST = { confirmed: ['bevestigd', 'ok'], cancelled: ['geannuleerd', 'bad'], held: ['gehouden', 'info'], no_show: ['niet opgedaagd', 'warn'] };
const dayLabel = (k, o) => new Date(k + 'T12:00:00Z').toLocaleDateString('nl-BE', { timeZone: 'UTC', ...(o || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) });
const addDays = (k, n) => { const x = new Date(k + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
// Local date-time text for <input type="datetime-local">.
function localInput(iso) { const d = new Date(iso), z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; }
function BookingActions({ b, upd, reload }) {
  const [mv, setMv] = useState(''), [err, setErr] = useState('');
  if (b.status !== 'confirmed') return <span className={'chip ' + BST[b.status][1]}>{BST[b.status][0]}</span>;
  async function move() { setErr(''); try { await adm('booking_move', { id: b.id, starts_at: new Date(mv).toISOString(), notify: true }); setMv(''); await reload(); } catch (x) { setErr(errText(x)); } }
  return <div style={{ display: 'grid', gap: 6 }}><div className="row" style={{ gap: 6 }}><button className="btn ghost sm" onClick={() => upd(b.id, 'held')}>Gehouden</button><button className="btn ghost sm" onClick={() => upd(b.id, 'no_show')}>Niet opgedaagd</button>{b.kind !== 'visit' && <button className="btn ghost sm" onClick={() => setMv(mv ? '' : localInput(b.starts_at))}>Verplaatsen</button>}<button className="btn danger sm" onClick={() => { if (confirm('Afspraak annuleren? De investeerder krijgt een e-mail.')) upd(b.id, 'cancelled'); }}>Annuleren</button></div>{mv && <div className="row" style={{ gap: 6 }}><input type="datetime-local" value={mv} onChange={(e) => setMv(e.target.value)} /><button className="btn sm" disabled={!mv} onClick={move}>Nieuw moment opslaan</button></div>}{err && <span className="hint">{err}</span>}</div>;
}
// Admin-only notes about a conversation. Shown under the appointment and on the investor page; never sent to the investor.
function Notes({ notes, bookingId, investorId, onChange, compact }) {
  const [txt, setTxt] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [edit, setEdit] = useState(null), [et, setEt] = useState('');
  async function add() { if (!txt.trim()) return; setBusy(true); setErr(''); try { await adm('note_add', { id: investorId, booking_id: bookingId || null, body: txt }); setTxt(''); await onChange(); } catch (x) { setErr(errText(x)); } setBusy(false); }
  async function save(id) { try { await adm('note_update', { id, body: et }); setEdit(null); await onChange(); } catch (x) { setErr(errText(x)); } }
  async function del(id) { if (!confirm('Notitie verwijderen?')) return; try { await adm('note_delete', { id }); await onChange(); } catch (x) { setErr(errText(x)); } }
  return <div className="notes">{notes.map((n) => <div key={n.id} className="note-it">{edit === n.id ? <><textarea value={et} onChange={(e) => setEt(e.target.value)} /><div className="row"><button className="btn ghost sm" onClick={() => save(n.id)}>Opslaan</button><button className="btn ghost sm" onClick={() => setEdit(null)}>Annuleren</button></div></> : <><p>{n.body}</p><span className="hint">{(n.author_email || '').split('@')[0]} · {whenNl(n.created_at)}{n.updated_at ? ' · gewijzigd' : ''} · <button className="link" onClick={() => { setEdit(n.id); setEt(n.body); }}>wijzigen</button> · <button className="link" onClick={() => del(n.id)}>verwijderen</button></span></>}</div>)}
    <div className="note-new"><textarea placeholder={bookingId ? 'Notitie over dit gesprek…' : 'Losse notitie, bv. na een telefoongesprek…'} value={txt} onChange={(e) => setTxt(e.target.value)} rows={compact ? 2 : 3} />{txt.trim() && <Btn kind="ghost" busy={busy} onClick={add}>Notitie opslaan</Btn>}</div>
    <Note kind="error">{err}</Note></div>;
}
// Full page per investor: appointments with notes, loose notes, messages, loan, choices, mails.
function InvPage({ id }) {
  const [d, setD] = useState(null), [err, setErr] = useState(''), [msg, setMsg] = useState(''), [ok, setOk] = useState(''), [busy, setBusy] = useState(false), [c, setC] = useState(''), [cn, setCn] = useState(''), [reason, setReason] = useState(''), [prev, setPrev] = useState(false);
  const load = useCallback(() => adm('investor_page', { id }).then(setD).catch((x) => setErr(errText(x))), [id]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Wait err={err} />;
  const i = d.investor, trName = (cd) => d.tranches.find((x) => x.code === cd)?.name || cd;
  const looseNotes = d.notes.filter((n) => !n.booking_id);
  async function send(txt) { setErr(''); setOk(''); try { const r = await adm('message_send', { id, body: txt }); setOk(r.mail ? 'Bericht verstuurd, ook per e-mail.' : 'Bericht geplaatst, maar de e-mail kon niet verstuurd worden.'); await load(); } catch (x) { setErr(errText(x)); throw x; } }
  async function invite() { setErr(''); setOk(''); try { if (i.status === 'invited') { await adm('invite', { id }); setOk('Persoonlijke uitnodiging verstuurd.'); } else { await adm('resend_invite', { id }); setOk('Link om het wachtwoord te wijzigen verstuurd.'); } load(); } catch (x) { setErr(errText(x)); } }
  async function rec() { setErr(''); setOk(''); try { await adm('record_choice', { id, choice: c, note: cn, reason }); setOk('Keuze geregistreerd.'); setC(''); setCn(''); setReason(''); load(); } catch (x) { setErr(errText(x)); } }
  return <>
    <div className="page-head"><div><p className="hint" style={{ margin: 0 }}><a href="#/investeerders">Investeerders</a> ›</p><h1 className="page-title">{nameOf(i)}{i.is_demo ? <span className="chip info" style={{ marginLeft: 10, verticalAlign: 'middle' }}>demo</span> : i.is_test ? <span className="chip warn" style={{ marginLeft: 10, verticalAlign: 'middle' }}>test</span> : null}</h1>
      <p className="page-sub">{trName(i.tranche)} · {eur(i.invested)} · keuze {d.choice?.choice || '—'} · {i.status === 'active' ? 'actief sinds ' + dayNl(i.activated_at) : 'nog geen wachtwoord'}</p></div>
      <div className="row"><button className="btn ghost sm" onClick={() => viewAs(i.id)}>Bekijk als</button>{i.status === 'invited' && <button className="btn ghost sm" onClick={() => setPrev(true)}>Bekijk uitnodiging</button>}<button className="btn ghost sm" onClick={invite}>{i.status === 'invited' ? 'Stuur persoonlijke uitnodiging' : 'Stuur link nieuw wachtwoord'}</button><button className="btn sm" onClick={() => document.querySelector('.composer textarea')?.focus()}>Bericht sturen</button></div></div>
    <Note kind="ok">{ok}</Note><Note kind="error">{err}</Note>{prev && <InvitePreview id={i.id} onClose={() => setPrev(false)} />}
    <div className="inv-grid">
      <div className="card stack"><h2 style={{ margin: 0 }}>Gegevens</h2>{[
        ['Type', isCompany(i) ? 'Bedrijf' : 'Privé'], ['Bedrijfsnaam', i.company_name || '—'], ['Naam', [i.first_name, i.last_name].filter(Boolean).join(' ') || '—'],
        ['E-mail', i.email], ['Telefoon', i.phone || '—'], ['IBAN', i.iban || '—'], ['Taal', i.lang || '—'],
        ['Tranche', trName(i.tranche)], ['Bedrag', eur(i.invested)], ['Investering op', i.invested_on ? dayNl(i.invested_on) : '—'],
        ['Status account', i.status === 'active' ? 'actief sinds ' + dayNl(i.activated_at) : i.status === 'suspended' ? 'geschorst' : 'nog geen wachtwoord'],
        ['Laatst aangemeld', i.last_login_at ? whenNl(i.last_login_at) : '—'], ['Aangemaakt', i.created_at ? whenNl(i.created_at) : '—'],
        ['Voorwaarden', i.terms_accepted_at ? 'versie ' + i.terms_version + ' aanvaard op ' + whenNl(i.terms_accepted_at) + (i.terms_email_consent ? ' · e-mails toegestaan' : ' · zonder e-mailtoestemming') : 'nog niet aanvaard'],
        ['Testaccount', i.is_test ? 'ja' : 'nee'], ['Demo-account', i.is_demo ? 'ja' : 'nee'],
      ].map(([k, v]) => <p key={k} style={{ margin: 0 }}><span className="hint">{k}</span> · {v}</p>)}</div>
      <div className="card stack"><h2 style={{ margin: 0 }}>Afspraken en notities <span className="chip warn">alleen beheerders</span></h2>
        {!d.bookings.length && <p className="hint" style={{ margin: 0 }}>Nog geen afspraken.</p>}
        {d.bookings.map((b) => <div key={b.id} className={'appt k-' + b.kind + (b.status === 'cancelled' ? ' off' : '')}><p style={{ margin: 0 }}><b>{KIND[b.kind]}</b> · {dayLabel(bxDay(b.starts_at), { weekday: 'short', day: 'numeric', month: 'short' })} {bxTime(b)}{b.kind === 'visit' ? ' · ' + b.persons + ' pers.' : ''} · <span className={'chip ' + BST[b.status][1]}>{BST[b.status][0]}</span></p>{(b.topic || b.message) && <p className="hint" style={{ margin: '4px 0 0' }}>{TOPIC[b.topic] || b.topic}{b.message ? ': ' + b.message : ''}</p>}<Notes notes={d.notes.filter((n) => n.booking_id === b.id)} bookingId={b.id} investorId={i.id} onChange={load} compact /></div>)}
        <div className="appt"><p style={{ margin: 0 }}><b>Losse notities</b></p><Notes notes={looseNotes} investorId={i.id} onChange={load} /></div></div>
      <div className="card stack"><h2 style={{ margin: 0 }}>Berichten</h2><p className="hint" style={{ margin: 0 }}>De investeerder krijgt elk bericht per e-mail van investor@belinus.com en kan antwoorden per e-mail of in het portaal.</p>
        <Thread msgs={d.messages} mine={(m) => m.direction === 'out'} nameIn={nameOf(i)} showRaw /><Composer placeholder={'Nieuw bericht aan ' + (i.first_name || nameOf(i)) + '…'} onSend={send} label="Versturen" /></div>
    </div>
    <div className="card"><h2>Lening en betaalschema</h2><Schedule rows={d.schedule.filter((r) => r.scenario === 'original')} /></div>
    <div className="inv-grid">
      <div className="card stack"><h2 style={{ margin: 0 }}>Keuze</h2>{d.log.length ? d.log.map((l) => <p key={l.id} style={{ margin: 0, fontSize: 14 }}><b>{l.choice}</b> · {whenNl(l.created_at)}{l.by_admin ? ' · door beheerder: ' + l.note : ''}{l.reason ? ' · ' + l.reason : ''}{l.wish ? ' · ' + l.wish : ''}</p>) : <p className="hint" style={{ margin: 0 }}>Nog geen keuze.</p>}
        <p style={{ margin: '8px 0 0', fontWeight: 500 }}>Keuze registreren (ontvangen per telefoon)</p><div className="grid2"><select value={c} onChange={(e) => setC(e.target.value)}><option value="">Kies…</option><option>A</option><option>B</option><option>C</option></select><input placeholder="Notitie (verplicht)" value={cn} onChange={(e) => setCn(e.target.value)} /></div>{c === 'C' && <input placeholder="Reden (verplicht)" value={reason} onChange={(e) => setReason(e.target.value)} />}<div><Btn kind="ghost" disabled={!c || !cn.trim()} onClick={rec}>Registreren</Btn></div></div>
      <div className="card stack"><h2 style={{ margin: 0 }}>Contact en e-mails</h2><p style={{ margin: 0, fontSize: 14 }}>{i.email}{i.phone ? ' · ' + i.phone : ''}<br /><span className="hint">Laatst aangemeld: {i.last_login_at ? whenNl(i.last_login_at) : '—'}</span></p>
        <div>{(d.mails || []).slice(0, 12).map((m, n) => <p key={n} style={{ margin: '0 0 4px', fontSize: 13 }}>{whenNl(m.created_at)} · {m.subject}{m.status !== 'sent' ? ' · ' + m.status : ''}</p>)}{!(d.mails || []).length && <p className="hint" style={{ margin: 0 }}>Nog geen e-mails verstuurd.</p>}</div></div>
    </div></>;
}
function AdmBookings() {
  const [d, load, err] = useLoad('bookings');
  const [ev] = useLoad('availability');
  const today = bxDay(new Date());
  const [view, setView] = useState(() => { try { return localStorage.getItem('inv_bk_view') || 'maand'; } catch (e) { return 'maand'; } });
  const [f, setF] = useState('upcoming'), [day, setDay] = useState(today), [month, setMonth] = useState(today.slice(0, 7));
  const pick = (v) => { setView(v); try { localStorage.setItem('inv_bk_view', v); } catch (e) {} };
  if (!d) return <Wait err={err} />;
  const now = new Date();
  const upd = (id, status) => adm('booking_update', { id, status, notify: status === 'cancelled', message: '' }).then(load);
  const all = [...d.bookings].sort((p, q) => (bxDay(p.starts_at) + bxTime(p) < bxDay(q.starts_at) + bxTime(q) ? -1 : 1));
  const live = all.filter((b) => b.status !== 'cancelled');
  const rows = all.filter((b) => (f === 'upcoming' ? new Date(b.ends_at) > now && b.status === 'confirmed' : f === 'past' ? new Date(b.ends_at) <= now : true));
  const exp = (list, name) => csvDownload(name, [['Datum', 'Uur', 'Type', 'Investeerdersdag', 'Investeerder', 'E-mail', 'Telefoon', 'Personen', 'Onderwerp', 'Bericht', 'Keuze', 'Status'], ...list.map((b) => [dayLabel(bxDay(b.starts_at)), bxTime(b), KIND[b.kind], b.inv_events?.title, nameOf(b.inv_investors), b.inv_investors.email, b.phone || b.inv_investors.phone, b.persons, TOPIC[b.topic] || b.topic, b.message, b.inv_investors.inv_choices?.choice, BST[b.status][0]])]);
  const who = (b) => <><a href={'#/investeerders/' + b.investor_id}><b>{nameOf(b.inv_investors)}</b></a><br /><span className="hint">{eur(b.inv_investors.invested)} · keuze {b.inv_investors.inv_choices?.choice || '—'}</span></>;
  const tabs = [['maand', 'Maand'], ['dag', 'Dag'], ['dagen', 'Investeerdersdagen'], ['lijst', 'Lijst']];
  let body;
  if (view === 'maand') {
    const [y, mo] = month.split('-').map(Number), blanks = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7, total = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const shift = (n) => setMonth(new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7));
    body = <div className="card"><div className="cal-head"><button className="cal-nav" onClick={() => shift(-1)} aria-label="Vorige maand">‹</button><b>{new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('nl-BE', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b><button className="cal-nav" onClick={() => shift(1)} aria-label="Volgende maand">›</button></div>
      <div className="agm">{['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((w) => <span key={w} className="cal-wd">{w}</span>)}{Array.from({ length: blanks }, (_, i) => <span key={'b' + i} />)}
        {Array.from({ length: total }, (_, i) => { const k = `${month}-${String(i + 1).padStart(2, '0')}`, items = live.filter((b) => bxDay(b.starts_at) === k); return <button key={k} className={'agm-day' + (k === today ? ' today' : '') + (items.length ? ' has' : '')} onClick={() => { setDay(k); pick('dag'); }}><span className="agm-n">{i + 1}</span>{items.slice(0, 3).map((b) => <span key={b.id} className={'agm-it k-' + b.kind}>{bxTime(b)} {bxShort[b.kind]}</span>)}{items.length > 3 && <span className="agm-more">+{items.length - 3} meer</span>}</button>; })}</div>
      <p className="hint" style={{ margin: '12px 0 0' }}>Klik op een dag voor de details.</p></div>;
  } else if (view === 'dag') {
    const items = all.filter((b) => bxDay(b.starts_at) === day);
    body = <div className="card stack"><div className="row" style={{ justifyContent: 'space-between' }}><div className="row"><button className="cal-nav" onClick={() => setDay(addDays(day, -1))} aria-label="Vorige dag">‹</button><b style={{ fontSize: 18, fontWeight: 400, textTransform: 'capitalize' }}>{dayLabel(day)}</b><button className="cal-nav" onClick={() => setDay(addDays(day, 1))} aria-label="Volgende dag">›</button></div><div className="row"><button className="btn ghost sm" onClick={() => setDay(today)}>Vandaag</button><input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} style={{ width: 'auto' }} /></div></div>
      {!items.length ? <p style={{ margin: 0 }}>Geen afspraken op deze dag.</p> : <div className="agd">{items.map((b) => <div key={b.id} className={'agd-it k-' + b.kind + (b.status === 'cancelled' ? ' off' : '')}><div className="agd-t">{bxTime(b)}</div><div><b>{KIND[b.kind]}</b>{b.kind === 'visit' ? ` · ${b.persons} pers.` : ''}<br />{who(b)}{b.meet_url && <><br /><a href={b.meet_url} target="_blank" rel="noopener">Teams-vergadering openen</a></>}<p style={{ margin: '6px 0 0', fontSize: 14 }}>{b.phone || b.inv_investors.phone || ''}{(b.phone || b.inv_investors.phone) ? ' · ' : ''}{TOPIC[b.topic] || b.topic}{b.message ? ': ' + b.message : ''}</p></div><BookingActions b={b} upd={upd} reload={load} /><div className="agd-notes"><Notes notes={(d.notes || []).filter((n) => n.booking_id === b.id)} bookingId={b.id} onChange={load} compact /></div></div>)}</div>}</div>;
  } else if (view === 'dagen') {
    const events = (ev?.events || []).slice().sort((p, q) => (p.starts_at < q.starts_at ? -1 : 1));
    body = !ev ? <Wait /> : !events.length ? <div className="card"><p style={{ margin: 0 }}>Geen investeerdersdagen.</p></div> : events.map((e) => {
      const list = live.filter((b) => b.event_id === e.id).sort((p, q) => ((p.arrival || '') + nameOf(p.inv_investors) < (q.arrival || '') + nameOf(q.inv_investors) ? -1 : 1));
      const persons = list.reduce((n, b) => n + b.persons, 0), slots = [...new Set([...(e.arrival_slots || []), ...list.map((b) => b.arrival || '')])].sort();
      return <div key={e.id} className="card stack"><div className="row" style={{ justifyContent: 'space-between' }}><div><h2 style={{ margin: 0 }}>{e.title}</h2><p className="hint" style={{ margin: '4px 0 0' }}>{list.length} inschrijvingen · {persons} van {e.capacity} plaatsen · {e.address || ''}</p></div><div className="row"><button className="btn ghost sm" onClick={() => exp(list, 'investeerdersdag-' + bxDay(e.starts_at) + '.csv')}>CSV</button><button className="btn ghost sm" onClick={() => window.print()}>Afdrukken</button></div></div>
        {!list.length ? <p style={{ margin: 0 }}>Nog geen inschrijvingen.</p> : <div className="tblw"><table className="tbl cards"><thead><tr><th>Aankomst</th><th>#</th><th>Investeerder</th><th className="n">Pers.</th><th>Telefoon</th><th>Onderwerp</th><th>Status</th></tr></thead><tbody>{slots.map((sl) => { const g = list.filter((b) => (b.arrival || '') === sl); if (!g.length) return null; return g.map((b, n) => <tr key={b.id} className={n === 0 ? 'grp' : ''}><td data-l="Aankomst">{n === 0 ? <b>{sl || '—'}</b> : ''}{n === 0 && <span className="hint"> · {g.reduce((x, y) => x + y.persons, 0)} pers.</span>}</td><td data-l="#">{list.indexOf(b) + 1}</td><td data-l="Investeerder">{who(b)}</td><td data-l="Pers." className="n">{b.persons}</td><td data-l="Telefoon">{b.phone || b.inv_investors.phone || '—'}</td><td data-l="Onderwerp">{TOPIC[b.topic] || b.topic}{b.message ? ': ' + b.message : ''}</td><td data-l="Status"><span className={'chip ' + BST[b.status][1]}>{BST[b.status][0]}</span></td></tr>); })}</tbody></table></div>}</div>;
    });
  } else {
    body = <div className="card">{!rows.length ? <p style={{ margin: 0 }}>Geen afspraken.</p> : <div className="tblw"><table className="tbl cards"><thead><tr><th>Wanneer</th><th>Type</th><th>Investeerder</th><th>Telefoon</th><th>Onderwerp</th><th /></tr></thead><tbody>{rows.map((b) => <tr key={b.id}><td data-l="Wanneer">{dayLabel(bxDay(b.starts_at), { weekday: 'short', day: 'numeric', month: 'short' })} · {bxTime(b)}</td><td data-l="Type">{KIND[b.kind]}{b.kind === 'visit' ? ' (' + b.persons + ')' : ''}</td><td data-l="Investeerder"><a href={'#/investeerders/' + b.investor_id}>{who(b)}</a>{b.meet_url && <><br /><a href={b.meet_url} target="_blank" rel="noopener">Teams-vergadering openen</a></>}</td><td data-l="Telefoon">{b.phone || b.inv_investors.phone || '—'}</td><td data-l="Onderwerp">{TOPIC[b.topic] || b.topic}{b.message ? ': ' + b.message : ''}{(d.notes || []).some((n) => n.booking_id === b.id) ? <><br /><span className="chip warn">{(d.notes || []).filter((n) => n.booking_id === b.id).length} notitie(s)</span></> : null}</td><td data-l=""><BookingActions b={b} upd={upd} reload={load} /></td></tr>)}</tbody></table></div>}</div>;
  }
  return <><div className="page-head"><div><h1 className="page-title">Afspraken</h1><p className="page-sub">{live.filter((b) => new Date(b.ends_at) > now).length} komende afspraken</p></div><div className="row">{view === 'lijst' && <select style={{ width: 'auto' }} value={f} onChange={(e) => setF(e.target.value)}><option value="upcoming">Komend</option><option value="past">Voorbij</option><option value="all">Alle</option></select>}<button className="btn ghost sm" onClick={() => exp(view === 'lijst' ? rows : live, 'afspraken.csv')}>CSV</button></div></div>
    <div className="seg" role="tablist" style={{ marginBottom: 16 }}>{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} className={'seg-b' + (view === k ? ' on' : '')} onClick={() => pick(k)}>{l}</button>)}</div>
    {body}</>;
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
    <div className="grid2" style={{ alignItems: 'start' }}><div className="card stack"><h2>Investeerdersdagen</h2>{d.events.map((e) => <EventRow key={e.id} e={e} run={run} />)}</div></div></>;
}
// One investor day: length of one appointment, and each arrival time with its own number of places.
function EventRow({ e, run }) {
  const [mins, setMins] = useState(e.slot_minutes || 30), [slots, setSlots] = useState((e.slots || []).map((x) => ({ start_time: x.start_time, capacity: x.capacity })));
  const set = (i, patch) => setSlots(slots.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  return <div className="stack"><b>{e.title}</b>
    <Field label="Duur van één afspraak"><select value={mins} onChange={(x) => setMins(Number(x.target.value))}>{[10, 15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n} minuten</option>)}</select></Field>
    <p className="hint" style={{ margin: 0 }}>Tijdstip en aantal plaatsen per afspraak. Een investeerder boekt maximaal 2 personen per afspraak.</p>
    {slots.map((x, i) => <div className="row" key={i} style={{ flexWrap: 'nowrap' }}><input type="time" value={x.start_time} onChange={(k) => set(i, { start_time: k.target.value })} /><input type="number" min="0" value={x.capacity} onChange={(k) => set(i, { capacity: k.target.value })} /><span className="hint">personen</span><button className="btn danger sm" onClick={() => setSlots(slots.filter((_, n) => n !== i))}>×</button></div>)}
    <div className="row"><Btn kind="ghost" onClick={() => setSlots([...slots, { start_time: '10:00', capacity: 2 }])}>Tijdstip toevoegen</Btn><Btn kind="ghost" onClick={() => run(adm('event_save', { id: e.id, active: e.active, slot_minutes: mins, slots: slots.map((x) => ({ start_time: x.start_time, capacity: Number(x.capacity) || 0 })) }))}>Opslaan</Btn></div>
  </div>;
}
// The confirmation mail an investor gets after booking an investor day visit, shown next to the investor day settings.
// The personal invitation as sent to investors, with a placeholder link.
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = () => res(window.XLSX); s.onerror = () => rej(new Error('Excel-module kon niet geladen worden.')); document.head.appendChild(s); });
}
// Investeerdersgroepen: overview. Creating a group has its own page (#/investeerdersgroepen/nieuw).
function AdmGroups() {
  const [gs, setGs] = useState(null), [err, setErr] = useState('');
  useEffect(() => { adm('groups').then((r) => setGs(r.groups)).catch((x) => setErr(errText(x))); }, []);
  if (!gs) return <Wait err={err} />;
  return <><div className="page-head"><div><h1 className="page-title">Investeerdersgroepen</h1><p className="page-sub">Groepen investeerders. Een groep wordt gebruikt voor e-mailcampagnes.</p></div><div className="row"><Btn onClick={() => { location.hash = '#/investeerdersgroepen/nieuw'; }}>Nieuwe groep</Btn></div></div>
    <Note kind="error">{err}</Note><div style={{ height: 12 }} />
    <div className="card"><div className="tblw"><table className="tbl cards"><thead><tr><th>Groep</th><th>Omschrijving</th><th className="n">Leden</th></tr></thead><tbody>{gs.map((x) => <tr key={x.code} className="click" style={{ cursor: 'pointer' }} onClick={() => { location.hash = '#/investeerdersgroepen/' + x.code; }}><td data-l="Groep"><b>{x.name}</b></td><td data-l="Omschrijving">{x.description}</td><td data-l="Leden" className="n">{x.members}</td></tr>)}</tbody></table></div></div>
  </>;
}
// New group page: after creating, back to the list.
function AdmGroupNew() {
  const [name, setName] = useState(''), [desc, setDesc] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  async function create() {
    setBusy(true); setErr('');
    try { await adm('group_create', { name, description: desc }); location.hash = '#/investeerdersgroepen'; }
    catch (x) { setErr(errText(x)); setBusy(false); }
  }
  return <><div className="page-head"><div><h1 className="page-title">Nieuwe groep</h1><p className="page-sub"><a href="#/investeerdersgroepen">← Alle groepen</a></p></div></div>
    <Note kind="error">{err}</Note>
    <div className="card stack"><div className="grid2"><label>Naam<input value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Investeerders 2027" /></label><label>Omschrijving<input value={desc} onChange={(e) => setDesc(e.target.value)} /></label></div>
      <div className="row"><Btn onClick={create} disabled={busy || !name.trim()}>{busy ? 'Bezig…' : 'Groep aanmaken'}</Btn><a href="#/investeerdersgroepen">Annuleren</a></div></div>
  </>;
}
// One group: members, add investors, remove investors.
function AdmGroup({ code }) {
  const [g, setG] = useState(null), [inv, setInv] = useState([]), [tr, setTr] = useState([]), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [q, setQ] = useState(''), [sel, setSel] = useState([]), [msg, setMsg] = useState('');
  const load = () => Promise.all([adm('group_detail', { code }), adm('dashboard')]).then(([gd, db]) => { setG(gd); setInv(db.investors || []); setTr(db.tranches || []); setSel([]); }).catch((x) => setErr(errText(x)));
  useEffect(() => { load(); }, [code]);
  const trName = (c) => tr.find((t) => t.code === c)?.name || c;
  async function run(action, ids) {
    setBusy(true); setErr(''); setMsg('');
    try { const r = await adm(action, { code, investor_ids: ids }); setMsg(action === 'group_members_add' ? r.changed + ' toegevoegd.' : r.changed + ' verwijderd.'); await load(); }
    catch (x) { setErr(errText(x)); } finally { setBusy(false); }
  }
  if (!g) return <Wait err={err} />;
  const memberIds = new Set(g.members.map((m) => m.id));
  const candidates = inv.filter((i) => !i.is_demo && !i.is_test && !memberIds.has(i.id) && (!q || (nameOf(i) + ' ' + i.email).toLowerCase().includes(q.toLowerCase()))).slice(0, 300);
  const toggle = (id) => setSel((x) => x.includes(id) ? x.filter((y) => y !== id) : [...x, id]);
  return <><div className="page-head"><div><h1 className="page-title">{g.group.name}</h1><p className="page-sub"><a href="#/investeerdersgroepen">← Alle groepen</a> · {g.members.length} leden{g.group.description ? ' · ' + g.group.description : ''}</p></div></div>
    <Note kind="error">{err}</Note>{msg && <Note kind="ok">{msg}</Note>}<div style={{ height: 12 }} />
    <div className="card"><h2 style={{ marginTop: 0 }}>Leden</h2><div className="tblw"><table className="tbl cards"><thead><tr><th>Investeerder</th><th>Tranche</th><th className="n">Bedrag</th><th>Account</th><th></th></tr></thead><tbody>{g.members.map((m) => <tr key={m.id}><td data-l="Investeerder"><b>{nameOf(m)}</b><br /><span className="hint">{m.email}</span></td><td data-l="Tranche">{trName(m.tranche)}</td><td data-l="Bedrag" className="n">{eur(m.invested)}</td><td data-l="Account">{m.status === 'active' ? 'actief' : m.status}</td><td data-l=""><button className="link" disabled={busy} onClick={() => run('group_members_remove', [m.id])}>Verwijder uit groep</button></td></tr>)}</tbody></table>{!g.members.length && <p className="hint">Nog geen leden.</p>}</div></div>
    <div style={{ height: 12 }} />
    <div className="card stack"><h2 style={{ margin: 0 }}>Investeerders toevoegen</h2>
      <input type="search" placeholder="Zoek op naam of e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--line, #ddd)', borderRadius: 8, padding: 8 }}>{candidates.map((i) => <label key={i.id} className="row" style={{ padding: '4px 0', gap: 8 }}><input type="checkbox" checked={sel.includes(i.id)} onChange={() => toggle(i.id)} /><span>{nameOf(i)} <span className="hint">{i.email} · {trName(i.tranche)}</span></span></label>)}{!candidates.length && <p className="hint">Geen investeerders om toe te voegen.</p>}</div>
      <div className="row"><Btn onClick={() => run('group_members_add', sel)} disabled={busy || !sel.length}>{busy ? 'Bezig…' : 'Voeg ' + sel.length + ' toe'}</Btn></div></div>
  </>;
}
const CAMP_ST = { draft: 'concept', sending: 'wordt verstuurd', sent: 'verstuurd' };
function AdmCampaigns() {
  const [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => { adm('campaigns').then(setD).catch((x) => setErr(errText(x))); }, []);
  if (!d) return <Wait err={err} />;
  return <><div className="page-head"><div><h1 className="page-title">E-mailcampagnes</h1><p className="page-sub">Campagnes naar groepen investeerders. Automatische e-mails staan onder "Automatische e-mails".</p></div></div>
    <Note kind="error">{err}</Note><div style={{ height: 12 }} />
    <div className="card"><div className="tblw"><table className="tbl cards"><thead><tr><th>Campagne</th><th>Groep</th><th>Status</th><th className="n">Verstuurd</th><th className="n">Geopend</th><th className="n">Link geklikt</th></tr></thead><tbody>{d.campaigns.map((c) => <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => { location.hash = '#/campagnes/' + c.id; }}><td data-l="Campagne"><b>{c.name}</b></td><td data-l="Groep">{c.group_code || '—'}</td><td data-l="Status"><span className={'chip ' + (c.status === 'sent' ? 'ok' : c.status === 'draft' ? '' : 'warn')}>{CAMP_ST[c.status] || c.status}</span></td><td data-l="Verstuurd" className="n">{c.sent}</td><td data-l="Geopend" className="n">{c.events_loaded ? c.opened : '—'}</td><td data-l="Link geklikt" className="n">{c.events_loaded ? c.clicked : '—'}</td></tr>)}</tbody></table></div></div></>;
}
// Bulk send of an invitation campaign to the investors of its group who still await an invitation.
function CampaignSend({ c, pending, groupName, groupCount, onDone }) {
  const [sure, setSure] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState(''), [show, setShow] = useState(false);
  async function go() { setBusy(true); setErr(''); setMsg(''); let total = 0, failed = 0;
    try { for (let n = 0; n < 20; n++) { const r = await adm('invite_batch', { confirm: 'VERSTUREN', campaign: c.id }); total += r.sent; failed += r.failed; setMsg(`Verstuurd: ${total}${failed ? ' · mislukt: ' + failed : ''} · nog te doen: ${r.left}`); if (!r.left || !r.sent) break; } } catch (x) { setErr(errText(x)); }
    setBusy(false); setSure(''); onDone(); }
  return <div className="card stack"><h2 style={{ fontSize: 18, margin: 0 }}>Campagne versturen</h2>
    <p style={{ margin: 0 }}>Groep: <b>{groupName}</b> ({groupCount} leden). {pending ? `${pending} investeerders hebben nog geen uitnodiging gekregen.` : 'Alle investeerders van deze groep hebben de uitnodiging al gekregen.'} De mail gaat van noreply@belinus.com; antwoorden is niet mogelijk. <button className="link" onClick={() => setShow(true)}>Bekijk de uitnodiging</button></p>
    {show && <InvitePreview onClose={() => setShow(false)} />}
    {!!pending && <div className="row" style={{ alignItems: 'flex-end' }}><div style={{ flex: '0 1 260px' }}><Field label={'Typ VERSTUREN om te bevestigen'}><input value={sure} onChange={(e) => setSure(e.target.value)} /></Field></div><Btn busy={busy} disabled={sure !== 'VERSTUREN'} onClick={go}>{`Verstuur naar ${pending} investeerders`}</Btn></div>}
    <Note kind="ok">{msg}</Note><Note kind="error">{err}</Note></div>;
}
function AdmCampaign({ id }) {
  const [d, setD] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [tab, setTab] = useState('stats');
  const load = () => adm('campaign', { id }).then(setD).catch((x) => setErr(errText(x)));
  useEffect(() => { load(); }, [id]);
  async function refresh() { setBusy(true); setErr(''); try { await adm('campaign_refresh', { id }); await load(); } catch (x) { setErr(errText(x)); } finally { setBusy(false); } }
  if (!d) return <Wait err={err} />;
  const c = d.campaign, s = d.stats;
  const cards = [['Verstuurd', s.sent], ['Afgeleverd', s.delivered], ['Geweigerd', s.refused], ['Tijdelijk mislukt', s.temporary], ['Geopend', s.opened], ['Niet geopend', s.not_opened], ['Link geklikt', s.clicked], ['Klacht', s.complained], ['Uitgeschreven', s.unsubscribed], ['Mislukt bij verzenden', s.failed]];
  return <><div className="page-head"><div><h1 className="page-title">{c.name}</h1><p className="page-sub"><a href="#/campagnes">← Alle campagnes</a> · Groep: {c.group_code || '—'} · {CAMP_ST[c.status] || c.status}{c.sent_at ? ' · ' + new Date(c.sent_at).toLocaleString('nl-BE') : ''}</p></div><div className="row"><Btn kind="ghost" onClick={refresh} disabled={busy}>{busy ? 'Bezig…' : 'Statistieken bijwerken'}</Btn><TestMail body={{ campaign: c.id }} /></div></div>
    <Note kind="error">{err}</Note><div style={{ height: 12 }} />
    <div className="seg" role="tablist">{[['stats', 'Resultaten'], ['recipients', 'Ontvangers'], ['template', 'E-mailtemplate']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={'seg-b' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div style={{ height: 16 }} />
    {d.role === 'belinus' && c.mail_kind === 'invite' && (c.status === 'draft' || c.status === 'sending') && <><CampaignSend c={c} pending={d.pending} groupName={d.group?.name || c.group_code} groupCount={d.group_members} onDone={() => { load(); }} /><div style={{ height: 16 }} /></>}
    {tab === 'stats' && <div className="card"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>{cards.map(([k, v]) => <div key={k}><div className="hint">{k}</div><div style={{ fontSize: 28 }}>{v}</div></div>)}</div><p className="hint" style={{ marginTop: 16 }}>Openen, klikken en afleverstatus komen uit Mailgun-gebeurtenissen. Klik op "Statistieken bijwerken" om ze op te halen. Geweigerd = de server van de ontvanger of Mailgun heeft het adres definitief geweigerd; die mail is niet aangekomen. Mailgun bewaart gebeurtenissen beperkt in de tijd.</p></div>}
    {tab === 'recipients' && <div className="card"><div className="tblw"><table className="tbl cards"><thead><tr><th>Ontvanger</th><th>Verzending</th><th>Aflevering</th><th>Geopend</th><th>Links geklikt</th></tr></thead><tbody>{d.recipients.map((r) => <tr key={r.recipient}><td data-l="Ontvanger">{r.recipient}{r.complained ? <span className="chip warn" style={{ marginLeft: 6 }}>klacht</span> : null}{r.unsubscribed ? <span className="chip" style={{ marginLeft: 6 }}>uitgeschreven</span> : null}</td><td data-l="Verzending">{r.status}</td><td data-l="Aflevering"><span className={'chip ' + (r.delivered ? 'ok' : r.refused ? 'warn' : '')}>{r.delivery}</span></td><td data-l="Geopend">{r.opened ? 'ja' : 'nee'}</td><td data-l="Links geklikt">{r.links.length ? r.links.join(', ') : '—'}</td></tr>)}</tbody></table></div></div>}
    {tab === 'template' && <div className="card stack"><p style={{ margin: 0 }}><b>Onderwerp:</b> {d.template.subject}</p>{d.template.cc && <p style={{ margin: 0 }}><b>Cc:</b> {d.template.cc} (alleen bij de eerste uitnodiging)</p>}<div><Btn kind="ghost" onClick={() => openHtml(d.template.html)}>Open in nieuw venster</Btn></div><iframe title="E-mailtemplate" srcDoc={d.template.html} style={{ width: '100%', height: 640, border: '1px solid var(--line, #ddd)', borderRadius: 8, background: '#fff' }} /></div>}
  </>;
}
const AUTO_MAILS = [
  ['access-link', 'Wachtwoordlink', 'Investeerder vraagt een nieuwe link, of beheerder stuurt opnieuw', 'Eén persoonlijke link; geldig tot de uiterste datum.', 'Stel-uw-wachtwoord-tekst (NL/FR/EN)'],
  ['login-code', 'Aanmeldcode', 'Aanmelding op het portaal (tweede stap)', '6 cijfers, 10 minuten geldig, één keer te gebruiken.', 'Korte e-mail met de code'],
  ['choice', 'Bevestiging van uw keuze', 'Investeerder bevestigt keuze A, B of C in het portaal', 'Verstuurd bij elke bevestiging. De keuze is daarna definitief. Bij keuze A/B: aankondiging van een e-mail van info@winwinner.be om het contract aan te passen. Bedankt voor uw vertrouwen.', 'Bevestiging met gekozen optie, vervolgstap en bedankje (NL/FR/EN)'],
  ['booking', 'Bevestiging afspraak', 'Investeerder boekt een afspraak (bezoek, video of terugbellen)', 'Kalenderbestand (.ics) bijgevoegd. Bezoek toont aankomsttijd en adres.', 'Afspraakbevestiging met details en link om te verplaatsen of annuleren'],
  ['booking-moved', 'Afspraak verplaatst', 'Beheerder verplaatst een afspraak (met melding)', 'Nieuw kalenderbestand bijgevoegd.', 'Melding van de nieuwe datum en tijd'],
  ['booking-cancel', 'Afspraak geannuleerd', 'Investeerder of beheerder annuleert een afspraak', 'Bevestiging van de annulering aan de investeerder.', 'Annuleringsbevestiging'],
  ['booking-reminder', 'Herinnering afspraak', 'Automatisch 15 minuten voor de afspraak (bel-inv-reminders)', 'Naar de investeerder en het interne contact. Voor video en bezoek met link.', 'Korte herinnering met tijdstip en link'],
  ['booking-notice', 'Interne melding afspraak', 'Nieuwe, geannuleerde of verplaatste afspraak', 'Naar het ingestelde meldingsadres (instellingen).', 'Korte interne melding'],
  ['message', 'Bericht van beheerder', 'Beheerder stuurt een bericht in het portaal', 'Melding aan de investeerder; het bericht zelf staat in het portaal.', 'Melding dat er een nieuw bericht is'],
  ['message-in', 'Nieuw bericht van investeerder', 'Investeerder stuurt een bericht in het portaal', 'Interne melding naar het ingestelde meldingsadres.', 'Korte interne melding met de tekst van het bericht'],
];
function openHtml(html) { const u = URL.createObjectURL(new Blob([html], { type: 'text/html' })); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000); }
// Sends a test mail (content only, not the flow) to the admin who is logged in. Used on the automated mails and on the campaigns.
function TestMail({ body }) {
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  async function go() { setBusy(true); setMsg(''); setErr(''); try { const r = await adm('send_test', body); setMsg('Testmail verstuurd naar ' + r.to + '.'); } catch (x) { setErr(errText(x)); } finally { setBusy(false); } }
  return <div><Btn kind="ghost" onClick={go} busy={busy} disabled={busy}>Stuur testmail</Btn>{msg && <p className="hint" style={{ margin: '8px 0 0' }}>{msg}</p>}{err && <Note kind="error">{err}</Note>}</div>;
}
function AutoPreview({ kind }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  // The window is opened straight away on the click (so the browser does not block it), then filled with the template.
  async function show() {
    setBusy(true); setErr('');
    const w = window.open('', '_blank');
    try {
      const p = await adm('automated_preview', { kind });
      if (!p.ok) { if (w) w.close(); setErr('Volledig voorbeeld volgt; tekst staat in de kolom Inhoud.'); }
      else if (!w) setErr('Het venster kon niet openen. Sta pop-ups toe voor deze site.');
      else { w.document.title = p.subject || 'Voorbeeld'; w.document.open(); w.document.write(p.html); w.document.close(); }
    } catch (x) { if (w) w.close(); setErr(errText(x)); }
    finally { setBusy(false); }
  }
  return <div><div className="row"><Btn kind="ghost" onClick={show} disabled={busy}>{busy ? 'Bezig…' : 'Voorbeeld'}</Btn><TestMail body={{ kind }} /></div>{err && <Note kind="error">{err}</Note>}</div>;
}
function AdmAutomated() {
  return <><div className="page-head"><div><h1 className="page-title">Automatische e-mails</h1><p className="page-sub">Alle e-mails die het systeem zelf verstuurt, met trigger en regels. Campagnes staan onder E-mailcampagnes.</p></div></div>
    <div className="card"><div className="tblw"><table className="tbl cards"><thead><tr><th>E-mail</th><th>Trigger</th><th>Regels</th><th>Inhoud</th></tr></thead><tbody>{AUTO_MAILS.map(([k, n, tr, rule, body]) => <tr key={k}><td data-l="E-mail"><b>{n}</b><br /><span className="hint">{k}</span></td><td data-l="Trigger">{tr}</td><td data-l="Regels">{rule}</td><td data-l="Inhoud">{body}<div style={{ marginTop: 8 }}><AutoPreview kind={k} /></div></td></tr>)}</tbody></table></div></div></>;
}
const FIN_ST = { paid: ['betaald', 'ok'], planned: ['gepland', ''], pending: ['wacht op handtekening', 'warn'], cancelled: ['geannuleerd', 'bad'] };
const FIN_F = [['all', 'Alle leningen'], ['bolero', 'Bolero'], ['winwinlening', 'Winwin'], ['winwin_raise', 'Winwin raise']];
function AdmFinancial() {
  const [view, setView] = useState('planned'), [signed, setSigned] = useState(false), [filter, setFilter] = useState('all'), [pick, setPick] = useState('all');
  const [d, setD] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { let live = true; setErr(''); adm('financial', { view, signed_only: signed, filter }).then((r) => { if (live) setD(r); }).catch((x) => { if (live) setErr(errText(x)); }); return () => { live = false; }; }, [view, signed, filter]);
  if (!d) return <Wait err={err} />;
  const sum = (k) => d.dates.reduce((s, x) => s + x[k], 0);
  const stText = (s) => Object.keys(FIN_ST).filter((k) => s[k]).map((k) => FIN_ST[k][0] + ' ' + eur(s[k])).join(' · ');
  async function exportXls() {
    setBusy(true); setErr('');
    try {
      const X = await loadXlsx(), wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet(d.dates.map((x) => ({ Datum: x.due, 'Bruto rente': x.gross_interest, 'Roerende voorheffing': x.withholding, 'Netto rente': x.net_interest, Kapitaal: x.principal, Totaal: x.total, Investeerders: x.investors, 'Betaald': x.status.paid, 'Gepland': x.status.planned, 'Wacht op handtekening': x.status.pending, 'Geannuleerd': x.status.cancelled }))), 'Overzicht');
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet(d.lines.map((l) => ({ Datum: l.due, Investeerder: l.investor, 'E-mail': l.email, Tranche: l.tranche, Keuze: l.choice, Bron: l.source, 'Bruto rente': l.gross_interest, 'Roerende voorheffing': l.withholding, 'Netto rente': l.net_interest, Kapitaal: l.principal, Totaal: Math.round((l.gross_interest + l.principal) * 100) / 100, Status: FIN_ST[l.status][0] }))), 'Details');
      X.writeFile(wb, 'financieel-' + view + '-' + filter + '.xlsx');
    } catch (x) { setErr(errText(x)); }
    setBusy(false);
  }
  return <><div className="page-head"><div><h1 className="page-title">Financieel</h1><p className="page-sub">{view === 'planned' ? 'Geplande betalingen volgens de oorspronkelijke leningen, ongewijzigd.' : 'Betalingen op basis van de geregistreerde keuzes van de investeerders.'}</p></div><div className="row"><Btn kind="ghost" busy={busy} onClick={exportXls}>Exporteer Excel</Btn></div></div>
    <Note kind="error">{err}</Note><div style={{ height: 12 }} />
    <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap' }}><div className="seg" role="tablist">{[['planned', 'Geplande betalingen'], ['registered', 'Geregistreerde keuzes']].map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} className={'seg-b' + (view === k ? ' on' : '')} onClick={() => setView(k)}>{l}</button>)}</div>
      <select style={{ width: 'auto' }} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Lening">{FIN_F.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <Btn kind="ghost" busy={pick === filter} onClick={() => setFilter(pick)}>Toepassen</Btn>
      {view === 'registered' && <label className="check"><input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} /><span>Enkel getekende keuzes</span></label>}</div>
    <div className="card">{!d.dates.length ? <p style={{ margin: 0 }}>{filter === 'bolero' ? 'Bolero-gegevens ontbreken nog. Er zijn nog geen betalingen geladen.' : 'Geen betalingen gevonden.'}</p> : <div className="tblw"><table className="tbl cards"><thead><tr><th>Datum</th><th className="n">Bruto rente</th><th className="n">Voorheffing</th><th className="n">Netto rente</th><th className="n">Kapitaal</th><th className="n">Totaal</th><th className="n">Investeerders</th><th>Status</th></tr></thead><tbody>
      {d.dates.map((x) => <tr key={x.due}><td data-l="Datum">{dayNl(x.due + 'T12:00:00Z')}</td><td data-l="Bruto rente" className="n">{eur(x.gross_interest)}</td><td data-l="Voorheffing" className="n">{eur(x.withholding)}</td><td data-l="Netto rente" className="n">{eur(x.net_interest)}</td><td data-l="Kapitaal" className="n">{eur(x.principal)}</td><td data-l="Totaal" className="n"><b>{eur(x.total)}</b></td><td data-l="Investeerders" className="n">{x.investors}</td><td data-l="Status"><span className="hint">{stText(x.status)}</span></td></tr>)}
      <tr><td><b>Totaal</b></td><td className="n"><b>{eur(sum('gross_interest'))}</b></td><td className="n"><b>{eur(sum('withholding'))}</b></td><td className="n"><b>{eur(sum('net_interest'))}</b></td><td className="n"><b>{eur(sum('principal'))}</b></td><td className="n"><b>{eur(sum('total'))}</b></td><td /><td /></tr>
      </tbody></table></div>}</div></>;
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
