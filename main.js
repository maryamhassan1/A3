// DATA (from data.json)
let roundOf16 = {};
let quarterFinals = {};
let teams = {};
const r16Results = {};

// BRACKET original STATE 
// Each match holds [team1, team2], null is not yet determined
let bracket = {
    qfL1: [null, null], qfL2: [null, null],
    qfR1: [null, null], qfR2: [null, null],
    sfL:  [null, null], sfR:  [null, null], 
    final: [null, null],
};

// the user's picked winner for each match 
let picks = { qfL1:null, qfL2:null, qfR1:null, qfR2:null, sfL:null, sfR:null, final:null };
let winner = null;
let viewMode = 'all'; 
let selectedCountry = '';

const nextRound = {
    qfL1: ['sfL',   0],  qfL2: ['sfL',   1],
    qfR1: ['sfR',   0],  qfR2: ['sfR',   1],
    sfL:  ['final', 0],  sfR:  ['final', 1],
    final: null,
};

// probability weights 
const probabilityWeights = { points: 45, goals: 35, WINhistory: 20 };

// Returns the weights to use based on which button is PRESSED, defaul is all 
function getCurrentWeights() {
    if (viewMode === 'points')     return { points: 100, goals: 0,   WINhistory: 0   };
    if (viewMode === 'goals')      return { points: 0,   goals: 100, WINhistory: 0   };
    if (viewMode === 'WINhistory') return { points: 0,   goals: 0,   WINhistory: 100 };
    return probabilityWeights; // default: 'all' mode
}

//  summary shown below the  buttons describing each view
const viewSummaries = {
    all:        '',
    points:     'Arsenal and Bayern are THE leaders on points per game.',
    goals:      'Arsenal conceded just 5 goals in 8 games, the best defensive record. Bayern (22 scored, 8 conceded) are the best all-round on goals.',
    WINhistory: 'Real Madrid\'s 15 UCL titles are the top of this metric. Liverpool (6) and Bayern (6) are next. Arsenal, Atletico, and Sporting have never won it.',
};

// creates and adds the stats panel to the page
function createStatsPanel() {
    const panel = document.createElement('div');
    panel.id = 'stats-panel';
    panel.innerHTML = `
        <button id="stats-close">&#x2715;</button>

        <div id="panel-team">
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
        </div>

        <div id="panel-match">
            <div id="match-panel-hdr">
                <div id="match-panel-teams"></div>
                <div id="match-panel-round"></div>
            </div>
            <div class="stats-section-title" style="margin-top:18px">Win probability breakdown</div>
            <div id="factor-chart"></div>
            <div class="model-note">Model: 45% points per game · 35% goals · 20% UCL win history</div>
            <div class="stats-section-title" style="margin-top:18px">How to read this</div>
            <div class="model-explainer">Each bar shows one team's edge in that factor. A team with 8W-0D-0L scores much higher on Points. The <strong>All</strong> row is the weighted sum, giving the final match probability.</div>
        </div>
    `;

    // add panel to the page
    document.body.appendChild(panel);
    document.getElementById('stats-close').addEventListener('click', closePanel);
}

createStatsPanel();

let panelOpen = false;
// 'team' = shows team stats, 'match' = shows match breakdown
let panelType = 'team'; 

// opens the panel showing a team's stats
function openStatsPanel(teamName) {
    const teamInfo = teams[teamName];
    if (!teamInfo) return;
    panelOpen = true;
    panelType  = 'team';
    document.getElementById('panel-team').style.display  = 'block';
    document.getElementById('panel-match').style.display = 'none';
    const panel = document.getElementById('stats-panel');
    panel.style.borderTop = '4px solid ' + teamInfo.color;
    document.getElementById('stats-name').textContent    = teamInfo.fullName;
    document.getElementById('stats-country').textContent = teamInfo.country;
    document.getElementById('stat-titles').textContent   = teamInfo.ucl_titles;
    document.getElementById('stat-finals').textContent   = teamInfo.finals;
    document.getElementById('stat-pos').textContent      = teamInfo.season.pos;
    document.getElementById('stats-r16').textContent     = teamInfo.r16_result;
    document.getElementById('stats-player').textContent  = teamInfo.key_player;

// make the titles badge in gold if they have won the championship before, grey if not
const titlesBadge = document.getElementById('badge-titles');
if (teamInfo.ucl_titles > 0) {
    // gold for winners
    titlesBadge.style.background = '#f0c040'; 
    titlesBadge.querySelector('.badge-num').style.color = '#1a2535';
    titlesBadge.querySelector('.badge-lbl').style.color = '#1a2535';
} else {
    // grey 
    titlesBadge.style.background = '#f4f6f9';
    titlesBadge.querySelector('.badge-num').style.color = '#1a2535';
    titlesBadge.querySelector('.badge-lbl').style.color = '#9aaabb';
}

drawGoals(teamInfo);
drawWDL(teamInfo);
panel.classList.add('open');
} 

// opens the panel showing the probability breakdown for a match
function openMatchBreakdown(matchId) {
    const [team1, team2] = bracket[matchId];
    if (!team1 && !team2) return;

    panelOpen = true;
    panelType  = 'match';

    // show the match view, hide the team view
    document.getElementById('panel-team').style.display  = 'none';
    document.getElementById('panel-match').style.display = 'block';

    const roundLabels = {
        qfL1: 'Quarter-Final', qfL2: 'Quarter-Final',
        qfR1: 'Quarter-Final', qfR2: 'Quarter-Final',
        sfL:  'Semi-Final',    sfR:  'Semi-Final',
        final: 'Final',
    };

    document.getElementById('match-panel-teams').textContent = (team1 || '?') + ' vs ' + (team2 || '?');
    document.getElementById('match-panel-round').textContent = roundLabels[matchId] || '';

    // use team1's colour for the panel top border
    const borderColor = (team1 && teams[team1]) ? teams[team1].color : '#cc0000';
    document.getElementById('stats-panel').style.borderTop = '4px solid ' + borderColor;

    drawFactorBreakdown(matchId);
    document.getElementById('stats-panel').classList.add('open');
}

