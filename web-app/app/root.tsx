import type { CSSProperties, ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import { ThemeToggle } from "./components/theme-toggle";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/brand/logo-mark.svg" },
  { rel: "icon", type: "image/png", sizes: "144x144", href: "/brand/logo-mark-144.png" },
  { rel: "apple-touch-icon", href: "/brand/logo-mark-144.png" },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const activeNavIndex = getActiveNavIndex(location.pathname);
  const navStyle = {
    "--nav-active-index": activeNavIndex,
    "--nav-item-count": navItems.length,
  } as CSSProperties;

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
          <header className="topbar">
            <div className="topbar-inner">
              <NavLink to="/" end className="brand-link" aria-label="打开首页">
                <span className="brand-mark" aria-hidden="true">
                  <img src="/brand/logo-mark.svg" alt="" className="brand-mark-image" />
                </span>
                <span className="brand-copy">
                  <strong className="brand-title">可视化教学</strong>
                  <span className="brand-subtitle">EASY TEACHING</span>
                </span>
              </NavLink>

              <nav className="topbar-nav" aria-label="主导航" style={navStyle}>
                <span aria-hidden="true" className="topbar-nav-indicator" />
                {navItems.map((item, index) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    aria-current={index === activeNavIndex ? "page" : undefined}
                    className={index === activeNavIndex ? "topbar-link is-active" : "topbar-link"}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="topbar-actions">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="app-main">
            <div className="page-shell">{children}</div>
          </main>
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
    <main className="page-shell">
      <section className="status-panel is-danger">
        <p className="status-kicker">页面异常</p>
        <h1 className="status-title">{message}</h1>
        <p className="status-copy">{details}</p>
        {stack && (
          <pre className="status-stack">
            <code>{stack}</code>
          </pre>
        )}
      </section>
    </main>
  );
}

const navItems = [
  { to: "/", label: "首页", end: true },
  { to: "/content", label: "知识库" },
  { to: "/study", label: "学习" },
  { to: "/me", label: "我的" },
];

function getActiveNavIndex(pathname: string) {
  if (pathname === "/") {
    return 0;
  }

  if (pathname.startsWith("/content") || pathname.startsWith("/visual")) {
    return 1;
  }

  if (pathname.startsWith("/study")) {
    return 2;
  }

  if (pathname.startsWith("/me")) {
    return 3;
  }

  return 0;
}
