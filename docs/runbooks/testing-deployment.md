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

## 首次初始化

首次接入测试机或需要重建 Caddy 站点文件时，执行：

```bash
./scripts/init-testing-env.sh
```

可选指定服务器：

```bash
./scripts/init-testing-env.sh --remote <ssh-host>
```

初始化内容：

- 创建 `/srv/easy-teaching/testing/releases`
- 下发独立 Caddy 站点文件
- `caddy validate`
- `systemctl reload caddy`

## 日常部署

```bash
./scripts/deploy-testing.sh
```

默认行为：

- 本地工作区必须干净。
- 自动执行 `npm --prefix web-app run build`。
- 将 `web-app/build/client` 打包上传到测试机。
- 远端解压到新的 release 目录。
- 生成 `/version.json`。
- 切换 `current` 软链。
- 用服务器本机 Host 探测验证静态站点。

## 可选参数

指定其他服务器：

```bash
./scripts/deploy-testing.sh --remote <ssh-host>
```

## Caddy 模板

仓库内模板文件：

```text
deploy/testing/Caddyfile.e-teach.codelib.cc.example
```

初始化脚本会把它下发成远端站点文件：

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
