import { createSlice } from "@reduxjs/toolkit";
import { isUUID } from "class-validator";

import { crypto_hash_sha512_BYTES } from "../cryptography/interfaces";

import type { PayloadAction } from "@reduxjs/toolkit";
import type { State } from "../store";
import type { MessageType } from "../utils/messageTypes";

export interface Channel {
  label: string;
  peerIds: string[];
}

export interface Peer {
  peerId: string;
  peerPublicKey: string;
}

export interface Message {
  merkleRootHex: string;
  sha512Hex: string;
  fromPeerId: string;
  filename: string;
  messageType: MessageType;
  savedSize: number;
  totalSize: number;
  channelLabel: string;
  timestamp: number;
}

export interface SetRoomArgs {
  url: string;
  id: string;
  canBeConnectionRelay?: boolean;
  onlyConnectWithKnownPeers?: boolean;
  rtcConfig?: RTCConfiguration;
}

export interface SetPeerArgs extends Peer {
  roomId: string;
}

export interface SetIceServersArgs {
  roomId: string;
  iceServers: RTCIceServer[];
}

export interface SetMessageArgs {
  roomId: string;
  merkleRootHex: string;
  sha512Hex: string;
  chunkSize: number;
  fromPeerId: string;
  filename: string;
  messageType: MessageType;
  totalSize: number;
  channelLabel: string;
}

export interface SetMessageAllChunksArgs {
  roomId: string;
  merkleRootHex: string;
  sha512Hex: string;
  fromPeerId: string;
  filename: string;
  messageType: MessageType;
  totalSize: number;
  channelLabel: string;
  timestamp: number;
}

export interface SetChannelArgs {
  roomId: string;
  peerId: string;
  label: string;
}

export interface DeleteMessageArgs {
  merkleRootHex: string;
}

export interface DeleteChannelArgs {
  peerId?: string;
  label?: string;
}

export interface SetCanOnlyConnectWithKnownPeers {
  roomId: string;
  onlyConnectWithKnownPeers: boolean;
}

export interface Room extends SetRoomArgs {
  connectingToPeers: boolean;
  connectedToPeers: boolean;
  canBeConnectionRelay: boolean;
  onlyConnectWithKnownAddresses: boolean;
  rtcConfig: RTCConfiguration;
  peers: Peer[];
  channels: Channel[];
  messages: Message[];
}

export const defaultRTCConfig = {
  iceServers: [
    {
      urls: [
        "stun:stun.p2party.com:3478",
        // "stun:stun.l.google.com:19302",
        // "stun:stun1.l.google.com:19302",
      ],
    },
  ],
  iceTransportPolicy: "all",
} as RTCConfiguration;

const initialState: Room[] = [];
// {
//   url: "",
//   id: "",
//   connectingToPeers: false,
//   connectedToPeers: false,
//   canBeConnectionRelay: true,
//   rtcConfig: defaultRTCConfig,
//   peers: [],
//   channels: [],
//   messages: [],
// };

