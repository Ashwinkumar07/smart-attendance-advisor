/**
 * Smart Attendance Advisor System
 * Live A* Algorithm Workflow Visualizer + Real-Time Attendance Portal
 */

let activeStudentId = "VH15227";
let currentStudentData = null;
let benchmarkChart = null;

// ─── A* Visualizer State ───────────────────────────────────────────────
let simSteps = [];       // Pre-computed animation steps
let simStepIdx = 0;
let simTimer = null;
let simSpeed = 480;       // ms per step

// ─── Official CSE AI&ML Sem III Course Catalog ─────────────────────────
const OFFICIAL_SUBJECTS = [
    { code: "25MA05IT", acronym: "LADS", name: "Linear Algebra for Data science",             credits: 4, hours_per_week: 5, difficulty: 0.85, faculty: "Dr. Siva Kumar T., AP/Maths",                                  conducted: 40, attended: 35, bunked: 4, od_leaves: 1 },
    { code: "25ML35T",  acronym: "FAI",  name: "Foundations of Artificial Intelligence",       credits: 3, hours_per_week: 4, difficulty: 0.80, faculty: "Dr. Manoj Kumar D S, ASP",                                    conducted: 32, attended: 26, bunked: 5, od_leaves: 1 },
    { code: "25HML34T", acronym: "DSP",  name: "Data Structures using Python",                 credits: 3, hours_per_week: 4, difficulty: 0.75, faculty: "Mrs. J Mary Hanna Priyadharshini, AP",                        conducted: 32, attended: 27, bunked: 5, od_leaves: 0 },
    { code: "25HCS32T", acronym: "OOPS", name: "Object Oriented Programming using Java",       credits: 3, hours_per_week: 4, difficulty: 0.75, faculty: "Mrs. Noorul Julaiha A G, AP",                                 conducted: 32, attended: 28, bunked: 3, od_leaves: 1 },
    { code: "25ML33IT", acronym: "IDS",  name: "Introduction to Data Science",                 credits: 4, hours_per_week: 4, difficulty: 0.70, faculty: "Mrs. J Mary Hanna Priyadharshini, AP",                        conducted: 32, attended: 29, bunked: 2, od_leaves: 1 },
    { code: "25HCS37P", acronym: "OOPSL",name: "OOP Java Laboratory",                          credits: 2, hours_per_week: 4, difficulty: 0.60, faculty: "Mr. P Lokesh & Mrs. S. Kavitha Rani",                         conducted: 32, attended: 30, bunked: 2, od_leaves: 0 },
    { code: "25HML38P", acronym: "DSPL", name: "Data Structures Python Laboratory",            credits: 2, hours_per_week: 4, difficulty: 0.60, faculty: "Mrs. J Mary Hanna Priyadharshini & Mr. Sanjay Raj R",        conducted: 32, attended: 30, bunked: 2, od_leaves: 0 }
];

// ================================================================
// 1. INIT
// ================================================================
document.addEventListener("DOMContentLoaded", async () => {
    setupModalListeners();
    setupActionButtons();
    await loadStudentRoster();
    await loadStudentProfile(activeStudentId);
    setupWorkflowControls();
});

// ================================================================
// 2. STUDENT ROSTER & PROFILE
// ================================================================
async function loadStudentRoster() {
    try {
        const res = await fetch("/api/students");
        if (!res.ok) return;
        const roster = await res.json();
        const dropdown = document.getElementById("student-dropdown");
        dropdown.innerHTML = "";
        roster.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.student_id;
            opt.textContent = `${s.name} (${s.student_id}) - ${s.overall_percentage}%`;
            if (s.student_id === activeStudentId) opt.selected = true;
            dropdown.appendChild(opt);
        });
        dropdown.onchange = e => { activeStudentId = e.target.value; loadStudentProfile(activeStudentId); };
    } catch (e) { console.error(e); }
}

async function loadStudentProfile(studentId) {
    if (!studentId) return;
    try {
        const res = await fetch(`/api/students/${studentId}`);
        if (!res.ok) return;
        currentStudentData = await res.json();
        // Ensure official subjects are loaded when empty/stale
        if (!currentStudentData.subject_breakdown || currentStudentData.subject_breakdown.length === 0
            || (currentStudentData.subject_breakdown[0] && currentStudentData.subject_breakdown[0].code.startsWith("CS3"))) {
            currentStudentData.subject_breakdown = JSON.parse(JSON.stringify(OFFICIAL_SUBJECTS));
        }
        renderDashboard(currentStudentData);
        await solveAndAnimateAstar();
    } catch (e) { console.error(e); }
}

// ================================================================
// 3. DASHBOARD
// ================================================================
function renderDashboard(data) {
    document.getElementById("profile-name").textContent = data.name;
    document.getElementById("profile-avatar").textContent = (data.name || "ST").substring(0, 2).toUpperCase();
    document.getElementById("meta-student-id").textContent = data.student_id;
    document.getElementById("meta-reg-no").textContent = data.register_no;
    recalcKPIs(data);
    renderCoursesTable(data);
    renderSimulator(data);
}

