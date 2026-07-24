#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

REMOTE_HOST="${EASY_TEACH_DEPLOY_REMOTE:-qfy-sc-test}"
SITE_DOMAIN="${EASY_TEACH_DEPLOY_DOMAIN:-e-teach.codelib.cc}"
REMOTE_ROOT="${EASY_TEACH_DEPLOY_ROOT:-/srv/easy-teaching/testing}"
KEEP_RELEASES="${EASY_TEACH_KEEP_RELEASES:-3}"
SKIP_BUILD="${EASY_TEACH_SKIP_BUILD:-0}"

ARTIFACT_DIR="$ROOT_DIR/.artifacts"
ARTIFACT_NAME="easy-teaching-web-testing.tar.gz"
ARTIFACT_PATH="$ARTIFACT_DIR/$ARTIFACT_NAME"

REMOTE_RELEASES_DIR="$REMOTE_ROOT/releases"
REMOTE_CURRENT_LINK="$REMOTE_ROOT/current"
REMOTE_ARTIFACT_PATH="$REMOTE_RELEASES_DIR/$ARTIFACT_NAME"
REMOTE_CADDY_FILE="/etc/caddy/Caddyfile.d/${SITE_DOMAIN}.caddy"

usage() {
  cat <<'EOF'
用法：
  ./scripts/deploy-testing.sh [--remote <ssh-host>] [--domain <domain>] [--root <remote-root>] [--skip-build]

默认值：
  --remote qfy-sc-test
  --domain e-teach.codelib.cc
  --root   /srv/easy-teaching/testing
EOF
}

run() {
  echo "==> $*"
  "$@"
}

local_sha256() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    echo "当前系统缺少 shasum/sha256sum，无法校验构建制品。" >&2
    exit 1
  fi
}

require_clean_worktree() {
  if [ -n "$(git -C "$ROOT_DIR" status --porcelain --untracked-files=all)" ]; then
    echo "部署测试环境前工作区必须干净，请先提交或清理本地改动。" >&2
    exit 1
  fi
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --remote)
        [ "$#" -ge 2 ] || { echo "缺少 --remote 参数值" >&2; exit 1; }
        REMOTE_HOST="$2"
        shift 2
        ;;
      --domain)
        [ "$#" -ge 2 ] || { echo "缺少 --domain 参数值" >&2; exit 1; }
        SITE_DOMAIN="$2"
        REMOTE_CADDY_FILE="/etc/caddy/Caddyfile.d/${SITE_DOMAIN}.caddy"
        shift 2
        ;;
      --root)
        [ "$#" -ge 2 ] || { echo "缺少 --root 参数值" >&2; exit 1; }
        REMOTE_ROOT="$2"
        REMOTE_RELEASES_DIR="$REMOTE_ROOT/releases"
        REMOTE_CURRENT_LINK="$REMOTE_ROOT/current"
        REMOTE_ARTIFACT_PATH="$REMOTE_RELEASES_DIR/$ARTIFACT_NAME"
        shift 2
        ;;
      --skip-build)
        SKIP_BUILD="1"
        shift
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
require_clean_worktree

mkdir -p "$ARTIFACT_DIR"

if [ "$SKIP_BUILD" != "1" ]; then
  run npm --prefix "$ROOT_DIR/web-app" run build
fi

if [ ! -f "$ROOT_DIR/web-app/build/client/index.html" ]; then
  echo "缺少 web-app/build/client/index.html，请先成功构建前端。" >&2
  exit 1
fi

run rm -f "$ARTIFACT_PATH"
run tar -C "$ROOT_DIR/web-app/build/client" -czf "$ARTIFACT_PATH" .

LOCAL_SHA="$(local_sha256 "$ARTIFACT_PATH")"
COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
COMMIT_SHORT="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
BRANCH_NAME="$(git -C "$ROOT_DIR" branch --show-current)"
DEPLOYED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RELEASE_STAMP="$(date -u +"%Y%m%d%H%M%S")"
REMOTE_RELEASE_DIR="$REMOTE_RELEASES_DIR/release-$RELEASE_STAMP"

echo "远端主机：$REMOTE_HOST"
echo "站点域名：$SITE_DOMAIN"
echo "远端目录：$REMOTE_ROOT"
echo "本地制品：$ARTIFACT_PATH"
echo "本地 SHA256：$LOCAL_SHA"

run ssh "$REMOTE_HOST" "set -eu; mkdir -p '$REMOTE_RELEASES_DIR'; if [ -f '$REMOTE_CADDY_FILE' ]; then ts=\$(date +%Y%m%d%H%M%S); cp '$REMOTE_CADDY_FILE' '${REMOTE_CADDY_FILE}.bak-'\$ts; fi"
run scp "$ARTIFACT_PATH" "$REMOTE_HOST:$REMOTE_ARTIFACT_PATH"

REMOTE_SHA="$(ssh "$REMOTE_HOST" "sha256sum '$REMOTE_ARTIFACT_PATH' | awk '{print \$1}'")"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "远端制品 SHA256 不一致：$REMOTE_SHA" >&2
  exit 1
