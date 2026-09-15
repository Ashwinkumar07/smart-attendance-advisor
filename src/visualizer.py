"""
Static Visualizer & Chart Generator for Academic Reports & Analysis.
Generates publication-quality charts in `docs/plots/`.
"""

import os
from typing import List, Dict, Any
import matplotlib.pyplot as plt
import numpy as np
from src.models import StudentProfile, RecoveryPlanResult
from src.astar_planner import AStarAttendancePlanner
from src.baseline_search import GreedyBestFirstPlanner, UniformCostPlanner
from src.config import REGISTER_NUMBER, STUDENT_ID


def ensure_plot_dir(dir_path: str = "docs/plots"):
    os.makedirs(dir_path, exist_ok=True)


def plot_subject_attendance_status(profile: StudentProfile, save_path: str = "docs/plots/subject_attendance.png"):
    """Bar chart with threshold lines showing current vs maximum achievable attendance."""
    ensure_plot_dir(os.path.dirname(save_path))
    
    subjects = list(profile.subject_states.values())
    codes = [s.subject.code for s in subjects]
    current_pcts = [s.current_percentage for s in subjects]
    max_pcts = [s.max_achievable_percentage for s in subjects]

    x = np.arange(len(codes))
    width = 0.35

    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)

    # Color bars based on risk
    colors = ['#ff4d6d' if p < 75.0 else '#ffb703' if p < 80.0 else '#06d6a0' for p in current_pcts]

    rects1 = ax.bar(x - width/2, current_pcts, width, label='Current Attendance (%)', color=colors, edgecolor='black', alpha=0.85)
    rects2 = ax.bar(x + width/2, max_pcts, width, label='Max Achievable (%)', color='#4361ee', edgecolor='black', alpha=0.6)

    # Threshold markers
    ax.axhline(75.0, color='#d90429', linestyle='--', linewidth=1.5, label='Min Threshold (75%)')
    ax.axhline(80.0, color='#2a9d8f', linestyle=':', linewidth=1.5, label='Safe Zone (80%)')

    ax.set_ylabel('Attendance Percentage (%)', fontsize=12, fontweight='bold')
    ax.set_title(f'Subject-Wise Attendance Audit (Reg No: {profile.register_no} | {profile.student_id})', fontsize=13, fontweight='bold', pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels([f"{s.subject.code}\n({s.subject.name[:12]}..)" for s in subjects], fontsize=10)
    ax.set_ylim(0, 105)
    ax.legend(loc='lower right', frameon=True)

    # Value annotations
    for rect in rects1:
        h = rect.get_height()
        ax.annotate(f'{h:.1f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 3), textcoords="offset points", ha='center', va='bottom', fontsize=9, fontweight='bold')

    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()
    return save_path


def plot_algorithm_benchmark(profile: StudentProfile, save_path: str = "docs/plots/algorithm_benchmark.png"):
    """
    Executes A*, Greedy, and UCS benchmarks and plots comparisons.
    """
    ensure_plot_dir(os.path.dirname(save_path))

    astar_res = AStarAttendancePlanner().solve(profile)
    greedy_res = GreedyBestFirstPlanner().solve(profile)
    ucs_res = UniformCostPlanner().solve(profile)

    results = [astar_res, greedy_res, ucs_res]
    algos = ["A* Search (Optimal)", "Greedy Best-First", "Uniform Cost (UCS)"]
    nodes = [r.nodes_expanded for r in results]
    runtimes = [r.execution_time_ms for r in results]
    costs = [r.total_cost for r in results]

    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(14, 4.5), dpi=300)

    # 1. Nodes Expanded
    colors = ['#06d6a0', '#ffd166', '#ef476f']
    ax1.bar(algos, nodes, color=colors, edgecolor='black')
    ax1.set_title('Search Efficiency (Nodes Expanded)', fontweight='bold')
    ax1.set_ylabel('Nodes Expanded')
    ax1.tick_params(axis='x', rotation=15)
    for i, v in enumerate(nodes):
        ax1.text(i, v + max(nodes)*0.02, str(v), ha='center', fontweight='bold')

    # 2. Execution Time
    ax2.bar(algos, runtimes, color=colors, edgecolor='black')
    ax2.set_title('Runtime Latency (Milliseconds)', fontweight='bold')
    ax2.set_ylabel('Time (ms)')
    ax2.tick_params(axis='x', rotation=15)
    for i, v in enumerate(runtimes):
        ax2.text(i, v + max(runtimes)*0.02, f"{v:.2f}ms", ha='center', fontweight='bold')

    # 3. Path Cost / Effort
    ax3.bar(algos, costs, color=colors, edgecolor='black')
    ax3.set_title('Total Recovery Effort (Cost g)', fontweight='bold')
    ax3.set_ylabel('Accumulated Effort Cost')
    ax3.tick_params(axis='x', rotation=15)
    for i, v in enumerate(costs):
        ax3.text(i, v + max(costs)*0.02, f"{v:.1f}", ha='center', fontweight='bold')

    plt.suptitle(f"Search Algorithm Benchmark Comparison (Seed: {REGISTER_NUMBER})", fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()
    return save_path


def generate_all_plots(profile: StudentProfile):
    p1 = plot_subject_attendance_status(profile)
    p2 = plot_algorithm_benchmark(profile)
    return {"subject_plot": p1, "benchmark_plot": p2}
