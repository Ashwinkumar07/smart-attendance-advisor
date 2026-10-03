# Smart Attendance Advisor System: AI-Driven Attendance Recovery & Risk Optimization
**Author**: Student VH15227 | **Register Number**: `113025148009`  
**Course**: Artificial Intelligence & Intelligent Systems  
**Repository**: `Smart-Attendance-Advisor-System` | **Release Version**: `v1.0`

---

## 1. Problem Formulation

Under university academic regulations, students must maintain a minimum statutory attendance threshold of $\tau = 75\%$ in every registered course to avoid semester detention. When mid-semester deficits arise due to illnesses or extracurriculars, students face a multi-objective constraint problem: **Which classes must be attended over the remaining semester to clear the threshold while minimizing academic cognitive fatigue and schedule strain?**

We formulate the Attendance Recovery Problem as a **State-Space Heuristic Search**:

### A. State Space ($S$)
A state $s \in S$ is represented by the allocation vector of classes planned to be attended across all $K$ registered courses:
$$s = \big( a_1, a_2, \dots, a_K \big), \quad \text{where } a_i \in [0, R_i]$$
* $A_i$: Classes attended to date in subject $i$.
* $T_i$: Classes conducted to date in subject $i$.
* $R_i$: Remaining scheduled classes in subject $i$.
* $a_i$: Additional future classes allocated to be attended.

### B. Action Space ($A$)
At search depth $i$ (corresponding to subject $i$), an action consists of choosing the number of future sessions $a_i$ to attend from the viable domain:
$$a_i \in \big[ \text{MinRequired}_i, \min(R_i, \text{MinRequired}_i + \text{SafeBuffer}) \big]$$

### C. Goal Test
A state $s$ satisfies the goal test if and only if every subject $i \in \{1, \dots, K\}$ achieves the target threshold:
$$\forall i \in \{1, \dots, K\}: \quad \frac{A_i + a_i}{T_i + R_i} \times 100 \ge \tau \quad (\text{or } a_i = R_i \text{ if mathematically irrecoverable})$$

### D. Step & Path Cost Function $g(n)$
Attending difficult courses with high credit weight incurs higher cognitive fatigue. The cost function models both subject difficulty $D_i \in (0, 1]$, credit weighting $C_i$, and non-linear cumulative fatigue:
$$g(n) = \sum_{j=1}^d a_j \times D_j \times \left(\frac{C_j}{3}\right) \times \big(1 + 0.02 \cdot a_j\big)$$

---

## 2. Approach & Algorithm Design

```mermaid
flowchart LR
    A[Student Attendance State] --> B{A* Search Engine}
    B -->|g(n): Workload Cost| C[f(n) = g(n) + h(n)]
    B -->|h(n): Admissible Lower Bound| C
    C --> D[Optimal Minimal-Strain Attendance Schedule]
    D --> E[Interactive 3D Dashboard & Risk Alerts]
```

### Heuristic Function $h(n)$ (Admissible & Consistent)
To guide the $A^*$ search efficiently towards the lowest-cost recovery path, we design an admissible heuristic function $h(n)$ representing the theoretical lower-bound cost for all remaining unassigned subjects from depth $d+1$ to $K$:
$$h(n) = \sum_{j=d+1}^K \text{MinRequired}_j \times D_j \times \left(\frac{C_j}{3}\right)$$

#### Proof of Admissibility:
1. For any unallocated subject $j$, the true remaining cost $h^*(n)$ includes non-linear fatigue penalties ($\ge 1.0$) and potential additional buffer classes ($a_j \ge \text{MinRequired}_j$).
2. Since $h(n)$ assumes zero fatigue multiplier ($1.0$) and strictly evaluates $\text{MinRequired}_j$, $h(n) \le h^*(n)$ for all states $n$.
3. Thus, $h(n)$ is **strictly admissible and monotonic (consistent)**, guaranteeing that $A^*$ returns an **optimal solution**.

---

## 3. Complexity Analysis

| Metric | Uniform Cost Search (UCS) | Greedy Best-First Search | $A^*$ Heuristic Search |
| :--- | :--- | :--- | :--- |
| **Time Complexity** | $O(b^{C^*/\epsilon})$ | $O(b^m)$ | $O(b^{d})$ (Pruned by $h(n)$) |
| **Space Complexity** | $O(b^{C^*/\epsilon})$ | $O(b \cdot m)$ | $O(b^d)$ |
| **Optimality** | Guaranteed | Suboptimal | **Guaranteed Optimal** |
| **Completeness** | Complete | Incomplete on loops | **Complete** |

* $K = 6$ subjects, branching factor $b \approx 7$, maximum depth $d = 6$.
* State space size $|S| \le 7^6 = 117,649$. With $A^*$ heuristic pruning, the search converges within **$< 600$ node expansions** in under **25 milliseconds**.

---

## 4. Experimental Results & Benchmarking

Deterministic benchmark evaluation was executed with Seed `113025148009` across three search paradigms on a mid-semester deficit scenario (CS301 & CS305 below 65%):

### Empirical Comparison Table

