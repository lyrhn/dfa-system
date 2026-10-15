(() => {
  const delta = { q0: { 0: 'q0', 1: 'q1' }, q1: { 0: 'q0', 1: 'q1' } };
  const START = 'q0', ACCEPT = 'q1';
  const $ = id => document.getElementById(id);
  const input = $('binaryInput'), pop = $('pop');
  const HINT = 'Enter only 0 and 1.';
  let str = '', states = [START], frame = 0, timer = null;

  const runDFA = s => [...s].reduce((acc, c) => (acc.push(delta[acc.at(-1)][c]), acc), [START]);

  let warnT;
  function warn(bad) {
    input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
    $('hint').textContent = `“${bad}” rejected. This DFA only reads 0 and 1.`;
    $('hint').className = 'hint warn';
    clearTimeout(warnT);
    warnT = setTimeout(() => { $('hint').textContent = HINT; $('hint').className = 'hint'; }, 2500);
  }
  // Stop a bad key before it ever reaches the box.
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); return start(); }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !/[01]/.test(e.key)) { e.preventDefault(); warn(e.key); }
  });
  input.addEventListener('beforeinput', e => {
    if (e.data && /[^01]/.test(e.data) && !e.inputType.startsWith('insertFromPaste')) { e.preventDefault(); warn(e.data.replace(/[01]/g, '')); }
  });
  // Fallback for paste, drop, autofill and mobile keyboards: strip anything that slipped in.
  input.addEventListener('input', () => {
    const pos = input.selectionStart, raw = input.value, clean = raw.replace(/[^01]/g, '');
    if (clean !== raw) {
      input.value = clean;
      const p = pos - (raw.length - clean.length);
      input.setSelectionRange(p, p);
      warn([...new Set(raw.replace(/[01]/g, ''))].join(' '));
    }
    load();
  });

  function load() { stop(); str = input.value; states = runDFA(str); frame = 0; pop.hidden = true; render(null); }
  const last = () => str.length + 1;

  // Plays itself: one transition per second, stops on the result card.
  function start() {
    load(); pop.hidden = false; render(0);
    timer = setInterval(() => { if (frame >= last()) return stop(); frame++; render(frame); }, 1000);
  }

  // f === null → idle view; 0 = start; 1..n = transition n; n+1 = result
  function render(f) {
    const n = str.length;
    document.querySelectorAll('.st,.edge,.tt td,.tt tr,.tt th').forEach(el => el.classList.remove('current', 'next', 'active', 'final-ok', 'final-bad', 'glow', 'row-on', 'fin-ok', 'fin-bad'));

    $('tape').innerHTML = n ? [...str].map((c, i) => {
      const cls = f === null || f === 0 ? '' : (i < f - 1 || f > n) ? 'done' : i === f - 1 ? 'active' : '';
      return `<div class="cell ${cls}" aria-label="symbol ${i + 1}: ${c}">${c}</div>`;
    }).join('') : '<span class="tape-empty">ε (empty string)</span>';

    const shown = f === null ? 0 : Math.min(f, n);
    const cur = states[shown];
    const vc = $('verdictChip');
    vc.hidden = true;

    if (f === null || f === 0) {
      $('s-' + START).classList.add('current');
    } else if (f <= n) {
      const from = states[f - 1], to = states[f];
      $('s-' + from).classList.add('current');
      if (from !== to) $('s-' + to).classList.add('next');
      $(`e-${from}-${to}`).classList.add('active');
      $('r-' + from).classList.add('row-on');
      $(`t-${from}-${str[f - 1]}`).classList.add('glow');
    } else {
      const ok = cur === ACCEPT;
      $('s-' + cur).classList.add(ok ? 'final-ok' : 'final-bad');
      $('r-' + cur).querySelector('th').classList.add(ok ? 'fin-ok' : 'fin-bad');
      vc.hidden = false; vc.className = 'chip ' + (ok ? 'ok' : 'bad'); vc.textContent = ok ? 'ACCEPTED' : 'REJECTED';
    }
    $('curChip').textContent = (f !== null && f >= 1 && f <= n) ? `${states[f - 1]} → ${states[f]}` : cur;
    $('stepChip').textContent = `step ${shown} of ${n}`;

    $('trace').innerHTML = shown ? [...str.slice(0, shown)].map((c, i) =>
      `<li class="${f !== null && f <= n && i === f - 1 ? 'now' : ''}">Step ${i + 1}: ${states[i]} + ${c} -> ${states[i + 1]}</li>`).join('')
      : '<li class="empty">Press Check String to run the DFA.</li>';
    $('path').innerHTML = states.slice(0, shown + 1).join('<span class="a">→</span>');

    if (f !== null) renderPop(f);
  }

  function renderPop(f) {
    const n = str.length, body = $('popBody');
    pop.className = 'pop';
    $('bar').style.width = (f / last() * 100) + '%';
    if (f === 0) {
      $('popTitle').textContent = 'Start';
      body.innerHTML = `<div class="big">→ q0</div>`;
    } else if (f <= n) {
      const from = states[f - 1], to = states[f], c = str[f - 1];
      $('popTitle').textContent = `Transition ${f} of ${n}`;
      body.innerHTML = `<div class="big">${from} <span class="sym">reads ${c}</span> → ${to}</div>`;
    } else {
      const ok = states[n] === ACCEPT;
      pop.classList.add(ok ? 'ok' : 'bad');
      $('popTitle').textContent = 'Result';
      body.innerHTML = `<div class="verdict">${ok ? 'Accepted' : 'Rejected'}</div>`;
    }
  }

  function finishView() { frame = last(); render(frame); pop.hidden = true; }
  function stop() { clearInterval(timer); timer = null; }
  // Closing mid-run jumps straight to the result so the page never stops half-way.
  const close = () => { const running = timer; stop(); running ? finishView() : (pop.hidden = true); };
  $('closeBtn').onclick = close;
  $('checkBtn').onclick = start;
  $('clearBtn').onclick = () => { input.value = ''; load(); input.focus(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) close(); });

  load();
})();
