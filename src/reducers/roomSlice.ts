import { createSlice } from "@reduxjs/toolkit";
import { isUUID } from "class-validator";

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
  fromPeerId: string;
  chunkIndexes: number[];
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

export interface SetChannelArgs {
  label: string;
  peerId: string;
}

export interface SetMessageArgs {
  merkleRootHex: string;
  chunkIndex: number;
  chunkSize: number;
  fromPeerId?: string;
  messageType?: MessageType;
  totalSize?: number;
  channelLabel?: string;
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

const initialState: Room = {
  url: "",
  id: "",
  connectingToPeers: false,
  connectedToPeers: false,
  canBeConnectionRelay: true,
  rtcConfig: {
    iceServers: [
      // {
      //   urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
      // },
    ],
  },
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

    deleteChannel: (state, action: PayloadAction<SetChannelArgs>) => {
      const channelIndex = state.channels.findIndex(
        (c) => c.label === action.payload.label,
      );

      if (channelIndex > -1) {
        const peerIndex = state.channels[channelIndex].peerIds.findIndex(
          (p) => p === action.payload.peerId,
        );

        if (peerIndex > -1) {
          state.channels[channelIndex].peerIds.splice(peerIndex, 1);
        } else {
          state.channels.splice(channelIndex, 1);
        }

        if (state.channels[channelIndex].peerIds.length === 0) {
          state.channels.splice(channelIndex, 1);
        }
      }
    },

    setMessage: (state, action: PayloadAction<SetMessageArgs>) => {
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
          channelLabel: action.payload.channelLabel,
          messageType: action.payload.messageType,
          fromPeerId: action.payload.fromPeerId,
          timestamp: Date.now(),
          chunkIndexes: [action.payload.chunkIndex],
          savedSize: action.payload.chunkSize,
          totalSize: action.payload.totalSize,
        });
      } else if (
        !state.messages[messageIndex].chunkIndexes.includes(
          action.payload.chunkIndex,
        ) &&
        state.messages[messageIndex].totalSize >=
          state.messages[messageIndex].savedSize + action.payload.chunkSize
      ) {
        state.messages[messageIndex].chunkIndexes.push(
          action.payload.chunkIndex,
        );
        state.messages[messageIndex].savedSize += action.payload.chunkSize;
      }
    },

    deleteMessage: (
      state,
      action: PayloadAction<{ merkleRootHex: string }>,
    ) => {
      const messageIndex = state.messages.findIndex(
        (m) => m.merkleRootHex === action.payload.merkleRootHex,
      );

      if (messageIndex > -1) state.messages.splice(messageIndex, 1);
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
  setMessage,
  deletePeer,
  deleteChannel,
  deleteMessage,
} = roomSlice.actions;
export const roomSelector = (state: State) => state.room;
export default roomSlice.reducer;
