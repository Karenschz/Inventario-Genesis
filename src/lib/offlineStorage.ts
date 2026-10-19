import type {
  Herramienta,
  MovimientoInventario,
  Repuesto,
  Sucursal,
  TipoMovimiento,
} from "../types";

export type OfflineChange =
  | { id: string; userId: string; type: "create-part"; value: { localId: string; part: Omit<Repuesto, "id"> } }
  | { id: string; userId: string; type: "update-part"; value: Repuesto }
  | { id: string; userId: string; type: "delete-part"; value: { id: string } }
  | {
      id: string;
      userId: string;
      type: "movement";
      value: {
        repuestoId: string;
        repuestoNombre: string;
        repuestoCodigo: string;
        sucursal: Sucursal;
        tipo: TipoMovimiento;
        cantidad: number;
        stockAnterior: number;
        stockResultante: number;
        motivo: string;
        folioReferencia?: string;
        usuarioId: string;
        usuarioNombre: string;
        notas?: string;
      };
    }
  | { id: string; userId: string; type: "create-tool"; value: { localId: string; tool: Omit<Herramienta, "id"> } }
  | { id: string; userId: string; type: "update-tool"; value: Herramienta }
  | { id: string; userId: string; type: "delete-tool"; value: { id: string } };

export interface OfflineSnapshot {
  repuestos: Repuesto[];
  herramientas: Herramienta[];
  movimientos: MovimientoInventario[];
}

const DATABASE_NAME = "genesis-offline";
const DATABASE_VERSION = 1;
const SNAPSHOTS = "snapshots";
const CHANGES = "changes";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore(SNAPSHOTS, { keyPath: "key" });
      database.createObjectStore(CHANGES, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir el almacenamiento local."));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error ?? new Error("No se pudo acceder al almacenamiento local."));
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Falló la transacción de almacenamiento local."));
    };
  });
}

export async function saveOfflineSnapshot(userId: string, snapshot: OfflineSnapshot): Promise<void> {
  await withStore(SNAPSHOTS, "readwrite", (store) =>
    store.put({ key: userId, snapshot, updatedAt: Date.now() })
  );
}

export async function loadOfflineSnapshot(userId: string): Promise<OfflineSnapshot | null> {
  const value = await withStore<{ snapshot: OfflineSnapshot } | undefined>(
    SNAPSHOTS,
    "readonly",
    (store) => store.get(userId)
  );
  return value?.snapshot ?? null;
}

export async function enqueueOfflineChange(change: OfflineChange): Promise<void> {
  await withStore(CHANGES, "readwrite", (store) => store.put(change));
}

export async function loadOfflineChanges(userId: string): Promise<OfflineChange[]> {
  const values = await withStore<OfflineChange[]>(CHANGES, "readonly", (store) => store.getAll());
  return values
    .filter((change) => change.userId === userId)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function removeOfflineChange(id: string): Promise<void> {
  await withStore(CHANGES, "readwrite", (store) => store.delete(id));
}

export async function remapOfflineEntityId(
  userId: string,
  localId: string,
  serverId: string
): Promise<void> {
  const changes = await loadOfflineChanges(userId);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CHANGES, "readwrite");
    const store = transaction.objectStore(CHANGES);
    for (const change of changes) {
      let updated = change;
      if (change.type === "update-part" && change.value.id === localId) {
        updated = { ...change, value: { ...change.value, id: serverId } };
      } else if (change.type === "delete-part" && change.value.id === localId) {
        updated = { ...change, value: { id: serverId } };
      } else if (change.type === "movement" && change.value.repuestoId === localId) {
        updated = { ...change, value: { ...change.value, repuestoId: serverId } };
      } else if (change.type === "update-tool" && change.value.id === localId) {
        updated = { ...change, value: { ...change.value, id: serverId } };
      } else if (change.type === "delete-tool" && change.value.id === localId) {
        updated = { ...change, value: { id: serverId } };
      }
      if (updated !== change) store.put(updated);
    }
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("No se pudieron actualizar referencias de cambios pendientes."));
    };
  });
}
