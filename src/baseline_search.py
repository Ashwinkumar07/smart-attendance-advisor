"""
Baseline Search Algorithms for Empirical Evaluation & Benchmark.
Includes:
  1. Greedy Best-First Search (evaluates f(n) = h(n))
  2. Uniform Cost Search / BFS (evaluates f(n) = g(n))
"""

import time
import heapq
from typing import Dict, List, Tuple, Optional
from src.models import StudentProfile, SearchNode, RecoveryPlanResult
from src.config import MIN_ATTENDANCE_THRESHOLD
from src.astar_planner import AStarAttendancePlanner


class GreedyBestFirstPlanner(AStarAttendancePlanner):
    """
    Greedy Best-First Search: chooses the node that minimizes h(n) without considering g(n).
    """
    def solve(self, profile: StudentProfile) -> RecoveryPlanResult:
        start_time = time.perf_counter()
        
        subject_keys = sorted(list(profile.subject_states.keys()))
        num_subjects = len(subject_keys)
        
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
        heapq.heappush(frontier, (initial_node.h_cost, node_counter, initial_node))
        
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
                    parent=current_node
                )

                node_counter += 1
                heapq.heappush(frontier, (succ_node.h_cost, node_counter, succ_node))

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        final_schedule = best_goal_node.planned_attended if best_goal_node else initial_planned
        total_cost = best_goal_node.g_cost if best_goal_node else 999.0

        projected = {}
        for code, state in profile.subject_states.items():
            att = state.total_effective_attended + final_schedule.get(code, 0)
            tot = state.total_potential_classes
            projected[code] = round((att / tot) * 100.0, 2) if tot > 0 else 100.0

        return RecoveryPlanResult(
            algorithm_name="Greedy Best-First Search",
            is_feasible=(best_goal_node is not None),
            nodes_expanded=nodes_expanded,
            execution_time_ms=round(elapsed_ms, 3),
            total_cost=round(total_cost, 2),
            recommended_schedule=final_schedule,
            projected_percentages=projected,
            advisory_notes=["Greedy plan produced via heuristic minimization."]
        )


class UniformCostPlanner(AStarAttendancePlanner):
    """
    Uniform Cost Search (Dijkstra-style): evaluates f(n) = g(n), h(n) = 0.
    """
    def solve(self, profile: StudentProfile) -> RecoveryPlanResult:
        start_time = time.perf_counter()
        
        subject_keys = sorted(list(profile.subject_states.keys()))
        num_subjects = len(subject_keys)
        
        initial_planned: Dict[str, int] = {}
        initial_node = SearchNode(
            planned_attended=initial_planned,
            current_step=0,
            g_cost=0.0,
            h_cost=0.0,
            parent=None
        )

        frontier: List[Tuple[float, int, SearchNode]] = []
        node_counter = 0
        heapq.heappush(frontier, (initial_node.g_cost, node_counter, initial_node))
        
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

                succ_node = SearchNode(
                    planned_attended=new_planned,
                    current_step=depth + 1,
                    g_cost=new_g,
                    h_cost=0.0,
                    parent=current_node
                )

                node_counter += 1
                heapq.heappush(frontier, (succ_node.g_cost, node_counter, succ_node))

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        final_schedule = best_goal_node.planned_attended if best_goal_node else initial_planned
        total_cost = best_goal_node.g_cost if best_goal_node else 999.0

        projected = {}
        for code, state in profile.subject_states.items():
            att = state.total_effective_attended + final_schedule.get(code, 0)
            tot = state.total_potential_classes
            projected[code] = round((att / tot) * 100.0, 2) if tot > 0 else 100.0

        return RecoveryPlanResult(
            algorithm_name="Uniform Cost Search (UCS / Dijkstra)",
            is_feasible=(best_goal_node is not None),
            nodes_expanded=nodes_expanded,
            execution_time_ms=round(elapsed_ms, 3),
            total_cost=round(total_cost, 2),
            recommended_schedule=final_schedule,
            projected_percentages=projected,
            advisory_notes=["UCS exhaustive path optimization completed."]
        )