fi
echo "远端 SHA256 校验通过。"

run ssh "$REMOTE_HOST" \
  "SITE_DOMAIN='$SITE_DOMAIN' REMOTE_ROOT='$REMOTE_ROOT' REMOTE_RELEASE_DIR='$REMOTE_RELEASE_DIR' REMOTE_RELEASES_DIR='$REMOTE_RELEASES_DIR' REMOTE_CURRENT_LINK='$REMOTE_CURRENT_LINK' REMOTE_ARTIFACT_PATH='$REMOTE_ARTIFACT_PATH' REMOTE_CADDY_FILE='$REMOTE_CADDY_FILE' COMMIT_SHA='$COMMIT_SHA' COMMIT_SHORT='$COMMIT_SHORT' BRANCH_NAME='$BRANCH_NAME' DEPLOYED_AT_UTC='$DEPLOYED_AT_UTC' KEEP_RELEASES='$KEEP_RELEASES' sh -s" <<'REMOTE_SCRIPT'
set -eu

SITE_DOMAIN="${SITE_DOMAIN:?set SITE_DOMAIN}"
REMOTE_ROOT="${REMOTE_ROOT:?set REMOTE_ROOT}"
REMOTE_RELEASE_DIR="${REMOTE_RELEASE_DIR:?set REMOTE_RELEASE_DIR}"
REMOTE_RELEASES_DIR="${REMOTE_RELEASES_DIR:?set REMOTE_RELEASES_DIR}"
REMOTE_CURRENT_LINK="${REMOTE_CURRENT_LINK:?set REMOTE_CURRENT_LINK}"
REMOTE_ARTIFACT_PATH="${REMOTE_ARTIFACT_PATH:?set REMOTE_ARTIFACT_PATH}"
REMOTE_CADDY_FILE="${REMOTE_CADDY_FILE:?set REMOTE_CADDY_FILE}"
COMMIT_SHA="${COMMIT_SHA:?set COMMIT_SHA}"
COMMIT_SHORT="${COMMIT_SHORT:?set COMMIT_SHORT}"
BRANCH_NAME="${BRANCH_NAME:?set BRANCH_NAME}"
DEPLOYED_AT_UTC="${DEPLOYED_AT_UTC:?set DEPLOYED_AT_UTC}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"

for command_name in tar caddy systemctl sha256sum curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "服务器缺少命令：$command_name" >&2
    exit 1
  fi
done

mkdir -p "$REMOTE_RELEASE_DIR"
rm -rf "$REMOTE_RELEASE_DIR"/*
tar -xzf "$REMOTE_ARTIFACT_PATH" -C "$REMOTE_RELEASE_DIR"

cat >"$REMOTE_RELEASE_DIR/version.json" <<EOF
{
  "project": "easy-teaching",
  "environment": "testing",
  "domain": "$SITE_DOMAIN",
  "branch": "$BRANCH_NAME",
  "commit": "$COMMIT_SHA",
  "commitShort": "$COMMIT_SHORT",
  "deployedAt": "$DEPLOYED_AT_UTC"
}
EOF

cat >"$REMOTE_CADDY_FILE" <<EOF
$SITE_DOMAIN {
  encode zstd gzip

  handle /version.json {
    root * $REMOTE_CURRENT_LINK
    header Cache-Control "no-store, max-age=0"
    file_server
  }

  @existing_assets {
    path /assets/* /brand/*
    file {
      root $REMOTE_CURRENT_LINK
      try_files {path}
    }
  }

  handle @existing_assets {
    root * $REMOTE_CURRENT_LINK
    header Cache-Control "public, max-age=31536000, immutable"
    file_server
  }

  handle {
    root * $REMOTE_CURRENT_LINK
    try_files {path} /index.html
    header Cache-Control "no-cache, max-age=0, must-revalidate"
    file_server
  }
}
EOF

ln -sfn "$REMOTE_RELEASE_DIR" "$REMOTE_CURRENT_LINK"

caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

old_releases="$(ls -1dt "$REMOTE_RELEASES_DIR"/release-* 2>/dev/null | tail -n +"$((KEEP_RELEASES + 1))" || true)"
if [ -n "$old_releases" ]; then
  echo "$old_releases" | while IFS= read -r release_dir; do
    rm -rf "$release_dir"
  done
fi

test -f "$REMOTE_CURRENT_LINK/index.html"
status_line="$(curl -sSI -H "Host: $SITE_DOMAIN" http://127.0.0.1/ | head -n 1)"
case "$status_line" in
  *" 200 "*|*" 308 "*)
    ;;
  *)
    echo "站点本机探测未返回预期状态：$status_line" >&2
    exit 1
    ;;
esac
REMOTE_SCRIPT

echo "测试环境部署完成：$REMOTE_HOST -> https://$SITE_DOMAIN"
echo "本次提交：$COMMIT_SHORT"
