#!/bin/bash
# Block edits to sensitive files

input=$(cat)
file_path=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

if [ -z "$file_path" ]; then
  exit 0
fi

basename=$(basename "$file_path")

if [[ "$file_path" == *".env" && "$file_path" != *".env.example" ]]; then
  echo "⛔ 拒絕編輯 .env 檔案（含敏感資訊，請手動修改）" >&2
  exit 1
fi

if [[ "$file_path" == *".sqlite" || "$file_path" == *".sqlite-shm" || "$file_path" == *".sqlite-wal" ]]; then
  echo "⛔ 拒絕直接編輯 SQLite 資料庫檔案（請透過 API 或 DB 工具操作）" >&2
  exit 1
fi

if [[ "$basename" == "package-lock.json" ]]; then
  echo "⛔ 拒絕手動編輯 package-lock.json（應由 npm install 自動管理）" >&2
  exit 1
fi

exit 0
