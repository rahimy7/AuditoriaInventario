import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "@/data/store";
import { ROLE_FULL_LABELS, type UserRole } from "@/data/types";
import { Avatar } from "@/components/common/RoleBadge";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard, roles: ["auxiliar", "supervisor", "gerente"] },
  { href: "/audits", label: "Auditorías", icon: ClipboardList, roles: ["auxiliar", "supervisor", "gerente"] },
  { href: "/metrics", label: "Métricas", icon: BarChart3, roles: ["supervisor", "gerente"] },
  { href: "/products", label: "Productos", icon: Package, roles: ["supervisor", "gerente"] },
  { href: "/locations", label: "Ubicaciones", icon: MapPin, roles: ["supervisor", "gerente"] },
  { href: "/users", label: "Usuarios", icon: Users, roles: ["gerente"] },
  { href: "/activity", label: "Actividad", icon: History, roles: ["supervisor", "gerente"] },
  { href: "/settings", label: "Configuración", icon: Settings, roles: ["auxiliar", "supervisor", "gerente"] },
];

function isActive(current: string, href: string): boolean {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useStore();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;
  const items = NAV.filter((n) => n.roles.includes(user.role));

  const SidebarBody = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
          <Boxes className="h-5 w-5" />
        </span>
        <div>
          <div className="text-[15px] font-bold leading-none">InventControl</div>
          <div className="mt-1 text-[11px] text-white/60">Consola de Gestión</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = isActive(location, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white text-sidebar-primary-foreground shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user.name} role={user.role} size={38} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-[11px] text-white/60">{ROLE_FULL_LABELS[user.role]}</div>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );

  const pageTitle = items.find((n) => isActive(location, n.href))?.label ?? "InventControl";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{SidebarBody}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">{SidebarBody}</div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {user.warehouse ? (
              <span className="hidden items-center gap-1 rounded-full bg-muted px-3 py-1 sm:inline-flex">{user.warehouse}</span>
            ) : null}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
