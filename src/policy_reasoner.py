"""
First-Order Logic (FOL) Policy Knowledge Base and Backward-Chaining Reasoner.
Encodes college statutory attendance and condonation policies as formal Horn clauses:
  1. Forall s, d: OnDuty(s, d) -> Present(s, d)
  2. Attendance(s) >= 75% -> StatutoryEligible(s)
  3. Attendance(s) >= 65% ^ MedicalVerified(s) -> CondonationEligible(s)
  4. CondonationEligible(s) ^ DeanApproved(s) -> ApprovedCondonation(s)
  5. IsLab(s) ^ LabAttendance(s) >= 80% -> LabCompliant(s)
  6. IsLab(s) ^ LabAttendance(s) < 80% -> LabDetained(s)
  7. ~IsLab(s) ^ (StatutoryEligible(s) v ApprovedCondonation(s)) -> EligibleForExam(s)
  8. IsLab(s) ^ LabCompliant(s) ^ (StatutoryEligible(s) v ApprovedCondonation(s)) -> EligibleForExam(s)

Executes goal-directed Backward-Chaining inference to answer:
  "Am I eligible for the final exam in subject X?"
and produces a step-by-step verified Proof Trace.
"""

from typing import Dict, List, Any, Optional, Tuple
from src.models import StudentProfile


class FOLRule:
    """Represents a First-Order Logic Horn clause."""
    def __init__(self, rule_id: str, consequent: str, antecedents: List[str], description: str, formula: str):
        self.rule_id = rule_id
        self.consequent = consequent
        self.antecedents = antecedents
        self.description = description
        self.formula = formula

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "consequent": self.consequent,
            "antecedents": self.antecedents,
            "description": self.description,
            "formula": self.formula
        }


