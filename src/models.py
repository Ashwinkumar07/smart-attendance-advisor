"""
Domain models and data structures for the Smart Attendance Advisor System.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum


class RiskTier(str, Enum):
    SAFE = "Safe"                   # >= 80%
    WARNING = "Warning"             # 75% - 79.9%
    CRITICAL_DEFICIT = "Critical"   # < 75%


@dataclass(frozen=True)
class Subject:
    code: str
    name: str
    credits: int
    difficulty: float               # 0.0 to 1.0 (cognitive strain factor)
    classes_per_week: int
    total_planned_classes: int = 60 # Default across full semester


@dataclass
class SubjectAttendanceState:
    subject: Subject
    conducted: int                  # Classes held to date
    attended: int                   # Classes attended
    approved_od_leaves: int = 0     # On-duty / medical excused leaves
    remaining_classes: int = 0      # Scheduled future classes

    @property
    def total_effective_attended(self) -> int:
        return self.attended + self.approved_od_leaves

    @property
    def current_percentage(self) -> float:
        if self.conducted == 0:
            return 100.0  # Zero classes conducted default
        return round((self.total_effective_attended / self.conducted) * 100.0, 2)

    @property
    def total_potential_classes(self) -> int:
        return self.conducted + self.remaining_classes

    @property
    def max_achievable_percentage(self) -> float:
        total = self.total_potential_classes
        if total == 0:
            return 100.0
        return round(((self.total_effective_attended + self.remaining_classes) / total) * 100.0, 2)

    @property
    def risk_tier(self) -> RiskTier:
        pct = self.current_percentage
        if pct >= 80.0:
            return RiskTier.SAFE
        elif pct >= 75.0:
            return RiskTier.WARNING
        return RiskTier.CRITICAL_DEFICIT

    def classes_needed_for_target(self, target_pct: float = 75.0) -> int:
        """
        Calculate consecutive classes required to reach target_pct.
        Formula: ceil((target * conducted - 100 * attended) / (100 - target))
        """
        if self.current_percentage >= target_pct:
            return 0
        numerator = (target_pct * self.conducted) - (100.0 * self.total_effective_attended)
        denominator = 100.0 - target_pct
        if denominator <= 0:
            return 0
        import math
        return max(0, math.ceil(numerator / denominator))

    def max_allowed_bunks(self, target_pct: float = 75.0) -> int:
        """
        Calculate how many classes can be safely skipped while staying >= target_pct.
        Formula: floor((100 * attended - target * conducted) / target)
        """
        if self.current_percentage < target_pct:
            return 0
        numerator = (100.0 * self.total_effective_attended) - (target_pct * self.conducted)
        if target_pct <= 0:
            return 0
        import math
        return max(0, math.floor(numerator / target_pct))


@dataclass
class StudentProfile:
    register_no: int
    student_id: str
    name: str
    current_week: int
    subject_states: Dict[str, SubjectAttendanceState] = field(default_factory=dict)

    @property
    def overall_conducted(self) -> int:
        return sum(s.conducted for s in self.subject_states.values())

    @property
    def overall_attended(self) -> int:
        return sum(s.total_effective_attended for s in self.subject_states.values())

    @property
    def overall_percentage(self) -> float:
        if self.overall_conducted == 0:
            return 100.0
        return round((self.overall_attended / self.overall_conducted) * 100.0, 2)

    @property
    def overall_risk_tier(self) -> RiskTier:
        pct = self.overall_percentage
        if pct >= 80.0:
            return RiskTier.SAFE
        elif pct >= 75.0:
            return RiskTier.WARNING
        return RiskTier.CRITICAL_DEFICIT


@dataclass
class SearchNode:
    """
    Search node for A* and baseline state-space graph search.
    """
    # Key: subject code -> attended count in upcoming recovery plan
    planned_attended: Dict[str, int]
    current_step: int                       # Current slot or week index
    g_cost: float                           # Accumulated effort/workload cost
    h_cost: float                           # Heuristic estimate to goal
    parent: Optional['SearchNode'] = None
    action_taken: Optional[Dict[str, int]] = None # Allocation for this step

    @property
    def f_cost(self) -> float:
        return self.g_cost + self.h_cost

    def __lt__(self, other: 'SearchNode') -> bool:
        return self.f_cost < other.f_cost


@dataclass
class RecoveryPlanResult:
    algorithm_name: str
    is_feasible: bool
    nodes_expanded: int
    execution_time_ms: float
    total_cost: float
    recommended_schedule: Dict[str, int]    # Subject -> classes to attend out of remaining
    projected_percentages: Dict[str, float]
    advisory_notes: List[str] = field(default_factory=list)
