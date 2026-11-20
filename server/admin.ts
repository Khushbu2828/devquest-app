import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { bankByStatus, bankQuestion, openReports, resolveReports, setStatus } from './store';

/**
 * Review queue for AI questions: the ones learners reported (two open reports
 * hide a question automatically) and, with DEVQUEST_REVIEW_NEW=true, every new
 * question before learners see it. Open /admin and enter DEVQUEST_ADMIN_TOKEN.
 * Without a token set, the admin pages are disabled.
 */
const TOKEN = process.env.DEVQUEST_ADMIN_TOKEN ?? '';

export function adminEnabled() {
  return TOKEN.length >= 12;
}

function authorized(req: IncomingMessage): boolean {
  const given = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!adminEnabled() || given.length !== TOKEN.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(TOKEN));
}

type Send = (res: ServerResponse, status: number, body: unknown) => void;

export async function handleAdmin(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  send: Send,
  readJson: (req: IncomingMessage) => Promise<unknown>,
): Promise<boolean> {
  if (!pathname.startsWith('/admin')) return false;
  if (!adminEnabled()) {
    send(res, 404, { error: 'Admin is disabled. Set DEVQUEST_ADMIN_TOKEN (12+ characters) in server/.env.' });
    return true;
  }
  if (req.method === 'GET' && pathname === '/admin') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
      'X-Frame-Options': 'DENY',
    });
    res.end(ADMIN_PAGE);
    return true;
  }
  if (!authorized(req)) {
    send(res, 401, { error: 'Wrong or missing admin token' });
    return true;
  }
  if (req.method === 'GET' && pathname === '/admin/api/queue') {
    const reports = openReports();
    const reported = [...new Set(reports.map((r) => r.questionId))].map((id) => ({
      id,
      question: bankQuestion(id) ?? null,
      snapshot: reports.find((r) => r.questionId === id)?.snapshot ?? null,
      reports: reports.filter((r) => r.questionId === id),
    }));
    send(res, 200, { reported, pending: bankByStatus('pending').filter((q) => !reported.some((r) => r.id === q.id)) });
    return true;
  }
  if (req.method === 'POST' && pathname === '/admin/api/review') {
    const body = (await readJson(req)) as { questionId?: string; decision?: string };
    if (typeof body.questionId !== 'string' || !['approve', 'reject', 'dismiss'].includes(body.decision ?? '')) {
      send(res, 400, { error: 'Send questionId and decision: approve | reject | dismiss' });
      return true;
    }
    if (body.decision !== 'dismiss') setStatus(body.questionId, body.decision === 'approve' ? 'approved' : 'rejected');
    resolveReports(body.questionId);
    send(res, 200, { ok: true });
    return true;
  }
  send(res, 404, { error: 'Not found' });
  return true;
}

const ADMIN_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>DevQuest review queue</title>
<style>
  :root { color-scheme: light dark; --bg:#f7f8fc; --card:#fff; --text:#11131a; --muted:#5b6170; --border:#dde1eb; --ok:#1e8e5a; --bad:#c93b3b; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0e1016; --card:#171a23; --text:#f2f3f8; --muted:#a3a9b8; --border:#2c3140; --ok:#4cc98a; --bad:#f07272; } }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui, sans-serif; }
  main { max-width:760px; margin:0 auto; padding:16px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px; margin:12px 0; }
  pre { background:#1e2030; color:#e6e8f2; padding:12px; border-radius:8px; overflow:auto; font-size:13px; }
  .muted { color:var(--muted); font-size:13px; }
  button { font:inherit; padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:var(--card); color:var(--text); cursor:pointer; margin-right:8px; }
  button.ok { border-color:var(--ok); color:var(--ok); } button.bad { border-color:var(--bad); color:var(--bad); }
  input { font:inherit; padding:8px; border-radius:8px; border:1px solid var(--border); width:100%; box-sizing:border-box; background:var(--card); color:var(--text); }
</style></head>
<body><main>
<h1>Review queue</h1>
<div id="login" class="card"><label>Admin token <input id="token" type="password" autocomplete="off"></label><p><button id="go">Load queue</button></p></div>
<div id="out"></div>
</main>
<script>
var token = sessionStorage.getItem('dq-admin') || '';
var out = document.getElementById('out');
function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
function api(path, body) {
  return fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
}
function decide(id, decision) { api('/admin/api/review', { questionId: id, decision: decision }).then(load).catch(function (e) { alert(e.message); }); }
function card(title, q, snapshot, reports) {
  var c = el('div', null, 'card');
  c.appendChild(el('strong', title));
  var shown = q || snapshot;
  if (shown) c.appendChild(el('p', shown.prompt));
  if (q) c.appendChild(el('pre', JSON.stringify(q, null, 2)));
  else if (snapshot) c.appendChild(el('p', 'Built-in question (' + snapshot.type + ', ' + snapshot.unitId + '). Fix it in src/content.', 'muted'));
  (reports || []).forEach(function (r) { c.appendChild(el('p', '⚑ ' + r.reason.replace('_', ' ') + (r.note ? ': ' + r.note : '') + ' · ' + new Date(r.at).toLocaleString(), 'muted')); });
  var row = el('p');
  if (q) {
    var a = el('button', 'Approve', 'ok'); a.onclick = function () { decide(q.id, 'approve'); }; row.appendChild(a);
    var b = el('button', 'Reject', 'bad'); b.onclick = function () { decide(q.id, 'reject'); }; row.appendChild(b);
  }
  if (reports && reports.length) { var d = el('button', 'Dismiss reports'); d.onclick = function () { decide((q || {}).id || reports[0].questionId, 'dismiss'); }; row.appendChild(d); }
  c.appendChild(row);
  return c;
}
function load() {
  api('/admin/api/queue').then(function (data) {
    document.getElementById('login').style.display = 'none';
    out.textContent = '';
    out.appendChild(el('h2', 'Reported (' + data.reported.length + ')'));
    data.reported.forEach(function (r) { out.appendChild(card(r.question ? 'AI question · ' + r.question.status : 'Built-in question', r.question, r.snapshot, r.reports)); });
    out.appendChild(el('h2', 'Waiting for review (' + data.pending.length + ')'));
    data.pending.forEach(function (q) { out.appendChild(card('AI question · ' + q.unitId, q, null, [])); });
  }).catch(function (e) { out.textContent = e.message; });
}
document.getElementById('go').onclick = function () { token = document.getElementById('token').value; sessionStorage.setItem('dq-admin', token); load(); };
if (token) load();
</script></body></html>`;