class PolicyReasoner:
    """
    Automated Backward-Chaining Reasoner for University Attendance Regulations.
    """
    def __init__(self):
        self.rules = self._init_rules()

    def _init_rules(self) -> List[FOLRule]:
        return [
            FOLRule(
                "R1_ON_DUTY",
                "Present(s, d)",
                ["OnDuty(s, d)", "VerifiedOD(s, d)"],
                "Official on-duty leaves are converted and credited as full attendance.",
                "∀s,d (OnDuty(s,d) ∧ VerifiedOD(s,d) → Present(s,d))"
            ),
            FOLRule(
                "R2_STATUTORY_ELIGIBILITY",
                "StatutoryEligible(s)",
                ["AttendanceGTE75(s)"],
                "Students with effective attendance >= 75% achieve direct statutory eligibility.",
                "Attendance(s) ≥ 75.0% → StatutoryEligible(s)"
            ),
            FOLRule(
                "R3_MEDICAL_CONDONATION",
                "CondonationEligible(s)",
                ["AttendanceGTE65(s)", "AttendanceLT75(s)", "MedicalCertificateVerified(s)"],
                "Attendance between 65% and 74.9% qualifies for medical condonation if valid certificate submitted.",
                "65.0% ≤ Attendance(s) < 75.0% ∧ MedicalCertificateVerified(s) → CondonationEligible(s)"
            ),
            FOLRule(
                "R4_DEAN_CONDONATION_APPROVAL",
                "ApprovedCondonation(s)",
                ["CondonationEligible(s)", "DeanApprovalGranted(s)"],
                "Medical condonation is validated and cleared by Academic Dean.",
                "CondonationEligible(s) ∧ DeanApprovalGranted(s) → ApprovedCondonation(s)"
            ),
            FOLRule(
                "R5_LAB_COMPLIANCE",
                "LabCompliant(s)",
                ["IsLab(s)", "LabAttendanceGTE80(s)"],
                "Practical laboratory courses require strict minimum 80% practical session participation.",
                "IsLab(s) ∧ LabAttendance(s) ≥ 80.0% → LabCompliant(s)"
            ),
            FOLRule(
                "R6_THEORY_EXAM_ELIGIBILITY_DIRECT",
                "EligibleForExam(s)",
                ["IsTheory(s)", "StatutoryEligible(s)"],
                "Theory subject eligibility satisfied via statutory attendance >= 75%.",
                "IsTheory(s) ∧ StatutoryEligible(s) → EligibleForExam(s)"
            ),
            FOLRule(
                "R7_THEORY_EXAM_ELIGIBILITY_CONDONED",
                "EligibleForExam(s)",
                ["IsTheory(s)", "ApprovedCondonation(s)"],
                "Theory subject eligibility satisfied via approved medical condonation.",
                "IsTheory(s) ∧ ApprovedCondonation(s) → EligibleForExam(s)"
            ),
            FOLRule(
                "R8_LAB_EXAM_ELIGIBILITY_DIRECT",
                "EligibleForExam(s)",
                ["IsLab(s)", "LabCompliant(s)", "StatutoryEligible(s)"],
                "Lab practical eligibility requires both lab compliance (>=80%) and statutory threshold (>=75%).",
                "IsLab(s) ∧ LabCompliant(s) ∧ StatutoryEligible(s) → EligibleForExam(s)"
            ),
            FOLRule(
                "R9_LAB_EXAM_ELIGIBILITY_CONDONED",
                "EligibleForExam(s)",
                ["IsLab(s)", "LabCompliant(s)", "ApprovedCondonation(s)"],
                "Lab practical eligibility satisfied with lab compliance and approved condonation.",
                "IsLab(s) ∧ LabCompliant(s) ∧ ApprovedCondonation(s) → EligibleForExam(s)"
            )
        ]

    def verify_eligibility(
        self,
        profile: StudentProfile,
        subject_code: str,
        has_medical_cert: bool = False,
        is_dean_approved: bool = True
    ) -> Dict[str, Any]:
        """
        Runs Backward Chaining on the goal 'EligibleForExam(subject)' and returns the full proof trace.
        """
        state = profile.subject_states.get(subject_code)
        if not state:
            return {"error": f"Subject code {subject_code} not found in student roster."}

        # 1. Construct student atomic facts
        pct = state.current_percentage
        is_lab = "Lab" in state.subject.name or "Laboratory" in state.subject.name or subject_code.endswith("P")
        od_count = state.approved_od_leaves

        facts = {
            f"Attendance({subject_code})": pct,
            f"AttendanceGTE75({subject_code})": pct >= 75.0,
            f"AttendanceGTE65({subject_code})": pct >= 65.0,
            f"AttendanceLT75({subject_code})": pct < 75.0,
            f"MedicalCertificateVerified({subject_code})": has_medical_cert,
            f"DeanApprovalGranted({subject_code})": is_dean_approved if has_medical_cert else False,
            f"IsLab({subject_code})": is_lab,
            f"IsTheory({subject_code})": not is_lab,
            f"LabAttendanceGTE80({subject_code})": pct >= 80.0 if is_lab else True,
            f"OnDutyCount({subject_code})": od_count,
            f"HasApprovedOD({subject_code})": od_count > 0
        }

        # 2. Execute Backward Chaining
        proof_trace: List[Dict[str, Any]] = []
        visited_goals = set()
        goal = f"EligibleForExam({subject_code})"

        is_eligible = self._backward_chain(goal, facts, proof_trace, visited_goals, depth=0)

        # Build summary status
        status = "ELIGIBLE (DIRECT)" if (is_eligible and pct >= 75.0) else (
            "ELIGIBLE (CONDONED)" if is_eligible else "DETAINED / INELIGIBLE"
        )

        recommendation = ""
        if is_eligible and pct >= 75.0:
            recommendation = "Statutory compliance met. Student is cleared to sit for the final semester exam."
        elif is_eligible and has_medical_cert:
            recommendation = "Condonation granted based on verified medical grounds (65-74.9%). Exam hall ticket approved."
        elif pct >= 65.0 and not has_medical_cert:
            needed_classes = state.classes_needed_for_target(75.0)
            recommendation = f"Attendance is {pct}% (in 65-75% range). Submit verified medical certificate OR attend {needed_classes} consecutive classes to clear detention."
        else:
            needed_classes = state.classes_needed_for_target(75.0)
            recommendation = f"Critical deficit ({pct}% < 65%). Medical condonation inapplicable. Mandatory recovery: attend {needed_classes} consecutive classes immediately."

        return {
            "subject_code": subject_code,
            "subject_name": state.subject.name,
            "acronym": state.subject.acronym,
            "is_lab": is_lab,
            "current_percentage": pct,
            "od_leaves_credited": od_count,
            "has_medical_certificate": has_medical_cert,
            "is_dean_approved": is_dean_approved,
            "is_eligible": is_eligible,
            "status": status,
            "recommendation": recommendation,
            "facts_unified": facts,
            "proof_trace": proof_trace,
            "rules_applied": [r.to_dict() for r in self.rules]
        }

    def _backward_chain(
        self,
        current_goal: str,
        facts: Dict[str, Any],
        proof_trace: List[Dict[str, Any]],
        visited_goals: set,
        depth: int
    ) -> bool:
        indent = "  " * depth

        # Check if goal is an atomic premise/fact
        if current_goal in facts:
            val = bool(facts[current_goal])
            proof_trace.append({
                "step": len(proof_trace) + 1,
                "depth": depth,
                "subgoal": current_goal,
                "action": "FACT_LOOKUP",
                "unified_value": facts[current_goal],
                "status": "PASS" if val else "FAIL",
                "explanation": f"{indent}Resolved atomic fact: {current_goal} = {facts[current_goal]}"
            })
            return val

        # Match rules where consequent == current_goal
        matching_rules = [r for r in self.rules if self._match_consequent(r.consequent, current_goal)]

        if not matching_rules:
            proof_trace.append({
                "step": len(proof_trace) + 1,
                "depth": depth,
                "subgoal": current_goal,
                "action": "NO_RULE_MATCH",
                "status": "FAIL",
                "explanation": f"{indent}No rules found to prove subgoal '{current_goal}'."
            })
            return False

        for rule in matching_rules:
            proof_trace.append({
                "step": len(proof_trace) + 1,
                "depth": depth,
                "subgoal": current_goal,
                "action": "RULE_EVALUATE",
                "rule_id": rule.rule_id,
                "formula": rule.formula,
                "description": rule.description,
                "status": "EVALUATING",
                "explanation": f"{indent}Applying Rule {rule.rule_id}: {rule.formula}"
            })

            # Check all antecedents for this rule
            subject_token = current_goal.split("(")[1].split(")")[0] if "(" in current_goal else ""
            rule_success = True

            for ant_template in rule.antecedents:
                subgoal = ant_template.replace("(s)", f"({subject_token})")
                subgoal_res = self._backward_chain(subgoal, facts, proof_trace, visited_goals, depth + 1)
                if not subgoal_res:
                    rule_success = False
                    break

            if rule_success:
                proof_trace.append({
                    "step": len(proof_trace) + 1,
                    "depth": depth,
                    "subgoal": current_goal,
                    "action": "RULE_FIRED",
                    "rule_id": rule.rule_id,
                    "status": "SUCCESS",
                    "explanation": f"{indent}Rule {rule.rule_id} fully satisfied! Goal '{current_goal}' proven TRUE."
                })
                return True

        proof_trace.append({
            "step": len(proof_trace) + 1,
            "depth": depth,
            "subgoal": current_goal,
            "action": "GOAL_FAILED",
            "status": "FAIL",
            "explanation": f"{indent}All rules attempting to prove '{current_goal}' failed."
        })
        return False

    def _match_consequent(self, rule_consequent_pattern: str, target_goal: str) -> bool:
        pred_rule = rule_consequent_pattern.split("(")[0]
        pred_target = target_goal.split("(")[0]
        return pred_rule == pred_target