// closes the stats panel
function closePanel() {
    document.getElementById('stats-panel').classList.remove('open');
    panelOpen = false;
}


// d3charts
// Draws the Goals For / Goals Against bar chart in the stats panel
function drawGoals(teamInfo) {
    const container = document.getElementById('goals-chart');
    container.innerHTML = '';

    const W = 260, H = 100, margin = { top:18, right:10, bottom:24, left:34 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
        .attr('width', W)
        .attr('height', H);

    // g is the inner drawing area shifted by the margin
    const g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const categories = ['GF', 'GA'];
    const values     = [teamInfo.season.GF, teamInfo.season.GA];
    const colors     = ['#27ae60', '#e74c3c'];

    // x scale: one band per category
    const xScale = d3.scaleBand()
        .domain(categories)
        .range([0, innerW])
        .padding(0.35);

    // y scale: 0 to max value
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(values) + 4])
        .range([innerH, 0]);

    // x axis
    g.append('g')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(d3.axisBottom(xScale).tickSize(0))
        .call(function(ax) { ax.select('.domain').remove(); })
        .selectAll('text')
        .style('fill', '#9aaabb')
        .style('font-size', '12px')
        .style('font-weight', '700');

    // y axis with gridlines
    g.append('g')
        .call(d3.axisLeft(yScale).ticks(4).tickFormat(d3.format('d')).tickSize(-innerW))
        .call(function(ax) {
            ax.select('.domain').remove();
            ax.selectAll('.tick line').style('stroke', '#e8ecf2').style('stroke-dasharray', '2,3');
            ax.selectAll('.tick text').style('fill', '#9aaabb').style('font-size', '10px');
        });

    // bars animated upward on entry
    g.selectAll('.bar')
        .data(values)
        .enter()
        .append('rect')
        .attr('x', function(_, i) { return xScale(categories[i]); })
        .attr('width', xScale.bandwidth())
        .attr('y', innerH)
        .attr('height', 0)
        .attr('fill', function(_, i) { return colors[i]; })
        .attr('rx', 4)
        .transition().duration(600).delay(function(_, i) { return i * 120; })
        .attr('y', function(d) { return yScale(d); })
        .attr('height', function(d) { return innerH - yScale(d); });

    // value labels above each bar
    g.selectAll('.bar-label')
        .data(values)
        .enter()
        .append('text')
        .attr('x', function(_, i) { return xScale(categories[i]) + xScale.bandwidth() / 2; })
        .attr('y', innerH)
        .attr('text-anchor', 'middle')
        .style('fill', '#1a2535')
        .style('font-size', '13px')
        .style('font-weight', '700')
        .style('opacity', 0)
        .text(function(d) { return d; })
        .transition().duration(600).delay(function(_, i) { return i * 120 + 300; })
        .attr('y', function(d) { return yScale(d) - 6; })
        .style('opacity', 1);
}

