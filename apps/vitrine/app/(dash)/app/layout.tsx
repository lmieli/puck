import Link from "next/link";
import { logout } from "@/app/actions";
import { requireUser } from "@/lib/auth";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div className="d-shell">
      <header className="d-topbar">
        <Link href="/app" className="d-logo">
          Vitrine
        </Link>
        <nav className="d-topnav">
          <Link href="/app">Sites</Link>
          {!!user.is_super_admin && (
            <Link href="/app/admin">IA e créditos</Link>
          )}
        </nav>
        <div className="d-user">
          <span className="d-avatar" aria-hidden>
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="d-user-name">
            {user.name}
            <small>{user.is_super_admin ? "Agência" : "Cliente"}</small>
          </span>
          <form action={logout}>
            <button className="d-btn d-btn-ghost d-btn-sm" type="submit">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="d-main">{children}</main>
    </div>
  );
}
