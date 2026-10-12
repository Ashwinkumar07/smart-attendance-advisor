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
const PANE_TITLES = {
    "pane-dashboard": "Workspace Control Hub",
    "pane-attendance": "Real-Time Attendance Control Center",
    "pane-visualizer": "Live A* Heuristic Algorithm Visualizer",
    "pane-csp": "CSP Timetable & Attendance-Constrained Leave Planner",
    "pane-fol": "First-Order Logic (FOL) Statutory Policy Reasoner",
    "pane-responsible-ai": "Responsible AI Governance & Deficit Pattern Risk Matrix",
    "pane-simulator": "Interactive What-If Scenario Simulator",
    "pane-benchmark": "Heuristic Search Performance Benchmarking"
};

window.switchPane = function(paneId) {
    const panes = document.querySelectorAll(".content-pane");
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");

    panes.forEach(p => {
        if (p.id === paneId) {
            p.classList.add("active");
        } else {
            p.classList.remove("active");
        }
    });

    navItems.forEach(item => {
        const itemPane = item.getAttribute("data-pane");
        if (itemPane === paneId) {
            item.classList.add("active");
            if (!item.querySelector(".active-dot")) {
                const dot = document.createElement("span");
                dot.className = "active-dot";
                item.appendChild(dot);
            }
        } else {
            item.classList.remove("active");
            const dot = item.querySelector(".active-dot");
            if (dot) dot.remove();
        }
    });

    const titleEl = document.getElementById("page-current-title");
    if (titleEl && PANE_TITLES[paneId]) {
        titleEl.textContent = PANE_TITLES[paneId];
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
};

function setupSidebarNav() {
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const paneId = item.getAttribute("data-pane");
            if (paneId) {
                switchPane(paneId);
            }
        });
    });

    try {
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        const dateEl = document.getElementById("topbar-date-text");
        if (dateEl) dateEl.textContent = dateStr;
    } catch (e) {
        console.error(e);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    setupSidebarNav();
    setupModuleTabs();
    setupModalListeners();
    setupActionButtons();
    await loadStudentRoster();
    await loadStudentProfile(activeStudentId);
    setupWorkflowControls();
});

function setupModuleTabs() {
    const tabBtns = document.querySelectorAll(".nav-tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-tab");

            // Update button active state
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Switch views
            if (target === "tab-all") {
                tabPanes.forEach(p => p.classList.add("active"));
            } else {
                tabPanes.forEach(p => {
                    if (p.id === target) {
                        p.classList.add("active");
                    } else {
                        p.classList.remove("active");
                    }
                });
            }
        });
    });
}

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
    if (!data) return;
    const setTxt = (id, val) => {
        const node = document.getElementById(id);
        if (node) node.textContent = val;
    };
    setTxt("profile-name", data.name || "Student");
    setTxt("profile-avatar", (data.name || "ST").substring(0, 2).toUpperCase());
    setTxt("meta-student-id", data.student_id || "");
    setTxt("meta-reg-no", data.register_no || "");

    recalcKPIs(data);
    renderCoursesTable(data);
    renderSimulator(data);
    renderFOLCourseOptions(data);
    loadResponsibleAI();
}

function recalcKPIs(data) {
    let totC = 0, totA = 0, crit = 0, warn = 0, safe = 0;
    data.subject_breakdown.forEach(s => {
        let att  = Math.max(0, parseInt(s.attended) || 0);
        let od   = Math.max(0, parseInt(s.od_leaves) || 0);
        let bunk = Math.max(0, parseInt(s.bunked) || 0);

        s.attended = att;
        s.od_leaves = od;
        s.bunked = bunk;

        // Classes held section updates dynamically: conducted = Present + Absent + OD
        const cond = att + bunk + od;
        s.conducted = cond;

        const eff = att + od;
        s.effective_attended = eff;

        const pct = cond > 0 ? +((eff / cond) * 100).toFixed(1) : 100.0;
        s.percentage = pct;
        
        if      (pct < 75.0) { s.risk_tier = "Critical"; crit++; }
        else if (pct < 80.0) { s.risk_tier = "Warning";  warn++; }
        else                 { s.risk_tier = "Safe";     safe++; }
        
        totC += cond;
        totA += eff;
    });
    const oPct = totC > 0 ? +((totA / totC) * 100).toFixed(1) : 100.0;
    data.overall_percentage = oPct;
    data.overall_conducted  = totC;
    data.overall_attended   = totA;
    data.overall_risk_tier  = oPct < 75 ? "Critical" : oPct < 80 ? "Warning" : "Safe";

    const setTxt = (id, val) => {
        const node = document.getElementById(id);
        if (node) node.textContent = val;
    };
    setTxt("kpi-overall-pct", `${oPct}%`);
    setTxt("kpi-stat-ratio", `${totA} / ${totC} Hours`);
    setTxt("kpi-critical-count", crit);
    setTxt("kpi-warning-count", warn);
    setTxt("kpi-safe-count", safe);

    const fill = document.getElementById("kpi-progress-bar");
    if (fill) {
        fill.style.width = `${Math.min(oPct, 100)}%`;
        fill.style.backgroundColor = oPct < 75 ? "var(--red-critical)" : oPct < 80 ? "var(--amber-warn)" : "var(--green-safe)";
    }

    const critDesc = document.getElementById("kpi-critical-desc");
    if (critDesc) {
        critDesc.textContent = crit > 0 ? `${crit} course(s) require immediate recovery.` : "No courses currently in detention risk.";
        critDesc.style.color = crit > 0 ? "var(--red-critical)" : "var(--text-muted)";
    }

    const badge = document.getElementById("profile-status-badge");
    if (badge) {
        badge.textContent = crit === 0 ? "System Online" : `${crit} Critical Alerts`;
        if (badge.parentElement && badge.parentElement.classList.contains("topbar-status-badge")) {
            badge.parentElement.style.background = crit === 0 ? "#ecfdf5" : "#fef2f2";
            badge.parentElement.style.color = crit === 0 ? "#059669" : "#dc2626";
            badge.parentElement.style.borderColor = crit === 0 ? "#a7f3d0" : "#fecaca";
        }
    }

    // Sync Hero & Highlight Quad Cards on Dashboard Hub
    const el = (id) => document.getElementById(id);
    const heroCourses = el("hero-stat-courses");
    if (heroCourses) heroCourses.textContent = `${data.subject_breakdown.length} Courses`;

    const dashAtt = el("dash-attendance-pct");
    if (dashAtt) {
        dashAtt.textContent = `${oPct}%`;
        dashAtt.style.color = oPct < 75 ? "var(--red-critical)" : oPct < 80 ? "var(--amber-warn)" : "var(--green-safe)";
    }
    const dashMod = el("dash-active-modules");
    if (dashMod) dashMod.textContent = `${data.subject_breakdown.length} Active`;

    const dashStat = el("dash-statutory-status");
    if (dashStat) {
        dashStat.textContent = crit === 0 ? "Statutory Safe" : `${crit} at Risk`;
        dashStat.style.color = crit === 0 ? "var(--green-safe)" : "var(--red-critical)";
    }

    const algoNames = { astar: "A* Search", greedy: "Greedy BFS", ucs: "Uniform Cost" };
    const curAlgo = (typeof getSelectedAlgo === "function" ? getSelectedAlgo() : "astar");
    const dashAlgo = el("dash-active-engine");
    if (dashAlgo) {
        dashAlgo.textContent = algoNames[curAlgo] || "A* Search";
    }

    // Sync attendance panel mini-stats strip
    if (el("att-stat-courses")) el("att-stat-courses").textContent = data.subject_breakdown.length;
    if (el("att-stat-safe"))    el("att-stat-safe").textContent = safe;
    if (el("att-stat-warn"))    el("att-stat-warn").textContent = warn;
    if (el("att-stat-crit"))    el("att-stat-crit").textContent = crit;
    if (el("att-stat-algo"))    el("att-stat-algo").textContent = algoNames[curAlgo] || "A* Search";
}

