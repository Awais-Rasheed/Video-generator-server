// utils/sse.mjs
export const clients = [];

let lastImageUrls = [];

export function sendProgressToClients(type, data) {
  if (type === 'all_images_processed') {
    lastImageUrls = data.imageUrls || [];
  }

  const payload = `data: ${JSON.stringify({ type, data })}\n\n`;

  clients.forEach((client, index) => {
    try {
      if (!client.finished) {
        client.write(payload);
      } else {
        clients.splice(index, 1);
      }
    } catch (err) {
      clients.splice(index, 1);
    }
  });
}

export function getLastImageUrls() {
  return lastImageUrls;
}
