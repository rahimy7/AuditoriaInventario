import type {
  ActivityRow,
  AuditRow,
  CountItemRow,
  LocalityRow,
  ProductRow,
  StorageLocationRow,
  UserRow,
  WarehouseRow,
} from "@workspace/db";

export function toUserDTO(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    warehouse: u.warehouse ?? undefined,
    active: u.active,
  };
}

export function toProductDTO(p: ProductRow) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category,
    line: p.line,
    unit: p.unit,
    systemStock: p.systemStock,
    active: p.active,
    imageUrl: p.imageUrl ?? undefined,
  };
}

export function toLocalityDTO(l: LocalityRow) {
  return { id: l.id, name: l.name, code: l.code, active: l.active };
}

export function toWarehouseDTO(w: WarehouseRow) {
  return { id: w.id, localityId: w.localityId, name: w.name, code: w.code, active: w.active };
}

export function toStorageLocationDTO(s: StorageLocationRow) {
  return { id: s.id, warehouseId: s.warehouseId, name: s.name, code: s.code, active: s.active };
}

export function toAuditDTO(a: AuditRow) {
  return {
    id: a.id,
    name: a.name,
    warehouse: a.warehouse,
    location: a.location,
    status: a.status,
    assignedTo: a.assignedTo,
    supervisorId: a.supervisorId,
    createdBy: a.createdBy,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    lines: a.lines,
    categories: a.categories,
    progress: a.progress,
    blindForAuxiliar: a.blindForAuxiliar,
    blindForSupervisor: a.blindForSupervisor,
  };
}

export function toCountItemDTO(i: CountItemRow, product: ProductRow | undefined) {
  return {
    id: i.id,
    auditId: i.auditId,
    productId: i.productId,
    product: product
      ? toProductDTO(product)
      : { id: i.productId, code: "—", name: "Producto eliminado", category: "", line: "", unit: "", systemStock: 0, active: false },
    assignedTo: i.assignedTo,
    location: i.location,
    systemQty: i.systemQty,
    countedQty: i.countedQty,
    notes: i.notes,
    photos: i.photos,
    status: i.status,
    countedAt: i.countedAt ? i.countedAt.toISOString() : undefined,
    reviewNotes: i.reviewNotes ?? undefined,
  };
}

export function toActivityDTO(a: ActivityRow) {
  return {
    id: a.id,
    timestamp: a.timestamp.toISOString(),
    userId: a.userId,
    userName: a.userName,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId,
    detail: a.detail,
  };
}
