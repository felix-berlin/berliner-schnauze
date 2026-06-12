#!/usr/bin/env python3
import json

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": (
            "TOOL CHECKLIST: "
            "(1) Codebase exploration → graphify query \"<q>\" via Bash FIRST, before Grep/Glob/Read. "
            "(2) Symbol/definition lookup → ToolSearch(\"select:mcp__serena__find_symbol,mcp__serena__find_declaration\") then call tool. "
            "(3) Past sessions/history → ToolSearch(\"select:mcp__plugin_claude-mem_mcp-search____IMPORTANT,"
            "mcp__plugin_claude-mem_mcp-search__search\") → call ____IMPORTANT → then search()."
        )
    }
}))
