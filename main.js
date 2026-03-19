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

// ── TEAM STATS DATA ───────────────────────────────────────────────────

const TEAM_DATA = {
    'PSG': {
        fullName: 'Paris Saint-Germain',
        country: 'France',
        ucl_titles: 1,
        finals: 1,
        season: { W:6, D:1, L:1, GF:26, GA:14, pos:'2nd' },
        r16_result: 'Beat Chelsea 8-2 on aggregate',
        key_player: 'Kylian Mbappe',
        color: '#003f7a',
    },
    'Liverpool': {
        fullName: 'Liverpool FC',
        country: 'England',
        ucl_titles: 6,
        finals: 9,
        season: { W:4, D:3, L:1, GF:22, GA:16, pos:'7th' },
        r16_result: 'Beat Galatasaray 4-1 on aggregate',
        key_player: 'Mohamed Salah',
        color: '#c8102e',
    },
    'Real Madrid': {
        fullName: 'Real Madrid CF',
        country: 'Spain',
        ucl_titles: 15,
        finals: 18,
        season: { W:5, D:1, L:2, GF:22, GA:14, pos:'5th' },
        r16_result: 'Beat Man City 5-1 on aggregate',
        key_player: 'Kylian Mbappe',
        color: '#00529f',
    },
    'Bayern Munich': {
        fullName: 'FC Bayern Munchen',
        country: 'Germany',
        ucl_titles: 6,
        finals: 11,
        season: { W:6, D:0, L:2, GF:24, GA:12, pos:'4th' },
        r16_result: 'Beat Atalanta 10-2 on aggregate',
        key_player: 'Harry Kane',
        color: '#dc052d',
    },
    'Barcelona': {
        fullName: 'FC Barcelona',
        country: 'Spain',
        ucl_titles: 5,
        finals: 11,
        season: { W:5, D:1, L:2, GF:21, GA:15, pos:'6th' },
        r16_result: 'Beat Newcastle 8-3 on aggregate',
        key_player: 'Lamine Yamal',
        color: '#a50044',
    },
    'Atletico Madrid': {
        fullName: 'Atletico de Madrid',
        country: 'Spain',
        ucl_titles: 0,
        finals: 3,
        season: { W:4, D:1, L:3, GF:17, GA:15, pos:'14th' },
        r16_result: 'Beat Tottenham 7-5 on aggregate',
        key_player: 'Julian Alvarez',
        color: '#cb3524',
    },
    'Sporting CP': {
        fullName: 'Sporting Clube de Portugal',
        country: 'Portugal',
        ucl_titles: 0,
        finals: 0,
        season: { W:4, D:2, L:2, GF:18, GA:14, pos:'11th' },
        r16_result: 'Beat Bodo/Glimt 5-3 on aggregate',
        key_player: 'Viktor Gyokeres',
        color: '#1a6b2c',
    },
    'Arsenal': {
        fullName: 'Arsenal FC',
        country: 'England',
        ucl_titles: 0,
        finals: 1,
        season: { W:8, D:0, L:0, GF:23, GA:4, pos:'1st' },
        r16_result: 'Beat Leverkusen 3-1 on aggregate',
        key_player: 'Gabriel Martinelli',
        color: '#ef0107',
    },
};

// ── STATS PANEL INJECTION ─────────────────────────────────────────────

(function injectPanel() {
    const panel = document.createElement('div');
    panel.id = 'stats-panel';
    panel.innerHTML = `
        <button id="stats-close">&#x2715;</button>
        <div id="stats-header">
            <div id="stats-name"></div>
            <div id="stats-country"></div>
        </div>
        <div id="stats-titles-row">
            <div class="stat-badge" id="badge-titles">
                <div class="badge-num" id="stat-titles">0</div>
                <div class="badge-lbl">UCL Titles</div>
            </div>
            <div class="stat-badge">
                <div class="badge-num" id="stat-finals">0</div>
                <div class="badge-lbl">Finals</div>
            </div>
            <div class="stat-badge">
                <div class="badge-num" id="stat-pos">0</div>
                <div class="badge-lbl">This Season</div>
            </div>
        </div>
        <div class="stats-section-title">Goals</div>
        <div id="goals-chart"></div>
        <div class="stats-section-title">W / D / L</div>
        <div id="wdl-chart"></div>
        <div class="stats-section-title">Round of 16</div>
        <div id="stats-r16"></div>
        <div class="stats-section-title">Key Player</div>
        <div id="stats-player"></div>
    `;
    document.body.appendChild(panel);
    document.getElementById('stats-close').addEventListener('click', closePanel);
})();