const roomSlice = createSlice({
  name: "rooms",
  initialState,
  reducers: {
    setRoom: (state, action: PayloadAction<SetRoomArgs>) => {
      const {
        url,
        id,
        canBeConnectionRelay,
        rtcConfig,
        onlyConnectWithKnownPeers,
      } = action.payload;

      if (url.length === 64 && isUUID(id)) {
        const roomIndex = state.findIndex((r) => r.url === url || r.id === id);

        if (roomIndex > -1) {
          state[roomIndex].url = url;
          state[roomIndex].id = id;
          if (canBeConnectionRelay != undefined)
            state[roomIndex].canBeConnectionRelay = canBeConnectionRelay;
          if (rtcConfig) state[roomIndex].rtcConfig = rtcConfig;
          if (onlyConnectWithKnownPeers != undefined) {
            state[roomIndex].onlyConnectWithKnownAddresses =
              onlyConnectWithKnownPeers;
          } else {
            state[roomIndex].onlyConnectWithKnownAddresses =
              localStorage.getItem(url + "-onlyConnectWithKnownPeers") ===
              "true";
          }
        } else {
          state.push({
            url,
            id,
            connectingToPeers: false,
            connectedToPeers: false,
            canBeConnectionRelay:
              canBeConnectionRelay != undefined ? canBeConnectionRelay : true,
            onlyConnectWithKnownAddresses:
              onlyConnectWithKnownPeers != undefined
                ? onlyConnectWithKnownPeers
                : localStorage.getItem(url + "-onlyConnectWithKnownPeers") ===
                  "true",
            rtcConfig: rtcConfig ?? defaultRTCConfig,
            peers: [],
            channels: [],
            messages: [],
          });
        }
      } else if (url.length === 64) {
        const roomIndex = state.findIndex((r) => r.url === url);

        if (roomIndex > -1) {
          state[roomIndex].url = url;
          state[roomIndex].id = "";
          if (canBeConnectionRelay != undefined)
            state[roomIndex].canBeConnectionRelay = canBeConnectionRelay;
          if (rtcConfig) state[roomIndex].rtcConfig = rtcConfig;
          if (onlyConnectWithKnownPeers != undefined) {
            state[roomIndex].onlyConnectWithKnownAddresses =
              onlyConnectWithKnownPeers;
          } else {
            state[roomIndex].onlyConnectWithKnownAddresses =
              localStorage.getItem(url + "-onlyConnectWithKnownPeers") ===
              "true";
          }
        } else {
          state.push({
            url,
            id: "",
            connectingToPeers: false,
            connectedToPeers: false,
            canBeConnectionRelay:
              canBeConnectionRelay != undefined ? canBeConnectionRelay : true,
            onlyConnectWithKnownAddresses:
              onlyConnectWithKnownPeers != undefined
                ? onlyConnectWithKnownPeers
                : localStorage.getItem(url + "-onlyConnectWithKnownPeers") ===
                  "true",
            rtcConfig: rtcConfig ?? defaultRTCConfig,
            peers: [],
            channels: [],
            messages: [],
          });
        }
      }
    },

    setConnectingToPeers: (
      state,
      action: PayloadAction<{ roomId: string; connectingToPeers: boolean }>,
    ) => {
      const { roomId, connectingToPeers } = action.payload;

      const roomIndex = state.findIndex((r) => r.id === roomId);

      if (roomIndex > -1)
        state[roomIndex].connectingToPeers = connectingToPeers;
    },

    setConnectedToPeers: (
      state,
      action: PayloadAction<{ roomId: string; connectedToPeers: boolean }>,
    ) => {
      const { roomId, connectedToPeers } = action.payload;

      const roomIndex = state.findIndex((r) => r.id === roomId);

      if (roomIndex > -1) {
        state[roomIndex].connectingToPeers = false;
        state[roomIndex].connectedToPeers = connectedToPeers;
      }
    },

    setConnectionRelay: (
      state,
      action: PayloadAction<{ roomId: string; canBeConnectionRelay: boolean }>,
    ) => {
      const { roomId, canBeConnectionRelay } = action.payload;

      const roomIndex = state.findIndex((r) => r.id === roomId);

      if (roomIndex > -1)
        state[roomIndex].canBeConnectionRelay = canBeConnectionRelay;
    },

    setPeer: (state, action: PayloadAction<SetPeerArgs>) => {
      const { roomId, peerId, peerPublicKey } = action.payload;

      const roomIndex = state.findIndex((r) => r.id === roomId);

      if (roomIndex > -1) {
        const peerIndex = state[roomIndex].peers.findIndex(
          (p) => p.peerId === peerId,
        );

        if (peerIndex === -1)
          state[roomIndex].peers.push({ peerId, peerPublicKey });
      }
    },

    deletePeer: (state, action: PayloadAction<{ peerId: string }>) => {
      const roomsLen = state.length;
      for (let i = 0; i < roomsLen; i++) {
        const peerIndex = state[i].peers.findIndex(
          (p) => p.peerId === action.payload.peerId,
        );

        if (peerIndex > -1) state[i].peers.splice(peerIndex, 1);
      }
    },

    setChannel: (state, action: PayloadAction<SetChannelArgs>) => {
      const { roomId, label, peerId } = action.payload;

      const roomIndex = state.findIndex((r) => r.id === roomId);

      if (roomIndex > -1) {
        const channelIndex = state[roomIndex].channels.findIndex(
          (c) => c.label === label,
        );

        if (channelIndex > -1) {
          const peerIndex = state[roomIndex].channels[
            channelIndex
          ].peerIds.findIndex((p) => p === peerId);

          if (peerIndex === -1) {
            state[roomIndex].channels[channelIndex].peerIds.push(peerId);
          }
        } else {
          state[roomIndex].channels.push({
            label: label,
            peerIds: [peerId],
          });
        }
      }
    },

    deleteChannel: (state, action: PayloadAction<DeleteChannelArgs>) => {
      const { peerId, label } = action.payload;

      const roomsLen = state.length;
      for (let i = 0; i < roomsLen; i++) {
        if (label && !peerId) {
          const channelIndex = state[i].channels.findIndex(
            (c) => c.label === label,
          );

          if (channelIndex > -1) state[i].channels.splice(channelIndex, 1);
        } else if (!label && peerId) {
          const channelsLen = state[i].channels.length;
          for (let j = 0; j < channelsLen; j++) {
            const peerIndex = state[i].channels[i].peerIds.findIndex(
              (p) => p === peerId,
            );

            if (peerIndex > -1) {
              state[i].channels[j].peerIds.splice(peerIndex, 1);

              if (state[i].channels[j].peerIds.length === 0) {
                state[i].channels.splice(j, 1);
              }
            }
          }
        } else if (peerId && label) {
          const channelIndex = state[i].channels.findIndex(
            (c) => c.label === label && c.peerIds.includes(peerId),
          );

          if (channelIndex > -1) {
            const peerIndex = state[i].channels[channelIndex].peerIds.findIndex(
              (p) => p === peerId,
            );

            state[i].channels[channelIndex].peerIds.splice(peerIndex, 1);

            if (state[i].channels[channelIndex].peerIds.length === 0) {
              state[i].channels.splice(channelIndex, 1);
            }
          }
        }
      }
    },

    setIceServers: (state, action: PayloadAction<SetIceServersArgs>) => {
      const { roomId, iceServers } = action.payload;

      const roomIndex = state.findIndex((r) => r.id === roomId);

      if (roomIndex > -1) {
        const iceServersLen = iceServers.length;
        const existingIceServers =
          state[roomIndex].rtcConfig.iceServers?.flatMap((server) =>
            Array.isArray(server.urls) ? server.urls : [server.urls],
          ) ?? [];
        for (let i = 0; i < iceServersLen; i++) {
          const urlsLen = iceServers[i].urls.length;
          let shouldPush = false;
          for (let j = 0; j < urlsLen; j++) {
            if (!existingIceServers.includes(iceServers[i].urls[j])) {
              shouldPush = true;

              break;
            }
          }

          if (shouldPush) {
            state[roomIndex].rtcConfig.iceServers?.push(iceServers[i]);
          }
        }
      }
    },

    setMessage: (state, action: PayloadAction<SetMessageArgs>) => {
      const { roomId } = action.payload;

      const roomIndex = state.findIndex((r) => r.id === roomId);

      if (roomIndex > -1) {
        const messageIndex = state[roomIndex].messages.findIndex(
          (m) => m.merkleRootHex === action.payload.merkleRootHex,
        );

        if (messageIndex === -1) {
          if (
            action.payload.channelLabel &&
            action.payload.fromPeerId &&
            isUUID(action.payload.fromPeerId) &&
            action.payload.messageType &&
            action.payload.chunkSize > 0 &&
            action.payload.totalSize
          ) {
            state[roomIndex].messages.push({
              merkleRootHex: action.payload.merkleRootHex,
              sha512Hex: action.payload.sha512Hex,
              channelLabel: action.payload.channelLabel,
              filename: action.payload.filename ?? "txt",
              messageType: action.payload.messageType,
              fromPeerId: action.payload.fromPeerId,
              timestamp: Date.now(),
              savedSize:
                action.payload.chunkSize > 0 ? action.payload.chunkSize : 0,
              totalSize: action.payload.totalSize,
            });
          }
        } else if (
          action.payload.chunkSize > 0 &&
          state[roomIndex].messages[messageIndex].totalSize >=
            state[roomIndex].messages[messageIndex].savedSize +
              action.payload.chunkSize
        ) {
          state[roomIndex].messages[messageIndex].savedSize +=
            action.payload.chunkSize;
        }
      }
    },

    setMessageAllChunks: (
      state,
      action: PayloadAction<SetMessageAllChunksArgs>,
    ) => {
      const { roomId } = action.payload;

      const roomIndex = state.findIndex((r) => r.id === roomId);

      if (roomIndex > -1) {
        const messageIndex = state[roomIndex].messages.findIndex(
          (m) => m.merkleRootHex === action.payload.merkleRootHex,
        );

        if (
          messageIndex === -1 &&
          action.payload.channelLabel &&
          action.payload.fromPeerId &&
          isUUID(action.payload.fromPeerId) &&
          action.payload.messageType &&
          action.payload.totalSize
        ) {
          state[roomIndex].messages.push({
            merkleRootHex: action.payload.merkleRootHex,
            sha512Hex: action.payload.sha512Hex,
            channelLabel: action.payload.channelLabel,
            filename: action.payload.filename ?? "txt",
            messageType: action.payload.messageType,
            fromPeerId: action.payload.fromPeerId,
            timestamp: action.payload.timestamp,
            savedSize: action.payload.totalSize,
            totalSize: action.payload.totalSize,
          });
        }
      }
    },

    deleteMessage: (state, action: PayloadAction<DeleteMessageArgs>) => {
      const { merkleRootHex } = action.payload;
      if (merkleRootHex.length !== crypto_hash_sha512_BYTES * 2) return;

      const roomsLen = state.length;
      for (let i = 0; i < roomsLen; i++) {
        const messageIndex = state[i].messages.findIndex(
          (m) => m.merkleRootHex === merkleRootHex,
        );

        if (messageIndex > -1) state[i].messages.splice(messageIndex, 1);
      }
    },

    setOnlyConnectWithKnownPeers: (
      state,
      action: PayloadAction<SetCanOnlyConnectWithKnownPeers>,
    ) => {
      const { roomId, onlyConnectWithKnownPeers } = action.payload;

      const roomIndex = state.findIndex((r) => r.id === roomId);

      if (roomIndex > -1) {
        state[roomIndex].onlyConnectWithKnownAddresses =
          onlyConnectWithKnownPeers;
      }
    },

    deleteRoom: (state, action: PayloadAction<string>) => {
      const roomIndex = state.findIndex(
        (r) => r.url === action.payload || r.id === action.payload,
      );
      if (roomIndex > -1) {
        const url = state[roomIndex].url;

        state[roomIndex] = {
          url,
          id: "",
          connectingToPeers: false,
          connectedToPeers: false,
          canBeConnectionRelay: true,
          onlyConnectWithKnownAddresses: false,
          rtcConfig: defaultRTCConfig,
          peers: [],
          channels: [],
          messages: [],
        };
      }
    },
  },
});

export const {
  setRoom,
  setConnectingToPeers,
  setConnectedToPeers,
  setConnectionRelay,
  setOnlyConnectWithKnownPeers,
  setPeer,
  setChannel,
  setIceServers,
  setMessage,
  setMessageAllChunks,
  deletePeer,
  deleteChannel,
  deleteMessage,
  deleteRoom,
} = roomSlice.actions;
export const roomSelector = (state: State) => state.rooms;
export default roomSlice.reducer;