// D3charts
function drawWDL(teamInfo) {
    const container = document.getElementById('wdl-chart');
    container.innerHTML = '';

    const W = 260, H = 100, margin = { top:18, right:10, bottom:24, left:34 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
        .attr('width', W)
        .attr('height', H);

    const g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const categories = ['W', 'D', 'L'];
    const values     = [teamInfo.season.W, teamInfo.season.D, teamInfo.season.L];
    const colors     = ['#27ae60', '#f39c12', '#e74c3c'];

    const xScale = d3.scaleBand()
        .domain(categories)
        .range([0, innerW])
        .padding(0.25);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(values) + 1])
        .range([innerH, 0]);

    g.append('g')
        .attr('transform', 'translate(0,' + innerH + ')')
        .call(d3.axisBottom(xScale).tickSize(0))
        .call(function(ax) { ax.select('.domain').remove(); })
        .selectAll('text')
        .style('fill', '#9aaabb')
        .style('font-size', '12px')
        .style('font-weight', '700');

    g.append('g')
        .call(d3.axisLeft(yScale).ticks(d3.max(values)).tickFormat(d3.format('d')).tickSize(-innerW))
        .call(function(ax) {
            ax.select('.domain').remove();
            ax.selectAll('.tick line').style('stroke', '#e8ecf2').style('stroke-dasharray', '2,3');
            ax.selectAll('.tick text').style('fill', '#9aaabb').style('font-size', '10px');
        });

    g.selectAll('.bar')
        .data(values)
        .enter()
        .append('rect')
        .attr('x', function(_, i) { return xScale(categories[i]); })
        .attr('width', xScale.bandwidth())
        .attr('y', innerH)
        .attr('height', 0)
        .attr('fill', function(_, i) { return colors[i]; })
        .attr('rx', 4)
        .transition().duration(600).delay(function(_, i) { return i * 100; })
        .attr('y', function(d) { return yScale(d); })
        .attr('height', function(d) { return innerH - yScale(d); });

    g.selectAll('.bar-label')
        .data(values)
        .enter()
        .append('text')
        .attr('x', function(_, i) { return xScale(categories[i]) + xScale.bandwidth() / 2; })
        .attr('y', innerH)
        .attr('text-anchor', 'middle')
        .style('fill', '#1a2535')
        .style('font-size', '13px')
        .style('font-weight', '700')
        .style('opacity', 0)
        .text(function(d) { return d; })
        .transition().duration(600).delay(function(_, i) { return i * 100 + 300; })
        .attr('y', function(d) { return yScale(d) - 6; })
        .style('opacity', 1);
}
// horizontal probability breakdown bars 
function drawFactorBreakdown(matchId) {
    const [team1, team2] = bracket[matchId];
    const container = document.getElementById('factor-chart');
    container.innerHTML = '';

    // if teams not yet determined, show a message
    if (!team1 || !team2 || !teams[team1] || !teams[team2]) {
        container.innerHTML = '<div class="factor-empty">Teams not yet determined for this match.</div>';
        return;
    }

    const dataA = teams[team1];
    const dataB = teams[team2];

    // calculate games played for each team
    const gamesA = dataA.season.W + dataA.season.D + dataA.season.L;
    const gamesB = dataB.season.W + dataB.season.D + dataB.season.L;

    // points per game
    const pointsA = (dataA.season.W * 3 + dataA.season.D) / gamesA;
    const pointsB = (dataB.season.W * 3 + dataB.season.D) / gamesB;
    const probPoints = pointsA / (pointsA + pointsB);

    // goals ratio 
    const ratioA = dataA.season.GF / (dataA.season.GF + dataA.season.GA);
    const ratioB = dataB.season.GF / (dataB.season.GF + dataB.season.GA);
    const probGoals = ratioA / (ratioA + ratioB);

    // UCL win history 
    const historyA = dataA.ucl_titles;
    const historyB = dataB.ucl_titles;
    const probHistory = (historyA + historyB === 0) ? 0.5 : historyA / (historyA + historyB);

    // combined weighted probability
    const total = probabilityWeights.points + probabilityWeights.goals + probabilityWeights.WINhistory;
    const probAll = (probabilityWeights.points * probPoints + probabilityWeights.goals * probGoals + probabilityWeights.WINhistory * probHistory) / total;

    // rows to draw
    const factors = [
        { label: 'Points',     probA: probPoints,  weight: probabilityWeights.points     },
        { label: 'Goals',      probA: probGoals,   weight: probabilityWeights.goals      },
        { label: 'WINhistory', probA: probHistory, weight: probabilityWeights.WINhistory },
        { label: 'All',        probA: probAll,     weight: null, isAll: true             },
    ];

    const colorA = dataA.color || '#1a4a99';
    const colorB = dataB.color || '#cc0000';

    const W = 270, rowH = 58, margin = { left: 4, right: 4, top: 6 };
    const innerW = W - margin.left - margin.right;
    const H = factors.length * rowH + margin.top;

    // create SVG 
    const svg = d3.select(container).append('svg')
        .attr('width', W)
        .attr('height', H);

    const g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // draw one row per factor (
    factors.forEach(function(f, i) {
        const rowY = i * rowH;
        const row  = g.append('g').attr('transform', 'translate(0,' + rowY + ')');

        // separator line before the All row
        if (f.isAll) {
            row.append('line')
                .attr('x1', 0).attr('x2', innerW)
                .attr('y1', 0).attr('y2', 0)
                .attr('stroke', '#dde3ed')
                .attr('stroke-width', 1.5);
        }

        const labelY = f.isAll ? 14 : 10;
        const barTop = f.isAll ? 20 : 16;
        const barH   = f.isAll ? 20 : 16;

        // factor label
        row.append('text')
            .attr('x', 0).attr('y', labelY)
            .style('font-size', f.isAll ? '12px' : '10px')
            .style('font-weight', '700')
            .style('fill', f.isAll ? '#1a2535' : '#9aaabb')
            .text(f.label + (f.weight !== null ? '  ·  ' + f.weight + '%' : ''));

        // grey background track
        row.append('rect')
            .attr('x', 0).attr('y', barTop)
            .attr('width', innerW).attr('height', barH)
            .attr('fill', '#edf0f5').attr('rx', 4);

        // team A coloured fill 
        row.append('rect')
            .attr('x', 0).attr('y', barTop)
            .attr('width', 0).attr('height', barH)
            .attr('fill', colorA).attr('rx', 4)
            .transition().duration(600).delay(i * 90)
            .attr('width', innerW * f.probA);

        const pctA = Math.round(f.probA * 100);
        const pctB = 100 - pctA;
        const fontSize = f.isAll ? '13px' : '11px';

        // team A percentage label
        row.append('text')
            .attr('x', 6).attr('y', barTop + barH / 2)
            .attr('dominant-baseline', 'middle')
            .style('font-size', fontSize).style('font-weight', '700')
            .style('fill', 'rgba(255,255,255,0.92)').style('opacity', 0)
            .text(pctA + '%')
            .transition().duration(400).delay(i * 90 + 450)
            .style('opacity', 1);

        // team B percentage label
        row.append('text')
            .attr('x', innerW - 6).attr('y', barTop + barH / 2)
            .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
            .style('font-size', fontSize).style('font-weight', '700')
            .style('fill', colorB).style('opacity', 0)
            .text(pctB + '%')
            .transition().duration(400).delay(i * 90 + 450)
            .style('opacity', 1);

        // team name labels below bar 
        if (i === 0) {
            row.append('text')
                .attr('x', 0).attr('y', barTop + barH + 12)
                .style('font-size', '10px').style('font-weight', '700')
                .style('fill', colorA)
                .text(team1);
            row.append('text')
                .attr('x', innerW).attr('y', barTop + barH + 12)
                .attr('text-anchor', 'end')
                .style('font-size', '10px').style('font-weight', '700')
                .style('fill', colorB)
                .text(team2);
        }
    });
}

