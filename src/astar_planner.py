"""
A* Heuristic Search Planner for Optimal Attendance Recovery.
Computes the minimal-strain, optimal class attendance schedule to achieve >= 75% target across all subjects.
"""

import time
import math
import heapq
from typing import Dict, List, Tuple, Optional
from src.models import StudentProfile, SearchNode, RecoveryPlanResult, SubjectAttendanceState
from src.config import MIN_ATTENDANCE_THRESHOLD, WORKLOAD_DIFFICULTY_WEIGHT, HIGH_CREDIT_PRIORITY_WEIGHT


class AStarAttendancePlanner:
    def __init__(self, target_pct: float = MIN_ATTENDANCE_THRESHOLD):
        self.target_pct = target_pct

    def compute_subject_cost(self, state: SubjectAttendanceState, allocated_classes: int) -> float:
        """
        Calculates total strain g(n) for attending `allocated_classes` in a subject.
        Accounts for subject difficulty, credit weightage, and marginal fatigue.
        """
        base_strain = state.subject.difficulty * WORKLOAD_DIFFICULTY_WEIGHT
        credit_factor = (state.subject.credits / 3.0) * HIGH_CREDIT_PRIORITY_WEIGHT
        fatigue_mult = 1.0 + (0.02 * allocated_classes)
        return round(allocated_classes * base_strain * credit_factor * fatigue_mult, 4)

    def compute_min_required_classes(self, state: SubjectAttendanceState) -> int:
        """Calculates minimum future classes needed in a subject to reach target_pct at end of semester."""
        final_total = state.total_potential_classes
        if final_total == 0:
            return 0
        min_target_attended = math.ceil((self.target_pct / 100.0) * final_total)
        deficit = max(0, min_target_attended - state.total_effective_attended)
        return min(deficit, state.remaining_classes)

    def compute_heuristic(self, profile: StudentProfile, subject_keys: List[str], current_depth: int) -> float:
        """
        Admissible & Consistent Heuristic h(n).
        Calculates the exact lower bound of cost for unassigned subjects from current_depth to K.
        Never overestimates the true remaining effort (Admissible).
        """
        h_cost = 0.0
        for i in range(current_depth, len(subject_keys)):
            code = subject_keys[i]
            state = profile.subject_states[code]
            min_req = self.compute_min_required_classes(state)
            base_strain = state.subject.difficulty * WORKLOAD_DIFFICULTY_WEIGHT
            credit_factor = (state.subject.credits / 3.0) * HIGH_CREDIT_PRIORITY_WEIGHT
            h_cost += min_req * base_strain * credit_factor
        return round(h_cost, 4)

    def solve(self, profile: StudentProfile) -> RecoveryPlanResult:
        """
        Executes A* Search over the subject-allocation state space.
        Guarantees optimal, minimum-fatigue schedule to reach >= target_pct.
        """
        start_time = time.perf_counter()
        
        subject_keys = sorted(list(profile.subject_states.keys()))
        num_subjects = len(subject_keys)
        
        feasibility_notes = []
        is_fully_recoverable = True

        for code in subject_keys:
            state = profile.subject_states[code]
            if state.max_achievable_percentage < self.target_pct:
                is_fully_recoverable = False
                feasibility_notes.append(
                    f"⚠️ Critical Alert: {state.subject.name} ({code}) cannot mathematically reach {self.target_pct}% "
                    f"even with 100% future attendance (Max possible: {state.max_achievable_percentage}%)."
                )

        # Initial node: depth 0, 0 subjects allocated
        initial_planned: Dict[str, int] = {}
        initial_h = self.compute_heuristic(profile, subject_keys, 0)
        
        initial_node = SearchNode(
            planned_attended=initial_planned,
            current_step=0,
            g_cost=0.0,
            h_cost=initial_h,
            parent=None
        )

        frontier: List[Tuple[float, int, SearchNode]] = []
        node_counter = 0
        heapq.heappush(frontier, (initial_node.f_cost, node_counter, initial_node))
        
        nodes_expanded = 0
        best_goal_node: Optional[SearchNode] = None

        while frontier:
            _, _, current_node = heapq.heappop(frontier)
            nodes_expanded += 1
            depth = current_node.current_step

            if depth == num_subjects:
                best_goal_node = current_node
                break

            subj_code = subject_keys[depth]
            state = profile.subject_states[subj_code]
            min_needed = self.compute_min_required_classes(state)
            max_possible = state.remaining_classes
            max_alloc_to_consider = min(max_possible, min_needed + 6)

            for alloc in range(min_needed, max_alloc_to_consider + 1):
                new_planned = dict(current_node.planned_attended)
                new_planned[subj_code] = alloc

                step_cost = self.compute_subject_cost(state, alloc)
                new_g = round(current_node.g_cost + step_cost, 4)
                new_h = self.compute_heuristic(profile, subject_keys, depth + 1)

                succ_node = SearchNode(
                    planned_attended=new_planned,
                    current_step=depth + 1,
                    g_cost=new_g,
                    h_cost=new_h,
                    parent=current_node,
                    action_taken={subj_code: alloc}
                )

                node_counter += 1
                heapq.heappush(frontier, (succ_node.f_cost, node_counter, succ_node))

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        if best_goal_node is None:
            final_schedule = {c: s.remaining_classes for c, s in profile.subject_states.items()}
            total_cost = 999.0
        else:
            final_schedule = best_goal_node.planned_attended
            total_cost = best_goal_node.g_cost

        # Calculate projected percentages
        projected = {}
        for code, state in profile.subject_states.items():
            att = state.total_effective_attended + final_schedule.get(code, 0)
            tot = state.total_potential_classes
            projected[code] = round((att / tot) * 100.0, 2) if tot > 0 else 100.0

        # Detailed clear explanation of what the algorithm figured out
        advisory = list(feasibility_notes)
        for code in subject_keys:
            state = profile.subject_states[code]
            needed = final_schedule.get(code, 0)
            rem = state.remaining_classes
            can_skip = rem - needed
            curr_pct = state.current_percentage
            
            if curr_pct < self.target_pct:
                advisory.append(
                    f"🔴 {state.subject.name} ({code}) [Current: {curr_pct}%]: "
                    f"In Deficit! A* algorithm determines you MUST attend at least {needed} of {rem} upcoming classes "
                    f"(Safe margin: can miss at most {can_skip} classes) to finish above 75%."
                )
            else:
                advisory.append(
                    f"🟢 {state.subject.name} ({code}) [Current: {curr_pct}%]: "
                    f"Safe Zone! A* recommends attending {needed} of {rem} upcoming classes "
                    f"(Safe buffer: You can skip up to {can_skip} classes without dropping below 75%)."
                )

        return RecoveryPlanResult(
            algorithm_name="A* Heuristic Search (Optimal)",
            is_feasible=is_fully_recoverable,
            nodes_expanded=nodes_expanded,
            execution_time_ms=round(elapsed_ms, 3),
            total_cost=round(total_cost, 2),
            recommended_schedule=final_schedule,
            projected_percentages=projected,
            advisory_notes=advisory
        )
