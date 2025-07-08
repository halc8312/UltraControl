// packages/ultracontrol-app/src/lib/interfaces/events.ts

// OpenHandsのイベント型を再利用またはラップする形で定義
// (実際のOpenHandsの型定義に合わせて調整が必要)
export enum EventType {
  Action = 'action',
  Observation = 'observation',
  Notification = 'notification', // UI向けの通知イベント
  System = 'system', // システム状態変更など
}

export interface BaseEventPayload {
  eventId: string;
  timestamp: string; // ISO 8601
  source: string; // イベント発行元の識別子 (e.g., "OpenHandsAgent:code_writer", "UserInterface")
}

// --- Action Events (Client -> Server) ---
export interface ActionPayload extends BaseEventPayload {
  type: EventType.Action;
  actionType: string; // e.g., "CmdRunAction", "FileWriteAction", "StartDevinTask"
  details: Record<string, any>; // アクション固有の詳細
}

// --- Observation Events (Server -> Client) ---
export interface ObservationPayload extends BaseEventPayload {
  type: EventType.Observation;
  observationType: string; // e.g., "CmdOutputObservation", "FileContentChanged", "DevinTaskStatusUpdate"
  details: Record<string, any>; // 観察結果固有の詳細
}

// --- Notification Events (Server -> Client) ---
export interface NotificationEventPayload extends BaseEventPayload {
  type: EventType.Notification;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  details?: Record<string, any>;
}

// --- System Events (Server -> Client or Client -> Server) ---
export interface SystemEventPayload extends BaseEventPayload {
  type: EventType.System;
  systemEventType: string; // e.g., "WebSocketConnected", "UserJoinedWorkspace"
  details?: Record<string, any>;
}


export type WebSocketMessage =
  | ActionPayload
  | ObservationPayload
  | NotificationEventPayload
  | SystemEventPayload;

// WebSocketエンドポイントの例 (コメントとして)
// ws://server/api/v1/events
