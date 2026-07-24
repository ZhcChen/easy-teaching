---
title: 可视化教学测试环境部署运行手册
type: runbook
status: active
date: 2026-07-24
---

# 可视化教学测试环境部署运行手册

本文记录 `easy-teaching` Web 静态站点的测试环境部署方式。

## 环境口径

```text
仓库：easy-teaching
部署模块：web-app
部署服务器别名：qfy-sc-test
测试域名：e-teach.codelib.cc
站点根目录：/srv/easy-teaching/testing
发布目录：/srv/easy-teaching/testing/releases
当前软链：/srv/easy-teaching/testing/current
Caddy 站点文件：/etc/caddy/Caddyfile.d/e-teach.codelib.cc.caddy
静态构建目录：web-app/build/client
```

## 部署原则

- 仅部署纯静态前端，不在服务器执行 Node 构建。
- Caddy 通过单独的 `Caddyfile.d/*.caddy` 文件接入，不修改其他项目站点块。
- 每次发布生成独立 release 目录，再切换 `current` 软链，降低回滚成本。
- 默认保留最近 3 个 release 目录。

## 一键部署

```bash
./scripts/deploy-testing.sh
```

默认行为：

- 本地工作区必须干净。
- 自动执行 `npm --prefix web-app run build`。
- 将 `web-app/build/client` 打包上传到测试机。
- 远端解压到新的 release 目录。
- 生成 `/version.json`。
- 更新独立 Caddy 站点文件并 reload。

## 可选参数

指定其他服务器：

```bash
./scripts/deploy-testing.sh --remote <ssh-host>
```

可选覆盖：

```bash
./scripts/deploy-testing.sh --remote qfy-sc-test --domain e-teach.codelib.cc --root /srv/easy-teaching/testing
```

跳过本地构建：

```bash
./scripts/deploy-testing.sh --skip-build
```

或使用环境变量：

```bash
EASY_TEACH_DEPLOY_REMOTE=qfy-sc-test \
EASY_TEACH_DEPLOY_DOMAIN=e-teach.codelib.cc \
EASY_TEACH_DEPLOY_ROOT=/srv/easy-teaching/testing \
EASY_TEACH_KEEP_RELEASES=3 \
./scripts/deploy-testing.sh
```

## Caddy 模板

仓库内模板文件：

```text
deploy/testing/Caddyfile.e-teach.codelib.cc.example
```

实际部署时脚本会根据当前参数直接生成远端站点文件：

```text
/etc/caddy/Caddyfile.d/e-teach.codelib.cc.caddy
```

## 验证命令

远端验证：

```bash
curl -I -H 'Host: e-teach.codelib.cc' http://127.0.0.1/
cat /srv/easy-teaching/testing/current/version.json
```

外部验证：

```bash
curl -fsS https://e-teach.codelib.cc/version.json
curl -I https://e-teach.codelib.cc/
```

如果外部验证失败，先检查域名当前是否已经解析到测试机公网 IP。

## 后续口径

后续用户说“部署测试环境”，默认就是执行：

```bash
./scripts/deploy-testing.sh
```
