"""
CSP Timetable Leave Planner and Constraint Propagation Engine.
Models each future class as a Boolean variable (1 = Attend, 0 = Skip) with:
  1. Per-subject attendance threshold constraint (>= 75%)
  2. Mandatory lab attendance constraint (Labs cannot be skipped)
  3. Maximum k consecutive absences constraint
Implements both standard Backtracking and Backtracking + Forward Checking / AC-3 Constraint Propagation,
measuring and comparing search effort (nodes visited, backtracks, checks).
"""

from typing import Dict, List, Tuple, Any, Optional
import time
import copy
from src.models import StudentProfile
from src.config import OFFICIAL_COURSES, OFFICIAL_WEEKLY_SCHEDULE, TIMETABLE_PERIODS


class CSPClassSlot:
    """Represents a specific timetable class slot variable in the planning window."""
    def __init__(self, slot_id: int, day: str, period: int, time_str: str, subject_code: str, acronym: str, is_lab: bool):
        self.slot_id = slot_id
        self.day = day
        self.period = period
        self.time_str = time_str
        self.subject_code = subject_code
        self.acronym = acronym
        self.is_lab = is_lab

    def to_dict(self) -> Dict[str, Any]:
        return {
            "slot_id": self.slot_id,
            "day": self.day,
            "period": self.period,
            "time_str": self.time_str,
            "subject_code": self.subject_code,
            "acronym": self.acronym,
            "is_lab": self.is_lab
        }


