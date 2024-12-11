import { handleReceiveMessage } from "./handleReceiveMessage";

import webrtcApi from "../api/webrtc";

import { setChannel, setMessage } from "../reducers/roomSlice";

import { randomNumberInRange } from "../cryptography/utils";

import { deleteDBSendQueueItem, getDBSendQueue } from "../db/api";
import { hexToUint8Array } from "../utils/uint8array";
import { decompileChannelMessageLabel } from "../utils/channelLabel";

import { wait } from "./handleSendMessage";

import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import type { State } from "../store";
import type {
  IRTCPeerConnection,
  IRTCDataChannel,
} from "../api/webrtc/interfaces";
import type { LibCrypto } from "../cryptography/libcrypto";

export interface OpenChannelHelperParams {
  channel: string | RTCDataChannel;
  epc: IRTCPeerConnection;
  dataChannels: IRTCDataChannel[];
  decryptionModule: LibCrypto;
  merkleModule: LibCrypto;
}

export const MAX_BUFFERED_AMOUNT = 128 * 1024;

export const handleOpenChannel = async (
  {
    channel,
    epc,
    dataChannels,
    decryptionModule,
    merkleModule,
  }: OpenChannelHelperParams,
  api: BaseQueryApi,
): Promise<IRTCDataChannel> => {
  try {
    const { keyPair } = api.getState() as State;

    const label = typeof channel === "string" ? channel : channel.label;
    const dataChannel =
      typeof channel === "string"
        ? epc.createDataChannel(channel, {
            ordered: false,
            maxRetransmits: 10,
          })
        : channel;
    dataChannel.binaryType = "blob";
    dataChannel.bufferedAmountLowThreshold = 64 * 1024;
    dataChannel.onbufferedamountlow = async () => {
      const sendQueue = await getDBSendQueue(label, epc.withPeerId);
      const sendQueueLen = sendQueue.length;
      let i = 0;

      while (
        dataChannel.bufferedAmount < MAX_BUFFERED_AMOUNT &&
        i < sendQueueLen
      ) {
        const timeoutMilliseconds = await randomNumberInRange(2, 20);
        await wait(timeoutMilliseconds);
        dataChannel.send(sendQueue[i].encryptedData);

        await deleteDBSendQueueItem(
          sendQueue[i].position,
          label,
          epc.withPeerId,
        );

        delete sendQueue[i];
        i++;
      }
    };

    const extChannel = dataChannel as IRTCDataChannel;
    extChannel.withPeerId = epc.withPeerId;

    extChannel.onclosing = () => {
      console.log(`Channel with label ${extChannel.label} is closing.`);
    };

    extChannel.onclose = () => {
      console.log(`Channel with label ${extChannel.label} has closed.`);

      api.dispatch(
        webrtcApi.endpoints.disconnectFromPeerChannelLabel.initiate({
          peerId: epc.withPeerId,
          label: extChannel.label,
        }),
      );
    };

    extChannel.onerror = (e) => {
      console.error(e);

      api.dispatch(
        webrtcApi.endpoints.disconnectFromPeerChannelLabel.initiate({
          peerId: epc.withPeerId,
          label: extChannel.label,
        }),
      );
    };

    extChannel.onmessage = async (e) => {
      try {
        const { channelLabel, merkleRoot, merkleRootHex, hashHex } =
          await decompileChannelMessageLabel(label);
        const { room } = api.getState() as State;

        const peerPublicKeyHex = epc.withPeerPublicKey;
        const senderPublicKey = hexToUint8Array(peerPublicKeyHex);
        const receiverSecretKey = hexToUint8Array(keyPair.secretKey);

        const { chunkSize, totalSize, messageType, filename } =
          await handleReceiveMessage(
            e.data as Blob,
            merkleRoot,
            senderPublicKey,
            receiverSecretKey,
            room,
            decryptionModule,
            merkleModule,
          );

        if (chunkSize > 0) {
          api.dispatch(
            setMessage({
              merkleRootHex,
              sha512Hex: hashHex,
              fromPeerId: epc.withPeerId,
              chunkSize,
              totalSize,
              messageType,
              filename,
              channelLabel,
            }),
          );
        }
      } catch (error) {
        console.error(error);
      }
    };

    extChannel.onopen = async () => {
      console.log(
        `Channel with label \"${extChannel.label}\" and client ${epc.withPeerId} is open.`,
      );

      dataChannels.push(extChannel);

      api.dispatch(setChannel({ label, peerId: extChannel.withPeerId }));
    };

    return extChannel;
  } catch (error) {
    throw error;
  }
};
