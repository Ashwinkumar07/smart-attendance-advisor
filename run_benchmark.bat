@echo off
cd /d "%~dp0"
echo Running Search Algorithms Benchmark (A* vs Greedy vs UCS)...
python src\app.py --benchmark
pause