// probability model
function getMatchProb(team1, team2) {
    const dataA = teams[team1];
    const dataB = teams[team2];

    // if either team is missing, return 50/50
    if (!dataA || !dataB) return { a: 0.5, b: 0.5 };

    // games played
    const gamesA = dataA.season.W + dataA.season.D + dataA.season.L;
    const gamesB = dataB.season.W + dataB.season.D + dataB.season.L;

    // points per game
    const pointsA = (dataA.season.W * 3 + dataA.season.D) / gamesA;
    const pointsB = (dataB.season.W * 3 + dataB.season.D) / gamesB;
    const probPoints = pointsA / (pointsA + pointsB);

    // goals ratio 
    const ratioA = dataA.season.GF / (dataA.season.GF + dataA.season.GA);
    const ratioB = dataB.season.GF / (dataB.season.GF + dataB.season.GA);
    const probGoals = ratioA / (ratioA + ratioB);

    // UCL win history 
    const historyA = dataA.ucl_titles;
    const historyB = dataB.ucl_titles;
    const probHistory =  (historyA + historyB === 0) ? 0.5 : historyA / (historyA + historyB);

    // get the active weights based on current view mode
    const w = getCurrentWeights();
    const total = w.points + w.goals + w.WINhistory;

    // if all weights are 0 return 50/50
    if (total === 0) return { a: 0.5, b: 0.5 };

    // weighted average of all three factors
    const probA = (w.points * probPoints + w.goals * probGoals + w.WINhistory * probHistory) / total;
    return { a: probA, b: 1 - probA };
}

// Returns win probabilities for a match, if user has locked in a pick, returns 100/0 instead of calculating
function getSlotProb(matchId) {
    const [team1, team2] = bracket[matchId];
    if (!team1 || !team2) return null;

    // if user has locked in a pick, that team gets 100%
    if (picks[matchId]) {
        return {
            [team1]: picks[matchId] === team1 ? 1 : 0,
            [team2]: picks[matchId] === team2 ? 1 : 0,
        };
    }

    // otherwise calculate normally
    const p = getMatchProb(team1, team2);
    return { [team1]: p.a, [team2]: p.b };
}

// Builds the Round of 16 match cards (display only)
function buildR16(elId, matchId) {
    const container = document.getElementById(elId);
    const match = roundOf16[matchId];
    container.innerHTML = '';

    match.teams.forEach(function(team) {
        const row = document.createElement('div');
        row.className = 'team-row no-click' + (team === match.winner ? ' winner' : ' loser');

        // team name label
        const lbl = document.createElement('span');
        lbl.className   = 'team-label';
        lbl.textContent = team;
        row.appendChild(lbl);

        if (teams[team] && teams[team].logo) {
    const img = document.createElement('img');
    img.src = teams[team].logo;
    img.style.width = '18px';
    img.style.height = '18px';
    img.style.objectFit = 'contain';
    img.style.marginLeft = '6px';
    img.style.flexShrink = '0';
    row.appendChild(img);
}

        // checkmark for winner
        if (team === match.winner) {
            const tick = document.createElement('span');
            tick.className   = 'team-tick';
            tick.textContent = '\u2713';
            tick.style.opacity = '1';
            row.appendChild(tick);
        }

        // clicking a team opens their stats panel
if (teams[team]) {
    row.classList.add('has-stats');
    const hint = document.createElement('span');
    hint.className   = 'team-form-note';
    hint.textContent = '→ stats';
    hint.style.marginLeft = 'auto';
        hint.style.display = 'inline-block'; // ← add this

    hint.style.opacity = '0.5';
    row.appendChild(hint);
    row.addEventListener('click', function(e) { e.stopPropagation(); openStatsPanel(team); });
}
container.appendChild(row); 
    });
}


// tournament probability 
function computeTournamentProbs() {
    if (!quarterFinals.qfL1) return {};
    const winProbs = {};
    Object.values(quarterFinals).flat().forEach(function(team) { winProbs[team] = 0; });

    function getProb(matchId, team1, team2) {
        if (!team1 || !team2) return {};
        if (picks[matchId]) {
            return { [team1]: picks[matchId] === team1 ? 1 : 0, [team2]: picks[matchId] === team2 ? 1 : 0 };
        }
        const p = getMatchProb(team1, team2);
        return { [team1]: p.a, [team2]: p.b };
    }

    const [L1a, L1b] = quarterFinals.qfL1;
    const [L2a, L2b] = quarterFinals.qfL2;
    const [R1a, R1b] = quarterFinals.qfR1;
    const [R2a, R2b] = quarterFinals.qfR2;

    const pL1 = getProb('qfL1', L1a, L1b);
    const pL2 = getProb('qfL2', L2a, L2b);
    const pR1 = getProb('qfR1', R1a, R1b);
    const pR2 = getProb('qfR2', R2a, R2b);

    [L1a, L1b].forEach(function(wL1) {
        [L2a, L2b].forEach(function(wL2) {
            [R1a, R1b].forEach(function(wR1) {
                [R2a, R2b].forEach(function(wR2) {
                    const probQF = (pL1[wL1]||0) * (pL2[wL2]||0) * (pR1[wR1]||0) * (pR2[wR2]||0);
                    const pSFL = getProb('sfL', wL1, wL2);
                    const pSFR = getProb('sfR', wR1, wR2);
                    [wL1, wL2].forEach(function(wSFL) {
                        [wR1, wR2].forEach(function(wSFR) {
                            const probSF = (pSFL[wSFL]||0) * (pSFR[wSFR]||0);
                            const pFinal = getProb('final', wSFL, wSFR);
                            [wSFL, wSFR].forEach(function(champ) {
                                winProbs[champ] += probQF * probSF * (pFinal[champ]||0);
                            });
                        });
                    });
                });
            });
        });
    });

    return winProbs;
}