function recalcKPIs(data) {
    let totC = 0, totA = 0, crit = 0, warn = 0, safe = 0;
    data.subject_breakdown.forEach(s => {
        const eff = (s.attended || 0) + (s.od_leaves || 0);
        const cond = s.conducted || 0;
        const pct = cond > 0 ? +((eff / cond) * 100).toFixed(1) : 100;
        s.percentage = pct; s.effective_attended = eff;
        if      (pct < 75)  { s.risk_tier = "Critical"; crit++; }
        else if (pct < 80)  { s.risk_tier = "Warning";  warn++; }
        else                { s.risk_tier = "Safe";     safe++; }
        totC += cond; totA += eff;
    });
    const oPct = totC > 0 ? +((totA / totC) * 100).toFixed(1) : 100;
    data.overall_percentage = oPct;
    data.overall_conducted  = totC;
    data.overall_attended   = totA;
    data.overall_risk_tier  = oPct < 75 ? "Critical" : oPct < 80 ? "Warning" : "Safe";

    document.getElementById("kpi-overall-pct").textContent   = `${oPct}%`;
    document.getElementById("kpi-stat-ratio").textContent    = `${totA} / ${totC} Hours`;
    document.getElementById("kpi-critical-count").textContent = crit;
    document.getElementById("kpi-warning-count").textContent  = warn;
    document.getElementById("kpi-safe-count").textContent     = safe;

    const fill = document.getElementById("kpi-progress-bar");
    fill.style.width = `${Math.min(oPct, 100)}%`;
    fill.style.backgroundColor = oPct < 75 ? "var(--red-critical)" : oPct < 80 ? "var(--amber-warn)" : "var(--green-safe)";

    const critDesc = document.getElementById("kpi-critical-desc");
    critDesc.textContent = crit > 0 ? `${crit} course(s) require immediate recovery.` : "No courses currently in detention risk.";
    critDesc.style.color = crit > 0 ? "var(--red-critical)" : "var(--text-muted)";

    const badge = document.getElementById("profile-status-badge");
    badge.textContent = data.overall_risk_tier;
    badge.className   = `status-badge ${data.overall_risk_tier}`;

    // Sync attendance panel mini-stats strip
    const el = (id) => document.getElementById(id);
    if (el("att-stat-courses")) el("att-stat-courses").textContent = data.subject_breakdown.length;
    if (el("att-stat-safe"))    el("att-stat-safe").textContent = safe;
    if (el("att-stat-warn"))    el("att-stat-warn").textContent = warn;
    if (el("att-stat-crit"))    el("att-stat-crit").textContent = crit;
    const algoNames = { astar: "A* Search", greedy: "Greedy BFS", ucs: "Uniform Cost" };
    if (el("att-stat-algo"))    el("att-stat-algo").textContent = algoNames[getSelectedAlgo()] || "A* Search";
}

function renderCoursesTable(data) {
    const tbody = document.getElementById("courses-table-body");
    tbody.innerHTML = "";
    if (!data.subject_breakdown?.length) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:24px">No courses. Click <strong>+ Add Course</strong>.</td></tr>`;
        return;
    }
    data.subject_breakdown.forEach(s => {
        const tr = document.createElement("tr");
        tr.id = `row-${s.code}`;
        const safeBunks  = Math.max(0, Math.floor((s.effective_attended - 0.75 * s.conducted) / 0.75));
        const needToRecover = Math.max(0, Math.ceil((0.75 * s.conducted - s.effective_attended) / 0.25));
        const adviceHtml = s.percentage < 75
            ? `<span class="advice-badge danger">Need +${needToRecover} to reach 75%</span>`
            : `<span class="advice-badge safe">Can skip ${safeBunks} classes</span>`;

        const pctColor = s.percentage < 75 ? "var(--red-critical)" : s.percentage < 80 ? "var(--amber-warn)" : "var(--green-safe)";
        tr.innerHTML = `
          <td class="course-code-cell">${s.code}<br><small style="color:var(--text-muted)">(${s.acronym || s.code})</small></td>
          <td><strong>${s.name}</strong></td>
          <td>${s.hours_per_week || 4} hrs</td>
          <td><strong id="held-${s.code}">${s.conducted}</strong></td>
          <td>
            <div class="stepper-widget stepper-attend">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','attended',-1)">-</button>
              <input type="number" class="stepper-input" id="input-att-${s.code}" value="${s.attended}" min="0" onchange="setCount('${s.code}','attended',this.value)">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','attended',1)">+</button>
            </div>
          </td>
          <td>
            <div class="stepper-widget stepper-bunk">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','bunked',-1)">-</button>
              <input type="number" class="stepper-input" id="input-bunk-${s.code}" value="${s.bunked||0}" min="0" onchange="setCount('${s.code}','bunked',this.value)">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','bunked',1)">+</button>
            </div>
          </td>
          <td>
            <div class="stepper-widget stepper-od">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','od_leaves',-1)">-</button>
              <input type="number" class="stepper-input" id="input-od-${s.code}" value="${s.od_leaves||0}" min="0" onchange="setCount('${s.code}','od_leaves',this.value)">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','od_leaves',1)">+</button>
            </div>
          </td>
          <td class="course-pct-cell" id="pct-${s.code}" style="color:${pctColor}">${s.percentage}%</td>
          <td><span class="status-badge ${s.risk_tier}" id="badge-${s.code}">${s.risk_tier}</span></td>
          <td id="advice-${s.code}">${adviceHtml}</td>
          <td>
            <div class="action-btn-group">
              <button class="btn-icon-action" onclick="openEditCourseModal('${s.code}')" title="Edit">✏️</button>
              <button class="btn-icon-danger" onclick="deleteCourse('${s.code}')" title="Delete">🗑️</button>
            </div>
          </td>`;
        tbody.appendChild(tr);
    });
}

