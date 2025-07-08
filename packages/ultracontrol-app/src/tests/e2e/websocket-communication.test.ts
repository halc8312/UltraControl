/**
 * WebSocket Communication E2E Tests
 * 
 * Tests for real-time communication between services
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { EventService } from '@/lib/services/EventService';
import { WebSocketMock } from '../mocks/WebSocketMock';
import type { EventPayload, EventType, WebSocketMessage } from '@/lib/interfaces';

describe('WebSocket Communication E2E Tests', () => {
  let eventService: EventService;
  let mockWebSocket: WebSocketMock;
  const wsUrl = 'ws://localhost:8000/ws/events';

  beforeAll(() => {
    // モックWebSocketを使用（実際のE2E環境では実サーバーを使用）
    global.WebSocket = WebSocketMock as any;
    mockWebSocket = new WebSocketMock(wsUrl);
    eventService = new EventService(wsUrl);
  });

  afterAll(async () => {
    await eventService.disconnect();
  });

  describe('接続管理', () => {
    it('WebSocket接続の確立', async () => {
      console.log('🔌 テスト: WebSocket接続確立');

      await eventService.connect();
      expect(eventService.isConnected()).toBe(true);
      expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);
    });

    it('自動再接続機能', async () => {
      console.log('🔄 テスト: 自動再接続');

      await eventService.connect();
      
      // 接続断をシミュレート
      mockWebSocket.close();
      expect(eventService.isConnected()).toBe(false);

      // 再接続を待つ
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // 自動再接続されることを確認
      expect(eventService.isConnected()).toBe(true);
    });

    it('最大再接続試行回数の制限', async () => {
      console.log('❌ テスト: 再接続試行回数制限');

      const failingService = new EventService(wsUrl, {
        maxReconnectAttempts: 3,
        reconnectInterval: 100
      });

      // 接続を常に失敗させる
      mockWebSocket.failConnection = true;

      await expect(failingService.connect()).rejects.toThrow();
      expect(failingService.getReconnectAttempts()).toBe(3);
    });
  });

  describe('イベント送受信', () => {
    beforeAll(async () => {
      await eventService.connect();
    });

    it('アクションイベントの送信', async () => {
      console.log('📤 テスト: アクションイベント送信');

      const actionEvent: EventPayload = {
        type: 'task:execute',
        payload: {
          taskId: 'test-task-1',
          command: 'npm install',
          workingDirectory: '/project'
        }
      };

      const sent = eventService.emit('action', actionEvent);
      expect(sent).toBe(true);

      // モックWebSocketでメッセージが送信されたことを確認
      const lastMessage = mockWebSocket.getLastSentMessage();
      expect(lastMessage).toMatchObject({
        type: 'action',
        payload: actionEvent
      });
    });

    it('観測イベントの受信', async () => {
      console.log('📥 テスト: 観測イベント受信');

      const receivedEvents: EventPayload[] = [];
      
      const unsubscribe = eventService.subscribe('file:changed', (event) => {
        receivedEvents.push(event);
      });

      // サーバーからのイベントをシミュレート
      mockWebSocket.simulateMessage({
        type: 'observation',
        payload: {
          type: 'file:changed',
          payload: {
            path: '/src/App.tsx',
            changeType: 'modified'
          }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toMatchObject({
        type: 'file:changed',
        payload: {
          path: '/src/App.tsx'
        }
      });

      unsubscribe();
    });

    it('ブロードキャストイベント', async () => {
      console.log('📢 テスト: ブロードキャストイベント');

      const subscribers: string[] = [];

      // 複数のサブスクライバーを登録
      const unsubscribe1 = eventService.subscribe('broadcast:test', () => {
        subscribers.push('subscriber-1');
      });

      const unsubscribe2 = eventService.subscribe('broadcast:test', () => {
        subscribers.push('subscriber-2');
      });

      const unsubscribe3 = eventService.subscribe('broadcast:test', () => {
        subscribers.push('subscriber-3');
      });

      // ブロードキャストイベントを送信
      mockWebSocket.simulateMessage({
        type: 'notification',
        payload: {
          type: 'broadcast:test',
          payload: { message: 'Test broadcast' }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(subscribers).toHaveLength(3);
      expect(subscribers).toContain('subscriber-1');
      expect(subscribers).toContain('subscriber-2');
      expect(subscribers).toContain('subscriber-3');

      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    });

    it('エラーイベントの処理', async () => {
      console.log('⚠️ テスト: エラーイベント処理');

      let errorReceived = false;
      let errorDetails: any = null;

      eventService.onError((error) => {
        errorReceived = true;
        errorDetails = error;
      });

      // エラーイベントをシミュレート
      mockWebSocket.simulateError(new Error('Connection lost'));

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(errorReceived).toBe(true);
      expect(errorDetails.message).toBe('Connection lost');
    });
  });

  describe('メッセージフィルタリング', () => {
    it('イベントタイプによるフィルタリング', async () => {
      console.log('🔍 テスト: イベントタイプフィルタリング');

      const taskEvents: EventPayload[] = [];
      const fileEvents: EventPayload[] = [];

      eventService.subscribe('task:*', (event) => {
        taskEvents.push(event);
      });

      eventService.subscribe('file:*', (event) => {
        fileEvents.push(event);
      });

      // 異なるタイプのイベントを送信
      mockWebSocket.simulateMessage({
        type: 'observation',
        payload: { type: 'task:started', payload: { id: '1' } }
      });

      mockWebSocket.simulateMessage({
        type: 'observation',
        payload: { type: 'file:created', payload: { path: '/test.js' } }
      });

      mockWebSocket.simulateMessage({
        type: 'observation',
        payload: { type: 'task:completed', payload: { id: '1' } }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(taskEvents).toHaveLength(2);
      expect(fileEvents).toHaveLength(1);
    });

    it('ペイロードベースのフィルタリング', async () => {
      console.log('🎯 テスト: ペイロードフィルタリング');

      const highPriorityEvents: EventPayload[] = [];

      eventService.subscribeWithFilter(
        'task:created',
        (event) => event.payload?.priority === 'high',
        (event) => {
          highPriorityEvents.push(event);
        }
      );

      // 異なる優先度のタスクイベントを送信
      mockWebSocket.simulateMessage({
        type: 'observation',
        payload: {
          type: 'task:created',
          payload: { id: '1', priority: 'low' }
        }
      });

      mockWebSocket.simulateMessage({
        type: 'observation',
        payload: {
          type: 'task:created',
          payload: { id: '2', priority: 'high' }
        }
      });

      mockWebSocket.simulateMessage({
        type: 'observation',
        payload: {
          type: 'task:created',
          payload: { id: '3', priority: 'medium' }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(highPriorityEvents).toHaveLength(1);
      expect(highPriorityEvents[0].payload.id).toBe('2');
    });
  });

  describe('パフォーマンスとレート制限', () => {
    it('メッセージバッチング', async () => {
      console.log('📦 テスト: メッセージバッチング');

      const messageCount = 100;
      const messages: EventPayload[] = [];

      for (let i = 0; i < messageCount; i++) {
        messages.push({
          type: 'metric:update',
          payload: {
            id: i,
            value: Math.random()
          }
        });
      }

      const startTime = Date.now();

      // バッチ送信
      eventService.emitBatch('action', messages);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // 100ms以内に完了
      expect(mockWebSocket.getSentMessageCount()).toBeLessThan(messageCount); // バッチングされている
    });

    it('レート制限の遵守', async () => {
      console.log('⏱️ テスト: レート制限');

      const rateLimitedService = new EventService(wsUrl, {
        rateLimit: {
          maxMessages: 10,
          windowMs: 1000
        }
      });

      await rateLimitedService.connect();

      let sentCount = 0;
      let rejectedCount = 0;

      // レート制限を超えるメッセージを送信
      for (let i = 0; i < 20; i++) {
        const sent = rateLimitedService.emit('action', {
          type: 'test',
          payload: { index: i }
        });

        if (sent) {
          sentCount++;
        } else {
          rejectedCount++;
        }
      }

      expect(sentCount).toBe(10);
      expect(rejectedCount).toBe(10);

      await rateLimitedService.disconnect();
    });
  });

  describe('状態同期', () => {
    it('接続時の状態同期', async () => {
      console.log('🔄 テスト: 接続時状態同期');

      const stateService = new EventService(wsUrl, {
        syncStateOnConnect: true
      });

      let syncedState: any = null;

      stateService.onStateSync((state) => {
        syncedState = state;
      });

      await stateService.connect();

      // サーバーからの状態同期をシミュレート
      mockWebSocket.simulateMessage({
        type: 'system',
        payload: {
          type: 'state:sync',
          payload: {
            activeAgents: 3,
            runningTasks: 5,
            connectedClients: 2
          }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(syncedState).toMatchObject({
        activeAgents: 3,
        runningTasks: 5,
        connectedClients: 2
      });

      await stateService.disconnect();
    });

    it('増分状態更新', async () => {
      console.log('📈 テスト: 増分状態更新');

      const stateUpdates: any[] = [];

      eventService.subscribe('state:update', (event) => {
        stateUpdates.push(event.payload);
      });

      // 複数の状態更新を送信
      mockWebSocket.simulateMessage({
        type: 'state_update',
        payload: {
          type: 'state:update',
          payload: {
            path: 'agents.bolt.status',
            value: 'busy',
            previousValue: 'idle'
          }
        }
      });

      mockWebSocket.simulateMessage({
        type: 'state_update',
        payload: {
          type: 'state:update',
          payload: {
            path: 'tasks.count',
            value: 10,
            previousValue: 8
          }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(stateUpdates).toHaveLength(2);
      expect(stateUpdates[0].path).toBe('agents.bolt.status');
      expect(stateUpdates[1].value).toBe(10);
    });
  });

  describe('セキュリティ', () => {
    it('認証トークンの送信', async () => {
      console.log('🔐 テスト: 認証トークン');

      const secureService = new EventService(wsUrl, {
        auth: {
          token: 'test-jwt-token'
        }
      });

      await secureService.connect();

      // 接続時に認証ヘッダーが送信されることを確認
      const connectionHeaders = mockWebSocket.getConnectionHeaders();
      expect(connectionHeaders['Authorization']).toBe('Bearer test-jwt-token');

      await secureService.disconnect();
    });

    it('不正なメッセージの拒否', async () => {
      console.log('🛡️ テスト: 不正メッセージ拒否');

      let invalidMessageReceived = false;

      eventService.subscribe('malicious:event', () => {
        invalidMessageReceived = true;
      });

      // 不正な形式のメッセージを送信
      mockWebSocket.simulateRawMessage('{ invalid json }');
      mockWebSocket.simulateRawMessage('<script>alert("XSS")</script>');
      mockWebSocket.simulateMessage({
        // typeプロパティが欠落
        payload: { data: 'test' }
      } as any);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(invalidMessageReceived).toBe(false);
    });
  });
});