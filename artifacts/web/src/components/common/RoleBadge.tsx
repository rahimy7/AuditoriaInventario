import { ROLE_COLORS, ROLE_LABELS, type UserRole } from "@/data/types";

export function RoleBadge({ role }: { role: UserRole }) {
  const color = ROLE_COLORS[role];
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export function Avatar({ name, role, size = 40 }: { name: string; role?: UserRole; size?: number }) {
  const color = role ? ROLE_COLORS[role] : "#1565C0";
  const letter = name.trim().charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, backgroundColor: `${color}1a`, color, fontSize: size * 0.4 }}
    >
      {letter}
    </span>
  );
}
