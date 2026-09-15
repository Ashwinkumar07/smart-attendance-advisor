"""
Professional REST API & Web Server for Multi-Student Smart Attendance Advisor.
Backed by official CSE AI&ML timetable, persistent data store, and real-time attendance logging.
"""

import os
import sys
import json

# Ensure root directory is on sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from src.data_store import (
    load_raw_data,
    get_all_student_profiles,
    get_single_student_profile,
    upsert_student,
    delete_student,
    upsert_course,
    delete_course,
    quick_mark_attendance
)
from src.risk_analyzer import AttendanceRiskAnalyzer
from src.astar_planner import AStarAttendancePlanner
from src.baseline_search import GreedyBestFirstPlanner, UniformCostPlanner
from src.config import (
    REGISTER_NUMBER,
    STUDENT_ID,
    OFFICIAL_COURSES,
    OFFICIAL_WEEKLY_SCHEDULE,
    TIMETABLE_PERIODS
)

WEB_DIR = os.path.join(PROJECT_ROOT, "web")


class AdvisorDashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def _send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        self._send_json({"status": "ok"})

    def do_GET(self):
        parsed = urlparse(self.path)
        path_parts = [p for p in parsed.path.split("/") if p]

        # 1. GET /api/timetable - Returns official schedule matrix
        if parsed.path == "/api/timetable":
            return self._send_json({
                "department": "CSE – Artificial Intelligence and Machine Learning",
                "academic_year": "2026–2027, ODD SEMESTER",
                "year_sem_sec": "II / III / A",
                "hall_no": "J202",
                "class_in_charge": "Mrs. J Mary Hanna Priyadharshini, AP",
                "periods": TIMETABLE_PERIODS,
                "schedule": OFFICIAL_WEEKLY_SCHEDULE,
                "courses": OFFICIAL_COURSES
            })

        # 2. GET /api/students - List all student profiles
        elif parsed.path == "/api/students":
            profiles = get_all_student_profiles()
            roster_list = []
            for s_id, profile in profiles.items():
                roster_list.append({
                    "student_id": profile.student_id,
                    "register_no": profile.register_no,
                    "name": profile.name,
                    "overall_percentage": profile.overall_percentage,
                    "overall_risk_tier": profile.overall_risk_tier.value,
                    "current_week": profile.current_week,
                    "total_courses": len(profile.subject_states)
                })
            return self._send_json(roster_list)

        # 3. GET /api/students/<student_id> - Full student attendance audit
        elif len(path_parts) == 3 and path_parts[0] == "api" and path_parts[1] == "students":
            s_id = path_parts[2]
            profile = get_single_student_profile(s_id)
            if not profile:
                return self._send_json({"error": "Student not found"}, 404)
            
            raw_all = load_raw_data()
            raw_student = raw_all.get(s_id, {})
            raw_subjects = raw_student.get("subjects", {})

            analysis = AttendanceRiskAnalyzer.analyze_profile(profile)
            
            # Enrich subject breakdown with faculty, acronym, and bunked details
            for item in analysis["subject_breakdown"]:
                c_code = item["code"]
                raw_c = raw_subjects.get(c_code, {})
                item["acronym"] = raw_c.get("acronym", c_code)
                item["faculty"] = raw_c.get("faculty", "Department Faculty")
                item["bunked"] = raw_c.get("bunked", max(0, item["conducted"] - item["attended"]))
                item["hours_per_week"] = raw_c.get("hours_per_week", 4)
                item["type"] = raw_c.get("type", "Theory")

            analysis["department"] = raw_student.get("department", "CSE - AI & ML")
            analysis["year_sem_sec"] = raw_student.get("year_sem_sec", "II / III / A")
            analysis["hall_no"] = raw_student.get("hall_no", "J202")
            analysis["class_in_charge"] = raw_student.get("class_in_charge", "Mrs. J Mary Hanna Priyadharshini, AP")

            return self._send_json(analysis)

        # 4. GET /api/students/<student_id>/solve?algorithm=astar
        elif len(path_parts) == 4 and path_parts[0] == "api" and path_parts[1] == "students" and path_parts[3] == "solve":
            s_id = path_parts[2]
            profile = get_single_student_profile(s_id)
            if not profile:
                return self._send_json({"error": "Student not found"}, 404)

            if len(profile.subject_states) == 0:
                return self._send_json({
                    "algorithm_name": "A* Heuristic Search (Optimal)",
                    "is_feasible": True,
                    "nodes_expanded": 0,
                    "execution_time_ms": 0.0,
                    "total_cost": 0.0,
                    "recommended_schedule": {},
                    "projected_percentages": {},
                    "advisory_notes": ["No courses currently enrolled. Add courses above to generate recovery plans."]
                })

            qs = parse_qs(parsed.query)
            algo = qs.get("algorithm", ["astar"])[0]

            if algo == "greedy":
                planner = GreedyBestFirstPlanner()
            elif algo == "ucs":
                planner = UniformCostPlanner()
            else:
                planner = AStarAttendancePlanner()

            result = planner.solve(profile)
            return self._send_json({
                "algorithm_name": result.algorithm_name,
                "is_feasible": result.is_feasible,
                "nodes_expanded": result.nodes_expanded,
                "execution_time_ms": result.execution_time_ms,
                "total_cost": result.total_cost,
                "recommended_schedule": result.recommended_schedule,
                "projected_percentages": result.projected_percentages,
                "advisory_notes": result.advisory_notes
            })

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path_parts = [p for p in parsed.path.split("/") if p]
        content_length = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
        data = json.loads(post_body) if post_body else {}

        # 1. POST /api/students - Add or edit student
        if parsed.path == "/api/students":
            student_id = data.get("student_id", "").strip()
            name = data.get("name", "").strip()
            reg_no = int(data.get("register_no", 0))
            current_week = int(data.get("current_week", 9))

            if not student_id or not name:
                return self._send_json({"error": "Missing student_id or name"}, 400)

            saved = upsert_student(student_id, name, reg_no, current_week)
            return self._send_json({"status": "success", "student": saved})

        # 2. POST /api/students/<student_id>/subjects/<course_code>/mark - Quick Attendance Action
        elif len(path_parts) == 6 and path_parts[0] == "api" and path_parts[1] == "students" and path_parts[3] == "subjects" and path_parts[5] == "mark":
            s_id = path_parts[2]
            code = path_parts[4].upper()
            action = data.get("action", "attend") # 'attend', 'bunk', 'od', 'undo'
            try:
                updated_subj = quick_mark_attendance(s_id, code, action)
                return self._send_json({"status": "success", "action": action, "subject": updated_subj})
            except Exception as e:
                return self._send_json({"error": str(e)}, 400)

        # 3. POST /api/students/<student_id>/subjects - Add or update a course
        elif len(path_parts) == 4 and path_parts[0] == "api" and path_parts[1] == "students" and path_parts[3] == "subjects":
            s_id = path_parts[2]
            code = data.get("code", "").strip().upper()
            if not code:
                return self._send_json({"error": "Missing course code"}, 400)

            saved = upsert_course(s_id, data)
            return self._send_json({"status": "success", "course": saved})

        return self._send_json({"error": "Invalid endpoint"}, 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path_parts = [p for p in parsed.path.split("/") if p]

        # 1. DELETE /api/students/<student_id>/subjects/<code>
        if len(path_parts) == 5 and path_parts[0] == "api" and path_parts[1] == "students" and path_parts[3] == "subjects":
            s_id = path_parts[2]
            code = path_parts[4].upper()
            deleted = delete_course(s_id, code)
            if deleted:
                return self._send_json({"status": "deleted", "code": code})
            return self._send_json({"error": "Course not found"}, 404)

        # 2. DELETE /api/students/<student_id>
        elif len(path_parts) == 3 and path_parts[0] == "api" and path_parts[1] == "students":
            s_id = path_parts[2]
            deleted = delete_student(s_id)
            if deleted:
                return self._send_json({"status": "deleted", "student_id": s_id})
            return self._send_json({"error": "Student not found"}, 404)

        return self._send_json({"error": "Invalid endpoint"}, 404)


def run_web_server(port: int = 8000):
    server_address = ("", port)
    httpd = HTTPServer(server_address, AdvisorDashboardHandler)
    print(f"\n" + "="*70)
    print(f"  SMART ATTENDANCE ADVISOR - OFFICIAL CSE AI&ML SEM III PORTAL")
    print(f"  Live UI: http://localhost:{port}")
    print(f"  Hall: J202 | In-Charge: Mrs. J Mary Hanna Priyadharshini, AP")
    print(f"="*70 + "\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down gracefully.")
        httpd.server_close()


if __name__ == "__main__":
    run_web_server(8000)
