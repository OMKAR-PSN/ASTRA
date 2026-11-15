import { createReceiver } from './receiver.mjs';

const receiver = await createReceiver(process.env.RECEIVER_DB ?? 'astra-receiver.db');
await receiver.listen({
  host: process.env.RECEIVER_HOST ?? '127.0.0.1',
  port: Number(process.env.RECEIVER_PORT ?? 8787),
});
console.log(receiver.listeningOrigin);
