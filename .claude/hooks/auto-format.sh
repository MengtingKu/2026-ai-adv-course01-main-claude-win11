#!/bin/bash
# Auto-format JS files after editing (requires prettier)

input=$(cat)
file_path=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

if [ -z "$file_path" ]; then
  exit 0
fi

if [[ "$file_path" == *.js ]]; then
  if command -v prettier &> /dev/null; then
    prettier --write "$file_path" 2>/dev/null || true
  fi
fi

exit 0
