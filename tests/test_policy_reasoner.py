"""
Unit tests for First-Order Logic Policy Reasoner and Backward-Chaining.
"""

import unittest
from src.data_generator import generate_student_profile
from src.policy_reasoner import PolicyReasoner


class TestPolicyReasoner(unittest.TestCase):
    def setUp(self):
        self.profile = generate_student_profile(
            student_id="VH15227",
            name="Aswin",
            register_no=113025148009,
            current_week=9
        )
        self.reasoner = PolicyReasoner()

    def test_direct_statutory_eligibility(self):
        # Find a subject >= 75%
        safe_subject = None
        for code, state in self.profile.subject_states.items():
            if state.current_percentage >= 75.0:
                safe_subject = code
                break

        if safe_subject:
            res = self.reasoner.verify_eligibility(self.profile, safe_subject)
            self.assertTrue(res["is_eligible"])
            self.assertIn("ELIGIBLE", res["status"])
            self.assertGreaterEqual(len(res["proof_trace"]), 1)

    def test_medical_condonation_reasoning(self):
        # Test on critical subject with medical certificate
        crit_subject = None
        for code, state in self.profile.subject_states.items():
            if 65.0 <= state.current_percentage < 75.0:
                crit_subject = code
                break
        if not crit_subject:
            crit_subject = list(self.profile.subject_states.keys())[0]

        # Without medical cert
        res_no_med = self.reasoner.verify_eligibility(self.profile, crit_subject, has_medical_cert=False)
        # With medical cert
        res_with_med = self.reasoner.verify_eligibility(self.profile, crit_subject, has_medical_cert=True, is_dean_approved=True)

        self.assertIn("proof_trace", res_with_med)
        self.assertIn("facts_unified", res_with_med)


if __name__ == "__main__":
    unittest.main()