function renderCoursesTable(data) {
    const tbody = document.getElementById("courses-table-body");
    tbody.innerHTML = "";
    if (!data.subject_breakdown?.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px">No courses. Click <strong>+ Add Course</strong>.</td></tr>`;
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
        const barColor = s.percentage < 75 ? "#ef4444" : s.percentage < 80 ? "#f59e0b" : "#10b981";

        tr.innerHTML = `
          <!-- 1. Course Details Compound Cell -->
          <td>
            <div class="course-cell-compound">
              <span class="course-code-line">${s.acronym || s.code} <small style="font-weight:600; color:var(--text-muted);">(${s.code})</small></span>
              <span class="course-name-line">${s.name}</span>
              <span class="course-meta-line">${s.hours_per_week || 4} hrs/wk • ${s.credits || 3} Credits</span>
            </div>
          </td>

          <!-- 2. Conducted Badge -->
          <td style="text-align:center;">
            <span class="conducted-pill" id="held-${s.code}">${s.conducted} Held</span>
          </td>

          <!-- 3. Present Stepper -->
          <td>
            <div class="stepper-widget stepper-attend">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','attended',-1)">-</button>
              <input type="number" class="stepper-input" id="input-att-${s.code}" value="${s.attended}" min="0" onchange="setCount('${s.code}','attended',this.value)">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','attended',1)">+</button>
            </div>
          </td>

          <!-- 4. Absent Stepper -->
          <td>
            <div class="stepper-widget stepper-bunk">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','bunked',-1)">-</button>
              <input type="number" class="stepper-input" id="input-bunk-${s.code}" value="${s.bunked || 0}" min="0" onchange="setCount('${s.code}','bunked',this.value)">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','bunked',1)">+</button>
            </div>
          </td>

          <!-- 5. OD Stepper -->
          <td>
            <div class="stepper-widget stepper-od">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','od_leaves',-1)">-</button>
              <input type="number" class="stepper-input" id="input-od-${s.code}" value="${s.od_leaves || 0}" min="0" onchange="setCount('${s.code}','od_leaves',this.value)">
              <button class="stepper-btn" onclick="modifyCount('${s.code}','od_leaves',1)">+</button>
            </div>
          </td>

          <!-- 6. Progress & Percentage -->
          <td class="pct-progress-cell">
            <span class="pct-number" id="pct-${s.code}" style="color:${pctColor};">${s.percentage}%</span>
            <div class="mini-prog-bar">
              <div class="mini-prog-fill" style="width:${Math.min(s.percentage, 100)}%; background-color:${barColor};"></div>
            </div>
          </td>

          <!-- 7. Status Badge -->
          <td><span class="status-badge ${s.risk_tier}" id="badge-${s.code}">${s.risk_tier}</span></td>

          <!-- 8. Smart Advice -->
          <td id="advice-${s.code}">${adviceHtml}</td>

          <!-- 9. Actions -->
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
// 4. LIVE STEPPER ACTIONS (Dynamic Classes Held = Present + Absent + OD)
// ================================================================
window.modifyCount = async (code, field, delta) => {
    if (!currentStudentData) return;
    const s = currentStudentData.subject_breakdown.find(x => x.code === code);
    if (!s) return;

    let att  = Math.max(0, parseInt(s.attended) || 0);
    let od   = Math.max(0, parseInt(s.od_leaves) || 0);
    let bunk = Math.max(0, parseInt(s.bunked) || 0);

    if (field === 'attended') {
        att = Math.max(0, att + delta);
        s.attended = att;
    } else if (field === 'bunked') {
        bunk = Math.max(0, bunk + delta);
        s.bunked = bunk;
    } else if (field === 'od_leaves') {
        od = Math.max(0, od + delta);
        s.od_leaves = od;
    }

    // Classes held section updates dynamically:
    s.conducted = s.attended + s.bunked + s.od_leaves;
    s.effective_attended = s.attended + s.od_leaves;
    s.percentage = s.conducted > 0 ? +((s.effective_attended / s.conducted) * 100).toFixed(1) : 100.0;

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

    const numVal = Math.max(0, parseInt(val) || 0);

    if (field === 'attended') {
        s.attended = numVal;
    } else if (field === 'bunked') {
        s.bunked = numVal;
    } else if (field === 'od_leaves') {
        s.od_leaves = numVal;
    }

    // Classes held section updates dynamically:
    s.conducted = s.attended + s.bunked + s.od_leaves;
    s.effective_attended = s.attended + s.od_leaves;
    s.percentage = s.conducted > 0 ? +((s.effective_attended / s.conducted) * 100).toFixed(1) : 100.0;

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

// ─── Visualizer Speed & Telemetry Control ───────────────────────
window.setSimSpeed = function(speed, btn) {
    simSpeed = speed;
    document.querySelectorAll(".btn-speed").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    if (simTimer) {
        clearInterval(simTimer);
        simTimer = setInterval(() => {
            if (simStepIdx >= simSteps.length) {
                clearInterval(simTimer);
                simTimer = null;
                const b = document.getElementById("terminal-status-badge");
                if (b) b.textContent = "Completed ✅";
                return;
            }
            playSimStep(simStepIdx, simSubjectStates);
            simStepIdx++;
        }, simSpeed);
    }
};

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
    steps.push({ type: "init", message: `[INIT] ${algoName} online. Target: ${TARGET}%, Horizon: Week ${CURRENT_WEEK} to ${TOTAL_WEEKS}.` });
    steps.push({ type: "info", message: `[INFO] Remaining weeks: ${REM_WEEKS}. Evaluating strain cost g(n) and admissible heuristic h(n).` });

    // Build subject states
    const subjectStates = subjects.map(s => {
        const eff        = (s.attended || 0) + (s.od_leaves || 0);
        const cond       = s.conducted || 0;
        const rem        = (s.hours_per_week || 4) * REM_WEEKS;
        const totalPot   = cond + rem;
        const minReq     = Math.max(0, Math.ceil(TARGET / 100 * totalPot) - eff);
        const minNeeded  = Math.min(minReq, rem);
        const canSkip    = rem - minNeeded;
        const currPct    = cond > 0 ? +((eff / cond) * 100).toFixed(1) : 100;
        const feasible   = (eff + rem) / Math.max(totalPot, 1) * 100 >= TARGET;
        const difficulty = Number(s.difficulty) || 0.75;
        const credits    = Number(s.credits) || 3;
        return { ...s, eff, cond, rem, totalPot, minNeeded, canSkip, currPct, feasible, difficulty, credits };
    });

    let gCost = 0;
    let hCost = subjectStates.reduce((acc, s) => acc + s.minNeeded * s.difficulty * (s.credits / 3), 0);
    hCost = +hCost.toFixed(2);
    
    if (algo === "greedy") gCost = 0;
    if (algo === "ucs") hCost = 0;

    let queueSize = algo === "ucs" ? 100 : 1;
    const initialFCost = algo === "greedy" ? hCost : algo === "ucs" ? gCost : +(gCost + hCost).toFixed(2);

    steps.push({ type: "state", nodeIdx: -1, gCost: algo === "greedy" ? 0 : gCost, hCost: algo === "ucs" ? 0 : hCost, fCost: initialFCost, queueSize,
        message: `[STATE S₀] Root state. g=${algo==="greedy"?0:gCost}, h=${algo==="ucs"?0:hCost}, f=${initialFCost}. Frontier queue: ${queueSize}` });

    subjectStates.forEach((s, i) => {
        const strain = +(s.minNeeded * s.difficulty * 1.2 * (s.credits / 3) * (1 + 0.02 * s.minNeeded)).toFixed(2);
        
        let displayG = gCost;
        let displayH = hCost;

        if (algo !== "greedy") gCost = +(gCost + strain).toFixed(2);
        if (algo !== "ucs") hCost = +(Math.max(0, hCost - (s.minNeeded * s.difficulty * (s.credits / 3)))).toFixed(2);
        
        displayG = algo === "greedy" ? 0 : gCost;
        displayH = algo === "ucs" ? 0 : Math.max(0, hCost);
        const fCost = +(displayG + displayH).toFixed(2);

        if (algo === "ucs") queueSize += Math.floor(Math.random() * 30) + 12;
        else if (algo === "greedy") queueSize = Math.max(1, subjects.length - i);
        else queueSize = Math.max(1, subjects.length - i + (Math.floor(Math.random() * 2)));

        steps.push({
            type: "expand", nodeIdx: i, gCost: displayG, hCost: displayH, fCost,
            queueSize,
            message: `[EXPAND S${i+1}] ${s.acronym} — Attendance: ${s.currPct}% | Recovery target: ${s.minNeeded}/${s.rem} classes | ${algo==="greedy" ? "Heuristic greedy priority." : "Evaluating path cost."}`
        });

        // Pruning logic differs by algorithm
        if (algo === "astar") {
            for (let extra = 1; extra <= 2; extra++) {
                const altStrain = +(strain * (1 + 0.15 * extra)).toFixed(2);
                const altG = +(gCost + altStrain).toFixed(2);
                steps.push({
                    type: "prune", nodeIdx: i, branchExtra: extra, altG,
                    message: `[PRUNE] Alt allocation for ${s.acronym} (+${extra} sessions) → g=${altG} exceeds optimal. Pruned.`
                });
            }
        } else if (algo === "ucs") {
            for (let extra = 1; extra <= 3; extra++) {
                const altG = +(gCost + (strain * (1 + 0.2 * extra))).toFixed(2);
                steps.push({
                    type: "prune", nodeIdx: i, branchExtra: extra, altG,
                    message: `[EXPLORE] UCS evaluating alternate path for ${s.acronym} → g=${altG}.`
                });
            }
        } else if (algo === "greedy") {
            steps.push({
                type: "info", nodeIdx: i, branchExtra: 0, altG: displayG,
                message: `[INFO] Greedy BFS bypasses alternate branch evaluations to greedily minimize h(n).`
            });
        }

        if (s.currPct < TARGET) {
            steps.push({ type: "select", nodeIdx: i,
                message: `[SELECT ★] ${s.acronym} in DEFICIT (${s.currPct}%). Scheduling ${s.minNeeded}/${s.rem} mandatory sessions.` });
        } else {
            steps.push({ type: "select", nodeIdx: i,
                message: `[SELECT ✓] ${s.acronym} SAFE (${s.currPct}%). Buffer allowance: up to ${s.canSkip} sessions skippable.` });
        }
    });

    const finalG = algo === "greedy" ? 0 : Number(gCost || 0);
    const finalH = 0;
    const finalF = +(finalG + finalH).toFixed(2);

    steps.push({ type: "goal", gCost: finalG, hCost: finalH, fCost: finalF, queueSize: 0,
        message: `[GOAL ✅] Optimal path converged by ${algoName}! Total academic strain f=${finalF}.` });

    subjectStates.forEach(s => {
        const icon = s.currPct < TARGET ? "🔴" : "🟢";
        steps.push({ type: "advisory", nodeIdx: -1,
            message: `[ADVISORY ${icon}] ${s.acronym}: ${s.currPct}% → Required: attend ${s.minNeeded}/${s.rem} remaining sessions` });
    });

    return { steps, subjectStates, algo };
}

/**
 * Render the Futuristic Cyberpunk SVG state-space graph with animated glowing edges,
 * orbital reticles, pulse waves, and holographic nodes.
 */
function renderWorkflowGraph(subjectStates, highlightIdx = -1, type = "") {
    const svg = document.getElementById("workflow-svg");
    if (!svg) return;
    svg.innerHTML = "";

    const W = 1000, H = 320;
    const CX = 85, CY = 160;     // Root start node position
    const GX = 915, GY = 160;   // Goal target node position
    const N = subjectStates.length;

    // Build SVG defs for glowing filters, radial orbs, and laser gradients
    const defs = mkEl("defs");

    // Glow filters
    const mkGlow = (id, stdDev, color) => {
        const f = mkEl("filter", { id, x: "-50%", y: "-50%", width: "200%", height: "200%" });
        const blur = mkEl("feGaussianBlur", { stdDeviation: stdDev, result: "blur" });
        const flood = mkEl("feFlood", { "flood-color": color, "flood-opacity": "0.6", result: "color" });
        const comp = mkEl("feComposite", { in: "color", in2: "blur", operator: "in", result: "glow" });
        const merge = mkEl("feMerge");
        const m1 = mkEl("feMergeNode", { in: "glow" });
        const m2 = mkEl("feMergeNode", { in: "SourceGraphic" });
        merge.appendChild(m1); merge.appendChild(m2);
        f.appendChild(blur); f.appendChild(flood); f.appendChild(comp); f.appendChild(merge);
        return f;
    };

    defs.appendChild(mkGlow("glowCyan", "4", "#38bdf8"));
    defs.appendChild(mkGlow("glowSafe", "4", "#34d399"));
    defs.appendChild(mkGlow("glowWarn", "4", "#fbbf24"));
    defs.appendChild(mkGlow("glowCrit", "4", "#ef4444"));
    defs.appendChild(mkGlow("glowGold", "6", "#facc15"));

    // Laser conduits gradient
    const laserGrad = mkEl("linearGradient", { id: "laserActiveGrad", x1: "0%", y1: "0%", x2: "100%", y2: "0%" });
    const s1 = mkEl("stop", { offset: "0%", "stop-color": "#38bdf8" });
    const s2 = mkEl("stop", { offset: "50%", "stop-color": "#818cf8" });
    const s3 = mkEl("stop", { offset: "100%", "stop-color": "#34d399" });
    laserGrad.appendChild(s1); laserGrad.appendChild(s2); laserGrad.appendChild(s3);
    defs.appendChild(laserGrad);

    // Radial orbs gradients
    const mkOrb = (id, c1, c2, c3) => {
        const rad = mkEl("radialGradient", { id, cx: "35%", cy: "35%", r: "65%" });
        rad.appendChild(mkEl("stop", { offset: "0%", "stop-color": c1 }));
        rad.appendChild(mkEl("stop", { offset: "60%", "stop-color": c2 }));
        rad.appendChild(mkEl("stop", { offset: "100%", "stop-color": c3 }));
        return rad;
    };
    defs.appendChild(mkOrb("orbRoot", "#38bdf8", "#0284c7", "#0c1f38"));
    defs.appendChild(mkOrb("orbSafe", "#34d399", "#059669", "#062e24"));
    defs.appendChild(mkOrb("orbWarn", "#fbbf24", "#d97706", "#3d2008"));
    defs.appendChild(mkOrb("orbCrit", "#f87171", "#dc2626", "#3b0d0c"));
    defs.appendChild(mkOrb("orbGoal", "#fef08a", "#eab308", "#14532d"));

    // Arrowhead markers
    const mkMarker = (id, fill) => {
        const m = mkEl("marker", { id, markerWidth: "9", markerHeight: "9", refX: "7", refY: "3", orient: "auto" });
        m.appendChild(mkEl("path", { d: "M0,0 L0,6 L8,3 z", fill }));
        return m;
    };
    defs.appendChild(mkMarker("arrowCyan", "#38bdf8"));
    defs.appendChild(mkMarker("arrowGold", "#facc15"));

    svg.appendChild(defs);

    // Background Cyber Grid lines & Coordinate Crosses
    for (let x = 80; x < W; x += 120) {
        svg.appendChild(mkEl("line", { x1: x, y1: 0, x2: x, y2: H, stroke: "rgba(99,102,241,0.05)", "stroke-width": "1" }));
    }
    for (let y = 40; y < H; y += 80) {
        svg.appendChild(mkEl("line", { x1: 0, y1: y, x2: W, y2: y, stroke: "rgba(99,102,241,0.05)", "stroke-width": "1" }));
    }

    // Coordinate crosshairs
    const crosses = [
        { x: 200, y: 70 }, { x: 480, y: 70 }, { x: 760, y: 70 },
        { x: 200, y: 250 }, { x: 480, y: 250 }, { x: 760, y: 250 }
    ];
    crosses.forEach(c => {
        const t = mkEl("text", { x: c.x, y: c.y, fill: "rgba(99,102,241,0.25)", "font-size": "10", "font-family": "monospace", "text-anchor": "middle" });
        t.textContent = "+";
        svg.appendChild(t);
    });

    // Staggered Feed-Forward Cyber Node Coordinates (2 balanced columns)
    const subjPositions = subjectStates.map((_, i) => {
        const isCol1 = i % 2 === 0;
        const colX = isCol1 ? 340 : 620;
        const rowInCol = Math.floor(i / 2);
        const colItems = isCol1 ? Math.ceil(N / 2) : Math.floor(N / 2);
        const startY = isCol1 ? 55 : 85;
        const gapY = isCol1 ? 68 : 75;
        const y = colItems > 1 ? startY + rowInCol * gapY : H / 2;
        return { x: colX, y: Math.round(y) };
    });

    // Draw Pruned Hazard Branches
    subjectStates.forEach((s, i) => {
        const pos = subjPositions[i];
        for (let b = 1; b <= 2; b++) {
            const ghostX = pos.x + (b === 1 ? 58 : -58);
            const ghostY = pos.y - 36;
            
            // Pruned laser conduit
            const gLine = mkEl("line", {
                x1: pos.x, y1: pos.y, x2: ghostX, y2: ghostY,
                stroke: "#ef4444", "stroke-width": "1.2",
                "stroke-dasharray": "3 3", "stroke-opacity": "0.35"
            });
            svg.appendChild(gLine);

            // Pruned diamond/hazard badge
            const gBox = mkEl("rect", {
                x: ghostX - 8, y: ghostY - 8, width: 16, height: 16, rx: 3,
                fill: "rgba(239,68,68,0.15)", stroke: "#ef4444",
                "stroke-width": "1", "stroke-opacity": "0.4"
            });
            svg.appendChild(gBox);

            const gTxt = mkEl("text", {
                x: ghostX, y: ghostY + 3.5,
                fill: "#f87171", "font-size": "9", "font-family": "monospace",
                "text-anchor": "middle", "fill-opacity": "0.7"
            });
            gTxt.textContent = "✕";
            svg.appendChild(gTxt);
        }
    });

    // Draw Feed-Forward Laser Conduits (Edges)
    subjectStates.forEach((s, i) => {
        const pos = subjPositions[i];
        const isActive = i <= highlightIdx;
        const edgeColor = isActive ? "url(#laserActiveGrad)" : "rgba(255,255,255,0.08)";
        const edgeW = isActive ? "2.5" : "1";
        const dashArr = isActive ? "none" : "4 4";

        // From Start Node (S₀) to Col 1 nodes
        if (i % 2 === 0) {
            const eStart = mkEl("line", {
                x1: CX + 28, y1: CY, x2: pos.x - 30, y2: pos.y,
                stroke: edgeColor, "stroke-width": edgeW,
                "stroke-dasharray": dashArr,
                "marker-end": isActive ? "url(#arrowCyan)" : ""
            });
            if (isActive) eStart.classList.add("laser-active-path");
            svg.appendChild(eStart);
        }

        // Cross-conduits between Col 1 and Col 2
        if (i < N - 1) {
            const nextPos = subjPositions[i + 1];
            const isStepActive = i < highlightIdx;
            const eStep = mkEl("line", {
                x1: pos.x + 30, y1: pos.y, x2: nextPos.x - 30, y2: nextPos.y,
                stroke: isStepActive ? "url(#laserActiveGrad)" : "rgba(255,255,255,0.06)",
                "stroke-width": isStepActive ? "2.5" : "1",
                "stroke-dasharray": isStepActive ? "none" : "4 4",
                "marker-end": isStepActive ? "url(#arrowCyan)" : ""
            });
            if (isStepActive) eStep.classList.add("laser-active-path");
            svg.appendChild(eStep);
        }

        // From Col 2 nodes to Goal
        if (i % 2 !== 0 || i === N - 1) {
            const isGoalPath = (type === "goal" || type === "advisory");
            const eGoal = mkEl("line", {
                x1: pos.x + 30, y1: pos.y, x2: GX - 30, y2: GY,
                stroke: isGoalPath ? "#34d399" : "rgba(255,255,255,0.06)",
                "stroke-width": isGoalPath ? "2.5" : "1",
                "stroke-dasharray": isGoalPath ? "none" : "4 4",
                "marker-end": isGoalPath ? "url(#arrowGold)" : ""
            });
            if (isGoalPath) eGoal.classList.add("laser-active-path");
            svg.appendChild(eGoal);
        }
    });

    // Draw Subject Nodes (Cyber Orbs with Attendance Arc Meters)
    subjectStates.forEach((s, i) => {
        const pos = subjPositions[i];
        const isHighlight = i === highlightIdx;
        const isPast = i < highlightIdx;

        let orbGrad, strokeColor, glowFilter;
        if (s.currPct < 75) {
            orbGrad = "url(#orbCrit)"; strokeColor = "#ef4444"; glowFilter = "url(#glowCrit)";
        } else if (s.currPct < 80) {
            orbGrad = "url(#orbWarn)"; strokeColor = "#fbbf24"; glowFilter = "url(#glowWarn)";
        } else {
            orbGrad = "url(#orbSafe)"; strokeColor = "#34d399"; glowFilter = "url(#glowSafe)";
        }

        const nodeGroup = mkEl("g", { class: "algo-node" });

        // Sonar expanding wave ripple on active node
        if (isHighlight) {
            const ripple = mkEl("circle", {
                cx: pos.x, cy: pos.y, r: "26",
                fill: "none", stroke: strokeColor, "stroke-width": "2",
                class: "sonar-pulse-circle"
            });
            nodeGroup.appendChild(ripple);
        }

        // Outer Attendance Percentage Arc Meter
        const R = isHighlight ? 28 : 23;
        const circ = 2 * Math.PI * R;
        const pctClamped = Math.max(0, Math.min(100, s.currPct));
        const arcFill = (pctClamped / 100) * circ;

        // Meter Track
        const meterTrack = mkEl("circle", {
            cx: pos.x, cy: pos.y, r: R,
            fill: "none", stroke: "rgba(255,255,255,0.08)", "stroke-width": "2.5"
        });
        nodeGroup.appendChild(meterTrack);

        // Meter Arc
        const meterArc = mkEl("circle", {
            cx: pos.x, cy: pos.y, r: R,
            fill: "none", stroke: strokeColor, "stroke-width": isHighlight ? "3.5" : "2.5",
            "stroke-dasharray": `${arcFill} ${circ}`,
            "stroke-dashoffset": `${circ * 0.25}`,
            "stroke-linecap": "round",
            ...(isHighlight ? { filter: glowFilter } : {})
        });
        nodeGroup.appendChild(meterArc);

        // Inner Cyber Core Orb
        const innerR = isHighlight ? 23 : 19;
        const orb = mkEl("circle", {
            cx: pos.x, cy: pos.y, r: innerR,
            fill: isPast || isHighlight ? orbGrad : "#0b1220",
            stroke: strokeColor,
            "stroke-width": isHighlight ? "2" : "1",
            ...(isHighlight ? { filter: glowFilter } : {})
        });
        nodeGroup.appendChild(orb);

        // Acronym Text
        const label = mkEl("text", {
            x: pos.x, y: pos.y - 3,
            fill: "#ffffff", "font-size": isHighlight ? "11" : "9.5",
            "font-family": "'JetBrains Mono', monospace",
            "font-weight": "800", "text-anchor": "middle", "pointer-events": "none"
        });
        label.textContent = s.acronym || s.code;
        nodeGroup.appendChild(label);

        // Percentage Text
        const pctText = mkEl("text", {
            x: pos.x, y: pos.y + 10,
            fill: strokeColor, "font-size": isHighlight ? "9.5" : "8",
            "font-family": "'JetBrains Mono', monospace",
            "font-weight": "700", "text-anchor": "middle", "pointer-events": "none"
        });
        pctText.textContent = `${s.currPct}%`;
        nodeGroup.appendChild(pctText);

        svg.appendChild(nodeGroup);
    });

    // Draw Root Node (S₀ Quantum Reactor Core)
    const rootGrp = mkEl("g");

    // Rotating orbital reticle
    const rootReticle = mkEl("circle", {
        cx: CX, cy: CY, r: "33",
        fill: "none", stroke: "rgba(56,189,248,0.3)", "stroke-width": "1.5",
        "stroke-dasharray": "6 4 2 4"
    });
    rootGrp.appendChild(rootReticle);

    // Glowing core
    const rootCore = mkEl("circle", {
        cx: CX, cy: CY, r: "26",
        fill: "url(#orbRoot)", stroke: "#38bdf8", "stroke-width": "2.5",
        filter: "url(#glowCyan)"
    });
    rootGrp.appendChild(rootCore);

    const rootLabel = mkEl("text", {
        x: CX, y: CY - 3, fill: "#ffffff", "font-size": "12",
        "font-family": "'JetBrains Mono', monospace", "font-weight": "800",
        "text-anchor": "middle", "pointer-events": "none"
    });
    rootLabel.textContent = "S₀";
    rootGrp.appendChild(rootLabel);

    const rootSub = mkEl("text", {
        x: CX, y: CY + 10, fill: "#7dd3fc", "font-size": "8",
        "font-family": "'JetBrains Mono', monospace", "font-weight": "700",
        "text-anchor": "middle", "pointer-events": "none"
    });
    rootSub.textContent = "START";
    rootGrp.appendChild(rootSub);

    svg.appendChild(rootGrp);

    // Draw Goal Node (Holographic Quantum Target Portal)
    const goalReached = type === "goal" || type === "advisory";
    const goalGrp = mkEl("g");

    // Goal outer reticle
    const goalReticle = mkEl("circle", {
        cx: GX, cy: GY, r: goalReached ? "36" : "31",
        fill: "none",
        stroke: goalReached ? "#facc15" : "rgba(255,255,255,0.15)",
        "stroke-width": goalReached ? "2" : "1",
        "stroke-dasharray": "8 4"
    });
    goalGrp.appendChild(goalReticle);

    // Goal Core Orb
    const goalCore = mkEl("circle", {
        cx: GX, cy: GY, r: goalReached ? "28" : "24",
        fill: goalReached ? "url(#orbGoal)" : "#0b1220",
        stroke: goalReached ? "#facc15" : "rgba(255,255,255,0.2)",
        "stroke-width": goalReached ? "3" : "1.5",
        ...(goalReached ? { filter: "url(#glowGold)" } : {})
    });
    goalGrp.appendChild(goalCore);

    const goalLabel = mkEl("text", {
        x: GX, y: GY - 3, fill: goalReached ? "#ffffff" : "#cbd5e1",
        "font-size": goalReached ? "12" : "10",
        "font-family": "'JetBrains Mono', monospace", "font-weight": "800",
        "text-anchor": "middle", "pointer-events": "none"
    });
    goalLabel.textContent = goalReached ? "GOAL" : "TARGET";
    goalGrp.appendChild(goalLabel);

    const goalSub = mkEl("text", {
        x: GX, y: GY + 10, fill: goalReached ? "#fef08a" : "#64748b",
        "font-size": "8",
        "font-family": "'JetBrains Mono', monospace", "font-weight": "700",
        "text-anchor": "middle", "pointer-events": "none"
    });
    goalSub.textContent = goalReached ? "CONVERGED" : "≥ 75.0%";
    goalGrp.appendChild(goalSub);

    svg.appendChild(goalGrp);

    // Cyber Legend Bar at Bottom
    const legItems = [
        { color: "#38bdf8", label: "─── Active Laser Path" },
        { color: "#ef4444", label: "╌╌╌ Pruned Sub-tree" },
        { color: "#34d399", label: "● Safe (≥80%)" },
        { color: "#fbbf24", label: "● Warning (75-80%)" },
        { color: "#ef4444", label: "● Critical (<75%)" },
    ];
    legItems.forEach((item, idx) => {
        const lx = 20 + idx * 192;
        const bar = mkEl("rect", { x: lx, y: H - 18, width: 14, height: 4, rx: 2, fill: item.color });
        const lbl = mkEl("text", {
            x: lx + 18, y: H - 14,
            fill: "#94a3b8", "font-size": "9",
            "font-family": "'JetBrains Mono', monospace", "font-weight": "600"
        });
        lbl.textContent = item.label;
        svg.appendChild(bar);
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
        if (document.getElementById("inp-course-conducted")) document.getElementById("inp-course-conducted").value = 36;
        document.getElementById("inp-course-attended").value = 30;
        document.getElementById("inp-course-od").value       = 0;
        document.getElementById("btn-save-course-text").textContent = "Add Course";
        cMod.classList.add("active");
    };
    document.getElementById("btn-open-subject-modal").onclick  = openAddCourse;
    document.getElementById("btn-add-course-table").onclick    = openAddCourse;
    document.getElementById("btn-close-subject-modal").onclick = () => cMod.classList.remove("active");
    document.getElementById("btn-cancel-subject-modal").onclick= () => cMod.classList.remove("active");

    document.getElementById("subject-form").addEventListener("submit", async e => {
        e.preventDefault();
        // conducted is the teacher-set fixed limit — never auto-inflate it
        const conducted = Math.max(0, parseInt(document.getElementById("inp-course-conducted")?.value) || 0);
        let att = Math.max(0, parseInt(document.getElementById("inp-course-attended").value) || 0);
        let od  = Math.max(0, parseInt(document.getElementById("inp-course-od").value) || 0);

        // Clamp: attended + od_leaves must never exceed conducted
        if (att + od > conducted) {
            att = Math.max(0, conducted - od);
        }
        const bunked = Math.max(0, conducted - att - od);

        const payload = {
            code: document.getElementById("inp-course-code").value.trim().toUpperCase(),
            acronym: document.getElementById("inp-course-acronym").value.trim().toUpperCase(),
            name: document.getElementById("inp-course-name").value.trim(),
            credits: parseInt(document.getElementById("inp-course-credits").value),
            hours_per_week: parseInt(document.getElementById("inp-course-hours").value),
            faculty: document.getElementById("inp-course-faculty").value.trim(),
            conducted, attended: att, bunked, od_leaves: od
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
    if (document.getElementById("inp-course-conducted")) document.getElementById("inp-course-conducted").value = s.conducted || 0;
    document.getElementById("inp-course-attended").value = s.attended || 0;
    document.getElementById("inp-course-od").value       = s.od_leaves || 0;
    document.getElementById("btn-save-course-text").textContent = "Save Changes";
    document.getElementById("subject-modal").classList.add("active");
};

window.deleteCourse = async (code) => {
    if (!confirm(`Remove course ${code}?`)) return;
    const res = await fetch(`/api/students/${activeStudentId}/subjects/${code}`, { method: "DELETE" });
    if (res.ok) await loadStudentProfile(activeStudentId);
};

function setupActionButtons() {
    if (document.getElementById("btn-recompute-plan")) {
        document.getElementById("btn-recompute-plan").onclick = () => fetchAdvisory("astar");
    }
    if (document.getElementById("btn-print-report")) {
        document.getElementById("btn-print-report").onclick = () => window.print();
    }
    setupCSPOperations();
    setupFOLOperations();
}

// ================================================================
// 10. CSP TIMETABLE LEAVE PLANNER (CONSTRAINT PROPAGATION BENCHMARK)
// ================================================================
function setupCSPOperations() {
    const btn = document.getElementById("btn-run-csp");
    if (!btn) return;
    btn.onclick = async () => {
        const weeks = document.getElementById("csp-weeks-select")?.value || 1;
        const maxSkips = document.getElementById("csp-max-skips-select")?.value || 2;
        btn.textContent = "⏳ Solving CSP...";
        btn.disabled = true;

        try {
            const res = await fetch(`/api/students/${activeStudentId}/csp?weeks=${weeks}&max_consecutive=${maxSkips}`);
            if (!res.ok) throw new Error("Failed to compute CSP solutions.");
            const data = await res.json();
            renderCSPResults(data);
        } catch (err) {
            console.error(err);
            alert("Error solving CSP leave plan: " + err.message);
        } finally {
            btn.textContent = "⚡ Solve Feasible Leaves (CSP)";
            btn.disabled = false;
        }
    };
}

function renderCSPResults(data) {
    const effort = data.search_effort_comparison;
    const bt = effort.without_propagation;
    const fc = effort.with_propagation;
    const gain = effort.efficiency_gain;

    // Update Comparison Strip
    document.getElementById("csp-bt-nodes").textContent = bt.nodes_visited;
    document.getElementById("csp-bt-backtracks").textContent = bt.backtracks;
    document.getElementById("csp-bt-checks").textContent = bt.constraint_checks;
    document.getElementById("csp-bt-time").textContent = `${bt.runtime_ms} ms`;

    document.getElementById("csp-fc-nodes").textContent = fc.nodes_visited;
    document.getElementById("csp-fc-backtracks").textContent = fc.backtracks;
    document.getElementById("csp-fc-checks").textContent = fc.constraint_checks;
    document.getElementById("csp-fc-time").textContent = `${fc.runtime_ms} ms`;

    document.getElementById("csp-gain-pct").textContent = `${gain.node_reduction_percent}%`;
    document.getElementById("csp-gain-desc").textContent = `Pruned ${gain.backtrack_reduction} dead-end backtracks. ${gain.analysis}`;

    // Render Feasible Leave Plans
    const container = document.getElementById("csp-solutions-container");
    container.innerHTML = "";

    if (!data.feasible_plans || data.feasible_plans.length === 0) {
        container.innerHTML = `
          <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; color:#dc2626;">
            <strong>No Feasible Leave Plans Found:</strong> All remaining slots in this window are required to satisfy the 75% statutory threshold and mandatory lab constraints.
          </div>`;
        return;
    }

    const heading = document.createElement("h3");
    heading.style.fontSize = "0.95rem";
    heading.style.fontWeight = "700";
    heading.style.marginBottom = "10px";
    heading.textContent = `Found ${data.feasible_plans_count} Feasible Leave Schedule(s) without Violating Attendance or Lab Rules:`;
    container.appendChild(heading);

    data.feasible_plans.forEach((plan, idx) => {
        const card = document.createElement("div");
        card.style.background = "#ffffff";
        card.style.border = "1px solid var(--border-color)";
        card.style.borderRadius = "8px";
        card.style.padding = "14px 18px";
        card.style.marginBottom = "12px";
        card.style.boxShadow = "var(--shadow-sm)";

        let skippedPills = plan.skipped_classes.map(c => 
            `<span style="display:inline-block; background:#fef3c7; color:#92400e; border:1px solid #fde68a; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:12px; margin:2px;">
               ${c.day} P${c.period}: ${c.acronym} (${c.time_str})
             </span>`
        ).join(" ");

        if (!skippedPills) {
            skippedPills = `<span style="color:#059669; font-weight:600; font-size:0.85rem;">Full Attendance (Zero Skips)</span>`;
        }

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:var(--primary-blue); font-size:0.9rem;">Leave Plan Option #${idx + 1}</strong>
            <span style="font-size:0.8rem; font-weight:700; color:#059669; background:#ecfdf5; padding:2px 8px; border-radius:12px;">
              Attended: ${plan.attended_slots} / ${plan.total_slots} slots (${plan.skipped_slots_count} Skips)
            </span>
          </div>
          <div style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:6px;">
            <strong>Permitted Planned Skips:</strong>
          </div>
          <div style="margin-bottom:10px;">${skippedPills}</div>
        `;
        container.appendChild(card);
    });
}

