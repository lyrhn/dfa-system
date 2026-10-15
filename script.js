// DFA Input String Checker
(() => {
  // Transition Function (δ)
  const delta = { q0: { 0: 'q0', 1: 'q1' }, q1: { 0: 'q0', 1: 'q1' } };
  // Start and Accept States
  const START = 'q0', ACCEPT = 'q1';
  // DOM Helpers
  const $ = id => document.getElementById(id);
  const input = $('binaryInput'), pop = $('pop');
  const HINT = 'Enter only 0 and 1.';
  // Run State
  let str = '', states = [START], frame = 0, timer = null;

  // Run DFA
  const runDFA = s => [...s].reduce((acc, c) => (acc.push(delta[acc.at(-1)][c]), acc), [START]);

  // Input Validation
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

  // Load Input
  function load() { stop(); str = input.value; states = runDFA(str); frame = 0; pop.hidden = true; render(null); }
  const last = () => str.length + 1;

  // Auto-Play
  // Plays itself: one transition per second, stops on the result card.
  function start() {
    load(); pop.hidden = false; render(0);
    timer = setInterval(() => { if (frame >= last()) return stop(); frame++; render(frame); }, 1000);
  }

  // Render Step
  // f === null → idle view; 0 = start; 1..n = transition n; n+1 = result
  function render(f) {
    const n = str.length;
    // Reset Highlights
    document.querySelectorAll('.st,.edge,.tt td,.tt tr,.tt th').forEach(el => el.classList.remove('current', 'next', 'active', 'final-ok', 'final-bad', 'glow', 'row-on', 'fin-ok', 'fin-bad'));

    // Input Tape
    $('tape').innerHTML = n ? [...str].map((c, i) => {
      const cls = f === null || f === 0 ? '' : (i < f - 1 || f > n) ? 'done' : i === f - 1 ? 'active' : '';
      return `<div class="cell ${cls}" aria-label="symbol ${i + 1}: ${c}">${c}</div>`;
    }).join('') : '<span class="tape-empty">ε (empty string)</span>';

    // Current Step and Verdict Chip
    const shown = f === null ? 0 : Math.min(f, n);
    const cur = states[shown];
    const vc = $('verdictChip');
    vc.hidden = true;

    // DFA Diagram and Transition Table Highlights
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
    // Status Chips
    $('curChip').textContent = (f !== null && f >= 1 && f <= n) ? `${states[f - 1]} → ${states[f]}` : cur;
    $('stepChip').textContent = `step ${shown} of ${n}`;

    // Processing Trace
    $('trace').innerHTML = shown ? [...str.slice(0, shown)].map((c, i) =>
      `<li class="${f !== null && f <= n && i === f - 1 ? 'now' : ''}">Step ${i + 1}: ${states[i]} + ${c} -> ${states[i + 1]}</li>`).join('')
      : '<li class="empty">Press Check String to run the DFA.</li>';
    // Complete State Flow
    $('path').innerHTML = states.slice(0, shown + 1).join('<span class="a">→</span>');

    // Transition Rules: same run (states) and same frame as the Processing Trace, so it reveals in sync.
    const verdict = q => q === ACCEPT ? 'ACCEPTED' : 'REJECTED';
    const rules = [...str.slice(0, shown)].map((c, i) =>
      `<li class="${f !== null && f <= n && i === f - 1 ? 'now' : ''}">Step ${i + 1}: δ(${states[i]}, ${c}) = ${states[i + 1]}</li>`);
    if (f !== null && f > n) rules.push(`<li class="${cur === ACCEPT ? 'fin-ok' : 'fin-bad'}">${n ? `Final state: ${cur}` : `ε: stays in ${START}`} → ${verdict(cur)}</li>`);
    $('rules').innerHTML = rules.join('');

    // Result Popup
    if (f !== null) renderPop(f);
  }

  // Result Popup
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

  // Popup Controls
  function finishView() { frame = last(); render(frame); pop.hidden = true; }
  function stop() { clearInterval(timer); timer = null; }
  // Closing mid-run jumps straight to the result so the page never stops half-way.
  const close = () => { const running = timer; stop(); running ? finishView() : (pop.hidden = true); };
  // Button and Keyboard Events
  $('closeBtn').onclick = close;
  $('checkBtn').onclick = start;
  $('clearBtn').onclick = () => { input.value = ''; load(); input.focus(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) close(); });

  // DFA Definition: every value is read from delta / START / ACCEPT above, so the panel can't disagree with the checker.
  const Q = Object.keys(delta), SIGMA = Object.keys(delta[START]), F = [ACCEPT];
  const set = a => `{${a.join(', ')}}`;
  $('defBox').innerHTML = [
    `M = (Q, Σ, δ, ${START}, F)`,
    `Q = ${set(Q)}`,
    `Σ = ${set(SIGMA)}`,
    `Start state = ${START}`,
    `Accept states F = ${set(F)}`
  ].map(l => `<div>${l}</div>`).join('');
  $('defLang').textContent = 'Language: binary strings that end in 1.';

  // Test Cases: "Expected" is the hand-written answer; "Actual" comes from runDFA, the same function the checker uses.
  const TESTS = [['1', 'ACCEPTED'], ['0', 'REJECTED'], ['11', 'ACCEPTED'], ['10', 'REJECTED'], ['101', 'ACCEPTED'], ['100', 'REJECTED'],
    ['111', 'ACCEPTED'], ['110', 'REJECTED'], ['0101', 'ACCEPTED'], ['1000', 'REJECTED'], ['', 'REJECTED']];
  const chip = v => `<span class="chip ${v === 'ACCEPTED' ? 'ok' : 'bad'}">${v}</span>`;
  let passed = 0;
  $('tcBody').innerHTML = TESTS.map(([s, expected], i) => {
    const run = runDFA(s), fin = run.at(-1), actual = fin === ACCEPT ? 'ACCEPTED' : 'REJECTED', ok = actual === expected;
    passed += ok;
    return `<tr class="${ok ? '' : 'mismatch'}"><td>${i + 1}</td><td class="mono">${s || 'ε'}</td><td class="mono">${run.join(' → ')}</td>` +
      `<td class="mono">${fin}</td><td>${chip(expected)}</td><td>${chip(actual)}${ok ? '' : ' <b>✗ mismatch</b>'}</td></tr>`;
  }).join('');
  $('tcSummary').textContent = `${passed} of ${TESTS.length} cases match the expected result.`;
  if (passed < TESTS.length) $('tcSummary').className = 'hint warn';

  // Initial Render
  load();
})();
