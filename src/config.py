"""
Official Curriculum and Timetable Configuration.
Department of CSE – Artificial Intelligence and Machine Learning
Year II / Sem III / Sec A | Hall No: J202 | Class-In-Charge: Mrs. J Mary Hanna Priyadharshini, AP
Seed: 113025148009 | Student ID: VH15227
"""

REGISTER_NUMBER: int = 113025148009
STUDENT_ID: str = "VH15227"
WEEKS_IN_SEMESTER: int = 15
MIN_ATTENDANCE_THRESHOLD: float = 75.0
SAFE_ATTENDANCE_THRESHOLD: float = 80.0
WARNING_THRESHOLD: float = 79.9
WORKLOAD_DIFFICULTY_WEIGHT: float = 1.2
HIGH_CREDIT_PRIORITY_WEIGHT: float = 1.5

# Official Theory & Practical Course Catalog
OFFICIAL_COURSES = [
    {
        "code": "25MA05IT",
        "name": "Linear Algebra for Data science",
        "acronym": "LADS",
        "type": "Theory",
        "ltpc": "3 0 1 4",
        "credits": 4,
        "classes_per_week": 5,
        "hours_per_week": 5,
        "faculty": "Dr. Siva Kumar T., AP/Maths",
        "difficulty": 0.85
    },
    {
        "code": "25ML35T",
        "name": "Foundations of Artificial Intelligence",
        "acronym": "FAI",
        "type": "Theory",
        "ltpc": "3 0 0 3",
        "credits": 3,
        "classes_per_week": 4,
        "hours_per_week": 4,
        "faculty": "Dr. Manoj Kumar D S, ASP/CSE(AI&ML)",
        "difficulty": 0.80
    },
    {
        "code": "25HML34T",
        "name": "Data Structures using Python",
        "acronym": "DSP",
        "type": "Theory",
        "ltpc": "3 0 0 3",
        "credits": 3,
        "classes_per_week": 4,
        "hours_per_week": 4,
        "faculty": "Mrs. J Mary Hanna Priyadharshini, AP/CSE(AI&ML)",
        "difficulty": 0.75
    },
    {
        "code": "25HCS32T",
        "name": "Object Oriented Programming using Java",
        "acronym": "OOPS",
        "type": "Theory",
        "ltpc": "3 0 0 3",
        "credits": 3,
        "classes_per_week": 4,
        "hours_per_week": 4,
        "faculty": "Mrs. Noorul Julaiha A G, AP/CSE(AI&ML)",
        "difficulty": 0.75
    },
    {
        "code": "25ML33IT",
        "name": "Introduction to Data Science",
        "acronym": "IDS",
        "type": "Theory",
        "ltpc": "3 0 1 4",
        "credits": 4,
        "classes_per_week": 4,
        "hours_per_week": 4,
        "faculty": "Mrs. J Mary Hanna Priyadharshini, AP/CSE(AI&ML)",
        "difficulty": 0.70
    },
    {
        "code": "25HCS37P",
        "name": "Object Oriented Programming using Java Laboratory",
        "acronym": "OOPSL",
        "type": "Practical",
        "ltpc": "0 0 4 2",
        "credits": 2,
        "classes_per_week": 4,
        "hours_per_week": 4,
        "faculty": "Mr. P Lokesh & Mrs. S. Kavitha Rani",
        "difficulty": 0.60
    },
    {
        "code": "25HML38P",
        "name": "Data Structures using Python Laboratory",
        "acronym": "DSPL",
        "type": "Practical",
        "ltpc": "0 0 4 2",
        "credits": 2,
        "classes_per_week": 4,
        "hours_per_week": 4,
        "faculty": "Mrs. J Mary Hanna Priyadharshini & Mr. Sanjay Raj R",
        "difficulty": 0.60
    }
]

# Alias for backwards compatibility
DEFAULT_SUBJECTS = OFFICIAL_COURSES

# Official Weekly Timetable Matrix
TIMETABLE_PERIODS = [
    {"period": 1, "time": "8.15 - 9.05"},
    {"period": 2, "time": "9.05 - 9.55"},
    {"period": 3, "time": "10.10 - 11.00"},
    {"period": 4, "time": "11.00 - 11.50"},
    {"period": 5, "time": "11.50 - 12.35"},
    {"period": 6, "time": "1.15 - 2.00"},
    {"period": 7, "time": "2.00 - 2.45"},
    {"period": 8, "time": "2.45 - 3.30"}
]

OFFICIAL_WEEKLY_SCHEDULE = {
    "MON": ["FAI", "DSP", "MP I / L203", "MP I / L203", "MP I / L203", "L1", "LADS", "IDSL"],
    "TUE": ["IDSL / L203", "IDSL / L203", "DSP", "Q1", "LADS", "FAI", "DSP", "OOPS"],
    "WED": ["OOPS", "DSPL", "DSPL / L203", "DSPL / L203", "DSPL / L203", "LADS", "LADS", "FAI"],
    "THURS": ["DSP", "OOPS", "MP I / L203", "MP I / L203", "MP I / L203", "CSD 1", "CSD 1", "OOPS"],
    "FRI": ["LADS", "OOPSL", "OOPSL / L203", "OOPSL / L203", "OOPSL / L203", "FAI", "IDSL", "Lib/Sports"]
}
