# Smart Attendance Advisor System 🎓

> **AI-Driven Academic Attendance Planner & Search Algorithm Visualizer**  
> Department of CSE – Artificial Intelligence & Machine Learning  
> Year II / Sem III / Sec A · Hall J202 · VEL TECH HIGH TECH  Chennai

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org)
[![Tests](https://img.shields.io/badge/Tests-10%2F10%20Passing-brightgreen)](run_tests.py)
[![Algorithms](https://img.shields.io/badge/Algorithms-A*%20%7C%20Greedy%20%7C%20UCS-blueviolet)](src/astar_planner.py)
[![UI](https://img.shields.io/badge/UI-Interactive%20Command%20Center-success)](web/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📌 Project Overview

The **Smart Attendance Advisor System** is a real-time academic planning platform and algorithm simulation engine engineered to compute the optimal, minimal-strain attendance recovery plan for university students. It guarantees $\geq 75\%$ statutory attendance across all enrolled courses before the end of the semester while balancing academic difficulty and workload constraints.

The platform provides a dual-interface experience:
1. **Attendance Command Center**: An interactive dashboard with real-time numeric steppers, automatic status badges, buffer/deficit calculations, and dynamic mini-stats.
2. **Live AI Algorithm Visualizer**: A game-like, animated state-space graph with HUD metrics and a live execution terminal showing search progression across **A\* Search**, **Greedy Best-First**, and **Uniform Cost Search (UCS)**.

---

## ✨ Key Features & Web Interface

| Feature | Description |
|---|---|
| 🎛️ **Attendance Command Center** | Real-time `+` / `-` pill steppers for Attended, Bunked, and OD classes with instant recalculation. |
| 🔀 **Multi-Algorithm Switcher** | Hot-swap seamlessly between **A\* Search**, **Greedy BFS**, and **UCS** with synced global controls. |
| 🎮 **Interactive State-Space Graph** | Animated SVG visualization showing nodes, status rings, optimal trajectories, and pruned ghost paths. |
| 📊 **Real-Time HUD Strip** | Instant tracking of $g(n)$ path cost, $h(n)$ heuristic estimate, $f(n)$ total evaluation, and active priority queue size. |
| 🖥️ **Live Terminal Trace** | Color-coded execution console streaming `[INIT]`, `[EXPAND]`, `[PRUNE]`, `[SELECT]`, and `[GOAL]` steps. |
| 🧮 **Validated Academic Math** | Verified formulas for safe bunks allowance and consecutive deficit recovery classes. |
| 👥 **Multi-Student Roster** | Dynamic profile switcher supporting persistent per-student course rosters and histories. |
| 📚 **Official Curriculum** | Pre-configured with the exact 7-course CSE (AI & ML) Semester III curriculum. |
| 🔬 **Empirical Benchmarks** | Built-in CLI and automated comparative analysis measuring runtime, optimality, and node expansions. |

---

## 🧠 Algorithmic Foundation

### 1. Problem Formulation
- **State** $S_k = (a_1, a_2, \dots, a_k)$ represents the attendance allocation decided for the first $k$ subjects.
- **Action** = Allocate $m$ future classes to subject $k+1$, where $m \in [\text{min\_required}_{k+1}, \text{remaining\_classes}_{k+1}]$.
- **Goal Condition** = Every subject satisfies $\text{percentage}_i \geq 75.0\%$ before semester week 15.

### 2. Objective & Cost Functions

$$f(n) = g(n) + h(n)$$

#### Path Cost $g(n)$ (Cumulative Academic Strain)
$$g(n) = \sum_{i=1}^{k} \text{alloc}_i \cdot \text{difficulty}_i \cdot w_{\text{workload}} \cdot \frac{C_i}{3} \cdot \left(1 + 0.02 \cdot \text{alloc}_i\right)$$

#### Heuristic Function $h(n)$ (Future Minimum Effort Lower Bound)
$$h(n) = \sum_{i=k+1}^{K} \text{min\_req}_i \cdot \text{difficulty}_i \cdot \frac{C_i}{3}$$

where $C_i$ is course credit weight, $\text{difficulty}_i \in [0, 1]$, and $K$ is total subject count.

- **Admissibility**: $h(n) \leq h^*(n)$ — $h(n)$ represents the bare-minimum linear attendance effort without non-linear strain penalties, strictly underestimating or equaling true cost.
- **Monotonicity (Consistency)**: $h(n) \leq c(n, a, n') + h(n')$ — ensures optimal path finding without reopening closed nodes.

### 3. Immediate Attendance Mathematics

| Metric | Condition | Mathematical Formulation |
|---|---|---|
| **Safe Bunks Allowed** | $\text{Current } \% \geq 75\%$ | $\left\lfloor \dfrac{(\text{Attended} + \text{OD}) - 0.75 \times \text{Conducted}}{0.75} \right\rfloor$ |
| **Consecutive Recovery Needed** | $\text{Current } \% < 75\%$ | $\left\lceil \dfrac{0.75 \times \text{Conducted} - (\text{Attended} + \text{OD})}{0.25} \right\rceil$ |

---

## 🔬 Algorithm Comparison & Benchmarks

The system provides three comparative search engines accessible via the UI and REST API:

```
+-------------------------------------------------------------------------------+
| Algorithm                | Evaluation f(n)   | Optimality | Search Strategy   |
+--------------------------+-------------------+------------+-------------------+
| A* Search                | f(n) = g(n) + h(n)| Guaranteed | Guided & Optimal  |
| Greedy Best-First (BFS)  | f(n) = h(n)       | Suboptimal | Fast Heuristic Rush|
| Uniform Cost Search (UCS)| f(n) = g(n)       | Guaranteed | Exhaustive Search |
+-------------------------------------------------------------------------------+
```

### Empirical Performance Benchmark

| Search Strategy | Nodes Expanded | Typical Latency | Optimality Guarantee | Memory Profile |
|---|---|---|---|---|
| **A\* Search** | ~3,909 | ~260 ms | ✅ **Guaranteed Optimal** | Moderate ($\mathcal{O}(b^d)$ pruned) |
| **Greedy BFS** | ~8 | ~0.6 ms | ❌ Suboptimal | Minimal |
| **Uniform Cost Search** | ~48,767 | ~1,600 ms | ✅ **Guaranteed Optimal** | High (Exhaustive Frontier) |

---

## 📁 Repository Structure

```
Smart Attendance advisor system/
├── src/
│   ├── app.py              # Unified CLI launcher (--web, --benchmark, --plots)
│   ├── server.py           # Lightweight REST API backend
│   ├── astar_planner.py    # A* Search Engine with admissible heuristics
│   ├── baseline_search.py  # Greedy Best-First & UCS baseline solvers
│   ├── risk_analyzer.py    # Risk tier evaluation & what-if projections
│   ├── data_store.py       # JSON file persistence layer
│   ├── data_generator.py   # Deterministic student record generator
│   ├── config.py           # Semester schedule & course catalog definitions
│   └── models.py           # Core Dataclasses (Subject, StudentProfile, SearchNode)
├── web/
│   ├── index.html          # Responsive single-page dashboard
│   ├── styles.css          # Design system & dark-theme visualizer styles
│   └── app.js              # State manager, live SVG renderer & stepper engine
├── tests/
│   ├── test_attendance_math.py   # Math unit tests (safe bunks, deficit recovery)
│   ├── test_astar_planner.py     # Search algorithm optimality & path tests
│   └── test_risk_analyzer.py     # Risk categorization & what-if tests
├── docs/
│   ├── report.md           # Detailed technical report & complexity proofs
│   └── plots/              # Benchmark charts & attendance distribution plots
├── data/
│   └── students.json       # Live persistent student records
├── push_to_github.py       # Automated Git REST API deployment utility
├── run_tests.py            # Automated test runner
├── run_web.bat             # Windows one-click web launcher
├── run_tests.bat           # Windows one-click test launcher
├── run_benchmark.bat       # Windows one-click benchmark runner
├── requirements.txt        # Minimal dependencies
└── README.md               # Project documentation
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- Python 3.10+ installed
- Modern web browser (Chrome, Edge, Firefox, Safari)

### 2. Installation
Clone the repository and install optional visualization dependencies:
```bash
git clone https://github.com/Ashwinkumar07/smart-attendance-advisor.git
cd smart-attendance-advisor
pip install -r requirements.txt
```

### 3. Launch Web Dashboard
Start the local server:
```bash
python src/app.py --web
```
Navigate to **`http://localhost:8000`** in your browser.

### 4. Run Automated Test Suite
Execute the test runner to verify math and search mechanics:
```bash
python run_tests.py
```
*Expected Result:* `10/10 tests passed (100% success rate)`.

### 5. Run CLI Benchmark & Export Plots
```bash
python src/app.py --benchmark --plots
```

---

## 📋 CSE AI&ML Semester III Course Catalog

The advisor is pre-configured with the official curriculum specifications:

| Code | Course Name | Acronym | Credits | Hours/Week | Difficulty Factor |
|---|---|---|---|---|---|
| `25MA05IT` | Linear Algebra for Data Science | LADS | 4 | 5 | 0.85 |
| `25ML35T`  | Foundations of Artificial Intelligence | FAI | 3 | 4 | 0.80 |
| `25HML34T` | Data Structures using Python | DSP | 3 | 4 | 0.75 |
| `25HCS32T` | Object Oriented Programming using Java | OOPS | 3 | 4 | 0.75 |
| `25ML33IT` | Introduction to Data Science | IDS | 4 | 4 | 0.70 |
| `25HCS37P` | OOP Java Laboratory | OOPSL | 2 | 4 | 0.60 |
| `25HML38P` | Data Structures Python Laboratory | DSPL | 2 | 4 | 0.60 |

---

## 🔌 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/students` | `GET` | List all registered students |
| `/api/students/<id>` | `GET` | Retrieve student profile and full attendance breakdown |
| `/api/students/<id>/solve?algorithm=astar\|greedy\|ucs` | `GET` | Compute optimal recovery plan with specified algorithm |
| `/api/students/<id>/simulate?bunks={}&attended={}` | `GET` | Evaluate what-if scenario on future attendance |
| `/api/students/<id>/subjects` | `POST` | Update attendance counts for a specific course |
| `/api/students` | `POST` | Register a new student profile |

---

## 📜 References & Literature

- **Russell, S., & Norvig, P. (2020)**. *Artificial Intelligence: A Modern Approach* (4th ed.). Pearson. (Chapter 3: Solving Problems by Searching).
- **Hart, P. E., Nilsson, N. J., & Raphael, B. (1968)**. *A Formal Basis for the Heuristic Determination of Minimum Cost Paths*. IEEE Transactions on Systems Science and Cybernetics, 4(2), 100–107.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

> **Author**: R Ashwin kumar · Reg No: `113025148009` · Student ID: `VH15227`
> Department of CSE (AI & ML), VEL TECH HIGH TECH Chennai · Semester III (2026–2027)
