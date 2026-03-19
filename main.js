// ── DATA ──────────────────────────────────────────────────────────────

const R16 = {
    r16L1: { teams: ['PSG',             'Chelsea'],      winner: 'PSG'             },
    r16L2: { teams: ['Liverpool',       'Galatasaray'],  winner: 'Liverpool'       },
    r16L3: { teams: ['Real Madrid',     'Man City'],     winner: 'Real Madrid'     },
    r16L4: { teams: ['Bayern Munich',   'Atalanta'],     winner: 'Bayern Munich'   },
    r16R1: { teams: ['Barcelona',       'Newcastle'],    winner: 'Barcelona'       },
    r16R2: { teams: ['Atletico Madrid', 'Tottenham'],    winner: 'Atletico Madrid' },
    r16R3: { teams: ['Sporting CP',     'Bodo/Glimt'],   winner: 'Sporting CP'     },
    r16R4: { teams: ['Arsenal',         'Leverkusen'],   winner: 'Arsenal'         },
};

const SLOTS = {
    qfL1: ['PSG',       'Liverpool'],          qfL2: ['Real Madrid',    'Bayern Munich'],
    qfR1: ['Barcelona', 'Atletico Madrid'],    qfR2: ['Sporting CP',    'Arsenal'],
    sfL:  [null, null],
    sfR:  [null, null],
    final:[null, null],
};

const FEEDS = {
    qfL1: ['sfL',   0],  qfL2: ['sfL',   1],
    qfR1: ['sfR',   0],  qfR2: ['sfR',   1],
    sfL:  ['final', 0],  sfR:  ['final', 1],
};

let W = { qfL1:null, qfL2:null, qfR1:null, qfR2:null, sfL:null, sfR:null, final:null };
let champion = null;

// ── BUILD R16 (static, read-only) ────────────────────────────────────

function buildR16(elId, matchId) {
    const el = document.getElementById(elId);
    const d  = R16[matchId];
    el.innerHTML = '';
    d.teams.forEach(team => {
        const row = document.createElement('div');
        row.className = 'team-row no-click' + (team === d.winner ? ' winner' : ' loser');
        const lbl = document.createElement('span');
        lbl.className   = 'team-label';
        lbl.textContent = team;
        row.appendChild(lbl);
        if (team === d.winner) {
            const tick = document.createElement('span');
            tick.className   = 'team-tick';
            tick.textContent = '✓';
            tick.style.opacity = '1';
            row.appendChild(tick);
        }
        el.appendChild(row);
    });
}

Object.keys(R16).forEach(mid => buildR16('m-' + mid, mid));

// ── BUILD CLICKABLE MATCHES ───────────────────────────────────────────

function buildMatch(elId, matchId) {
    const el = document.getElementById(elId);
    el.innerHTML = '';
    [0, 1].forEach(si => {
        const row  = document.createElement('div');
        row.className    = 'team-row';
        row.dataset.match = matchId;
        row.dataset.slot  = si;
        const lbl  = document.createElement('span'); lbl.className  = 'team-label';
        const tick = document.createElement('span'); tick.className = 'team-tick'; tick.textContent = '✓';
        row.appendChild(lbl);
        row.appendChild(tick);
        el.appendChild(row);
        row.addEventListener('click',      ()  => handleClick(matchId, si));
        row.addEventListener('mouseenter', e   => showTip(e, matchId, si));
        row.addEventListener('mousemove',  e   => moveTip(e));
        row.addEventListener('mouseleave', hideTip);
    });
}

['qfL1','qfL2','qfR1','qfR2','sfL','sfR','final'].forEach(id => buildMatch('m-' + id, id));

// ── RENDER ────────────────────────────────────────────────────────────

function render() {
    document.querySelectorAll('.team-row:not(.no-click)').forEach(row => {
        const mid  = row.dataset.match;
        const si   = +row.dataset.slot;
        const team = SLOTS[mid][si];
        const w    = W[mid];
        row.querySelector('.team-label').textContent = team || '—';
        row.classList.remove('winner', 'loser', 'empty');
        if (!team)           row.classList.add('empty');
        else if (w === team) row.classList.add('winner');
        else if (w !== null) row.classList.add('loser');
    });
    const ce = document.getElementById('champName');
    ce.textContent  = champion || '—';
    ce.style.color  = champion ? '#cc0000' : '#aabbcc';
    requestAnimationFrame(drawConnectors);
}

// ── CLICK LOGIC ───────────────────────────────────────────────────────

function handleClick(matchId, si) {
    const team = SLOTS[matchId][si];
    if (!team) return;

    // Click current winner → undo
    if (W[matchId] === team) {
        W[matchId] = null;
        clearDown(matchId);
        render();
        return;
    }

    if (W[matchId] !== null) clearDown(matchId);
    W[matchId] = team;

    const feed = FEEDS[matchId];
    if (feed) {
        const [nid, ns] = feed;
        const prev = SLOTS[nid][ns];
        if (prev && prev !== team && W[nid] === prev) {
            W[nid] = null;
            clearDown(nid);
        }
        SLOTS[nid][ns] = team;
    } else {
        // Final clicked — set champion and fire confetti!
        champion = team;
        fireConfetti();
    }
    render();
}

