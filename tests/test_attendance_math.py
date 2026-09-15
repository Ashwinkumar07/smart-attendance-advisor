"""
Unit tests for attendance math, edge cases, and threshold equations.
"""

import unittest
from src.models import Subject, SubjectAttendanceState, RiskTier


class TestAttendanceMath(unittest.TestCase):
    def setUp(self):
        self.sample_subject = Subject(
            code="CS301",
            name="Artificial Intelligence",
            credits=4,
            difficulty=0.8,
            classes_per_week=4,
            total_planned_classes=60
        )

    def test_zero_conducted_classes(self):
        """Verify zero division is safely handled and returns 100%."""
        state = SubjectAttendanceState(
            subject=self.sample_subject,
            conducted=0,
            attended=0,
            approved_od_leaves=0,
            remaining_classes=60
        )
        self.assertEqual(state.current_percentage, 100.0)
        self.assertEqual(state.risk_tier, RiskTier.SAFE)
        self.assertEqual(state.classes_needed_for_target(75.0), 0)

    def test_standard_percentage_with_od(self):
        """Verify regular attended + OD leaves calculation."""
        state = SubjectAttendanceState(
            subject=self.sample_subject,
            conducted=40,
            attended=28,
            approved_od_leaves=2,
            remaining_classes=20
        )
        # Effective attended = 28 + 2 = 30; 30/40 = 75.0%
        self.assertEqual(state.total_effective_attended, 30)
        self.assertEqual(state.current_percentage, 75.0)
        self.assertEqual(state.risk_tier, RiskTier.WARNING)

    def test_classes_needed_calculation(self):
        """Verify formula: ceil((target*conducted - 100*attended)/(100 - target))."""
        # 20 conducted, 10 attended = 50%
        state = SubjectAttendanceState(
            subject=self.sample_subject,
            conducted=20,
            attended=10,
            approved_od_leaves=0,
            remaining_classes=40
        )
        # Target 75%: (75*20 - 100*10)/(25) = (1500 - 1000)/25 = 500/25 = 20 consecutive classes needed
        self.assertEqual(state.classes_needed_for_target(75.0), 20)

    def test_safe_bunks_calculation(self):
        """Verify formula: floor((100*attended - target*conducted)/target)."""
        # 40 conducted, 36 attended = 90%
        state = SubjectAttendanceState(
            subject=self.sample_subject,
            conducted=40,
            attended=36,
            approved_od_leaves=0,
            remaining_classes=20
        )
        # Target 75%: (3600 - 75*40)/75 = (3600 - 3000)/75 = 600/75 = 8 classes can be skipped
        self.assertEqual(state.max_allowed_bunks(75.0), 8)

    def test_max_achievable_percentage(self):
        """Verify max achievable if 100% future classes are attended."""
        state = SubjectAttendanceState(
            subject=self.sample_subject,
            conducted=30,
            attended=15,
            approved_od_leaves=0,
            remaining_classes=30 # total 60
        )
        # Max attended = 15 + 30 = 45 / 60 = 75.0%
        self.assertEqual(state.max_achievable_percentage, 75.0)


if __name__ == "__main__":
    unittest.main()
