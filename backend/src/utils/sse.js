const clients = new Map(); // ownerId -> Set<res>

export function addSSEClient(ownerId, res) {
  if (!clients.has(ownerId)) clients.set(ownerId, new Set());
  clients.get(ownerId).add(res);
}

export function removeSSEClient(ownerId, res) {
  const set = clients.get(ownerId);
  if (set) {
    set.delete(res);
    if (set.size === 0) clients.delete(ownerId);
  }
}

export function emitSSE(ownerId, event, data) {
  const set = clients.get(ownerId);
  if (!set) return;
  for (const client of set) {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
