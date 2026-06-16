import { EventEmitter } from "events";

// Bus central de eventos da API.
// Para integrar notificações, importe e escute aqui:
//
//   import bus from "./events/bus.js";
//   bus.on("comment:new", ({ plugin, comment }) => { ... });
//
// Eventos emitidos:
//   comment:new  → { plugin: string, comment: { id, author, body, created_at } }

const bus = new EventEmitter();

export default bus;
