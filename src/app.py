"""
Main Entrypoint & Command-Line Interface (CLI) for Smart Attendance Advisor System.
"""

import os
import sys

# Ensure root directory is always on sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import argparse
from src.config import REGISTER_NUMBER, STUDENT_ID
from src.data_generator import generate_student_profile
from src.risk_analyzer import AttendanceRiskAnalyzer
from src.astar_planner import AStarAttendancePlanner
from src.baseline_search import GreedyBestFirstPlanner, UniformCostPlanner
from src.visualizer import generate_all_plots
from src.server import run_web_server


def display_cli_dashboard(profile):
    analysis = AttendanceRiskAnalyzer.analyze_profile(profile)
    
    print("\n" + "="*78)
    print(f"  SMART ATTENDANCE ADVISOR SYSTEM (AI SEARCH & OPTIMIZATION)")
    print(f"  Register No: {analysis['register_no']} | Student ID: {analysis['student_id']} | Week: {analysis['current_week']}")
    print("="*78)
    
    print(f"\n[GLOBAL STATUS]: Overall Attendance = {analysis['overall_percentage']}% ({analysis['overall_risk_tier'].upper()})")
    print(f"Total Conducted: {analysis['overall_conducted']} | Total Attended: {analysis['overall_attended']}")
    
    if analysis['alerts']:
        print("\n--- [ACTIVE ADVISORY ALERTS] ---")
        for alert in analysis['alerts']:
            print(f"  [!] {alert}")

    print("\n--- [COURSE-BY-COURSE AUDIT] ---")
    headers = f"{'Code':<7} | {'Course Name':<28} | {'Att/Tot':<8} | {'Curr %':<7} | {'Status':<9} | {'Need >=75%':<10}"
    print(headers)
    print("-" * len(headers))

    for s in analysis['subject_breakdown']:
        needed_str = f"+{s['classes_needed_75']} classes" if s['classes_needed_75'] > 0 else "Safe (0)"
        print(f"{s['code']:<7} | {s['name'][:28]:<28} | {s['effective_attended']}/{s['conducted']:<6} | {s['percentage']:>6.1f}% | {s['risk_tier']:<9} | {needed_str:<10}")

    print("\n" + "="*78)


def run_algorithm_benchmark(profile):
    print("\n" + "#"*78)
    print("  RUNNING EMPIRICAL SEARCH ALGORITHM BENCHMARK (A* vs Greedy vs UCS)")
    print("#"*78)

    astar = AStarAttendancePlanner().solve(profile)
    greedy = GreedyBestFirstPlanner().solve(profile)
    ucs = UniformCostPlanner().solve(profile)

    results = [astar, greedy, ucs]
    
    print(f"\n{'Algorithm':<32} | {'Feasible':<8} | {'Nodes Expanded':<14} | {'Runtime (ms)':<12} | {'Effort Cost':<11}")
    print("-" * 86)
    for r in results:
        print(f"{r.algorithm_name:<32} | {str(r.is_feasible):<8} | {r.nodes_expanded:<14} | {r.execution_time_ms:<12.3f} | {r.total_cost:<11.2f}")

    print("\n--- [A* RECOMMENDED RECOVERY SCHEDULE] ---")
    for note in astar.advisory_notes:
        print(f"  -> {note}")
    print("#"*78 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Smart Attendance Advisor System")
    parser.add_argument("--web", action="store_true", help="Launch interactive 3D Web UI Dashboard")
    parser.add_argument("--port", type=int, default=8000, help="Web server port (default: 8000)")
    parser.add_argument("--benchmark", action="store_true", help="Run search algorithms comparison")
    parser.add_argument("--plots", action="store_true", help="Generate publication plots in docs/plots/")
    parser.add_argument("--scenario", type=str, default="custom_deficit", choices=["custom_deficit", "critical_all", "borderline", "safe"], help="Attendance scenario profile")
    args = parser.parse_args()

    profile = generate_student_profile(
        register_no=REGISTER_NUMBER,
        student_id=STUDENT_ID,
        scenario=args.scenario
    )

    if args.plots:
        print("\nGenerating charts in docs/plots/...")
        plots = generate_all_plots(profile)
        print(f"  [+] Saved {plots['subject_plot']}")
        print(f"  [+] Saved {plots['benchmark_plot']}")

    if args.web:
        run_web_server(port=args.port)
        return

    # CLI default mode
    display_cli_dashboard(profile)
    run_algorithm_benchmark(profile)


if __name__ == "__main__":
    main()