| Algorithm | Feasible Plan Found | Nodes Expanded | Runtime (ms) | Total Effort Cost $g$ | Optimality |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **A\* Search (Optimal)** | **Yes** | **567** | **24.41 ms** | **205.85** | **Optimal** |
| **Greedy Best-First** | **Yes** | **7** | **0.41 ms** | 205.85 | Heuristic-driven |
| **Uniform Cost Search** | **Yes** | **1215** | **26.09 ms** | **205.85** | **Optimal** |

### Visual Results
* **Subject Attendance Audit**:
  ![Subject Attendance](plots/subject_attendance.png)
* **Search Benchmark Comparison**:
  ![Algorithm Benchmark](plots/algorithm_benchmark.png)

### Key Observations:
1. **$A^*$ Search vs. UCS**: $A^*$ achieved identical optimal cost ($205.85$) while expanding **$53.3\%$ fewer nodes** ($567$ vs. $1215$) than unguided Uniform Cost Search.
2. **Deficit Recovery**: The advisor identified that the student must attend $22/24$ sessions in CS301 (AI) and CS305 (Algorithms) while safely leveraging 8 buffer sessions in elective courses.

---

---

## 5. Final Project Extension: Policy-Aware Eligibility Reasoner

### A. CSP Layer: Timetable Slot Leave Planner & Constraint Propagation
- **Variables**: $X_{s,t} \in \{0, 1\}$ representing each future timetable slot $t$ for subject $s$ ($1 = \text{Attend}, 0 = \text{Skip}$).
- **Constraints**:
  1. **Statutory Cutoff**: $\forall s, \ \text{Attendance}_s \ge 75.0\%$
  2. **Mandatory Lab Sessions**: $\forall s \in \text{Labs}, \forall t, \ X_{s,t} = 1$
  3. **Consecutive Miss Constraint**: No more than $k$ consecutive misses across the scheduled sequence.
- **Constraint Propagation (Forward Checking / AC-3)**:
  - Prunes domain values ($D_i = \{1\}$) immediately upon detecting dead-end assignments.
  - Generates an empirical comparison measuring search effort (nodes visited and backtracks) with vs. without propagation.

### B. Knowledge & Reasoning Layer: First-Order Logic Proof Trace
- **First-Order Horn Clauses**:
  - $\forall s,d \ (\text{OnDuty}(s,d) \land \text{VerifiedOD}(s,d) \rightarrow \text{Present}(s,d))$
  - $\text{Attendance}(s) \ge 75.0\% \rightarrow \text{StatutoryEligible}(s)$
  - $65.0\% \le \text{Attendance}(s) < 75.0\% \land \text{MedicalCertificateVerified}(s) \rightarrow \text{CondonationEligible}(s)$
  - $\text{CondonationEligible}(s) \land \text{DeanApprovalGranted}(s) \rightarrow \text{ApprovedCondonation}(s)$
  - $\text{IsLab}(s) \land \text{LabAttendance}(s) \ge 80.0\% \rightarrow \text{LabCompliant}(s)$
  - $\text{IsTheory}(s) \land (\text{StatutoryEligible}(s) \lor \text{ApprovedCondonation}(s)) \rightarrow \text{EligibleForExam}(s)$
  - $\text{IsLab}(s) \land \text{LabCompliant}(s) \land (\text{StatutoryEligible}(s) \lor \text{ApprovedCondonation}(s)) \rightarrow \text{EligibleForExam}(s)$
- **Backward-Chaining Proof Engine**: Resolves subgoals from `EligibleForExam(s)` downwards, emitting a structured, human-readable proof trace tree.

### C. Applied & Responsible AI Layer
- **Weekday Absence Pattern Mining**: Evaluates historical absence rates across Monday–Friday to identify temporal fatigue vulnerabilities.
- **Explainable AI (XAI)**: Generates natural-language rationales for every subject recommendation.
- **7-Subject Risk Matrix**: Evaluates all enrolled subjects under Low, Medium, and High risk classifications.
- **Ethical Safeguards & Anonymization**: Privacy-preserving pseudonymization (`STU_XXXXX`) with an explicit Responsible AI notice ensuring the system serves as an emergency academic planning tool rather than an absenteeism optimizer.

---

## 6. Verification & Automated Test Suite

Validated by **18 automated unit tests** (`run_tests.py`):
- `test_attendance_math.py`: 5 tests (safe bunks, deficit recovery, OD credits).
- `test_astar_planner.py`: 3 tests (A* search optimality, UCS benchmark, Greedy comparison).
- `test_risk_analyzer.py`: 2 tests (risk tiers, what-if simulator).
- `test_csp_planner.py`: 3 tests (CSP leave plans, mandatory lab constraints, propagation metrics).
- `test_policy_reasoner.py`: 2 tests (direct statutory eligibility, medical condonation proof trace).
- `test_responsible_ai.py`: 3 tests (data anonymization, weekday pattern analysis, 7-subject risk matrix).

```
Ran 18 tests in 1.746s
OK (100% Success Rate)
```

---

## 7. Academic Honesty Declaration

*All core search algorithms, CSP constraint solvers, First-Order Logic inference engines, responsible AI risk models, and web visualizers were designed, implemented, and verified specifically for this project seeded with Register Number `113025148009` and Student ID `VH15227`.*

