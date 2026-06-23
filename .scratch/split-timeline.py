#!/usr/bin/env python3
"""Split cm-timeline.md into per-ISO-week files."""
import re
import os
from datetime import date
from collections import defaultdict

INPUT = ".scratch/cm-timeline.md"
OUT_DIR = "docs/timeline-weeks"
os.makedirs(OUT_DIR, exist_ok=True)

MONTH_MAP = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

with open(INPUT, encoding="utf-8") as f:
    raw = f.read()

lines = raw.splitlines(keepends=True)

# Preamble = everything before first "### Mon DD, YYYY"
DATE_HEADER = re.compile(r"^### (\w{3}) (\d+), (\d{4})\s*$")

# Count observations in source (lines starting with a digit)
OBS_RE = re.compile(r"^\d+\s")
source_obs = sum(1 for l in lines if OBS_RE.match(l))

preamble_lines = []
day_sections = {}  # date → list of lines (including the ### header)

current_date = None
current_lines = []

for line in lines:
    m = DATE_HEADER.match(line)
    if m:
        if current_date is None:
            preamble_lines = current_lines
        else:
            day_sections[current_date] = current_lines
        mon, day, year = m.group(1), int(m.group(2)), int(m.group(3))
        current_date = date(year, MONTH_MAP[mon], day)
        current_lines = [line]
    else:
        current_lines.append(line)

if current_date is not None:
    day_sections[current_date] = current_lines

# Group days by ISO week
week_days = defaultdict(list)
for d in sorted(day_sections.keys()):
    iso = d.isocalendar()
    key = (iso.year, iso.week)
    week_days[key].append(d)

# Write weekly files
preamble = "".join(preamble_lines)
weeks_sorted = sorted(week_days.keys())
week_files = []

for year, week in weeks_sorted:
    days = sorted(week_days[(year, week)])
    start = days[0]
    end = days[-1]
    label = f"{year}-W{week:02d}-{start.strftime('%b%d')}-to-{end.strftime('%b%d')}"
    filename = f"{label}.md"
    filepath = os.path.join(OUT_DIR, filename)

    content = preamble
    for d in days:
        content += "".join(day_sections[d])

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    obs_count = sum(1 for l in content.splitlines() if OBS_RE.match(l))
    week_files.append((filename, year, week, start, end, obs_count))
    print(f"  {filename}: {len(days)} day(s), {obs_count} obs")

# Dual-pass sanity check
distributed = sum(x[5] for x in week_files)
print(f"\nSource obs: {source_obs}, distributed: {distributed}", end="")
if source_obs == distributed:
    print(" ✓")
else:
    print(f" MISMATCH!")

# Write README index
readme_lines = ["# Weekly Timeline Index\n\n",
                "| # | Week | Dates | Observations | File |\n",
                "|---|------|-------|--------------|------|\n"]
for i, (fn, year, week, start, end, obs) in enumerate(week_files, 1):
    dates = f"{start.strftime('%b %d')} – {end.strftime('%b %d, %Y')}"
    readme_lines.append(f"| {i} | W{week:02d}/{year} | {dates} | {obs} | [{fn}]({fn}) |\n")

with open(os.path.join(OUT_DIR, "README.md"), "w", encoding="utf-8") as f:
    f.writelines(readme_lines)

print(f"\n{len(week_files)} weekly files written to {OUT_DIR}/")
print(f"README: {OUT_DIR}/README.md")
