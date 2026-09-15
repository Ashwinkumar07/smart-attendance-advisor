"""
Attendance Risk Analyzer, Defaulter Predictor, and Catch-Up Simulator.
"""

from typing import Dict, List, Any
from src.models import StudentProfile, RiskTier, SubjectAttendanceState
from src.config import MIN_ATTENDANCE_THRESHOLD, SAFE_ATTENDANCE_THRESHOLD, WARNING_THRESHOLD


class AttendanceRiskAnalyzer:
    @staticmethod
    def analyze_profile(profile: StudentProfile) -> Dict[str, Any]:
        """
        Performs a full analytical audit on student attendance.
        """
        subject_reports = []
        critical_count = 0
        warning_count = 0
        safe_count = 0

        for code, state in profile.subject_states.items():
            pct = state.current_percentage
            tier = state.risk_tier
            if tier == RiskTier.CRITICAL_DEFICIT:
                critical_count += 1
            elif tier == RiskTier.WARNING:
                warning_count += 1
            else:
                safe_count += 1

            needed_75 = state.classes_needed_for_target(MIN_ATTENDANCE_THRESHOLD)
            needed_80 = state.classes_needed_for_target(SAFE_ATTENDANCE_THRESHOLD)
            can_skip_75 = state.max_allowed_bunks(MIN_ATTENDANCE_THRESHOLD)

            subject_reports.append({
                "code": code,
                "name": state.subject.name,
                "credits": state.subject.credits,
                "conducted": state.conducted,
                "attended": state.attended,
                "od_leaves": state.approved_od_leaves,
                "effective_attended": state.total_effective_attended,
                "percentage": pct,
                "risk_tier": tier.value,
                "remaining_classes": state.remaining_classes,
                "max_achievable_pct": state.max_achievable_percentage,
                "classes_needed_75": needed_75,
                "classes_needed_80": needed_80,
                "safe_bunks_75": can_skip_75,
                "is_recoverable": state.max_achievable_percentage >= MIN_ATTENDANCE_THRESHOLD
            })

        overall_pct = profile.overall_percentage
        overall_tier = profile.overall_risk_tier

        # Executive summary advisory flags
        alerts = []
        if critical_count > 0:
            alerts.append(f"CRITICAL: {critical_count} course(s) are below statutory 75% detention threshold.")
        if warning_count > 0:
            alerts.append(f"ADVISORY WARNING: {warning_count} course(s) are in the borderline warning zone (75-80%).")
        if overall_pct < MIN_ATTENDANCE_THRESHOLD:
            alerts.append(f"DETENTION RISK: Cumulative attendance ({overall_pct}%) is below 75%. Immediate intervention required.")

        return {
            "register_no": profile.register_no,
            "student_id": profile.student_id,
            "name": profile.name,
            "current_week": profile.current_week,
            "overall_conducted": profile.overall_conducted,
            "overall_attended": profile.overall_attended,
            "overall_percentage": overall_pct,
            "overall_risk_tier": overall_tier.value,
            "subject_breakdown": subject_reports,
            "metrics": {
                "critical_subjects": critical_count,
                "warning_subjects": warning_count,
                "safe_subjects": safe_count
            },
            "alerts": alerts
        }

    @staticmethod
    def simulate_what_if(
        profile: StudentProfile,
        missed_classes_delta: Dict[str, int]
    ) -> Dict[str, Any]:
        """
        Simulates what happens if a student misses additional upcoming classes.
        """
        simulation_results = {}
        for code, state in profile.subject_states.items():
            miss = missed_classes_delta.get(code, 0)
            sim_conducted = state.conducted + miss
            sim_attended = state.total_effective_attended # Did not attend those missed
            sim_pct = round((sim_attended / sim_conducted) * 100.0, 2) if sim_conducted > 0 else 100.0
            
            simulation_results[code] = {
                "subject": state.subject.name,
                "original_pct": state.current_percentage,
                "simulated_missed": miss,
                "simulated_pct": sim_pct,
                "new_risk_tier": (
                    RiskTier.SAFE.value if sim_pct >= 80.0
                    else RiskTier.WARNING.value if sim_pct >= 75.0
                    else RiskTier.CRITICAL_DEFICIT.value
                ),
                "remedy_classes_needed": state.classes_needed_for_target(MIN_ATTENDANCE_THRESHOLD)
            }
        return simulation_results
