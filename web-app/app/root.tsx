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

import { ThemeToggle } from "./components/theme-toggle";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const theme = localStorage.getItem("easy-teaching-theme") || "light";
                document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
              } catch (error) {
                document.documentElement.dataset.theme = "light";
              }
            })();`,
          }}
        />
      </head>
      <body className="app-body antialiased">
        <div className="app-shell">
          <header className="app-header">
            <div className="app-header-main">
              <div className="app-brand">
                <span className="brand-pill">Easy Teaching</span>
                <div className="app-brand-copy">
                  <h1 className="app-title">可视化教学</h1>
                  <p className="app-description">
                    以 PC 为核心的简约科技风教学入口，先从学段、学科和知识点卡片开始，再进入具体可视化页面。
                  </p>
                </div>
              </div>
              <div className="app-header-tools">
                <nav className="app-nav" aria-label="主导航">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        isActive ? "app-nav-link is-active" : "app-nav-link"
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="app-status">
                  <ThemeToggle />
                  <div className="status-note">
                    <p>默认亮色</p>
                    <p>支持亮 / 暗主题</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <main className="app-main">{children}</main>
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
    <main className="surface-panel border-danger p-6">
      <h1 className="text-2xl font-semibold text-[var(--danger-text)]">{message}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--danger-copy)]">{details}</p>
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-xs text-[var(--text-secondary)]">
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
