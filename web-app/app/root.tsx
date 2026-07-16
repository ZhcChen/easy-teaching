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
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="sticky top-5 z-30 rounded-[30px] border border-cyan-400/15 bg-slate-950/78 px-6 py-5 shadow-[0_24px_64px_rgba(2,6,23,0.42)] backdrop-blur-xl">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-cyan-200 uppercase">
                  Easy Teaching
                </span>
                <div className="mt-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    可视化教学
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                    PC 优先的科技简约风教学入口，先从学段、学科和知识点卡片开始，再进入具体可视化页面。
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 xl:items-end">
                <nav className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        [
                          "rounded-full px-4 py-2 text-sm font-medium transition",
                          isActive
                            ? "bg-cyan-400 text-slate-950"
                            : "text-slate-300 hover:bg-white/7 hover:text-white",
                        ].join(" ")
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3 text-sm text-slate-300">
                  <p>技术基座：React Router 8 + React 19</p>
                  <p>当前目标：PC 首页与可视化页面主体验证</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 py-8">{children}</main>
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
  { to: "/content", label: "知识库" },
  { to: "/study", label: "学习" },
  { to: "/me", label: "我的" },
];