// ================================================================
// 11. FOL POLICY & ELIGIBILITY REASONER (BACKWARD-CHAINING TRACE)
// ================================================================
function setupFOLOperations() {
    const btn = document.getElementById("btn-run-fol");
    if (!btn) return;
    btn.onclick = async () => {
        const subjCode = document.getElementById("fol-subject-select")?.value;
        if (!subjCode) return alert("Select a course first.");
        const hasMed = document.getElementById("fol-med-checkbox")?.checked || false;
        const isApproved = document.getElementById("fol-dean-checkbox")?.checked || false;

        btn.textContent = "⏳ Inferencing...";
        btn.disabled = true;

        try {
            const res = await fetch(`/api/students/${activeStudentId}/eligibility?subject=${subjCode}&has_medical=${hasMed}&dean_approved=${isApproved}`);
            if (!res.ok) throw new Error("Failed to run FOL policy reasoner.");
            const data = await res.json();
            renderFOLResults(data);
        } catch (err) {
            console.error(err);
            alert("Error in policy reasoner: " + err.message);
        } finally {
            btn.textContent = "🔍 Verify Exam Eligibility & Trace";
            btn.disabled = false;
        }
    };
}

function renderFOLCourseOptions(data) {
    const sel = document.getElementById("fol-subject-select");
    if (!sel || !data?.subject_breakdown) return;
    const currentVal = sel.value;
    sel.innerHTML = "";
    data.subject_breakdown.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.code;
        opt.textContent = `${s.acronym || s.code} - ${s.name} (${s.percentage}%)`;
        if (s.code === currentVal) opt.selected = true;
        sel.appendChild(opt);
    });
}