// build all R16 cards
function buildAllR16() {
    Object.keys(roundOf16).forEach(function(matchId) {
        buildR16('m-' + matchId, matchId);
    });
}

function buildAllMatches() {
    ['qfL1','qfL2','qfR1','qfR2','sfL','sfR','final'].forEach(function(id) {
        buildMatch('m-' + id, id);
    });
}

// Builds interactive QF/SF/Final match cards
function buildMatch(elId, matchId) {
    const container = document.getElementById(elId);
    container.innerHTML = '';

    // badge for annotations like "CLOSEST MATCH"
    const badge = document.createElement('div');
    badge.className = 'match-badge';
    badge.id = 'badge-' + matchId;
    container.appendChild(badge);

    // build two team rows (slot 0 and slot 1)
    [0, 1].forEach(function(slotIndex) {
        const row = document.createElement('div');
        row.className     = 'team-row';
        row.dataset.match = matchId;
        row.dataset.slot  = slotIndex;

        // team name + probability percentage
        const nameCol = document.createElement('div');
        nameCol.className = 'team-name-col';
        const lbl  = document.createElement('span');
        lbl.className = 'team-label';
        const pct  = document.createElement('span');
        pct.className = 'team-pct';
        nameCol.appendChild(lbl);
        nameCol.appendChild(pct);


        // checkmark for picked winner
        const tick = document.createElement('span');
        tick.className   = 'team-tick';
        tick.textContent = '\u2713';

        // info button opens team stats panel
        const infoBtn = document.createElement('button');
        infoBtn.className   = 'info-btn';
        infoBtn.textContent = '\u24d8';
        infoBtn.title       = 'View team stats';

        row.appendChild(nameCol);
        row.appendChild(tick);
        row.appendChild(infoBtn);
        container.appendChild(row);

        // probability split bar 
        if (slotIndex === 0) {
            const bar  = document.createElement('div');
            bar.className    = 'prob-split';
            bar.dataset.match = matchId;
            const pA   = document.createElement('div');
            pA.className  = 'prob-a';
            const pB   = document.createElement('div');
            pB.className  = 'prob-b';
            const hint = document.createElement('span');
            hint.className   = 'prob-hint';
            hint.textContent = 'click to analyse';
            bar.appendChild(pA);
            bar.appendChild(pB);
            bar.appendChild(hint);
            // clicking the bar opens the match breakdown panel
            bar.addEventListener('click', function(e) {
                e.stopPropagation();
                openMatchBreakdown(matchId);
            });
            container.appendChild(bar);
        }

        // event listeners 
        row.addEventListener('click',      function()  { handleClick(matchId, slotIndex); });
        row.addEventListener('mouseenter', function(e) { showTip(e, matchId, slotIndex); });
        row.addEventListener('mousemove',  function(e) { moveTip(e); });
        row.addEventListener('mouseleave', hideTip);

        infoBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const team = bracket[matchId][slotIndex];
            if (team && teams[team]) openStatsPanel(team);
        });
    });
}



//RENDER
function render() {

    // update team name labels and winner/loser 
    document.querySelectorAll('.team-row:not(.no-click)').forEach(function(row) {
        const matchId  = row.dataset.match;
        const slotIndex = +row.dataset.slot;
        const team     = bracket[matchId][slotIndex];
        const picked   = picks[matchId];

        row.querySelector('.team-label').textContent = team || '';
        const existingImg = row.querySelector('.team-logo');
if (existingImg) existingImg.remove();
if (team && teams[team] && teams[team].logo) {
    const img = document.createElement('img');
    img.className = 'team-logo';
    img.src = teams[team].logo;
    img.style.width = '16px';
    img.style.height = '16px';
    img.style.objectFit = 'contain';
    img.style.marginLeft = '4px';
    img.style.flexShrink = '0';
    row.insertBefore(img, row.querySelector('.team-name-col'));

}
        row.classList.remove('winner', 'loser', 'empty');
        if (!team)              row.classList.add('empty');
        else if (picked === team) row.classList.add('winner');
        else if (picked !== null) row.classList.add('loser');
    });

    // update probability percentages and split bars
    ['qfL1','qfL2','qfR1','qfR2','sfL','sfR','final'].forEach(function(matchId) {
        const probs = getSlotProb(matchId);
        const [team1, team2] = bracket[matchId];

        // update percentage labels
        document.querySelectorAll('[data-match="' + matchId + '"].team-row').forEach(function(row) {
            const slotIndex = +row.dataset.slot;
            const pctEl = row.querySelector('.team-pct');
            if (!pctEl) return;
            const team = bracket[matchId][slotIndex];
            if (probs && team) {
                pctEl.textContent   = Math.round(probs[team] * 100) + '%';
                pctEl.style.opacity = '1';
            } else {
                pctEl.textContent   = '';
                pctEl.style.opacity = '0';
            }
        });

        // update split bar widths and colours
        const bar = document.querySelector('.prob-split[data-match="' + matchId + '"]');
        if (!bar) return;
        const pA = bar.querySelector('.prob-a');
        const pB = bar.querySelector('.prob-b');
        if (probs && team1 && team2) {
            pA.style.width      = (probs[team1] * 100) + '%';
            pA.style.background = (teams[team1] && teams[team1].color) || '#1a4a99';
            pB.style.width      = (probs[team2] * 100) + '%';
            pB.style.background = (teams[team2] && teams[team2].color) || '#cc0000';
            bar.style.opacity   = '1';
        } else {
            pA.style.width    = '50%';
            pB.style.width    = '50%';
            bar.style.opacity = '0.15';
        }
    });

    updateAnnotations();
    applyCountryFilter();

    // update champion label
    const champEl = document.getElementById('champName');
    champEl.textContent = winner || '';
    champEl.style.color = winner ? '#cc0000' : '#aabbcc';

    requestAnimationFrame(drawConnectors);
    drawTournamentChart();
}

