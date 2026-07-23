const clients = new Set();

export function addSseClient(res) {
  clients.add(res);
}

export function removeSseClient(res) {
  clients.delete(res);
}

export function broadcastSseEvent(eventName, data = {}) {
  const payload = JSON.stringify(data);

  for (const client of clients) {
    client.write(`event: ${eventName}\n`);
    client.write(`data: ${payload}\n\n`);
  }
}