let panelOpen = false;

function openStatsPanel(teamName) {
    const data = TEAM_DATA[teamName];
    if (!data) return;

    panelOpen = true;
    const panel = document.getElementById('stats-panel');
    panel.style.borderTop = '4px solid ' + data.color;

    document.getElementById('stats-name').textContent    = data.fullName;
    document.getElementById('stats-country').textContent = data.country;
    document.getElementById('stat-titles').textContent   = data.ucl_titles;
    document.getElementById('stat-finals').textContent   = data.finals;
    document.getElementById('stat-pos').textContent      = data.season.pos;
    document.getElementById('stats-r16').textContent     = data.r16_result;
    document.getElementById('stats-player').textContent  = data.key_player;

    const badgeTitles = document.getElementById('badge-titles');
    if (data.ucl_titles > 0) {
        badgeTitles.style.background = data.color;
        badgeTitles.querySelector('.badge-num').style.color = '#fff';
        badgeTitles.querySelector('.badge-lbl').style.color = 'rgba(255,255,255,0.75)';
    } else {
        badgeTitles.style.background = '#f4f6f9';
        badgeTitles.querySelector('.badge-num').style.color = '#1a2535';
        badgeTitles.querySelector('.badge-lbl').style.color = '#9aaabb';
    }

    drawGoals(data);
    drawWDL(data);

    panel.classList.add('open');
}

function closePanel() {
    document.getElementById('stats-panel').classList.remove('open');
    panelOpen = false;
}

// ── D3 GOALS CHART ────────────────────────────────────────────────────

function drawGoals(data) {
    const el = document.getElementById('goals-chart');
    el.innerHTML = '';

    const W = 260, H = 100, M = { top:18, right:10, bottom:24, left:34 };
    const iW = W - M.left - M.right;
    const iH = H - M.top  - M.bottom;

    const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
    const g   = svg.append('g').attr('transform', 'translate(' + M.left + ',' + M.top + ')');

    const cats   = ['GF', 'GA'];
    const vals   = [data.season.GF, data.season.GA];
    const colors = ['#27ae60', '#e74c3c'];

    const x = d3.scaleBand().domain(cats).range([0, iW]).padding(0.35);
    const y = d3.scaleLinear().domain([0, d3.max(vals) + 4]).range([iH, 0]);

    g.append('g').attr('transform', 'translate(0,' + iH + ')')
        .call(d3.axisBottom(x).tickSize(0))
        .call(function(ax) { ax.select('.domain').remove(); })
        .selectAll('text')
        .style('fill', '#9aaabb')
        .style('font-family', "'Barlow Condensed', sans-serif")
        .style('font-size', '12px')
        .style('font-weight', '700')
        .style('letter-spacing', '1px');

    g.append('g')
        .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')).tickSize(-iW))
        .call(function(ax) {
            ax.select('.domain').remove();
            ax.selectAll('.tick line').style('stroke', '#e8ecf2').style('stroke-dasharray', '2,3');
            ax.selectAll('.tick text').style('fill', '#9aaabb').style('font-size', '10px');
        });

    g.selectAll('.bar')
        .data(vals)
        .enter().append('rect')
        .attr('x',      function(d, i) { return x(cats[i]); })
        .attr('width',  x.bandwidth())
        .attr('y',      iH)
        .attr('height', 0)
        .attr('fill',   function(d, i) { return colors[i]; })
        .attr('rx', 4)
        .transition().duration(600).delay(function(d, i) { return i * 120; })
        .attr('y',      function(d) { return y(d); })
        .attr('height', function(d) { return iH - y(d); });

    g.selectAll('.bar-lbl')
        .data(vals)
        .enter().append('text')
        .attr('x',           function(d, i) { return x(cats[i]) + x.bandwidth() / 2; })
        .attr('y',           iH)
        .attr('text-anchor', 'middle')
        .style('fill',       '#1a2535')
        .style('font-family', "'Barlow Condensed', sans-serif")
        .style('font-size',  '13px')
        .style('font-weight','700')
        .style('opacity',    0)
        .text(function(d) { return d; })
        .transition().duration(600).delay(function(d, i) { return i * 120 + 300; })
        .attr('y', function(d) { return y(d) - 6; })
        .style('opacity', 1);
}

