import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <header className="rounded-[28px] border border-white/10 bg-white/5 px-5 py-5 shadow-2xl shadow-slate-950/25 backdrop-blur md:px-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-cyan-200 uppercase">
                  Easy Teaching Web App
                </span>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    可视化教学
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    面向 PC 与 H5 的可视化教学前端基座，当前优先承接物理场景，后续扩展到数学、化学与记忆教学。
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                <p>技术基座：React Router 8 + React 19</p>
                <p>规划能力：本地优先数据、2D / 3D 可视化、PC / H5 自适配</p>
              </div>
            </div>
          </header>
          <nav className="fixed inset-x-4 bottom-4 z-30 mx-auto grid max-w-md grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-2 shadow-2xl shadow-slate-950/40 backdrop-blur md:static md:mt-6 md:max-w-none md:grid-cols-4 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "flex min-h-12 items-center justify-center rounded-xl px-3 text-sm font-medium transition",
                    isActive
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-300 hover:bg-white/8 hover:text-white",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="flex-1 pb-24 pt-6 md:pb-0">{children}</main>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "页面异常";
  let details = "发生了未预期的错误。";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "请求异常";
    details =
      error.status === 404
        ? "访问的页面不存在。"
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6 text-rose-50">
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p className="mt-3 text-sm leading-6 text-rose-100/85">{details}</p>
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded-2xl bg-slate-950/70 p-4 text-xs text-slate-200">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

const navItems = [
  { to: "/", label: "首页", end: true },
  { to: "/content", label: "内容" },
  { to: "/study", label: "学习" },
  { to: "/me", label: "我的" },
];
