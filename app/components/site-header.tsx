import Link from "next/link";

import { getSessionUser } from "@/src/lib/auth";

import { Button } from "@/app/components/ui/button";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/apps", label: "Apps" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/status", label: "Status" },
];

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Utility Hub
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-slate-600 hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" size="sm" variant="outline">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/auth/login">
              <Button size="sm">Log in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
