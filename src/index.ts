import { isUUID } from "class-validator";

import { store, dispatch } from "./store";

import signalingServerApi from "./api/signalingServerApi";
import webrtcApi from "./api/webrtc";

import {
  roomSelector,
  setConnectingToPeers,
  setRoom,
} from "./reducers/roomSlice";
import { keyPairSelector } from "./reducers/keyPairSlice";
import {
  signalingServerSelector,
  signalingServerActions,
} from "./reducers/signalingServerSlice";

import type { State } from "./store";
import type { Room } from "./reducers/roomSlice";
import type {
  WebSocketMessageRoomIdRequest,
  WebSocketMessageRoomIdResponse,
  WebSocketMessageChallengeRequest,
  WebSocketMessageChallengeResponse,
  WebSocketMessageDescriptionSend,
  WebSocketMessageDescriptionReceive,
  WebSocketMessageCandidateSend,
  WebSocketMessageCandidateReceive,
  WebSocketMessageError,
} from "./utils/interfaces";
import type { RoomData } from "./api/webrtc/interfaces";

const connect = (
  roomUrl: string,
  signalingServerUrl = "ws://localhost:3001/ws",
  rtcConfig: RTCConfiguration = {
    iceServers: [
      {
        urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
      },
    ],
  },
) => {
  const { keyPair, signalingServer, room } = store.getState();

  dispatch(setRoom({ url: roomUrl, id: "", rtcConfig }));

  if (signalingServer.isConnected && isUUID(keyPair.peerId)) {
    if (!isUUID(room.id)) {
      dispatch(
        signalingServerApi.endpoints.sendMessage.initiate({
          content: {
            type: "room",
            fromPeerId: keyPair.peerId,
            roomUrl,
          } as WebSocketMessageRoomIdRequest,
        }),
      );
    } else {
      dispatch(setConnectingToPeers(true));
    }
  } else {
    dispatch(
      signalingServerApi.endpoints.connectWebSocket.initiate(
        signalingServerUrl,
      ),
    );
  }
};

const connectToSignalingServer = async (
  signalingServerUrl = "ws://localhost:3001/ws",
) => {
  dispatch(
    signalingServerApi.endpoints.connectWebSocket.initiate(signalingServerUrl),
  );
};

const disconnectFromSignalingServer = async () => {
  dispatch(signalingServerActions.disconnect());
};

const disconnectFromRoom = async (roomId: string, _deleteMessages = false) => {
  dispatch(webrtcApi.endpoints.disconnectFromRoom.initiate({ roomId }));
};

const openChannel = async (
  label: string,
  withPeers?: { peerId: string; peerPublicKey: string }[],
) => {
  dispatch(
    webrtcApi.endpoints.openChannel.initiate({
      channel: label,
      withPeers,
    }),
  );
};

/**
 * If Neither toPeer nor toChannel then broadcast the message everywhere to everyone.
 * If only toPeer then broadcast to all channels with that peer.
 * If only toChannel then broadcast to all peers with that channel.
 * If both there then send one message to one peer on one channel.
 */
const sendMessage = async (
  message: string,
  toPeer?: string,
  toChannel?: string,
) => {
  const { keyPair } = store.getState();
  dispatch(
    webrtcApi.endpoints.message.initiate({
      message,
      fromPeerId: keyPair.peerId,
      toPeerId: toPeer,
      label: toChannel,
    }),
  );
};

export default {
  store,
  signalingServerSelector,
  roomSelector,
  keyPairSelector,
  connect,
  connectToSignalingServer,
  // connectToRoomPeers,
  disconnectFromSignalingServer,
  disconnectFromRoom,
  openChannel,
  sendMessage,
};

export type {
  State,
  Room,
  RoomData,
  WebSocketMessageRoomIdRequest,
  WebSocketMessageRoomIdResponse,
  WebSocketMessageChallengeRequest,
  WebSocketMessageChallengeResponse,
  WebSocketMessageDescriptionSend,
  WebSocketMessageDescriptionReceive,
  WebSocketMessageCandidateSend,
  WebSocketMessageCandidateReceive,
  WebSocketMessageError,
};
