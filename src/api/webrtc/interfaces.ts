export interface IRTCPeerConnection extends RTCPeerConnection {
  withPeerId: string;
  withPeerPublicKey: string;
  // polite: boolean;
  iceCandidates: RTCIceCandidate[];
}

export interface IRTCDataChannel extends RTCDataChannel {
  withPeerId: string;
  roomId: string;
}

export interface IRTCMessage {
  id: string;
  message: string;
  fromPeerId: string;
  toPeerId: string;
  channelLabel: string;
  timestamp: Date;
}

export interface IRTCIceCandidate extends RTCIceCandidate {
  withPeerId: string;
}

export interface RTCPeerConnectionParams {
  peerId: string;
  peerPublicKey: string;
  roomId: string;
  initiator?: boolean;
  rtcConfig?: RTCConfiguration;
}

export interface RTCSetDescriptionParams {
  peerId: string;
  peerPublicKey: string;
  roomId: string;
  description: RTCSessionDescription;
  rtcConfig?: RTCConfiguration;
}

export interface RTCSetCandidateParams {
  peerId: string;
  candidate: RTCIceCandidate;
}

export interface RTCOpenChannelParams {
  channel: string | RTCDataChannel;
  withPeers?: { peerId: string; peerPublicKey: string }[];
}

export interface RTCChannelMessageParams {
  message: string;
  fromPeerId: string;
  label?: string;
}

export interface RTCRoomInfoParams {
  roomId: string;
}

export interface ChannelData {
  label: string;
  peerId: string;
}

export interface PeerData {
  peerId: string;
  peerPublicKey: string;
}

export interface MessageData extends IRTCMessage {
  channel: string;
}

export interface RoomData {
  roomId: string;
  peers: PeerData[];
  channels: ChannelData[];
  messages: MessageData[];
}

export interface RTCDisconnectFromRoomParams {
  roomId: string;
}

export interface RTCDisconnectFromPeerParams {
  peerId: string;
}

export interface RTCDisconnectFromChannelLabelParams {
  label: string;
}

export interface RTCDisconnectFromPeerChannelLabelParams {
  peerId: string;
  label: string;
}