// Adds CLOSEST MATCH and TOURNAMENT FAVOURITE badges to QF cards
function updateAnnotations() {

    // clear all badges first
    document.querySelectorAll('.match-badge').forEach(function(b) {
        b.textContent = '';
        b.className   = 'match-badge';
    });

    const qfIds = ['qfL1', 'qfL2', 'qfR1', 'qfR2'];

    // find the most evenly contested QF match
    let closestMatchId = null;
    let closestDiff    = 1;
    qfIds.forEach(function(matchId) {
        const p = getSlotProb(matchId);
        if (!p) return;
        const diff = Math.abs(Object.values(p)[0] - 0.5);
        if (diff < closestDiff) {
            closestDiff    = diff;
            closestMatchId = matchId;
        }
    });
    if (closestMatchId) {
        const badge = document.getElementById('badge-' + closestMatchId);
        if (badge) {
            badge.textContent = 'CLOSEST MATCH';
            badge.classList.add('badge-tossup');
        }
    }

    // find the tournament favourite and label their QF
    const tournamentProbs = computeTournamentProbs();
    const favTeam = Object.keys(tournamentProbs).reduce(function(a, b) {
        return tournamentProbs[a] > tournamentProbs[b] ? a : b;
    });
    qfIds.forEach(function(matchId) {
        if (bracket[matchId].indexOf(favTeam) !== -1) {
            const badge = document.getElementById('badge-' + matchId);
            if (badge && !badge.textContent) {
                badge.textContent = 'TOURNAMENT FAVOURITE';
                badge.classList.add('badge-fav');
            }
        }
    });

    // update insight text below mode buttons
    const insightEl = document.getElementById('mode-insight');
    if (insightEl) insightEl.textContent = viewSummaries[viewMode] || '';
}

// Highlights teams from the selected country
function applyCountryFilter() {
    document.querySelectorAll('.team-row').forEach(function(row) {
        row.classList.remove('country-hi', 'country-lo');
        if (!selectedCountry) return;

        let team = null;
        if (row.classList.contains('no-click')) {
            const lbl = row.querySelector('.team-label');
            team = lbl && lbl.textContent;
        } else {
            const matchId    = row.dataset.match;
            const slotIndex  = row.dataset.slot;
            if (matchId !== undefined && slotIndex !== undefined) {
                team = bracket[matchId] && bracket[matchId][+slotIndex];
            }
        }

        if (!team || !teams[team]) return;
        if (teams[team].country === selectedCountry) {
            row.classList.add('country-hi');
        } else {
            row.classList.add('country-lo');
        }
    });
}

// D3 force-directed bubble chart showing each team's championship odds
let bubbleSim = null;

function drawTournamentChart() {
    const probs  = computeTournamentProbs();
    const container = document.getElementById('tourn-chart');
    const W      = Math.max(container.clientWidth || 700, 400);
    const H      = 300;

    // square root scale so bubble AREA (not radius) is proportional 
    const maxP   = d3.max(Object.values(probs));
    const rScale = d3.scaleSqrt().domain([0, maxP]).range([22, 76]);

    const nodes = Object.keys(probs).map(function(team) {
        return {
            id:    team,
            prob:  probs[team],
            r:     rScale(probs[team]),
            color: (teams[team] && teams[team].color) || '#1a4a99',
        };
    });

    const existing = d3.select(container).select('svg');

    if (existing.empty()) {
        // first render - create SVG and bubbles 
        const svg = d3.select(container).append('svg')
            .attr('width', W)
            .attr('height', H);

        // start all nodes at center
        nodes.forEach(function(d) { d.x = W / 2; d.y = H / 2; });

        // create bubble groups
        const grp = svg.selectAll('.bubble-g')
            .data(nodes, function(d) { return d.id; })
            .enter()
            .append('g')
            .attr('class', 'bubble-g')
            .attr('transform', 'translate(' + (W/2) + ',' + (H/2) + ')');

        // circle animated 
        grp.append('circle')
            .attr('r', 0)
            .attr('fill', function(d) { return d.color; })
            .attr('fill-opacity', 0.88)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2.5)
            .transition().duration(600).delay(function(_, i) { return i * 55; })
            .attr('r', function(d) { return d.r; });

        // team name label
        grp.append('text')
            .attr('class', 'bubble-name')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.2em')
            .style('font-family', "'Barlow Condensed', system-ui, sans-serif")
            .style('font-weight', '800')
            .style('font-size', function(d) { return Math.max(8, Math.min(d.r * 1.6 / (d.id.length * 0.5), d.r * 0.28, 13)) + 'px'; })
            .style('fill', '#fff')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .text(function(d) { return d.id; })
            .transition().duration(400).delay(function(_, i) { return i * 55 + 380; })
            .style('opacity', 1);

        // probability percentage label
        grp.append('text')
            .attr('class', 'bubble-pct')
            .attr('text-anchor', 'middle')
            .attr('dy', '1em')
            .style('font-family', "'Barlow Condensed', system-ui, sans-serif")
            .style('font-weight', '700')
            .style('font-size', function(d) { return Math.max(8, Math.min(d.r * 0.22, 11)) + 'px'; })
            .style('fill', 'rgba(255,255,255,0.8)')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .text(function(d) { return (d.prob * 100).toFixed(1) + '%'; })
            .transition().duration(400).delay(function(_, i) { return i * 55 + 460; })
            .style('opacity', 1);

        runSim(svg, nodes, W, H);

    } else {
        // just update sizes 
        existing.attr('width', W).attr('height', H);

        // carry over existing positions so bubbles don't jump
        existing.selectAll('.bubble-g').each(function(old) {
            const match = nodes.find(function(n) { return n.id === old.id; });
            if (match) { match.x = old.x || W/2; match.y = old.y || H/2; }
        });

        existing.selectAll('.bubble-g')
            .data(nodes, function(d) { return d.id; })
            .select('circle')
            .transition().duration(500)
            .attr('r', function(d) { return d.r; });

        existing.selectAll('.bubble-g')
            .data(nodes, function(d) { return d.id; })
            .select('.bubble-name')
            .transition().duration(500)
            .style('font-size', function(d) { return Math.max(8, Math.min(d.r * 1.6 / (d.id.length * 0.5), d.r * 0.28, 13)) + 'px'; });

        existing.selectAll('.bubble-g')
            .data(nodes, function(d) { return d.id; })
            .select('.bubble-pct')
            .transition().duration(500)
            .text(function(d) { return (d.prob * 100).toFixed(1) + '%'; })
            .style('font-size', function(d) { return Math.max(8, Math.min(d.r * 0.22, 11)) + 'px'; });

        runSim(existing, nodes, W, H);
    }

}

