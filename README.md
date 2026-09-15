# Smart Attendance Advisor System 🎓

> **A* Heuristic Search-Based Academic Attendance Planner**  
> Department of CSE – Artificial Intelligence & Machine Learning  
> Year II / Sem III / Sec A · Hall J202 · VIT Chennai

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org)
[![Tests](https://img.shields.io/badge/Tests-10%2F10%20Passing-brightgreen)](run_tests.py)
[![Algorithm](https://img.shields.io/badge/Algorithm-A*%20Heuristic%20Search-blueviolet)](src/astar_planner.py)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📌 What This Project Does

A **real-time, multi-student academic attendance advisor** powered by the **A\* Heuristic Search algorithm**.  
It computes the optimal minimal-strain attendance recovery plan to guarantee ≥ 75% attendance in every subject before the end of semester — satisfying the statutory university detention cutoff.

### Core Features

| Feature | Description |
|---|---|
| 🤖 **A\* Search Engine** | Optimal, admissible heuristic search across all 7 subjects simultaneously |
| 📊 **Live Attendance Tracking** | Real-time `+` / `-` steppers for Attended, Bunked, and OD per course |
| 🎮 **Live Algorithm Visualizer** | Animated SVG state-space graph showing exactly how A\* expands, prunes, and finds the optimal path |
| 🖥️ **Terminal Trace Log** | Real-time coloured execution trace: `[EXPAND]`, `[PRUNE]`, `[SELECT]`, `[GOAL]`, `[ADVISORY]` |
| 🧮 **Correct Math** | Immediate safe-bunk allowance and deficit recovery formulas verified by unit tests |
| 👥 **Multi-Student Roster** | Register multiple students with individual attendance histories |
| 🗓️ **Official Timetable** | Exact CSE AI&ML Sem III curriculum (7 courses, real faculty, real credits) |
| 🔬 **Search Benchmarks** | Empirical A\* vs Greedy Best-First vs UCS comparison chart |
| 💾 **Persistent Storage** | JSON file-backed data store — no database required |

---

## 🧠 Algorithm: A\* Heuristic Search

### Problem Formulation

- **State** $S_i$ = $(att_1, att_2, \ldots, att_k)$ — allocated attendance for subjects $1 \ldots i$
- **Action** = Allocate $m$ classes to subject $i+1$ where $m \geq \text{min\_required}$
- **Goal State** = All subjects reach $\geq 75\%$ attendance before end of semester

### Cost Function

$$f(n) = g(n) + h(n)$$

$$g(n) = \sum_{i=1}^{k} \text{alloc}_i \cdot \text{difficulty}_i \cdot w_\text{workload} \cdot \frac{C_i}{3} \cdot \left(1 + 0.02 \cdot \text{alloc}_i\right)$$

$$h(n) = \sum_{i=k+1}^{K} \text{min\_req}_i \cdot \text{difficulty}_i \cdot \frac{C_i}{3}$$

where $C_i$ = credits of subject $i$ and $K$ = total number of subjects.

**Admissibility**: $h(n)$ never overestimates the true remaining cost (always a lower bound).  
**Consistency**: $h(n) \leq \text{step\_cost}(n, n') + h(n')$ — monotone non-increasing along any path.

### Immediate Buffer / Deficit Formulas

| Situation | Formula |
|---|---|
| **Safe Zone** ($\geq 75\%$) — How many classes can I skip? | $\left\lfloor \dfrac{\text{Attended + OD} - 0.75 \times \text{Conducted}}{0.75} \right\rfloor$ |
| **Deficit** ($< 75\%$) — How many must I attend consecutively? | $\left\lceil \dfrac{0.75 \times \text{Conducted} - (\text{Attended + OD})}{0.25} \right\rceil$ |

---

## 🗂️ Project Structure

```
Smart Attendance advisor system/
├── src/
│   ├── app.py              # CLI entry point (--web, --benchmark, --plots)
│   ├── server.py           # HTTP REST API server
│   ├── astar_planner.py    # A* Heuristic Search engine
│   ├── baseline_search.py  # Greedy Best-First & UCS baselines
│   ├── risk_analyzer.py    # Risk tier classification & what-if simulator
│   ├── data_store.py       # Persistent JSON student/course storage
│   ├── data_generator.py   # Deterministic profile generator (seeded by Reg No)
│   ├── config.py           # Official CSE AI&ML Sem III timetable & courses
│   └── models.py           # Dataclasses: Subject, StudentProfile, SearchNode
├── web/
│   ├── index.html          # Main dashboard UI
│   ├── styles.css          # Clean enterprise styles
│   └── app.js              # Live A* workflow visualizer + stepper logic
├── tests/
│   ├── test_attendance_math.py   # 5 unit tests for math formulas
│   ├── test_astar_planner.py     # 3 unit tests for A* search
│   └── test_risk_analyzer.py     # 2 unit tests for risk analyzer
├── docs/
│   ├── report.md           # Academic report & algorithm analysis
│   └── plots/              # Generated benchmark & attendance charts
├── data/                   # Auto-created: students.json persistence
├── run_tests.py            # Test runner
├── requirements.txt        # Python dependencies
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+ (no special packages needed — stdlib only for core)
- `matplotlib` only needed for `--plots` mode

```bash
pip install -r requirements.txt
```

### 2. Run the Web Dashboard

```bash
python "src/app.py" --web
```

Open **http://localhost:8000** in your browser.

### 3. Run Tests

```bash
python run_tests.py
```

Expected output:
```
Ran 10 tests in ~1.8s
OK
```

### 4. Run Benchmark & Generate Plots

```bash
python "src/app.py" --benchmark --plots
```

---

## 🎮 Live A\* Workflow Visualizer

Below the attendance table, a **dark-theme interactive panel** shows:

- **SVG State-Space Graph** — animated nodes for each subject with colour-coded status (🟢 Safe · 🟡 Warning · 🔴 Critical)
- **Flowing blue edges** = optimal path chosen by A\*
- **Faint red dashed branches** = suboptimal branches pruned by A\*
- **HUD Strip** showing live $g(n)$, $h(n)$, $f(n)$, and frontier queue size
- **Terminal Trace Log** — real-time `[EXPAND]`, `[PRUNE]`, `[SELECT]`, `[GOAL]` logs

### Controls

| Button | Action |
|---|---|
| ▶ Run Live Simulation | Animated replay at 480ms/step |
| ⏭ Step Forward | Manual step-through |
| ⚡ Instant Path | Show final optimal path immediately |
| 🔄 Reset | Clear and restart |

> Updates **automatically** every time you adjust any attendance counter.

---

## 📋 Official CSE AI&ML Sem III Curriculum

| Code | Course | Acronym | L-T-P-C | Hrs/Wk | Faculty |
|---|---|---|---|---|---|
| 25MA05IT | Linear Algebra for Data science | LADS | 3-0-1-4 | 5 | Dr. Siva Kumar T., AP/Maths |
| 25ML35T | Foundations of Artificial Intelligence | FAI | 3-0-0-3 | 4 | Dr. Manoj Kumar D S, ASP |
| 25HML34T | Data Structures using Python | DSP | 3-0-0-3 | 4 | Mrs. J Mary Hanna Priyadharshini, AP |
| 25HCS32T | Object Oriented Programming using Java | OOPS | 3-0-0-3 | 4 | Mrs. Noorul Julaiha A G, AP |
| 25ML33IT | Introduction to Data Science | IDS | 3-0-1-4 | 4 | Mrs. J Mary Hanna Priyadharshini, AP |
| 25HCS37P | OOP using Java Laboratory | OOPSL | 0-0-4-2 | 4 | Mr. P Lokesh & Mrs. S. Kavitha Rani |
| 25HML38P | Data Structures Python Laboratory | DSPL | 0-0-4-2 | 4 | Mrs. J Mary Hanna Priyadharshini & Mr. Sanjay Raj R |

---

## 🔬 Benchmark Results (A\* vs Greedy vs UCS)

| Algorithm | Nodes Expanded | Runtime | Optimality |
|---|---|---|---|
| **A\* Heuristic Search** | ~3,909 | ~262 ms | ✅ Guaranteed Optimal |
| Greedy Best-First | ~8 | ~0.6 ms | ❌ Not Guaranteed |
| Uniform Cost Search | ~48,767 | ~1,608 ms | ✅ Optimal but Expensive |

---

## 🛡️ Academic Integrity

- **Randomness seed**: `113025148009` (Register Number) — ensures reproducible, unique output
- **Per-student parameter**: Student ID `VH15227`, Sem III Section A
- All code understood and independently written. Sources cited where applicable.
- AI assistants consulted for scaffolding; all logic independently verified.

---

## 📎 Citations

- Russell, S. & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach* (4th ed.) — A\* Search, Chapter 3
- Hart, P. E., Nilsson, N. J., & Raphael, B. (1968). *A Formal Basis for the Heuristic Determination of Minimum Cost Paths* — IEEE Transactions on Systems Science and Cybernetics

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

> **Author**: Aswin · Reg No: 113025148009 · VH15227  
> Department of CSE (AI&ML), VIT Chennai · Academic Year 2026–2027, Odd Semester