function clearDown(matchId) {
    const feed = FEEDS[matchId];
    if (!feed) { champion = null; return; }
    const [nid, ns] = feed;
    const prev = SLOTS[nid][ns];
    SLOTS[nid][ns] = null;
    if (prev && W[nid] === prev) {
        W[nid] = null;
        clearDown(nid);
    }
    if (nid === 'final') champion = null;
}

// ── CONNECTOR LINES (D3 SVG) ─────────────────────────────────────────

const PAIRS = [
    ['r16L1','qfL1'], ['r16L2','qfL1'], ['r16L3','qfL2'], ['r16L4','qfL2'],
    ['r16R1','qfR1'], ['r16R2','qfR1'], ['r16R3','qfR2'], ['r16R4','qfR2'],
    ['qfL1','sfL'],   ['qfL2','sfL'],   ['qfR1','sfR'],   ['qfR2','sfR'],
    ['sfL','final'],  ['sfR','final'],
];

function drawConnectors() {
    const wrap = document.querySelector('.bracket-wrap');
    const svg  = document.getElementById('connSvg');
    if (!wrap || !svg) return;
    const wRect = wrap.getBoundingClientRect();
    svg.setAttribute('width',   wrap.clientWidth);
    svg.setAttribute('height',  wrap.clientHeight);
    svg.setAttribute('viewBox', `0 0 ${wrap.clientWidth} ${wrap.clientHeight}`);
    svg.innerHTML = '';

    PAIRS.forEach(([fid, tid]) => {
        const fEl = document.getElementById('m-' + fid);
        const tEl = document.getElementById('m-' + tid);
        if (!fEl || !tEl) return;
        const fr = fEl.getBoundingClientRect();
        const tr = tEl.getBoundingClientRect();
        const fy = fr.top - wRect.top + fr.height / 2;
        const ty = tr.top - wRect.top + tr.height / 2;
        const goRight = fr.left < tr.left;
        const sx = goRight ? fr.right - wRect.left : fr.left  - wRect.left;
        const ex = goRight ? tr.left  - wRect.left : tr.right - wRect.left;
        const mx = (sx + ex) / 2;
        const p  = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d',            `M${sx},${fy} H${mx} V${ty} H${ex}`);
        p.setAttribute('fill',         'none');
        p.setAttribute('stroke',       '#ccd5e0');
        p.setAttribute('stroke-width', '1.5');
        svg.appendChild(p);
    });
}

// ── TOOLTIP ──────────────────────────────────────────────────────────

const r16Info = {};
Object.values(R16).forEach(({ teams, winner }) => {
    const loser = teams.find(t => t !== winner);
    r16Info[winner] = `Beat ${loser} — Round of 16`;
});

const tipEl = document.getElementById('tip');

function showTip(e, mid, si) {
    const team = SLOTS[mid][si];
    if (!team) return;
    const info = r16Info[team] || '';
    tipEl.style.display = 'block';
    tipEl.innerHTML = `<div class="tip-name">${team}</div>${info ? `<div class="tip-info">${info}</div>` : ''}`;
    moveTip(e);
}
function moveTip(e) {
    tipEl.style.left = (e.clientX + 14) + 'px';
    tipEl.style.top  = (e.clientY - 52) + 'px';
}
function hideTip() { tipEl.style.display = 'none'; }

// ── RESET ─────────────────────────────────────────────────────────────

document.getElementById('resetBtn').addEventListener('click', () => {
    Object.assign(SLOTS, {
        qfL1: ['PSG',       'Liverpool'],       qfL2: ['Real Madrid',    'Bayern Munich'],
        qfR1: ['Barcelona', 'Atletico Madrid'], qfR2: ['Sporting CP',    'Arsenal'],
        sfL:  [null, null], sfR: [null, null],  final: [null, null],
    });
    W = { qfL1:null, qfL2:null, qfR1:null, qfR2:null, sfL:null, sfR:null, final:null };
    champion = null;
    render();
});

window.addEventListener('resize', drawConnectors);

// ── CONFETTI ──────────────────────────────────────────────────────────

const canvas = document.getElementById('confetti-canvas');
const ctx    = canvas.getContext('2d');
let particles = [];
let animId    = null;

const COLORS = ['#cc0000','#1a4a99','#f0c040','#00aa55','#ff6600','#aa00cc','#00aacc'];

function fireConfetti() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];
    for (let i = 0; i < 160; i++) {
        particles.push({
            x:     Math.random() * canvas.width,
            y:     -10 - Math.random() * 200,
            w:     6 + Math.random() * 8,
            h:     10 + Math.random() * 6,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            vx:    (Math.random() - 0.5) * 3,
            vy:    2 + Math.random() * 4,
            angle: Math.random() * Math.PI * 2,
            spin:  (Math.random() - 0.5) * 0.2,
            life:  1,
        });
    }
    if (animId) cancelAnimationFrame(animId);
    animateConfetti();
}

function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
        p.x     += p.vx;
        p.y     += p.vy;
        p.angle += p.spin;
        p.vy    += 0.08;
        p.life  -= 0.005;
        if (p.y < canvas.height + 20) alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
    });
    if (alive) {
        animId = requestAnimationFrame(animateConfetti);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// ── INIT ──────────────────────────────────────────────────────────────
render();