// runs the D3 force simulation to position the bubbles
function runSim(svg, nodes, W, H) {
    if (bubbleSim) bubbleSim.stop();
    bubbleSim = d3.forceSimulation(nodes)
        .force('center',  d3.forceCenter(W / 2, H / 2).strength(0.08))
        .force('collide', d3.forceCollide(function(d) { return d.r + 4; }).strength(0.9).iterations(4))
        .force('charge',  d3.forceManyBody().strength(-20))
        .on('tick', function() {
            svg.selectAll('.bubble-g').attr('transform', function(d) {
                d.x = Math.max(d.r + 2, Math.min(W - d.r - 2, d.x));
                d.y = Math.max(d.r + 2, Math.min(H - d.r - 2, d.y));
                return 'translate(' + d.x + ',' + d.y + ')';
            });
        });
    }
    


// handles clicking a team row to lock in a pick
function handleClick(matchId, slotIndex) {
    const team = bracket[matchId][slotIndex];
    if (!team) return;

    if (picks[matchId] === team) {
        picks[matchId] = null;
        clearDown(matchId);
        render();
        return;
    }

    if (picks[matchId] !== null) clearDown(matchId);
    picks[matchId] = team;

    //  winner into next round
    const next = nextRound[matchId];
    if (next) {
        const nextMatchId  = next[0];
        const nextSlot     = next[1];
        const prev         = bracket[nextMatchId][nextSlot];
        if (prev && prev !== team && picks[nextMatchId] === prev) {
            picks[nextMatchId] = null;
            clearDown(nextMatchId);
        }
        bracket[nextMatchId][nextSlot] = team;
    } else {
        // we have a champion!
        winner = team;
        fireConfetti();
    }
    render();
}

// clears all picks 
function clearDown(matchId) {
    const next = nextRound[matchId];
    if (!next) { winner = null; return; }
    const nextMatchId = next[0];
    const nextSlot    = next[1];
    const prev        = bracket[nextMatchId][nextSlot];
    bracket[nextMatchId][nextSlot] = null;
    if (prev && picks[nextMatchId] === prev) {
        picks[nextMatchId] = null;
        clearDown(nextMatchId);
    }
    if (nextMatchId === 'final') winner = null;
}

// draws SVG lines connecting each match to the next round

const matchPairs = [
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

    matchPairs.forEach(function(pair) {
        const fromEl = document.getElementById('m-' + pair[0]);
        const toEl   = document.getElementById('m-' + pair[1]);
        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect   = toEl.getBoundingClientRect();

        const fromY  = fromRect.top  - wRect.top + fromRect.height / 2;
        const toY    = toRect.top    - wRect.top + toRect.height  / 2;
        const goRight = fromRect.left < toRect.left;
        const startX  = goRight ? fromRect.right - wRect.left : fromRect.left  - wRect.left;
        const endX    = goRight ? toRect.left    - wRect.left : toRect.right   - wRect.left;
        const midX    = (startX + endX) / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d',            'M' + startX + ',' + fromY + ' H' + midX + ' V' + toY + ' H' + endX);
        path.setAttribute('fill',         'none');
        path.setAttribute('stroke',       '#ccd5e0');
        path.setAttribute('stroke-width', '1.5');
        svg.appendChild(path);
    });
}


const tipEl = document.getElementById('tip');

function showTip(e, matchId, slotIndex) {
    const team = bracket[matchId][slotIndex];
    if (!team) return;

    const probs = getSlotProb(matchId);
    const pct   = probs ? Math.round(probs[team] * 100) : null;
    const opp   = bracket[matchId][slotIndex === 0 ? 1 : 0];

    // factor breakdown vs opponent
    let factorHtml = '';
    if (opp && teams[team] && teams[opp]) {
        const dataA = teams[team];
        const dataB = teams[opp];

        const gamesA = dataA.season.W + dataA.season.D + dataA.season.L;
        const gamesB = dataB.season.W + dataB.season.D + dataB.season.L;

        const pointsA = (dataA.season.W * 3 + dataA.season.D) / gamesA;
        const pointsB = (dataB.season.W * 3 + dataB.season.D) / gamesB;
        const fP = Math.round(pointsA / (pointsA + pointsB) * 100);

        const ratioA = dataA.season.GF / (dataA.season.GF + dataA.season.GA);
        const ratioB = dataB.season.GF / (dataB.season.GF + dataB.season.GA);
        const fG = Math.round(ratioA / (ratioA + ratioB) * 100);

        const historyA = dataA.ucl_titles;
        const historyB = dataB.ucl_titles;
        const fH = (historyA + historyB === 0) ? 50 : Math.round(historyA / (historyA + historyB) * 100);

        factorHtml = '<div class="tip-factors">'
            + '<div>Points <b>' + fP + '%</b></div>'
            + '<div>Goals <b>'  + fG + '%</b></div>'
            + '<div>Win History <b>' + fH + '%</b></div>'
            + '</div>';
    }

    const r16Info = r16Results[team] || '';
    tipEl.style.display = 'block';
    tipEl.innerHTML = '<div class="tip-name">' + team + (pct !== null ? ' &middot; ' + pct + '% to win' : '') + '</div>'
        + (r16Info ? '<div class="tip-info">' + r16Info + '</div>' : '')
        + factorHtml
        + (opp ? '<div class="tip-cta">Click bar to see full breakdown</div>' : '');
    moveTip(e);
}

