import { useState } from "react";
import { Database, LogOut, Save } from "lucide-react";
import { useStore } from "@/data/store";
import { ROLE_FULL_LABELS } from "@/data/types";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, RoleBadge } from "@/components/common/RoleBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

export function SettingsPage() {
  const { user, updateUser, resetData, logout } = useStore();
  const [name, setName] = useState(user?.name ?? "");
  const [warehouse, setWarehouse] = useState(user?.warehouse ?? "");
  const [password, setPassword] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  if (!user) return null;

  const saveProfile = () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    updateUser(user.id, {
      name: name.trim(),
      warehouse: warehouse.trim() || undefined,
      ...(password.trim() ? { password: password.trim() } : {}),
    });
    setPassword("");
    toast.success("Perfil actualizado");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <PageHeader title="Configuración" description="Tu perfil y preferencias de la consola." />

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} role={user.role} size={56} />
          <div>
            <div className="text-lg font-bold text-foreground">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="mt-1 flex items-center gap-2">
              <RoleBadge role={user.role} />
              <span className="text-xs text-muted-foreground">{ROLE_FULL_LABELS[user.role]}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h3 className="text-sm font-bold">Editar perfil</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Almacén</Label>
            <Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nueva contraseña</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Dejar en blanco para conservar" />
          </div>
        </div>
        <Button className="gap-2" onClick={saveProfile}>
          <Save className="h-4 w-4" /> Guardar cambios
        </Button>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="text-sm font-bold">Datos y sesión</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="gap-2" onClick={() => setConfirmReset(true)}>
            <Database className="h-4 w-4" /> Restablecer datos de demo
          </Button>
          <Button variant="outline" className="gap-2 text-destructive" onClick={logout}>
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Los datos se guardan localmente en este navegador (localStorage). Restablecer vuelve a la información de demostración inicial.
        </p>
      </Card>

      <div className="text-center text-xs text-muted-foreground">InventControl · Consola Web · v1.0</div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Restablecer datos de demostración"
        description="Se descartarán todos los cambios locales (auditorías, conteos, usuarios y productos) y se restaurará la información inicial."
        confirmLabel="Restablecer"
        destructive
        onConfirm={() => {
          resetData();
          toast.success("Datos restablecidos");
        }}
      />
    </div>
  );
}