// ── D3 W/D/L BAR CHART ───────────────────────────────────────────────

function drawWDL(data) {
    const el = document.getElementById('wdl-chart');
    el.innerHTML = '';

    const W = 260, H = 100, M = { top:18, right:10, bottom:24, left:34 };
    const iW = W - M.left - M.right;
    const iH = H - M.top  - M.bottom;

    const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
    const g   = svg.append('g').attr('transform', 'translate(' + M.left + ',' + M.top + ')');

    const cats   = ['W', 'D', 'L'];
    const vals   = [data.season.W, data.season.D, data.season.L];
    const colors = ['#27ae60', '#f39c12', '#e74c3c'];

    const x = d3.scaleBand().domain(cats).range([0, iW]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(vals) + 1]).range([iH, 0]);

    g.append('g').attr('transform', 'translate(0,' + iH + ')')
        .call(d3.axisBottom(x).tickSize(0))
        .call(function(ax) { ax.select('.domain').remove(); })
        .selectAll('text')
        .style('fill', '#9aaabb')
        .style('font-family', "'Barlow Condensed', sans-serif")
        .style('font-size', '12px')
        .style('font-weight', '700')
        .style('letter-spacing', '1px');

    g.append('g')
        .call(d3.axisLeft(y).ticks(d3.max(vals)).tickFormat(d3.format('d')).tickSize(-iW))
        .call(function(ax) {
            ax.select('.domain').remove();
            ax.selectAll('.tick line').style('stroke', '#e8ecf2').style('stroke-dasharray', '2,3');
            ax.selectAll('.tick text').style('fill', '#9aaabb').style('font-size', '10px');
        });

    g.selectAll('.bar')
        .data(vals)
        .enter().append('rect')
        .attr('x',      function(d, i) { return x(cats[i]); })
        .attr('width',  x.bandwidth())
        .attr('y',      iH)
        .attr('height', 0)
        .attr('fill',   function(d, i) { return colors[i]; })
        .attr('rx', 4)
        .transition().duration(600).delay(function(d, i) { return i * 100; })
        .attr('y',      function(d) { return y(d); })
        .attr('height', function(d) { return iH - y(d); });

    g.selectAll('.bar-lbl')
        .data(vals)
        .enter().append('text')
        .attr('x',           function(d, i) { return x(cats[i]) + x.bandwidth() / 2; })
        .attr('y',           iH)
        .attr('text-anchor', 'middle')
        .style('fill',       '#1a2535')
        .style('font-family', "'Barlow Condensed', sans-serif")
        .style('font-size',  '13px')
        .style('font-weight','700')
        .style('opacity',    0)
        .text(function(d) { return d; })
        .transition().duration(600).delay(function(d, i) { return i * 100 + 300; })
        .attr('y', function(d) { return y(d) - 6; })
        .style('opacity', 1);
}

// ── BUILD R16 ─────────────────────────────────────────────────────────

function buildR16(elId, matchId) {
    const el = document.getElementById(elId);
    const d  = R16[matchId];
    el.innerHTML = '';
    d.teams.forEach(function(team) {
        const row = document.createElement('div');
        row.className = 'team-row no-click' + (team === d.winner ? ' winner' : ' loser');

        const lbl = document.createElement('span');
        lbl.className   = 'team-label';
        lbl.textContent = team;
        row.appendChild(lbl);

        if (team === d.winner) {
            const tick = document.createElement('span');
            tick.className     = 'team-tick';
            tick.textContent   = '\u2713';
            tick.style.opacity = '1';
            row.appendChild(tick);
        }

        if (TEAM_DATA[team]) {
            row.classList.add('has-stats');
            row.addEventListener('click', function(e) {
                e.stopPropagation();
                openStatsPanel(team);
            });
        }

        el.appendChild(row);
    });
}

Object.keys(R16).forEach(function(mid) { buildR16('m-' + mid, mid); });

// ── BUILD CLICKABLE MATCHES ───────────────────────────────────────────

