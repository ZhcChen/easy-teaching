#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

REMOTE_HOST="qfy-sc-test"
SITE_DOMAIN="e-teach.codelib.cc"
REMOTE_ROOT="/srv/easy-teaching/testing"
REMOTE_RELEASES_DIR="$REMOTE_ROOT/releases"
REMOTE_CURRENT_LINK="$REMOTE_ROOT/current"
REMOTE_CADDY_FILE="/etc/caddy/Caddyfile.d/${SITE_DOMAIN}.caddy"
LOCAL_CADDY_TEMPLATE="$ROOT_DIR/deploy/testing/Caddyfile.e-teach.codelib.cc.example"

usage() {
  cat <<'EOF'
用法：
  ./scripts/init-testing-env.sh [--remote <ssh-host>]

默认值：
  --remote qfy-sc-test
EOF
}

run() {
  echo "==> $*"
  "$@"
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --remote)
        [ "$#" -ge 2 ] || { echo "缺少 --remote 参数值" >&2; exit 1; }
        REMOTE_HOST="$2"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "未知参数：$1" >&2
        usage >&2
        exit 1
        ;;
    esac
  done
}

parse_args "$@"

if [ ! -f "$LOCAL_CADDY_TEMPLATE" ]; then
  echo "缺少 Caddy 模板：$LOCAL_CADDY_TEMPLATE" >&2
  exit 1
fi

run ssh "$REMOTE_HOST" "set -eu; mkdir -p '$REMOTE_RELEASES_DIR'; if [ ! -L '$REMOTE_CURRENT_LINK' ] && [ ! -d '$REMOTE_CURRENT_LINK' ]; then mkdir -p '$REMOTE_CURRENT_LINK'; fi; if [ -f '$REMOTE_CADDY_FILE' ]; then ts=\$(date +%Y%m%d%H%M%S); cp '$REMOTE_CADDY_FILE' '${REMOTE_CADDY_FILE}.bak-'\$ts; fi"
run scp "$LOCAL_CADDY_TEMPLATE" "$REMOTE_HOST:$REMOTE_CADDY_FILE"
run ssh "$REMOTE_HOST" "set -eu; caddy validate --config /etc/caddy/Caddyfile; systemctl reload caddy"

echo "测试环境初始化完成：$REMOTE_HOST -> $SITE_DOMAIN"
