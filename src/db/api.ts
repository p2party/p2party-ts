import type { SetMessageAllChunksArgs } from "../reducers/roomSlice";
import type { WorkerMessages } from "./types";

const workerSrc = process.env.INDEXEDDB_WORKER_JS ?? "";
const workerBlob = new Blob([workerSrc], {
  type: "application/javascript",
});
const worker = new Worker(URL.createObjectURL(workerBlob), { type: "module" });

let msgId = 0;
const pending = new Map<
  number,
  { resolve: (value: any) => void; reject: (reason?: any) => void }
>();

worker.onmessage = (e: MessageEvent) => {
  const { id, result, error } = e.data;
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  if (error) p.reject(error);
  else p.resolve(result);
};

function callWorker<M extends WorkerMessages["method"]>(
  method: M,
  ...args: Extract<WorkerMessages, { method: M }>["args"]
): Promise<import("./types").WorkerMethodReturnTypes[M]> {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, method, args });
  });
}

export const getDBAddressBookEntry = (
  peerId?: string,
  peerPublicKey?: string,
) => callWorker("getDBAddressBookEntry", peerId, peerPublicKey);

export const getAllDBAddressBookEntries = () =>
  callWorker("getAllDBAddressBookEntries");

export const setDBAddressBookEntry = (
  username: string,
  peerId: string,
  peerPublicKey: string,
) => callWorker("setDBAddressBookEntry", username, peerId, peerPublicKey);

export const deleteDBAddressBookEntry = (
  username?: string,
  peerId?: string,
  peerPublicKey?: string,
) => callWorker("deleteDBAddressBookEntry", username, peerId, peerPublicKey);

export const getDBPeerIsBlacklisted = (
  peerId?: string,
  peerPublicKey?: string,
) => callWorker("getDBPeerIsBlacklisted", peerId, peerPublicKey);

export const getAllDBBlacklisted = () => callWorker("getAllDBBlacklisted");

export const setDBPeerInBlacklist = (peerId: string, peerPublicKey: string) =>
  callWorker("setDBPeerInBlacklist", peerId, peerPublicKey);

export const deleteDBPeerFromBlacklist = (
  peerId?: string,
  peerPublicKey?: string,
) => callWorker("deleteDBPeerFromBlacklist", peerId, peerPublicKey);

export const getDBRoomMessageData = (roomId: string) =>
  callWorker("getDBRoomMessageData", roomId);

export const setDBRoomMessageData = (
  roomId: string,
  message: SetMessageAllChunksArgs,
) => callWorker("setDBRoomMessageData", roomId, message);

export const getDBChunk = (merkleRootHex: string, chunkIndex: number) =>
  callWorker("getDBChunk", merkleRootHex, chunkIndex);

export const existsDBChunk = (merkleRootHex: string, chunkIndex: number) =>
  callWorker("existsDBChunk", merkleRootHex, chunkIndex);

export const getDBSendQueue = (label: string, toPeerId: string) =>
  callWorker("getDBSendQueue", label, toPeerId);

export const getDBAllChunks = (merkleRootHex: string) =>
  callWorker("getDBAllChunks", merkleRootHex);

export const getDBAllChunksCount = (merkleRootHex: string) =>
  callWorker("getDBAllChunksCount", merkleRootHex);

export const setDBChunk = (chunk: import("./types").Chunk) =>
  callWorker("setDBChunk", chunk);

export const setDBSendQueue = (item: import("./types").SendQueue) =>
  callWorker("setDBSendQueue", item);

export const countDBSendQueue = (label: string, toPeerId: string) =>
  callWorker("countDBSendQueue", label, toPeerId);

export const deleteDBChunk = (merkleRootHex: string, chunkIndex?: number) =>
  callWorker("deleteDBChunk", merkleRootHex, chunkIndex);

export const deleteDBMessageData = (merkleRootHex: string) =>
  callWorker("deleteDBMessageData", merkleRootHex);

export const deleteDB = () => callWorker("deleteDB");

export const deleteDBSendQueue = (
  label: string,
  toPeerId: string,
  position?: number,
) => callWorker("deleteDBSendQueue", label, toPeerId, position);