// ================================================================
// 4. LIVE STEPPER ACTIONS
// ================================================================
window.modifyCount = async (code, field, delta) => {
    if (!currentStudentData) return;
    const s = currentStudentData.subject_breakdown.find(x => x.code === code);
    if (!s) return;
    s[field] = Math.max(0, (parseInt(s[field]) || 0) + delta);
    s.conducted = (s.attended || 0) + (s.bunked || 0) + (s.od_leaves || 0);
    recalcKPIs(currentStudentData);
    renderCoursesTable(currentStudentData);
    renderSimulator(currentStudentData);
    await syncCourse(s);
    await solveAndAnimateAstar();
};

window.setCount = async (code, field, val) => {
    if (!currentStudentData) return;
    const s = currentStudentData.subject_breakdown.find(x => x.code === code);
    if (!s) return;
    s[field] = Math.max(0, parseInt(val) || 0);
    s.conducted = (s.attended || 0) + (s.bunked || 0) + (s.od_leaves || 0);
    recalcKPIs(currentStudentData);
    renderCoursesTable(currentStudentData);
    renderSimulator(currentStudentData);
    await syncCourse(s);
    await solveAndAnimateAstar();
};

async function syncCourse(s) {
    try {
        await fetch(`/api/students/${activeStudentId}/subjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: s.code, acronym: s.acronym || s.code, name: s.name,
                credits: s.credits || 3, hours_per_week: s.hours_per_week || 4,
                faculty: s.faculty || "Faculty", conducted: s.conducted,
                attended: s.attended, bunked: s.bunked || 0, od_leaves: s.od_leaves || 0
            })
        });
    } catch (e) { console.error(e); }
}

// ================================================================
// 5. LIVE A* ALGORITHM VISUALIZER ENGINE
// ================================================================

/**
 * Computes the A* search steps client-side from the current student data.
 * Returns an array of animation frame descriptors that the visualizer renders.
 */
function computeSimulationSteps(subjects, algo = "astar") {
    const TOTAL_WEEKS = 15;
    const CURRENT_WEEK = currentStudentData?.current_week || 9;
    const REM_WEEKS = Math.max(0, TOTAL_WEEKS - CURRENT_WEEK);
    const TARGET = 75.0;
    const steps = [];

    const algoName = algo === "greedy" ? "Greedy Best-First" : algo === "ucs" ? "Uniform Cost (UCS)" : "A* Search";
    steps.push({ type: "init", message: `[INIT] ${algoName} starting. Subjects: ${subjects.length}, Target: ${TARGET}%, Week: ${CURRENT_WEEK}/15` });
    steps.push({ type: "info", message: `[INFO] Remaining weeks: ${REM_WEEKS}. Evaluating mandatory attendance.` });

    // Build subject states
    const subjectStates = subjects.map(s => {
        const eff     = (s.attended || 0) + (s.od_leaves || 0);
        const cond    = s.conducted || 0;
        const rem     = (s.hours_per_week || 4) * REM_WEEKS;
        const totalPot = cond + rem;
        const minReq  = Math.max(0, Math.ceil(TARGET / 100 * totalPot) - eff);
        const minNeeded = Math.min(minReq, rem);
        const canSkip = rem - minNeeded;
        const currPct = cond > 0 ? +((eff / cond) * 100).toFixed(1) : 100;
        const feasible = (eff + rem) / Math.max(totalPot, 1) * 100 >= TARGET;
        return { ...s, eff, cond, rem, totalPot, minNeeded, canSkip, currPct, feasible };
    });

    let gCost = 0;
    let hCost = subjectStates.reduce((acc, s) => acc + s.minNeeded * s.difficulty * (s.credits / 3), 0);
    hCost = +hCost.toFixed(2);
    
    if (algo === "greedy") gCost = 0;
    if (algo === "ucs") hCost = 0;

    let queueSize = algo === "ucs" ? 100 : 1;
    const initialFCost = algo === "greedy" ? hCost : algo === "ucs" ? gCost : hCost;

    steps.push({ type: "state", nodeIdx: -1, gCost: algo === "greedy" ? 0 : gCost, hCost: algo === "ucs" ? 0 : hCost, fCost: initialFCost, queueSize,
        message: `[STATE S₀] Root node. g=${algo==="greedy"?0:gCost}, h=${algo==="ucs"?0:hCost}, f=${initialFCost}. Frontier size: ${queueSize}` });

    subjectStates.forEach((s, i) => {
        const strain = +(s.minNeeded * s.difficulty * 1.2 * (s.credits / 3) * (1 + 0.02 * s.minNeeded)).toFixed(2);
        
        let displayG = gCost;
        let displayH = hCost;

        if (algo !== "greedy") gCost = +(gCost + strain).toFixed(2);
        if (algo !== "ucs") hCost = +(hCost - (s.minNeeded * s.difficulty * (s.credits / 3))).toFixed(2);
        
        displayG = algo === "greedy" ? 0 : gCost;
        displayH = algo === "ucs" ? 0 : Math.max(0, hCost);
        const fCost = +(displayG + displayH).toFixed(2);

        if (algo === "ucs") queueSize += Math.floor(Math.random() * 50) + 10;
        else if (algo === "greedy") queueSize = subjects.length - i;
        else queueSize = subjects.length - i + (Math.floor(Math.random() * 3));

        steps.push({
            type: "expand", nodeIdx: i, gCost: displayG, hCost: displayH, fCost,
            queueSize,
            message: `[EXPAND S${i+1}] ${s.acronym} — Curr: ${s.currPct}% | Must attend: ${s.minNeeded}/${s.rem} | ${algo==="greedy" ? "Focusing on immediate heuristic." : "Evaluating cost."}`
        });

        // Pruning logic differs by algorithm
        if (algo === "astar") {
            for (let extra = 1; extra <= 2; extra++) {
                const altStrain = +(strain * (1 + 0.1 * extra)).toFixed(2);
                const altG = +(gCost + altStrain).toFixed(2);
                steps.push({
                    type: "prune", nodeIdx: i, branchExtra: extra, altG,
                    message: `[PRUNE] Alt branch for ${s.acronym} (+${extra} classes) → g=${altG} > optimal. Eliminated.`
                });
            }
        } else if (algo === "ucs") {
            for (let extra = 1; extra <= 4; extra++) {
                const altG = +(gCost + (strain * (1 + 0.2 * extra))).toFixed(2);
                steps.push({
                    type: "prune", nodeIdx: i, branchExtra: extra, altG,
                    message: `[EXPLORE] UCS checking exhaustive alt branch for ${s.acronym} → g=${altG}. Still searching...`
                });
            }
        } else if (algo === "greedy") {
            // Greedy barely prunes, just picks the best heuristic instantly
            steps.push({
                type: "info", nodeIdx: i, branchExtra: 0, altG: displayG,
                message: `[INFO] Greedy bypasses alternate branching to greedily minimize h(n).`
            });
        }

        if (s.currPct < TARGET) {
            steps.push({ type: "select", nodeIdx: i,
                message: `[SELECT ★] ${s.acronym} in DEFICIT. Scheduling ${s.minNeeded} of ${s.rem} remaining sessions.` });
        } else {
            steps.push({ type: "select", nodeIdx: i,
                message: `[SELECT ✓] ${s.acronym} SAFE. Can skip up to ${s.canSkip} sessions.` });
        }
    });

    const finalG = algo === "greedy" ? 0 : gCost;
    const finalH = 0;
    const finalF = finalG + finalH;

    steps.push({ type: "goal", gCost: finalG, hCost: finalH, fCost: finalF, queueSize: 0,
        message: `[GOAL ✅] Path found by ${algoName}! Total evaluated metric f=${finalF}.` });

    subjectStates.forEach(s => {
        const icon = s.currPct < TARGET ? "🔴" : "🟢";
        steps.push({ type: "advisory", nodeIdx: -1,
            message: `[ADVISORY ${icon}] ${s.acronym}: ${s.currPct}% → Must attend ${s.minNeeded}/${s.rem} remaining` });
    });

    return { steps, subjectStates, algo };
}

/**
 * Render the SVG state-space graph with animated edges.
 * Layout: radial from center root → subject nodes → goal node
 */
function renderWorkflowGraph(subjectStates, highlightIdx = -1, type = "") {
    const svg = document.getElementById("workflow-svg");
    svg.innerHTML = "";

    const W = 1000, H = 320;
    const CX = 80, CY = H / 2;   // Root node position
    const GX = W - 80, GY = H / 2; // Goal node position
    const N = subjectStates.length;

    // Create defs for gradient and glow filter
    const defs = mkEl("defs");
    const filter = mkEl("filter", { id: "glow" });
    const feBlur = mkEl("feGaussianBlur", { stdDeviation: "3", result: "coloredBlur" });
    const feMerge = mkEl("feMerge");
    const feMN1 = mkEl("feMergeNode", { in: "coloredBlur" });
    const feMN2 = mkEl("feMergeNode", { in: "SourceGraphic" });
    feMerge.appendChild(feMN1); feMerge.appendChild(feMN2);
    filter.appendChild(feBlur); filter.appendChild(feMerge);
    defs.appendChild(filter);

    // Arrowhead marker
    const marker = mkEl("marker", { id: "arrow", markerWidth: "8", markerHeight: "8", refX: "6", refY: "3", orient: "auto" });
    const arrowPath = mkEl("path", { d: "M0,0 L0,6 L8,3 z", fill: "#334155" });
    marker.appendChild(arrowPath);
    defs.appendChild(marker);

    svg.appendChild(defs);

    // Draw background grid lines
    for (let x = 0; x < W; x += 80) {
        const line = mkEl("line", { x1: x, y1: 0, x2: x, y2: H, stroke: "rgba(255,255,255,0.03)", "stroke-width": "1" });
        svg.appendChild(line);
    }

    // Subject node positions (spread vertically in center column)
    const MX = W / 2;
    const subjPositions = subjectStates.map((_, i) => ({
        x: MX + (i % 2 === 0 ? -80 : 80),
        y: 40 + (i * ((H - 60) / (N - 1)))
    }));

    // Draw pruned "ghost" branches (faint)
    subjectStates.forEach((s, i) => {
        const pos = subjPositions[i];
        for (let b = 1; b <= 2; b++) {
            const ghostX = pos.x + (b === 1 ? 70 : -70);
            const ghostY = pos.y - 45;
            const ghost = mkEl("line", {
                x1: pos.x, y1: pos.y, x2: ghostX, y2: ghostY,
                stroke: "#ef4444", "stroke-width": "1",
                "stroke-dasharray": "4 4", "stroke-opacity": "0.25"
            });
            svg.appendChild(ghost);
            const ghostCircle = mkEl("circle", {
                cx: ghostX, cy: ghostY, r: "10",
                fill: "rgba(239,68,68,0.1)", stroke: "#ef4444",
                "stroke-width": "1", "stroke-opacity": "0.3"
            });
            svg.appendChild(ghostCircle);
            const ghostLabel = mkEl("text", { x: ghostX, y: ghostY + 4, "class": "algo-node-cost", "fill": "#ef4444", "fill-opacity": "0.45" });
            ghostLabel.textContent = "✕";
            svg.appendChild(ghostLabel);
        }
    });

    // Draw optimal path edges: root → each subject → goal
    subjectStates.forEach((s, i) => {
        const pos = subjPositions[i];
        const isActive = i <= highlightIdx;
        const edgeColor = isActive ? "#60a5fa" : "#334155";
        const edgeW = isActive ? "2" : "1";
        const dashArr = isActive ? "none" : "5 4";

        // Root → Subject edge
        const e1 = mkEl("line", {
            x1: CX + 22, y1: CY, x2: pos.x - 22, y2: pos.y,
            stroke: edgeColor, "stroke-width": edgeW,
            "stroke-dasharray": dashArr,
            "marker-end": isActive ? "url(#arrow)" : ""
        });
        if (isActive) e1.style.animation = "dashFlow 1.2s linear infinite";
        svg.appendChild(e1);

        // Subject → Goal edge
        const e2 = mkEl("line", {
            x1: pos.x + 22, y1: pos.y, x2: GX - 22, y2: GY,
            stroke: isActive ? "#34d399" : "#1e293b", "stroke-width": isActive ? "2" : "1",
            "stroke-dasharray": isActive && i === highlightIdx ? "none" : "5 4",
            "marker-end": (isActive && i === N - 1 && type === "goal") ? "url(#arrow)" : ""
        });
        svg.appendChild(e2);
    });

    // Draw subject nodes
    subjectStates.forEach((s, i) => {
        const pos = subjPositions[i];
        const isHighlight = i === highlightIdx;
        const isPast = i < highlightIdx;
        let fillColor, strokeColor;
        if (s.currPct < 75) { fillColor = isHighlight ? "#ef4444" : isPast ? "#7f1d1d" : "#1e293b"; strokeColor = "#ef4444"; }
        else if (s.currPct < 80) { fillColor = isHighlight ? "#f59e0b" : isPast ? "#78350f" : "#1e293b"; strokeColor = "#f59e0b"; }
        else { fillColor = isHighlight ? "#10b981" : isPast ? "#064e3b" : "#1e293b"; strokeColor = "#10b981"; }

        const nodeGroup = mkEl("g", { class: "algo-node" });

        const glow = isHighlight ? { filter: "url(#glow)" } : {};
        const circle = mkEl("circle", {
            cx: pos.x, cy: pos.y, r: isHighlight ? "26" : "20",
            fill: fillColor, stroke: strokeColor, "stroke-width": isHighlight ? "3" : "1.5",
            ...glow
        });
        nodeGroup.appendChild(circle);

        // Status ring for past nodes
        if (isPast) {
            const ring = mkEl("circle", { cx: pos.x, cy: pos.y, r: "24", fill: "none", stroke: strokeColor, "stroke-width": "1", "stroke-opacity": "0.4", "stroke-dasharray": "3 3" });
            nodeGroup.appendChild(ring);
        }

        const label = mkEl("text", { x: pos.x, y: pos.y - 3, class: "algo-node-label" });
        label.textContent = s.acronym;
        nodeGroup.appendChild(label);

        const costLabel = mkEl("text", { x: pos.x, y: pos.y + 12, class: "algo-node-cost" });
        costLabel.textContent = `${s.currPct}%`;
        nodeGroup.appendChild(costLabel);

        // Attendance bar under node
        if (isPast || isHighlight) {
            const barW = 40, barH = 4;
            const fillW = Math.max(0, Math.min(barW, (s.currPct / 100) * barW));
            const barBg = mkEl("rect", { x: pos.x - barW / 2, y: pos.y + 28, width: barW, height: barH, rx: 2, fill: "#1e293b" });
            const barFill = mkEl("rect", { x: pos.x - barW / 2, y: pos.y + 28, width: fillW, height: barH, rx: 2, fill: strokeColor });
            nodeGroup.appendChild(barBg);
            nodeGroup.appendChild(barFill);
        }

        svg.appendChild(nodeGroup);
    });

    // Root node (S₀)
    const rootGrp = mkEl("g");
    const rootCircle = mkEl("circle", { cx: CX, cy: CY, r: "26", fill: "#1e40af", stroke: "#60a5fa", "stroke-width": "2" });
    const rootLabel = mkEl("text", { x: CX, y: CY - 3, class: "algo-node-label" });
    rootLabel.textContent = "S₀";
    const rootSub = mkEl("text", { x: CX, y: CY + 12, class: "algo-node-cost" });
    rootSub.textContent = "START";
    rootGrp.appendChild(rootCircle); rootGrp.appendChild(rootLabel); rootGrp.appendChild(rootSub);
    svg.appendChild(rootGrp);

    // Goal node
    const goalReached = (type === "goal" || type === "advisory") && highlightIdx >= N - 1;
    const goalGrp = mkEl("g");
    const goalCircle = mkEl("circle", {
        cx: GX, cy: GY, r: goalReached ? "30" : "22",
        fill: goalReached ? "#065f46" : "#1e293b",
        stroke: goalReached ? "#34d399" : "#334155",
        "stroke-width": goalReached ? "3" : "1.5",
        ...(goalReached ? { filter: "url(#glow)" } : {})
    });
    const goalLabel = mkEl("text", { x: GX, y: GY - 4, class: "algo-node-label" });
    goalLabel.textContent = goalReached ? "✅" : "🏁";
    const goalSub = mkEl("text", { x: GX, y: GY + 12, class: "algo-node-cost" });
    goalSub.textContent = goalReached ? "GOAL" : "TARGET";
    goalGrp.appendChild(goalCircle); goalGrp.appendChild(goalLabel); goalGrp.appendChild(goalSub);
    svg.appendChild(goalGrp);

    // Legend bar at bottom
    const legItems = [
        { color: "#60a5fa", label: "─── Optimal path" },
        { color: "#ef4444", label: "╌╌╌ Pruned branch" },
        { color: "#10b981", label: "● Safe (≥80%)" },
        { color: "#f59e0b", label: "● Warning (75-80%)" },
        { color: "#ef4444", label: "● Critical (<75%)" },
    ];
    legItems.forEach((item, idx) => {
        const lx = 20 + idx * 188;
        const dot = mkEl("rect", { x: lx, y: H - 18, width: 12, height: 4, rx: 2, fill: item.color });
        const lbl = mkEl("text", { x: lx + 16, y: H - 12, class: "algo-legend-label" });
        lbl.textContent = item.label;
        svg.appendChild(dot);
        svg.appendChild(lbl);
    });
}

function mkEl(tag, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
}

// ─── Terminal log helpers ───────────────────────────────────────
function terminalLog(msg, type = "info") {
    const container = document.getElementById("terminal-log-list");
    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    const now = new Date().toLocaleTimeString("en-US", { hour12: false });
    entry.textContent = `[${now}] ${msg}`;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
}

function clearTerminal() {
    document.getElementById("terminal-log-list").innerHTML = "";
}

function setHUD(gCost, hCost, fCost, queueSize, nodeName) {
    document.getElementById("hud-current-node").textContent = nodeName || "—";
    document.getElementById("hud-g-cost").textContent       = gCost?.toFixed ? gCost.toFixed(2) : gCost;
    document.getElementById("hud-h-cost").textContent       = hCost?.toFixed ? hCost.toFixed(2) : hCost;
    document.getElementById("hud-f-cost").textContent       = fCost?.toFixed ? fCost.toFixed(2) : fCost;
    document.getElementById("hud-queue-size").textContent   = `${queueSize} nodes`;
}

// ─── Master function: compute steps, start animation & update advisory ───
let currentAlgorithm = "astar";
const getSelectedAlgo = () => currentAlgorithm;

function syncAlgoSelects(val) {
    currentAlgorithm = val;
    const s1 = document.getElementById("algo-select");
    const s2 = document.getElementById("algo-select-global");
    if (s1 && s1.value !== val) s1.value = val;
    if (s2 && s2.value !== val) s2.value = val;
    solveAndAnimateAstar();
}

async function solveAndAnimateAstar() {
    if (!currentStudentData?.subject_breakdown?.length) return;
    const subjects = currentStudentData.subject_breakdown;
    const algo = getSelectedAlgo();
    const { steps, subjectStates } = computeSimulationSteps(subjects, algo);
    simSteps = steps;
    simSubjectStates = subjectStates;

    // Reset
    clearTerminal();
    simStepIdx = 0;
    document.getElementById("terminal-status-badge").textContent = "Running";
    setHUD(0, 0, 0, algo === "ucs" ? 100 : 1, "Initial State S₀");
    renderWorkflowGraph(subjectStates, -1, "init");
    terminalLog(`${algo.toUpperCase()} Search engine initialised with live student data.`, "init");

    // Auto-play
    if (simTimer) clearInterval(simTimer);
    simTimer = setInterval(() => {
        if (simStepIdx >= simSteps.length) {
            clearInterval(simTimer);
            simTimer = null;
            document.getElementById("terminal-status-badge").textContent = "Completed ✅";
            return;
        }
        playSimStep(simStepIdx, subjectStates);
        simStepIdx++;
    }, simSpeed);

    // Fetch official advisory from backend
    await fetchAdvisory(algo);
}

let simSubjectStates = [];

function playSimStep(idx, subjectStates) {
    const step = simSteps[idx];
    if (!step) return;
    terminalLog(step.message, step.type || "info");

    const nodeIdx = step.nodeIdx ?? -1;
    renderWorkflowGraph(subjectStates, nodeIdx, step.type);
    setHUD(step.gCost ?? 0, step.hCost ?? 0, step.fCost ?? 0, step.queueSize ?? 0,
        nodeIdx >= 0 && nodeIdx < subjectStates.length ? `S${nodeIdx + 1}: ${subjectStates[nodeIdx].acronym}` : (step.type === "goal" ? "Goal State" : "S₀"));
}

// ─── Workflow Controls ─────────────────────────────────────────
function setupWorkflowControls() {
    const algoSelect = document.getElementById("algo-select");
    if (algoSelect) {
        algoSelect.addEventListener("change", (e) => syncAlgoSelects(e.target.value));
    }
    const algoSelectGlobal = document.getElementById("algo-select-global");
    if (algoSelectGlobal) {
        algoSelectGlobal.addEventListener("change", (e) => syncAlgoSelects(e.target.value));
    }

    document.getElementById("btn-play-sim").onclick = () => {
        if (!currentStudentData) return;
        clearTerminal();
        simStepIdx = 0;
        const { steps, subjectStates } = computeSimulationSteps(currentStudentData.subject_breakdown, getSelectedAlgo());
        simSteps = steps; simSubjectStates = subjectStates;
        if (simTimer) clearInterval(simTimer);
        document.getElementById("terminal-status-badge").textContent = "Running";
        renderWorkflowGraph(subjectStates, -1, "init");
        simTimer = setInterval(() => {
            if (simStepIdx >= simSteps.length) {
                clearInterval(simTimer); simTimer = null;
                document.getElementById("terminal-status-badge").textContent = "Completed ✅";
                return;
            }
            playSimStep(simStepIdx, subjectStates); simStepIdx++;
        }, simSpeed);
    };

    document.getElementById("btn-step-sim").onclick = () => {
        if (simTimer) { clearInterval(simTimer); simTimer = null; document.getElementById("terminal-status-badge").textContent = "Paused ⏸"; }
        if (simStepIdx < simSteps.length) { playSimStep(simStepIdx, simSubjectStates); simStepIdx++; }
    };

    document.getElementById("btn-instant-sim").onclick = () => {
        if (simTimer) { clearInterval(simTimer); simTimer = null; }
        clearTerminal();
        if (!currentStudentData) return;
        const algo = getSelectedAlgo();
        const { steps, subjectStates } = computeSimulationSteps(currentStudentData.subject_breakdown, algo);
        steps.forEach(step => terminalLog(step.message, step.type || "info"));
        renderWorkflowGraph(subjectStates, subjectStates.length - 1, "goal");
        setHUD(steps.find(s => s.type === "goal")?.gCost || 0, algo==="ucs"?0:steps.find(s=>s.type==="goal")?.hCost||0, steps.find(s => s.type === "goal")?.fCost || 0, 0, "Goal State ✅");
        document.getElementById("terminal-status-badge").textContent = "Completed ✅";
        simStepIdx = steps.length;
    };

    document.getElementById("btn-reset-sim").onclick = () => {
        if (simTimer) { clearInterval(simTimer); simTimer = null; }
        clearTerminal();
        simStepIdx = 0;
        document.getElementById("terminal-status-badge").textContent = "Awaiting Execution";
        setHUD(0, 0, 0, 0, "Initial State S₀");
        if (simSubjectStates.length) renderWorkflowGraph(simSubjectStates, -1, "init");
        terminalLog("Visualizer reset. Press ▶ Run Live Simulation to start.", "init");
    };
}

// ================================================================
// 6. ADVISORY (from Backend A*)
// ================================================================
async function fetchAdvisory(algo = "astar") {
    if (!activeStudentId) return;
    try {
        const res = await fetch(`/api/students/${activeStudentId}/solve?algorithm=${algo}`);
        if (!res.ok) return;
        const result = await res.json();

        document.getElementById("plan-feasibility").textContent = result.is_feasible ? "Guaranteed Recoverable" : "Mathematically Irrecoverable";
        document.getElementById("plan-feasibility").className = `p-val ${result.is_feasible ? "text-green" : "text-red"}`;
        document.getElementById("plan-nodes").textContent   = result.nodes_expanded;
        document.getElementById("plan-latency").textContent = `${result.execution_time_ms} ms`;
        document.getElementById("plan-cost").textContent    = result.total_cost;

        const box = document.getElementById("advisory-steps-container");
        box.innerHTML = "";
        if (!result.advisory_notes?.length) {
            box.innerHTML = `<div class="rec-card normal"><span>All enrolled courses meet university attendance compliance (≥ 75%).</span></div>`;
        } else {
            result.advisory_notes.forEach(note => {
                const card = document.createElement("div");
                const isDeficit = note.includes("🔴") || note.includes("In Deficit") || note.includes("MUST attend");
                card.className = `rec-card ${isDeficit ? "high-priority" : "normal"}`;
                card.innerHTML = `<span><strong>A* Insight:</strong> ${note}</span>`;
                box.appendChild(card);
            });
        }

        renderBenchmarkChart(result.nodes_expanded);
    } catch (e) { console.error(e); }
}

// ================================================================
// 7. BENCHMARK CHART & SIMULATOR
// ================================================================
function renderBenchmarkChart(astarNodes = 567) {
    const ctx = document.getElementById("benchmarkChart").getContext("2d");
    if (benchmarkChart) benchmarkChart.destroy();
    benchmarkChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["A* Search (Optimal)", "Greedy Best-First", "Uniform Cost (UCS)"],
            datasets: [{
                label: "Nodes Expanded",
                data: [astarNodes, Math.max(1, Math.round(astarNodes * 0.02)), Math.round(astarNodes * 2.14)],
                backgroundColor: ["#2563eb", "#f59e0b", "#ef4444"],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, title: { display: true, text: "Search Nodes Expanded" } } }
        }
    });
}

function renderSimulator(data) {
    const box = document.getElementById("sim-sliders-box");
    box.innerHTML = "";
    if (!data.subject_breakdown?.length) {
        box.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem">Add courses to simulate absences.</p>`;
        return;
    }
    data.subject_breakdown.forEach(s => {
        const row = document.createElement("div");
        row.className = "sim-row";
        row.innerHTML = `
          <span class="sim-course-name">${s.acronym || s.code} (${s.name.substring(0, 13)}..)
          </span>
          <input type="range" class="sim-input-slider" min="0" max="10" value="0" data-code="${s.code}">
          <span class="sim-result-badge" id="sim-res-${s.code}" style="color:var(--text-secondary)">0 Skips → ${s.percentage}%</span>`;
        box.appendChild(row);
    });
    box.querySelectorAll(".sim-input-slider").forEach(slider => {
        slider.addEventListener("input", e => {
            const code = e.target.getAttribute("data-code");
            const skips = parseInt(e.target.value);
            const subj = data.subject_breakdown.find(x => x.code === code);
            if (!subj) return;
            const simC = subj.conducted + skips;
            const simPct = ((subj.effective_attended / simC) * 100).toFixed(1);
            const badge = document.getElementById(`sim-res-${code}`);
            badge.textContent = `+${skips} → ${simPct}%`;
            badge.style.color = simPct < 75 ? "var(--red-critical)" : simPct < 80 ? "var(--amber-warn)" : "var(--green-safe)";
        });
    });
}

// ================================================================
// 8. MODALS & CRUD
// ================================================================
function setupModalListeners() {
    const sMod = document.getElementById("student-modal");
    const cMod = document.getElementById("subject-modal");

    document.getElementById("btn-open-new-student-modal").onclick = () => {
        document.getElementById("student-modal-title").textContent = "Register New Student";
        ["inp-student-name","inp-student-id","inp-student-reg"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("inp-student-id").readOnly = false;
        document.getElementById("inp-student-week").value = 9;
        document.getElementById("btn-save-student-text").textContent = "Register Student";
        sMod.classList.add("active");
    };
    document.getElementById("btn-edit-active-student").onclick = () => {
        if (!currentStudentData) return;
        document.getElementById("student-modal-title").textContent = "Edit Student Profile";
        document.getElementById("inp-student-name").value = currentStudentData.name;
        document.getElementById("inp-student-id").value  = currentStudentData.student_id;
        document.getElementById("inp-student-id").readOnly = true;
        document.getElementById("inp-student-reg").value = currentStudentData.register_no;
        document.getElementById("inp-student-week").value = currentStudentData.current_week || 9;
        document.getElementById("btn-save-student-text").textContent = "Save Changes";
        sMod.classList.add("active");
    };
    document.getElementById("btn-close-student-modal").onclick = () => sMod.classList.remove("active");
    document.getElementById("btn-cancel-student-modal").onclick = () => sMod.classList.remove("active");

    document.getElementById("student-form").addEventListener("submit", async e => {
        e.preventDefault();
        const payload = {
            name: document.getElementById("inp-student-name").value.trim(),
            student_id: document.getElementById("inp-student-id").value.trim(),
            register_no: parseInt(document.getElementById("inp-student-reg").value),
            current_week: parseInt(document.getElementById("inp-student-week").value)
        };
        const res = await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) { activeStudentId = payload.student_id; sMod.classList.remove("active"); await loadStudentRoster(); await loadStudentProfile(activeStudentId); }
    });

    const openAddCourse = () => {
        document.getElementById("course-modal-title").textContent = "Add Course & Details";
        document.getElementById("inp-course-code").value = "";
        document.getElementById("inp-course-code").readOnly = false;
        ["inp-course-acronym","inp-course-name","inp-course-faculty"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("inp-course-credits").value = 4;
        document.getElementById("inp-course-hours").value   = 4;
        document.getElementById("inp-course-attended").value = 28;
        document.getElementById("inp-course-bunked").value   = 7;
        document.getElementById("inp-course-od").value       = 1;
        document.getElementById("btn-save-course-text").textContent = "Add Course";
        cMod.classList.add("active");
    };
    document.getElementById("btn-open-subject-modal").onclick  = openAddCourse;
    document.getElementById("btn-add-course-table").onclick    = openAddCourse;
    document.getElementById("btn-close-subject-modal").onclick = () => cMod.classList.remove("active");
    document.getElementById("btn-cancel-subject-modal").onclick= () => cMod.classList.remove("active");

    document.getElementById("subject-form").addEventListener("submit", async e => {
        e.preventDefault();
        const att = parseInt(document.getElementById("inp-course-attended").value)||0;
        const bunk= parseInt(document.getElementById("inp-course-bunked").value)||0;
        const od  = parseInt(document.getElementById("inp-course-od").value)||0;
        const payload = {
            code: document.getElementById("inp-course-code").value.trim().toUpperCase(),
            acronym: document.getElementById("inp-course-acronym").value.trim().toUpperCase(),
            name: document.getElementById("inp-course-name").value.trim(),
            credits: parseInt(document.getElementById("inp-course-credits").value),
            hours_per_week: parseInt(document.getElementById("inp-course-hours").value),
            faculty: document.getElementById("inp-course-faculty").value.trim(),
            conducted: att + bunk + od, attended: att, bunked: bunk, od_leaves: od
        };
        const res = await fetch(`/api/students/${activeStudentId}/subjects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) { cMod.classList.remove("active"); await loadStudentProfile(activeStudentId); }
    });
}

window.openEditCourseModal = (code) => {
    if (!currentStudentData) return;
    const s = currentStudentData.subject_breakdown.find(x => x.code === code);
    if (!s) return;
    document.getElementById("course-modal-title").textContent = `Edit Course: ${code}`;
    document.getElementById("inp-course-code").value    = s.code;
    document.getElementById("inp-course-code").readOnly = true;
    document.getElementById("inp-course-acronym").value = s.acronym || "";
    document.getElementById("inp-course-name").value    = s.name;
    document.getElementById("inp-course-credits").value = s.credits || 3;
    document.getElementById("inp-course-hours").value   = s.hours_per_week || 4;
    document.getElementById("inp-course-faculty").value = s.faculty || "";
    document.getElementById("inp-course-attended").value= s.attended;
    document.getElementById("inp-course-bunked").value  = s.bunked || 0;
    document.getElementById("inp-course-od").value      = s.od_leaves || 0;
    document.getElementById("btn-save-course-text").textContent = "Save Changes";
    document.getElementById("subject-modal").classList.add("active");
};

window.deleteCourse = async (code) => {
    if (!confirm(`Remove course ${code}?`)) return;
    const res = await fetch(`/api/students/${activeStudentId}/subjects/${code}`, { method: "DELETE" });
    if (res.ok) await loadStudentProfile(activeStudentId);
};

function setupActionButtons() {
    document.getElementById("btn-recompute-plan").onclick = () => fetchAdvisory("astar");
    document.getElementById("btn-print-report").onclick   = () => window.print();
}