function buildMatch(elId, matchId) {
    const el = document.getElementById(elId);
    el.innerHTML = '';
    [0, 1].forEach(function(si) {
        const row  = document.createElement('div');
        row.className     = 'team-row';
        row.dataset.match = matchId;
        row.dataset.slot  = si;

        const lbl  = document.createElement('span'); lbl.className  = 'team-label';
        const tick = document.createElement('span'); tick.className = 'team-tick'; tick.textContent = '\u2713';

        const info = document.createElement('button');
        info.className   = 'info-btn';
        info.textContent = '\u24d8';
        info.title       = 'View team stats';

        row.appendChild(lbl);
        row.appendChild(tick);
        row.appendChild(info);
        el.appendChild(row);

        row.addEventListener('click',      function()  { handleClick(matchId, si); });
        row.addEventListener('mouseenter', function(e) { showTip(e, matchId, si); });
        row.addEventListener('mousemove',  function(e) { moveTip(e); });
        row.addEventListener('mouseleave', hideTip);

        info.addEventListener('click', function(e) {
            e.stopPropagation();
            const team = SLOTS[matchId][si];
            if (team && TEAM_DATA[team]) openStatsPanel(team);
        });
    });
}

['qfL1','qfL2','qfR1','qfR2','sfL','sfR','final'].forEach(function(id) { buildMatch('m-' + id, id); });

// ── RENDER ────────────────────────────────────────────────────────────

function render() {
    document.querySelectorAll('.team-row:not(.no-click)').forEach(function(row) {
        const mid  = row.dataset.match;
        const si   = +row.dataset.slot;
        const team = SLOTS[mid][si];
        const w    = W[mid];
        row.querySelector('.team-label').textContent = team || '\u2014';
        row.classList.remove('winner', 'loser', 'empty');
        if (!team)           row.classList.add('empty');
        else if (w === team) row.classList.add('winner');
        else if (w !== null) row.classList.add('loser');
    });
    const ce = document.getElementById('champName');
    ce.textContent = champion || '\u2014';
    ce.style.color = champion ? '#cc0000' : '#aabbcc';
    requestAnimationFrame(drawConnectors);
}

// ── CLICK LOGIC ───────────────────────────────────────────────────────

function handleClick(matchId, si) {
    const team = SLOTS[matchId][si];
    if (!team) return;

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
        const nid = feed[0];
        const ns  = feed[1];
        const prev = SLOTS[nid][ns];
        if (prev && prev !== team && W[nid] === prev) {
            W[nid] = null;
            clearDown(nid);
        }
        SLOTS[nid][ns] = team;
    } else {
        champion = team;
        fireConfetti();
    }
    render();
}

function clearDown(matchId) {
    const feed = FEEDS[matchId];
    if (!feed) { champion = null; return; }
    const nid  = feed[0];
    const ns   = feed[1];
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
    svg.setAttribute('viewBox', '0 0 ' + wrap.clientWidth + ' ' + wrap.clientHeight);
    svg.innerHTML = '';

    PAIRS.forEach(function(pair) {
        const fid = pair[0];
        const tid = pair[1];
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
        p.setAttribute('d',            'M' + sx + ',' + fy + ' H' + mx + ' V' + ty + ' H' + ex);
        p.setAttribute('fill',         'none');
        p.setAttribute('stroke',       '#ccd5e0');
        p.setAttribute('stroke-width', '1.5');
        svg.appendChild(p);
    });
}

// ── TOOLTIP ──────────────────────────────────────────────────────────

const r16Info = {};
Object.values(R16).forEach(function(m) {
    const loser = m.teams.find(function(t) { return t !== m.winner; });
    r16Info[m.winner] = 'Beat ' + loser + ' in the Round of 16';
});

const tipEl = document.getElementById('tip');

function showTip(e, mid, si) {
    const team = SLOTS[mid][si];
    if (!team) return;
    const info = r16Info[team] || '';
    tipEl.style.display = 'block';
    tipEl.innerHTML = '<div class="tip-name">' + team + '</div>' + (info ? '<div class="tip-info">' + info + '</div>' : '');
    moveTip(e);
}
function moveTip(e) {
    tipEl.style.left = (e.clientX + 14) + 'px';
    tipEl.style.top  = (e.clientY - 52) + 'px';
}
function hideTip() { tipEl.style.display = 'none'; }

// ── RESET ─────────────────────────────────────────────────────────────

document.getElementById('resetBtn').addEventListener('click', function() {
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
    particles.forEach(function(p) {
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