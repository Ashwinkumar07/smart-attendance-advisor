"""
Unit tests for Risk Analysis, Tier Classification, and What-If Simulation.
"""

import unittest
from src.data_generator import generate_student_profile
from src.risk_analyzer import AttendanceRiskAnalyzer
from src.config import REGISTER_NUMBER, STUDENT_ID


class TestRiskAnalyzer(unittest.TestCase):
    def test_risk_analyzer_breakdown(self):
        profile = generate_student_profile(register_no=REGISTER_NUMBER, student_id=STUDENT_ID, scenario="custom_deficit")
        analysis = AttendanceRiskAnalyzer.analyze_profile(profile)

        self.assertEqual(analysis["register_no"], REGISTER_NUMBER)
        self.assertEqual(analysis["student_id"], STUDENT_ID)
        self.assertEqual(len(analysis["subject_breakdown"]), len(profile.subject_states))
        self.assertIn("metrics", analysis)
        self.assertGreaterEqual(analysis["metrics"]["critical_subjects"], 1)

    def test_what_if_simulator(self):
        profile = generate_student_profile(register_no=REGISTER_NUMBER, student_id=STUDENT_ID, scenario="safe")
        sim = AttendanceRiskAnalyzer.simulate_what_if(profile, {"25ML35T": 10})
        
        self.assertIn("25ML35T", sim)
        self.assertLess(sim["25ML35T"]["simulated_pct"], sim["25ML35T"]["original_pct"])


if __name__ == "__main__":
    unittest.main()