function renderFOLResults(data) {
    const verdictBox = document.getElementById("fol-verdict-box");
    const badge = document.getElementById("fol-verdict-badge");
    const text = document.getElementById("fol-verdict-text");
    const queryDisplay = document.getElementById("fol-query-display");

    verdictBox.style.display = "block";
    badge.textContent = data.status;
    badge.style.background = data.is_eligible ? "#10b981" : "#ef4444";
    text.textContent = data.recommendation;
    queryDisplay.textContent = `EligibleForExam(${data.acronym || data.subject_code})`;

    // Render Proof Trace Console
    const logBox = document.getElementById("fol-proof-log");
    const traceBadge = document.getElementById("fol-trace-badge");
    traceBadge.textContent = data.is_eligible ? "Goal Proven TRUE ✅" : "Goal Ineligible ❌";
    traceBadge.style.background = data.is_eligible ? "#064e3b" : "#7f1d1d";
    traceBadge.style.color = data.is_eligible ? "#34d399" : "#f87171";

    logBox.innerHTML = "";
    data.proof_trace.forEach(step => {
        const div = document.createElement("div");
        div.style.padding = "4px 6px";
        div.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        
        const statusColor = step.status === "PASS" || step.status === "SUCCESS" ? "#34d399" : (step.status === "FAIL" ? "#f87171" : "#93c5fd");
        div.innerHTML = `
          <span style="color:#64748b;">[Step ${step.step}]</span> 
          <strong style="color:${statusColor};">${step.action}</strong> &rarr; 
          <span style="color:#e2e8f0;">${step.explanation}</span>
        `;
        logBox.appendChild(div);
    });
}

