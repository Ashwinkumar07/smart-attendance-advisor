"""
Unit & Property Tests for A* Search Planner and Baseline Comparators.
"""

import unittest
from src.data_generator import generate_student_profile
from src.astar_planner import AStarAttendancePlanner
from src.baseline_search import GreedyBestFirstPlanner, UniformCostPlanner
from src.config import REGISTER_NUMBER, STUDENT_ID


class TestAStarPlanner(unittest.TestCase):
    def test_astar_finds_goal(self):
        """Verify that A* search successfully guides all recoverable subjects to >= 75%."""
        profile = generate_student_profile(register_no=REGISTER_NUMBER, student_id=STUDENT_ID, scenario="custom_deficit")
        planner = AStarAttendancePlanner(target_pct=75.0)
        result = planner.solve(profile)

        self.assertTrue(result.is_feasible)
        self.assertGreater(result.nodes_expanded, 0)
        self.assertGreater(result.total_cost, 0)

        # Ensure all subjects in projected plan meet >= 75%
        for code, pct in result.projected_percentages.items():
            self.assertGreaterEqual(pct, 74.95, f"Subject {code} projected at {pct}% which is below threshold!")

    def test_astar_optimality_vs_ucs(self):
        """
        Since UCS guarantees the exact minimum cost path,
        A* with an admissible heuristic must match UCS's optimal cost
        while expanding fewer or equal nodes.
        """
        profile = generate_student_profile(register_no=REGISTER_NUMBER, student_id=STUDENT_ID, scenario="custom_deficit")
        
        astar_res = AStarAttendancePlanner().solve(profile)
        ucs_res = UniformCostPlanner().solve(profile)

        self.assertEqual(astar_res.is_feasible, ucs_res.is_feasible)
        # Costs should match within 0.2 tolerance (both find the optimal path)
        self.assertLess(abs(astar_res.total_cost - ucs_res.total_cost), 0.2)
        # A* should explore significantly fewer or equal nodes than unguided UCS
        self.assertLessEqual(astar_res.nodes_expanded, ucs_res.nodes_expanded)

    def test_greedy_vs_astar(self):
        """Verify Greedy Best-First Search executes and provides a feasible allocation."""
        profile = generate_student_profile(register_no=REGISTER_NUMBER, student_id=STUDENT_ID, scenario="custom_deficit")
        greedy_res = GreedyBestFirstPlanner().solve(profile)
        
        self.assertTrue(greedy_res.is_feasible)
        self.assertEqual(len(greedy_res.recommended_schedule), len(profile.subject_states))


if __name__ == "__main__":
    unittest.main()