class CSPLeavePlanner:
    """
    Formulates and solves the leave planning problem as a Constraint Satisfaction Problem.
    """
    def __init__(self, profile: StudentProfile, planning_weeks: int = 1, max_consecutive_skips: int = 2, threshold: float = 75.0):
        self.profile = profile
        self.planning_weeks = max(1, planning_weeks)
        self.max_consecutive_skips = max(1, max_consecutive_skips)
        self.threshold = threshold / 100.0  # 0.75

        self.subject_map = {c["acronym"]: c["code"] for c in OFFICIAL_COURSES}
        self.code_to_course = {c["code"]: c for c in OFFICIAL_COURSES}

        # Build timetable slot sequence
        self.slots = self._build_slot_sequence()

        # Subject counts in this window
        self.subject_slots: Dict[str, List[int]] = {}
        for slot in self.slots:
            if slot.subject_code not in self.subject_slots:
                self.subject_slots[slot.subject_code] = []
            self.subject_slots[slot.subject_code].append(slot.slot_id)

    def _build_slot_sequence(self) -> List[CSPClassSlot]:
        slots = []
        slot_id = 0
        days = ["MON", "TUE", "WED", "THURS", "FRI"]

        for w in range(self.planning_weeks):
            for day in days:
                periods = OFFICIAL_WEEKLY_SCHEDULE.get(day, [])
                for p_idx, subject_raw in enumerate(periods):
                    acronym = subject_raw.split(" / ")[0].strip()
                    code = self.subject_map.get(acronym)
                    if not code:
                        continue
                    course = self.code_to_course.get(code, {})
                    is_lab = course.get("type") == "Practical" or "Lab" in course.get("name", "") or acronym.endswith("L")
                    time_str = TIMETABLE_PERIODS[p_idx]["time"] if p_idx < len(TIMETABLE_PERIODS) else f"Period {p_idx+1}"
                    slots.append(CSPClassSlot(slot_id, f"{day} (W{w+1})", p_idx + 1, time_str, code, acronym, is_lab))
                    slot_id += 1
        return slots

    def solve_comparison(self, max_solutions: int = 5) -> Dict[str, Any]:
        """
        Runs both Backtracking (without propagation) and Backtracking + Forward Checking (with propagation),
        comparing search effort metrics.
        """
        # 1. Backtracking without constraint propagation
        bt_metrics = {"nodes_visited": 0, "backtracks": 0, "constraint_checks": 0}
        t0 = time.perf_counter()
        bt_solutions = self._solve_pure_backtracking(0, {}, bt_metrics, max_solutions)
        t_bt = (time.perf_counter() - t0) * 1000.0

        # 2. Backtracking WITH Forward Checking & Constraint Propagation
        fc_metrics = {"nodes_visited": 0, "backtracks": 0, "constraint_checks": 0}
        initial_domains = {s.slot_id: ([1] if s.is_lab else [0, 1]) for s in self.slots}
        t1 = time.perf_counter()
        fc_solutions = self._solve_with_forward_checking(0, {}, initial_domains, fc_metrics, max_solutions)
        t_fc = (time.perf_counter() - t1) * 1000.0

        # Format feasible leave plans
        formatted_plans = []
        for sol in fc_solutions:
            skipped_slots = [self.slots[i].to_dict() for i in range(len(self.slots)) if sol.get(i) == 0]
            attended_count = sum(1 for v in sol.values() if v == 1)
            skipped_count = sum(1 for v in sol.values() if v == 0)

            # Impact per subject
            subject_impact = {}
            for code, slot_ids in self.subject_slots.items():
                state = self.profile.subject_states.get(code)
                base_eff = state.total_effective_attended if state else 0
                base_cond = state.conducted if state else 0
                win_attended = sum(1 for sid in slot_ids if sol.get(sid) == 1)
                win_total = len(slot_ids)
                new_pct = round(((base_eff + win_attended) / (base_cond + win_total)) * 100.0, 1) if (base_cond + win_total) > 0 else 100.0
                course_info = self.code_to_course.get(code, {})
                subject_impact[code] = {
                    "acronym": course_info.get("acronym", code),
                    "name": course_info.get("name", code),
                    "planned_attended": win_attended,
                    "planned_skipped": win_total - win_attended,
                    "projected_percentage": new_pct
                }

            formatted_plans.append({
                "total_slots": len(self.slots),
                "attended_slots": attended_count,
                "skipped_slots_count": skipped_count,
                "skipped_classes": skipped_slots,
                "subject_impact": subject_impact
            })

        # Calculate efficiency gain
        node_reduction_pct = 0.0
        if bt_metrics["nodes_visited"] > 0:
            node_reduction_pct = round(((bt_metrics["nodes_visited"] - fc_metrics["nodes_visited"]) / bt_metrics["nodes_visited"]) * 100.0, 1)

        return {
            "total_slots_modeled": len(self.slots),
            "planning_weeks": self.planning_weeks,
            "max_consecutive_skips": self.max_consecutive_skips,
            "feasible_plans_count": len(fc_solutions),
            "feasible_plans": formatted_plans,
            "search_effort_comparison": {
                "without_propagation": {
                    "method": "Standard Backtracking",
                    "nodes_visited": bt_metrics["nodes_visited"],
                    "backtracks": bt_metrics["backtracks"],
                    "constraint_checks": bt_metrics["constraint_checks"],
                    "runtime_ms": round(t_bt, 2)
                },
                "with_propagation": {
                    "method": "Backtracking + Forward Checking (AC-3/FC)",
                    "nodes_visited": fc_metrics["nodes_visited"],
                    "backtracks": fc_metrics["backtracks"],
                    "constraint_checks": fc_metrics["constraint_checks"],
                    "runtime_ms": round(t_fc, 2)
                },
                "efficiency_gain": {
                    "node_reduction_percent": max(0.0, node_reduction_pct),
                    "backtrack_reduction": max(0, bt_metrics["backtracks"] - fc_metrics["backtracks"]),
                    "analysis": "Constraint propagation prunes dead-end branches before assignment, drastically shrinking the state space."
                }
            }
        }

    # -------------------------------------------------------------
    # Method 1: Pure Backtracking (Checks validity only on assignment)
    # -------------------------------------------------------------
    def _solve_pure_backtracking(self, idx: int, assignment: Dict[int, int], metrics: Dict[str, int], max_sols: int) -> List[Dict[int, int]]:
        if len(assignment) == len(self.slots):
            return [copy.deepcopy(assignment)]

        metrics["nodes_visited"] += 1
        solutions = []

        # Values: prioritize 0 (Skip/Leave) then 1 (Attend) to find leave opportunities
        for val in [0, 1]:
            metrics["constraint_checks"] += 1
            if self._is_consistent_partial(idx, val, assignment):
                assignment[idx] = val
                res = self._solve_pure_backtracking(idx + 1, assignment, metrics, max_sols)
                solutions.extend(res)
                del assignment[idx]
                if len(solutions) >= max_sols:
                    break
            else:
                metrics["backtracks"] += 1

        return solutions

    def _is_consistent_partial(self, slot_idx: int, val: int, assignment: Dict[int, int]) -> bool:
        slot = self.slots[slot_idx]

        # Constraint 1: Lab is strictly mandatory
        if slot.is_lab and val == 0:
            return False

        # Constraint 2: Max consecutive absences (k)
        if val == 0:
            consecutive = 1
            check_idx = slot_idx - 1
            while check_idx >= 0 and assignment.get(check_idx) == 0:
                consecutive += 1
                check_idx -= 1
            if consecutive > self.max_consecutive_skips:
                return False

        # Constraint 3: Attendance threshold check
        code = slot.subject_code
        state = self.profile.subject_states.get(code)
        base_eff = state.total_effective_attended if state else 0
        base_cond = state.conducted if state else 0
        base_pct = state.current_percentage if state else 100.0
        total_in_window = len(self.subject_slots[code])

        if base_pct < self.threshold * 100.0:
            # In deficit: cannot skip any classes for this subject in the planning window
            if val == 0:
                return False
        else:
            # In safe zone: must maintain >= threshold after window
            assigned_in_subj = sum(1 for sid in self.subject_slots[code] if sid < slot_idx and assignment.get(sid) == 1)
            if val == 1:
                assigned_in_subj += 1

            remaining_unassigned = sum(1 for sid in self.subject_slots[code] if sid > slot_idx)
            max_possible_attended = base_eff + assigned_in_subj + remaining_unassigned
            total_conducted = base_cond + total_in_window

            if total_conducted > 0 and (max_possible_attended / total_conducted) < self.threshold:
                return False

        return True

    # -------------------------------------------------------------
    # Method 2: Backtracking with Forward Checking & Constraint Propagation
    # -------------------------------------------------------------
    def _solve_with_forward_checking(self, idx: int, assignment: Dict[int, int], domains: Dict[int, List[int]], metrics: Dict[str, int], max_sols: int) -> List[Dict[int, int]]:
        if len(assignment) == len(self.slots):
            return [copy.deepcopy(assignment)]

        metrics["nodes_visited"] += 1
        solutions = []

        slot = self.slots[idx]
        domain_values = list(domains[idx])

        for val in domain_values:
            metrics["constraint_checks"] += 1

            # Forward check and propagate
            new_domains, valid = self._forward_check(idx, val, assignment, domains)
            if valid:
                assignment[idx] = val
                res = self._solve_with_forward_checking(idx + 1, assignment, new_domains, metrics, max_sols)
                solutions.extend(res)
                del assignment[idx]
                if len(solutions) >= max_sols:
                    break
            else:
                metrics["backtracks"] += 1

        return solutions

    def _forward_check(self, slot_idx: int, val: int, assignment: Dict[int, int], domains: Dict[int, List[int]]) -> Tuple[Dict[int, List[int]], bool]:
        new_domains = {k: list(v) for k, v in domains.items()}
        new_domains[slot_idx] = [val]

        # 1. Lab constraint check
        slot = self.slots[slot_idx]
        if slot.is_lab and val == 0:
            return new_domains, False

        # 2. Consecutive absences check
        if val == 0:
            consecutive = 1
            check_idx = slot_idx - 1
            while check_idx >= 0 and assignment.get(check_idx) == 0:
                consecutive += 1
                check_idx -= 1
            if consecutive > self.max_consecutive_skips:
                return new_domains, False
            # Constraint propagation: If we hit consecutive limit, next slot MUST be 1
            if consecutive == self.max_consecutive_skips and slot_idx + 1 < len(self.slots):
                if 0 in new_domains[slot_idx + 1]:
                    new_domains[slot_idx + 1] = [1]  # Prune 0 from domain immediately

        # 3. Subject-level threshold constraint propagation
        code = slot.subject_code
        state = self.profile.subject_states.get(code)
        base_eff = state.total_effective_attended if state else 0
        base_cond = state.conducted if state else 0
        base_pct = state.current_percentage if state else 100.0
        total_in_window = len(self.subject_slots[code])
        total_conducted = base_cond + total_in_window

        if base_pct < self.threshold * 100.0:
            # Deficit subject: cannot skip
            if val == 0:
                return new_domains, False
            # Propagate: all future slots of this deficit subject must be 1
            for sid in self.subject_slots[code]:
                if sid > slot_idx:
                    new_domains[sid] = [1]
        else:
            if total_conducted > 0:
                min_req_attended = int(self.threshold * total_conducted)
                if self.threshold * total_conducted > min_req_attended:
                    min_req_attended += 1
                min_future_in_window = max(0, min_req_attended - base_eff)

                assigned_ones = sum(1 for sid in self.subject_slots[code] if sid <= slot_idx and (assignment.get(sid) == 1 or (sid == slot_idx and val == 1)))
                max_remaining_ones = sum(1 for sid in self.subject_slots[code] if sid > slot_idx and (1 in new_domains[sid]))

                if (assigned_ones + max_remaining_ones) < min_future_in_window:
                    return new_domains, False  # Dead end pruned!

                # If all remaining MUST be attended to meet threshold, prune 0 from all future slots of this subject
                if (assigned_ones + max_remaining_ones) == min_future_in_window:
                    for sid in self.subject_slots[code]:
                        if sid > slot_idx:
                            new_domains[sid] = [1]

        # Ensure no domain became empty
        for sid in range(slot_idx + 1, len(self.slots)):
            if not new_domains[sid]:
                return new_domains, False

        return new_domains, True