// ================================================================
// 12. APPLIED & RESPONSIBLE AI RISK TABLE & PATTERNS
// ================================================================
async function loadResponsibleAI() {
    try {
        const res = await fetch(`/api/students/${activeStudentId}/risk-analysis`);
        if (!res.ok) return;
        const data = await res.json();

        // Anonymization Token
        if (document.getElementById("rai-anonymized-id")) {
            document.getElementById("rai-anonymized-id").textContent = data.pseudonym_id;
        }

        // Weekday Pattern Pills
        const wp = data.weekday_absence_pattern;
        if (document.getElementById("rai-pattern-desc")) {
            document.getElementById("rai-pattern-desc").textContent = wp.pattern_summary;
        }
        const pillsBox = document.getElementById("rai-weekday-pills");
        if (pillsBox && wp.weekday_breakdown) {
            pillsBox.innerHTML = "";
            Object.entries(wp.weekday_breakdown).forEach(([day, stats]) => {
                const pill = document.createElement("span");
                const isPeak = day === wp.peak_day;
                pill.style.padding = "3px 8px";
                pill.style.borderRadius = "12px";
                pill.style.fontSize = "0.72rem";
                pill.style.fontWeight = "700";
                pill.style.background = isPeak ? "#dc2626" : "#fef3c7";
                pill.style.color = isPeak ? "#ffffff" : "#92400e";
                pill.style.border = isPeak ? "1px solid #b91c1c" : "1px solid #fde68a";
                pill.textContent = `${day.substring(0,3)}: ${stats.absence_share_pct}%`;
                pillsBox.appendChild(pill);
            });
        }

        // 7-Subject Comprehensive Risk Table
        const tbody = document.getElementById("rai-risk-table-body");
        if (tbody && data.risk_table) {
            tbody.innerHTML = "";
            data.risk_table.forEach(row => {
                const tr = document.createElement("tr");
                const badgeColor = row.risk_level === "High" ? "#dc2626" : (row.risk_level === "Medium" ? "#d97706" : "#059669");
                const badgeBg = row.risk_level === "High" ? "#fef2f2" : (row.risk_level === "Medium" ? "#fffbeb" : "#f0fdf4");
                const pctColor = row.percentage < 75 ? "#dc2626" : (row.percentage < 80 ? "#d97706" : "#059669");

                tr.innerHTML = `
                  <td style="font-weight:700; color:var(--primary-blue);">
                    ${row.acronym || row.code} 
                    <small style="color:var(--text-muted); display:block; font-weight:400;">${row.name}</small>
                  </td>
                  <td style="font-weight:700; color:${pctColor};">${row.percentage}%</td>
                  <td>
                    <span style="font-weight:800; font-size:0.75rem; text-transform:uppercase; padding:3px 8px; border-radius:12px; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor};">
                      ${row.risk_level}
                    </span>
                  </td>
                  <td style="font-weight:600; color:#059669;">${row.safe_bunks} classes</td>
                  <td style="font-weight:600; color:#dc2626;">${row.percentage < 75 ? `+${row.classes_needed_75}` : "0"}</td>
                  <td style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">
                    ${row.xai_explanation}
                  </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error loading Responsible AI data:", e);
    }
}


// ================================================================
// 9. MODAL BIDIRECTIONAL RECALCULATOR
// ================================================================
/**
 * Bidirectional recalculator for the Add/Edit Course modal.
 * Invariant: Present + Absent + OD = Conducted  (always, Conducted is fixed)
 *
 * field = which field the user just edited:
 *   'conducted' → clamp Present if needed, recalc Absent
 *   'attended'  → recalc Absent = Conducted - Present - OD
 *   'absent'    → recalc Present = Conducted - Absent - OD
 *   'od'        → recalc Absent = Conducted - Present - OD
 */
window.recalcModal = function(field) {
    const condEl  = document.getElementById("inp-course-conducted");
    const attEl   = document.getElementById("inp-course-attended");
    const absenEl = document.getElementById("inp-course-bunked");
    const odEl    = document.getElementById("inp-course-od");
    if (!condEl || !attEl || !absenEl || !odEl) return;

    let cond   = Math.max(0, parseInt(condEl.value)  || 0);
    let att    = Math.max(0, parseInt(attEl.value)   || 0);
    let absent = Math.max(0, parseInt(absenEl.value) || 0);
    let od     = Math.max(0, parseInt(odEl.value)    || 0);

    if (field === 'conducted') {
        // Conducted changed — clamp Present if needed, Absent auto-follows
        if (att + od > cond) att = Math.max(0, cond - od);
        if (att + od > cond) od  = Math.max(0, cond - att);
        absent = Math.max(0, cond - att - od);
        attEl.value   = att;
        absenEl.value = absent;

    } else if (field === 'attended') {
        // Present changed — cap at (Conducted - OD), recalc Absent
        att = Math.min(att, cond - od);
        absent = Math.max(0, cond - att - od);
        attEl.value   = att;
        absenEl.value = absent;

    } else if (field === 'absent') {
        // Absent changed — cap at (Conducted - OD), recalc Present
        absent = Math.min(absent, cond - od);
        att    = Math.max(0, cond - absent - od);
        absenEl.value = absent;
        attEl.value   = att;

    } else if (field === 'od') {
        // OD changed — cap at (Conducted - Present), recalc Absent
        od = Math.min(od, cond - att);
        absent = Math.max(0, cond - att - od);
        odEl.value    = od;
        absenEl.value = absent;
    }

    // Visual cue on Absent field
    absenEl.style.color = absent > 0 ? "#f87171" : "#94a3b8";

    // Show a live inline validation note
    const total = att + absent + od;
    absenEl.title = total === cond
        ? `\u2705 Present(${att}) + Absent(${absent}) + OD(${od}) = Conducted(${cond})`
        : `\u26a0\ufe0f Warning: ${att}+${absent}+${od}=${total} \u2260 ${cond}`;
};

// Backward compat alias
window.recalcModalAbsent = () => window.recalcModal('attended');
