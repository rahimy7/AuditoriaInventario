export type UserRole = "auxiliar" | "supervisor" | "gerente";

export type AuditStatus =
  | "creado"
  | "asignado"
  | "en_proceso"
  | "enviado"
  | "en_revision"
  | "devuelto"
  | "aprobado"
  | "cerrado";

export type CountStatus = "pendiente" | "contado" | "enviado" | "aprobado" | "devuelto";

export type ActivityEntity = "audit" | "count" | "user" | "product";
