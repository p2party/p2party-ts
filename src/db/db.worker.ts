import { openDB } from "idb";

import type { DBSchema, IDBPDatabase } from "idb";
import type {
  Chunk,
  SendQueue,
  WorkerMessages,
  WorkerMethodReturnTypes,
} from "./types";

export const dbName = "p2party";
export const dbVersion = 1;

export interface RepoSchema extends DBSchema {
  chunks: {
    value: Chunk;
    key: [string, number];
    indexes: { merkleRoot: string };
  };
  sendQueue: {
    value: SendQueue;
    key: [number, string, string];
    indexes: { labelPeer: string };
  };
}

async function getDB(): Promise<IDBPDatabase<RepoSchema>> {
  return openDB<RepoSchema>(dbName, dbVersion, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("chunks")) {
        const chunks = db.createObjectStore("chunks", {
          keyPath: ["merkleRoot", "chunkIndex"],
        });
        chunks.createIndex("merkleRoot", "merkleRoot", { unique: false });
      }

      if (!db.objectStoreNames.contains("sendQueue")) {
        const sendQueue = db.createObjectStore("sendQueue", {
          keyPath: ["position", "label", "toPeerId"],
        });
        sendQueue.createIndex("labelPeer", ["label", "toPeerId"], {
          unique: false,
        });
      }
    },
  });
}

// Define each function with the expected arguments and return type:

async function fnGetDBChunk(
  merkleRootHex: string,
  chunkIndex: number,
): Promise<Blob | undefined> {
  const db = await getDB();
  const chunk = await db.get("chunks", [merkleRootHex, chunkIndex]);
  db.close();
  return chunk?.data;
}

async function fnExistsDBChunk(
  merkleRootHex: string,
  chunkIndex: number,
): Promise<boolean> {
  const db = await getDB();
  const count = await db.count("chunks", [merkleRootHex, chunkIndex]);
  db.close();
  return count > 0;
}

async function fnGetDBSendQueue(
  label: string,
  toPeerId: string,
): Promise<SendQueue[]> {
  const db = await getDB();
  const sendQueueCount = await db.countFromIndex(
    "sendQueue",
    "labelPeer",
    label + toPeerId,
  );
  if (sendQueueCount > 0) {
    const sendQueue = await db.getAllFromIndex(
      "sendQueue",
      "labelPeer",
      label + toPeerId,
    );
    db.close();
    return sendQueue;
  } else {
    const tx = db.transaction("sendQueue", "readonly");
    const store = tx.objectStore("sendQueue");
    const index = store.index("labelPeer");
    const keyRange = IDBKeyRange.only([label, toPeerId]);
    const sendQueue = await index.getAll(keyRange);
    db.close();
    return sendQueue;
  }
}

async function fnGetDBAllChunks(merkleRootHex: string): Promise<Chunk[]> {
  const db = await getDB();
  const chunksCount = await db.countFromIndex(
    "chunks",
    "merkleRoot",
    merkleRootHex,
  );
  if (chunksCount > 0) {
    const chunks = await db.getAllFromIndex(
      "chunks",
      "merkleRoot",
      merkleRootHex,
    );
    db.close();
    return chunks;
  } else {
    const tx = db.transaction("chunks", "readonly");
    const store = tx.objectStore("chunks");
    const index = store.index("merkleRoot");
    const keyRange = IDBKeyRange.only(merkleRootHex);
    const chunks = await index.getAll(keyRange);
    db.close();
    return chunks;
  }
}

async function fnGetDBAllChunksCount(merkleRootHex: string): Promise<number> {
  const db = await getDB();
  const chunksCount = await db.countFromIndex(
    "chunks",
    "merkleRoot",
    merkleRootHex,
  );
  db.close();
  return chunksCount;
}

async function fnSetDBChunk(chunk: Chunk): Promise<void> {
  const db = await getDB();
  await db.put("chunks", chunk);
  db.close();
}

async function fnSetDBSendQueue(item: SendQueue): Promise<void> {
  const db = await getDB();
  await db.put("sendQueue", item);
  db.close();
}

async function fnDeleteDBChunk(
  merkleRootHex: string,
  chunkIndex?: number,
): Promise<void> {
  const db = await getDB();
  if (chunkIndex != null) {
    await db.delete("chunks", [merkleRootHex, chunkIndex]);
  } else {
    const chunks = await fnGetDBAllChunks(merkleRootHex);
    for (let i = 0; i < chunks.length; i++) {
      await db.delete("chunks", [merkleRootHex, chunks[i].chunkIndex]);
    }
  }
  db.close();
}

async function fnDeleteDBSendQueueItem(
  position: number,
  label: string,
  toPeerId: string,
): Promise<void> {
  const db = await getDB();
  await db.delete("sendQueue", [position, label, toPeerId]);
  db.close();
}

onmessage = async (e: MessageEvent) => {
  const message = e.data as WorkerMessages;
  const { id, method } = message;
  try {
    let result: WorkerMethodReturnTypes[typeof method];
    switch (method) {
      case "getDBChunk":
        result = (await fnGetDBChunk(
          ...message.args,
        )) as WorkerMethodReturnTypes["getDBChunk"];
        break;
      case "existsDBChunk":
        result = (await fnExistsDBChunk(
          ...message.args,
        )) as WorkerMethodReturnTypes["existsDBChunk"];
        break;
      case "getDBSendQueue":
        result = (await fnGetDBSendQueue(
          ...message.args,
        )) as WorkerMethodReturnTypes["getDBSendQueue"];
        break;
      case "getDBAllChunks":
        result = (await fnGetDBAllChunks(
          ...message.args,
        )) as WorkerMethodReturnTypes["getDBAllChunks"];
        break;
      case "getDBAllChunksCount":
        result = (await fnGetDBAllChunksCount(
          ...message.args,
        )) as WorkerMethodReturnTypes["getDBAllChunksCount"];
        break;
      case "setDBChunk":
        result = (await fnSetDBChunk(
          ...message.args,
        )) as WorkerMethodReturnTypes["setDBChunk"];
        break;
      case "setDBSendQueue":
        result = (await fnSetDBSendQueue(
          ...message.args,
        )) as WorkerMethodReturnTypes["setDBSendQueue"];
        break;
      case "deleteDBChunk":
        result = (await fnDeleteDBChunk(
          ...message.args,
        )) as WorkerMethodReturnTypes["deleteDBChunk"];
        break;
      case "deleteDBSendQueueItem":
        result = (await fnDeleteDBSendQueueItem(
          ...message.args,
        )) as WorkerMethodReturnTypes["deleteDBSendQueueItem"];
        break;
      default:
        postMessage({ id, error: "Method not found" });
        return;
    }

    postMessage({ id, result });
  } catch (error: any) {
    postMessage({ id, error: String(error) });
  }
};
