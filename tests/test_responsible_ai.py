"""
Unit tests for Applied & Responsible AI Pattern Risk and Explainability.
"""

import unittest
from src.data_generator import generate_student_profile
from src.responsible_ai import ResponsibleAIAdvisor


class TestResponsibleAI(unittest.TestCase):
    def setUp(self):
        self.profile = generate_student_profile(
            student_id="VH15227",
            name="Aswin",
            register_no=113025148009,
            current_week=9
        )

    def test_anonymization(self):
        anon_id = ResponsibleAIAdvisor.anonymize_id(self.profile.student_id, self.profile.register_no)
        self.assertTrue(anon_id.startswith("STU_"))
        self.assertNotEqual(anon_id, self.profile.student_id)

    def test_weekday_absence_patterns(self):
        patterns = ResponsibleAIAdvisor.analyze_weekday_absence_patterns(self.profile)
        self.assertIn("weekday_breakdown", patterns)
        self.assertIn("Monday", patterns["weekday_breakdown"])
        self.assertIn("Friday", patterns["weekday_breakdown"])
        self.assertIn("peak_day", patterns)

    def test_comprehensive_risk_table_for_at_least_five_subjects(self):
        report = ResponsibleAIAdvisor.generate_comprehensive_risk_table(self.profile)
        table = report["risk_table"]
        self.assertGreaterEqual(len(table), 5, "Risk table must evaluate at least 5 subjects!")
        for row in table:
            self.assertIn(row["risk_level"], ["Low", "Medium", "High"])
            self.assertTrue(len(row["xai_explanation"]) > 10)
        self.assertIn("RESPONSIBLE AI USAGE POLICY", report["responsible_ai_policy"])


if __name__ == "__main__":
    unittest.main()
