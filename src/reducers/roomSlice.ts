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
  rtcConfig?: RTCConfiguration;
}

export interface SetIceServersArgs {
  iceServers: RTCIceServer[];
}

export interface SetMessageArgs {
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
  merkleRootHex: string;
  sha512Hex: string;
  fromPeerId: string;
  filename: string;
  messageType: MessageType;
  totalSize: number;
  channelLabel: string;
}

export interface SetChannelArgs {
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

export interface Room extends SetRoomArgs {
  connectingToPeers: boolean;
  connectedToPeers: boolean;
  canBeConnectionRelay: boolean;
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

const initialState: Room = {
  url: "",
  id: "",
  connectingToPeers: false,
  connectedToPeers: false,
  canBeConnectionRelay: true,
  rtcConfig: defaultRTCConfig,
  peers: [],
  channels: [],
  messages: [],
};

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    setRoom: (state, action: PayloadAction<SetRoomArgs>) => {
      const { url, id, canBeConnectionRelay, rtcConfig } = action.payload;

      if (url.length > 0) state.url = url;
      if (isUUID(id)) state.id = id;
      if (canBeConnectionRelay)
        state.canBeConnectionRelay = canBeConnectionRelay;
      if (rtcConfig) state.rtcConfig = rtcConfig;
    },

    setConnectingToPeers: (state, action: PayloadAction<boolean>) => {
      state.connectingToPeers = action.payload;
    },

    setConnectedToPeers: (state, action: PayloadAction<boolean>) => {
      state.connectingToPeers = false;
      state.connectedToPeers = action.payload;
    },

    setConnectionRelay: (state, action: PayloadAction<boolean>) => {
      state.canBeConnectionRelay = action.payload;
    },

    setPeer: (state, action: PayloadAction<Peer>) => {
      const peerIndex = state.peers.findIndex(
        (p) => p.peerId === action.payload.peerId,
      );

      if (peerIndex === -1) state.peers.push(action.payload);
    },

    deletePeer: (state, action: PayloadAction<{ peerId: string }>) => {
      const peerIndex = state.peers.findIndex(
        (p) => p.peerId === action.payload.peerId,
      );

      if (peerIndex > -1) state.peers.splice(peerIndex, 1);
    },

    setChannel: (state, action: PayloadAction<SetChannelArgs>) => {
      const channelIndex = state.channels.findIndex(
        (c) => c.label === action.payload.label,
      );

      if (channelIndex > -1) {
        const peerIndex = state.channels[channelIndex].peerIds.findIndex(
          (p) => p === action.payload.peerId,
        );

        if (peerIndex === -1) {
          state.channels[channelIndex].peerIds.push(action.payload.peerId);
        }
      } else {
        state.channels.push({
          label: action.payload.label,
          peerIds: [action.payload.peerId],
        });
      }
    },

    deleteChannel: (state, action: PayloadAction<DeleteChannelArgs>) => {
      const { peerId, label } = action.payload;
      if (label && !peerId) {
        const channelIndex = state.channels.findIndex((c) => c.label === label);

        if (channelIndex > -1) state.channels.splice(channelIndex, 1);
      } else if (!label && peerId) {
        const channelsLen = state.channels.length;
        for (let i = 0; i < channelsLen; i++) {
          const peerIndex = state.channels[i].peerIds.findIndex(
            (p) => p === peerId,
          );

          if (peerIndex > -1) state.channels[i].peerIds.splice(peerIndex, 1);
        }
      } else if (peerId && label) {
        const channelIndex = state.channels.findIndex(
          (c) => c.label === label && c.peerIds.includes(peerId),
        );

        if (channelIndex > -1) {
          const peerIndex = state.channels[channelIndex].peerIds.findIndex(
            (p) => p === peerId,
          );

          state.channels[channelIndex].peerIds.splice(peerIndex, 1);
        }
      }
    },

    setIceServers: (state, action: PayloadAction<SetIceServersArgs>) => {
      const iceServersLen = action.payload.iceServers.length;
      for (let i = 0; i < iceServersLen; i++) {
        state.rtcConfig.iceServers?.push(action.payload.iceServers[i]);
      }
    },

    setMessage: (state, action: PayloadAction<SetMessageArgs>) => {
      const messageIndex = state.messages.findIndex(
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
          state.messages.push({
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
        state.messages[messageIndex].totalSize >=
          state.messages[messageIndex].savedSize + action.payload.chunkSize
      ) {
        state.messages[messageIndex].savedSize += action.payload.chunkSize;
      }
    },

    setMessageAllChunks: (
      state,
      action: PayloadAction<SetMessageAllChunksArgs>,
    ) => {
      const messageIndex = state.messages.findIndex(
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
        state.messages.push({
          merkleRootHex: action.payload.merkleRootHex,
          sha512Hex: action.payload.sha512Hex,
          channelLabel: action.payload.channelLabel,
          filename: action.payload.filename ?? "txt",
          messageType: action.payload.messageType,
          fromPeerId: action.payload.fromPeerId,
          timestamp: Date.now(),
          savedSize: action.payload.totalSize,
          totalSize: action.payload.totalSize,
        });
      }
    },

    deleteMessage: (state, action: PayloadAction<DeleteMessageArgs>) => {
      const { merkleRootHex } = action.payload;
      if (merkleRootHex.length !== crypto_hash_sha512_BYTES * 2) return;

      const messageIndex = state.messages.findIndex(
        (m) => m.merkleRootHex === merkleRootHex,
      );

      if (messageIndex > -1) state.messages.splice(messageIndex, 1);
    },

    deleteRoom: (state, _action: PayloadAction<void>) => {
      const url = state.url;

      return {
        ...initialState,
        url,
      };
    },
  },
});

export const {
  setRoom,
  setConnectingToPeers,
  setConnectedToPeers,
  setConnectionRelay,
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
export const roomSelector = (state: State) => state.room;
export default roomSlice.reducer;
