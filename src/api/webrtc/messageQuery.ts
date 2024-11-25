import { isUUID } from "class-validator";

import { handleSendMessage } from "../../handlers/handleSendMessage";
import { handleReceiveMessage } from "../../handlers/handleReceiveMessage";

import libcrypto from "../../cryptography/libcrypto";

import { hexToUint8Array } from "../../utils/uint8array";

import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { State } from "../../store";
import type {
  IRTCDataChannel,
  IRTCPeerConnection,
  RTCChannelMessageParams,
} from "./interfaces";

export interface RTCChannelMessageParamsExtension
  extends RTCChannelMessageParams {
  peerConnections: IRTCPeerConnection[];
  dataChannels: IRTCDataChannel[];
  encryptionWasmMemory: WebAssembly.Memory;
  decryptionWasmMemory: WebAssembly.Memory;
}

const webrtcMessageQuery: BaseQueryFn<
  RTCChannelMessageParamsExtension,
  void,
  unknown
> = async (
  {
    data,
    fromPeerId,
    label,
    peerConnections,
    dataChannels,
    encryptionWasmMemory,
    decryptionWasmMemory,
  },
  api,
) => {
  try {
    if (!isUUID(fromPeerId)) throw new Error("FromPeerId not a uuidv4");

    const { keyPair } = api.getState() as State;
    if (keyPair.peerId === fromPeerId) {
      const encryptionModule = await libcrypto({
        wasmMemory: encryptionWasmMemory,
      });

      await handleSendMessage(
        data as string | File,
        peerConnections,
        dataChannels,
        encryptionModule,
        api,
        label,
      );
    } else {
      if (!label) throw new Error("Received a message without a label");

      const peerIndex = peerConnections.findIndex(
        (p) => p.withPeerId === fromPeerId,
      );
      if (peerIndex === -1)
        throw new Error("Received a message from unknown peer");

      const decryptionModule = await libcrypto({
        wasmMemory: decryptionWasmMemory,
      });

      const peerPublicKeyHex = peerConnections[peerIndex].withPeerPublicKey;

      const senderPublicKey = hexToUint8Array(peerPublicKeyHex);
      const receiverSecretKey = hexToUint8Array(keyPair.secretKey);

      // const msgUint8 = new Uint8Array(data as ArrayBuffer);
      await handleReceiveMessage(
        data as Blob, // msgUint8,
        senderPublicKey,
        receiverSecretKey,
        decryptionModule,
        label ?? "",
        fromPeerId,
        api,
      );
    }

    return { data: undefined };
  } catch (error) {
    throw error;
  }
};

export default webrtcMessageQuery;
