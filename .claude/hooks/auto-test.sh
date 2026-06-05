#!/bin/bash
# Auto-run tests after editing src/ or tests/ files

input=$(cat)
file_path=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

if [ -z "$file_path" ]; then
  exit 0
fi

# Only trigger for source or test files
if [[ "$file_path" == */src/* || "$file_path" == */tests/* ]]; then
  project_root=$(dirname "$0")/../..
  cd "$project_root" && npm test 2>&1
fi

exit 0
