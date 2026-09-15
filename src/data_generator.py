"""
Deterministic Data Generator & Student Profile Generator.
Mapped to official CSE AI&ML Sem III Course codes.
"""

import random
from typing import Dict, List, Optional
from src.config import REGISTER_NUMBER, STUDENT_ID, OFFICIAL_COURSES, WEEKS_IN_SEMESTER
from src.models import Subject, SubjectAttendanceState, StudentProfile


def get_default_subjects() -> List[Subject]:
    """Returns the official CSE AI&ML curriculum catalog."""
    return [
        Subject(
            code=s["code"],
            name=s["name"],
            credits=s["credits"],
            difficulty=s["difficulty"],
            classes_per_week=s["hours_per_week"],
            total_planned_classes=s["hours_per_week"] * WEEKS_IN_SEMESTER
        )
        for s in OFFICIAL_COURSES
    ]


def generate_student_profile(
    register_no: int = REGISTER_NUMBER,
    student_id: str = STUDENT_ID,
    name: str = "Aswin",
    current_week: int = 9,
    scenario: str = "custom_deficit"
) -> StudentProfile:
    """Generates a deterministic student attendance profile."""
    random.seed(register_no)
    
    subjects = get_default_subjects()
    profile = StudentProfile(
        register_no=register_no,
        student_id=student_id,
        name=name,
        current_week=current_week
    )

    remaining_weeks = max(0, WEEKS_IN_SEMESTER - current_week)

    for subj in subjects:
        conducted = subj.classes_per_week * current_week
        remaining = subj.classes_per_week * remaining_weeks

        if scenario == "custom_deficit":
            if subj.code == "25ML35T": # FAI
                attended = int(conducted * 0.62)
                od_leaves = 1
            elif subj.code == "25HML34T": # DSP
                attended = int(conducted * 0.65)
                od_leaves = 0
            elif subj.code == "25HCS32T": # OOPS
                attended = int(conducted * 0.76)
                od_leaves = 1
            elif subj.code == "25MA05IT": # LADS
                attended = int(conducted * 0.85)
                od_leaves = 1
            else:
                attended = int(conducted * 0.88)
                od_leaves = 1
        elif scenario == "critical_all":
            attended = int(conducted * random.uniform(0.50, 0.68))
            od_leaves = random.choice([0, 1])
        elif scenario == "borderline":
            attended = int(conducted * random.uniform(0.73, 0.77))
            od_leaves = 1
        else: # safe
            attended = int(conducted * random.uniform(0.88, 0.96))
            od_leaves = random.choice([1, 2])

        attended = max(0, min(conducted, attended))
        
        state = SubjectAttendanceState(
            subject=subj,
            conducted=conducted,
            attended=attended,
            approved_od_leaves=od_leaves,
            remaining_classes=remaining
        )
        profile.subject_states[subj.code] = state

    return profile
