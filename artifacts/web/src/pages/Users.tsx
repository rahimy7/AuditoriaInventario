import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { useStore } from "@/data/store";
import { ROLE_LABELS, type UserRole } from "@/data/types";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RoleBadge, Avatar } from "@/components/common/RoleBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

interface Draft {
  name: string;
  email: string;
  role: UserRole;
  warehouse: string;
  password: string;
  active: boolean;
}

const EMPTY: Draft = { name: "", email: "", role: "auxiliar", warehouse: "", password: "", active: true };
const ROLES: UserRole[] = ["auxiliar", "supervisor", "gerente"];

export function UsersPage() {
  const { user, users, audits, createUser, updateUser, deleteUser, getUserAudits, getSupervisorAudits } = useStore();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "todos">("todos");
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [toDelete, setToDelete] = useState<(typeof users)[number] | null>(null);

  const filtered = useMemo(
    () =>
      users
        .filter((u) => roleFilter === "todos" || u.role === roleFilter)
        .filter(
          (u) =>
            !query.trim() ||
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase()),
        ),
    [users, query, roleFilter],
  );

  const counts = ROLES.map((r) => ({ role: r, n: users.filter((u) => u.role === r).length }));

  const auditCount = (u: (typeof users)[number]) =>
    u.role === "supervisor" ? getSupervisorAudits(u.id).length : u.role === "auxiliar" ? getUserAudits(u.id).length : audits.length;

  const update = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  const save = () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.name.trim() || !d.email.trim()) {
      toast.error("Nombre y correo son obligatorios");
      return;
    }
    if (!editing.id && !d.password.trim()) {
      toast.error("Define una contraseña para el nuevo usuario");
      return;
    }
    if (editing.id) {
      updateUser(editing.id, {
        name: d.name,
        email: d.email,
        role: d.role,
        warehouse: d.warehouse || undefined,
        active: d.active,
        ...(d.password.trim() ? { password: d.password } : {}),
      });
      toast.success("Usuario actualizado");
    } else {
      createUser({ name: d.name, email: d.email, role: d.role, warehouse: d.warehouse || undefined, password: d.password, active: d.active });
      toast.success("Usuario creado");
    }
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Gestión de usuarios"
        description="Control de acceso por rol: auxiliares, supervisores y gerentes."
        actions={
          <Button className="gap-2" onClick={() => setEditing({ id: null, draft: { ...EMPTY } })}>
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {counts.map((c) => (
          <Card key={c.role} className="p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{c.n}</div>
            <div className="text-xs text-muted-foreground">{ROLE_LABELS[c.role]}s</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o correo…" className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "todos")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead className="text-right">Auditorías</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} role={u.role} size={36} />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.warehouse ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">{auditCount(u)}</TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                      style={u.active ? { backgroundColor: "#E8F5E9", color: "#2E7D32" } : { backgroundColor: "#FFEBEE", color: "#C62828" }}
                    >
                      {u.active ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() =>
                        setEditing({
                          id: u.id,
                          draft: { name: u.name, email: u.email, role: u.role, warehouse: u.warehouse ?? "", password: "", active: u.active },
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30"
                      disabled={u.id === user?.id}
                      title={u.id === user?.id ? "No puedes eliminar tu propia cuenta" : "Eliminar"}
                      onClick={() => setToDelete(u)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Sin usuarios
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing?.id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editing?.id ? "Editar usuario" : "Nuevo usuario"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nombre completo</Label>
                <Input value={editing.draft.name} onChange={(e) => update({ name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Correo</Label>
                <Input type="email" value={editing.draft.email} onChange={(e) => update({ email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={editing.draft.role} onValueChange={(v) => update({ role: v as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Almacén</Label>
                <Input value={editing.draft.warehouse} onChange={(e) => update({ warehouse: e.target.value })} placeholder="Opcional" />
              </div>
              <div className="space-y-1.5">
                <Label>{editing.id ? "Nueva contraseña" : "Contraseña"}</Label>
                <Input
                  type="text"
                  value={editing.draft.password}
                  onChange={(e) => update({ password: e.target.value })}
                  placeholder={editing.id ? "Dejar en blanco para conservar" : "••••"}
                />
              </div>
              <div className="flex items-end justify-between gap-3 rounded-lg border p-3 sm:col-span-2">
                <div>
                  <Label>Cuenta activa</Label>
                  <p className="text-xs text-muted-foreground">Los usuarios inactivos no pueden iniciar sesión.</p>
                </div>
                <Switch checked={editing.draft.active} onCheckedChange={(v) => update({ active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar usuario"
        description={toDelete ? `Se eliminará la cuenta de "${toDelete.name}".` : ""}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (toDelete) {
            deleteUser(toDelete.id);
            toast.success("Usuario eliminado");
          }
        }}
      />
    </div>
  );
}
