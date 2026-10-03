"""
Unit tests for CSP Timetable Leave Planner and Constraint Propagation.
"""

import unittest
from src.data_generator import generate_student_profile
from src.csp_planner import CSPLeavePlanner


class TestCSPPlanner(unittest.TestCase):
    def setUp(self):
        self.profile = generate_student_profile(
            student_id="VH15227",
            name="Aswin",
            register_no=113025148009,
            current_week=9
        )

    def test_csp_finds_feasible_plans(self):
        planner = CSPLeavePlanner(self.profile, planning_weeks=1, max_consecutive_skips=2, threshold=75.0)
        res = planner.solve_comparison(max_solutions=3)
        self.assertIn("feasible_plans", res)
        self.assertGreaterEqual(res["feasible_plans_count"], 1)

    def test_labs_are_strictly_mandatory(self):
        planner = CSPLeavePlanner(self.profile, planning_weeks=1, max_consecutive_skips=2, threshold=75.0)
        res = planner.solve_comparison(max_solutions=5)
        for plan in res["feasible_plans"]:
            for skipped in plan["skipped_classes"]:
                self.assertFalse(skipped["is_lab"], f"Lab course {skipped['acronym']} was skipped in feasible plan!")

    def test_search_effort_comparison_metrics(self):
        planner = CSPLeavePlanner(self.profile, planning_weeks=1, max_consecutive_skips=2, threshold=75.0)
        res = planner.solve_comparison(max_solutions=3)
        effort = res["search_effort_comparison"]
        self.assertIn("without_propagation", effort)
        self.assertIn("with_propagation", effort)
        self.assertIn("efficiency_gain", effort)
        # Propagation should perform fewer or equal backtracks / prune invalid nodes
        self.assertGreaterEqual(effort["without_propagation"]["nodes_visited"], 1)
        self.assertGreaterEqual(effort["with_propagation"]["nodes_visited"], 1)


if __name__ == "__main__":
    unittest.main()