function moveTip(e) {
    tipEl.style.left = (e.clientX + 14) + 'px';
    tipEl.style.top  = (e.clientY - 52) + 'px';
}

function hideTip() { tipEl.style.display = 'none'; }


// randomly picks a winner weighted by the probability model
function pickWinner(matchId) {
    const team1 = bracket[matchId][0];
    const team2 = bracket[matchId][1];
    if (!team1 || !team2) return team1 || team2;
    const p = getMatchProb(team1, team2);
    return Math.random() < p.a ? team1 : team2;
}

// locks in a pick 
function programmaticPick(matchId, team) {
    picks[matchId] = team;
    const next = nextRound[matchId];
    if (next) {
        bracket[next[0]][next[1]] = team;
    } else {
        winner = team;
    }
}

// simulates the whole tournament 
function simulateTournament() {
    const btn = document.getElementById('simulateBtn');
    btn.disabled    = true;
    btn.textContent = 'Simulating...';

    // reset everything
    bracket = {
        qfL1: [...quarterFinals.qfL1], qfL2: [...quarterFinals.qfL2],
        qfR1: [...quarterFinals.qfR1], qfR2: [...quarterFinals.qfR2],
        sfL: [null, null], sfR: [null, null], final: [null, null],
    };
    picks  = { qfL1:null, qfL2:null, qfR1:null, qfR2:null, sfL:null, sfR:null, final:null };
    winner = null;
    render();

    // pick a winner
    function flash(matchId, callback) {
        const card = document.getElementById('m-' + matchId);
        if (card) card.classList.add('is-deciding');
        setTimeout(function() {
            if (card) card.classList.remove('is-deciding');
            programmaticPick(matchId, pickWinner(matchId));
            render();
            if (callback) callback();
        }, 180);
    }

    const delay = 220;
    setTimeout(function() { flash('qfL1'); },               0);
    setTimeout(function() { flash('qfL2'); },           delay);
    setTimeout(function() { flash('qfR1'); },       2 * delay);
    setTimeout(function() { flash('qfR2'); },       3 * delay);
    setTimeout(function() { flash('sfL'); },    4 * delay + 150);
    setTimeout(function() { flash('sfR'); },    5 * delay + 150);
    setTimeout(function() {
        flash('final', function() {
            fireConfetti();
            btn.disabled    = false;
            btn.textContent = '\u25B6 Simulate Again';
        });
    }, 6 * delay + 300);
}

document.getElementById('simulateBtn').addEventListener('click', simulateTournament);

// reset

document.getElementById('resetBtn').addEventListener('click', function() {
    bracket = {
        qfL1: [...quarterFinals.qfL1], qfL2: [...quarterFinals.qfL2],
        qfR1: [...quarterFinals.qfR1], qfR2: [...quarterFinals.qfR2],
        sfL:  [null, null], sfR: [null, null], final: [null, null],
    };
    picks  = { qfL1:null, qfL2:null, qfR1:null, qfR2:null, sfL:null, sfR:null, final:null };
    winner = null;
    render();
});

// redraw connectors and bubble chart on window resize
window.addEventListener('resize', function() {
    drawConnectors();
    drawTournamentChart();
});

// view mode buttons

document.getElementById('mode-btns').addEventListener('click', function(e) {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    viewMode = btn.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    render();
});

// country filter buttons

document.getElementById('country-btns').addEventListener('click', function(e) {
    const btn = e.target.closest('.country-btn');
    if (!btn) return;
    selectedCountry = btn.dataset.country;
    document.querySelectorAll('.country-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    applyCountryFilter();
});

// confetti

const canvas   = document.getElementById('confetti-canvas');
const ctx      = canvas.getContext('2d');
let particles  = [];
let animId     = null;
const confettiColors = ['#cc0000','#1a4a99','#f0c040','#00aa55','#ff6600','#aa00cc','#00aacc'];

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
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
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
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
    });
    if (alive) { animId = requestAnimationFrame(animateConfetti); }
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

// Load data from data.json then build and render the visualization 
fetch('data.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
        roundOf16      = data.R16;
        quarterFinals  = data.QF_INITIAL;
        teams          = data.TEAM_DATA;

        // initialise bracket with QF teams
        bracket = {
            qfL1: [...quarterFinals.qfL1], qfL2: [...quarterFinals.qfL2],
            qfR1: [...quarterFinals.qfR1], qfR2: [...quarterFinals.qfR2],
            sfL: [null, null], sfR: [null, null], final: [null, null],
        };

        // also pre-build R16 result lookup for tooltips
        Object.values(roundOf16).forEach(function(match) {
            const loser = match.teams.find(function(t) { return t !== match.winner; });
            r16Results[match.winner] = 'Beat ' + loser + ' in the Round of 16';
        });

        buildAllR16();
        buildAllMatches();
        render();
    });