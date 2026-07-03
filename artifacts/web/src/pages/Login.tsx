import { useState } from "react";
import { useLocation } from "wouter";
import { Boxes, Lock, Mail } from "lucide-react";
import { useStore } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

export function LoginPage() {
  const { login } = useStore();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await login(email, password);
    setBusy(false);
    if (ok) navigate("/");
    else toast.error("Credenciales inválidas", { description: "Verifica el correo y la contraseña." });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0D47A1] to-[#1565C0] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Boxes className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold">InventControl</h1>
          <p className="mt-1 text-sm text-white/70">Consola de gestión de inventario</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-card p-6 shadow-xl">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="tucorreo@inv.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
