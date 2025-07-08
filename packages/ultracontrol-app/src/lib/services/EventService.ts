// packages/ultracontrol-app/src/lib/services/EventService.ts
import { atom } from 'nanostores';
import type { WebSocketMessage, ActionPayload, ObservationPayload, NotificationEventPayload, SystemEventPayload } from '../interfaces/events';
import { EventType } from '../interfaces/events';
import type { StateUpdateMessage } from '../interfaces/state'; // Import StateUpdateMessage
import { StateType } from '../interfaces/state'; // Import StateType
import {
  addNotification,
  // DevinTask actions
  updateDevinTask,
  addDevinTask,
  removeDevinTask,
  setDevinTasks,
  // BoltSession actions
  addBoltSession,
  updateBoltSession,
  removeBoltSession,
  boltSessions,
  // OpenHandsAgent actions
  addOpenHandsAgent,
  updateOpenHandsAgent,
  removeOpenHandsAgent,
  openHandsAgents,
  // UserPreferences actions
  userPreferences,
  setTheme,
} from '../store';

const WS_URL = import.meta.env.VITE_WS_EVENTS_URL || 'ws://localhost:8000/ws/events'; // Example URL

export const isEventServiceConnected = atom(false);

type EventCallback<T extends WebSocketMessage> = (payload: T) => void;

class EventService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private clientId: string = this.generateClientId();

  private actionCallbacks: Array<EventCallback<ActionPayload>> = [];
  private observationCallbacks: Array<EventCallback<ObservationPayload>> = [];
  private notificationCallbacks: Array<EventCallback<NotificationEventPayload>> = [];
  private systemCallbacks: Array<EventCallback<SystemEventPayload>> = [];
  private stateUpdateCallbacks: Array<EventCallback<StateUpdateMessage<any>>> = [];

  constructor() {
    // Bind methods to ensure 'this' context is correct
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected.');
      return;
    }

    console.log(`Attempting to connect to WebSocket: ${WS_URL}`);
    this.socket = new WebSocket(WS_URL);
    this.socket.onopen = this.handleOpen;
    this.socket.onmessage = this.handleMessage;
    this.socket.onerror = this.handleError;
    this.socket.onclose = this.handleClose;
  }

  private handleOpen(): void {
    console.log('WebSocket connection established.');
    isEventServiceConnected.set(true);
    this.reconnectAttempts = 0;
    
    // Request state synchronization from server
    this.sendSystemEvent('RequestStateSync', {
      clientId: this.getClientId(),
      stateTypes: Object.values(StateType),
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const rawMessage = JSON.parse(event.data as string);
      console.debug('WebSocket message received:', rawMessage);

      // Check if it's a StateUpdateMessage by looking for stateType property
      if (rawMessage && typeof rawMessage === 'object' && 'stateType' in rawMessage) {
        const stateMessage = rawMessage as StateUpdateMessage<any>;
        this.handleStateUpdateMessage(stateMessage);
        this.stateUpdateCallbacks.forEach(cb => cb(stateMessage));
        return;
      }

      // Otherwise, process as a standard WebSocketMessage
      const message = rawMessage as WebSocketMessage;
      switch (message.type) {
        case EventType.Action:
          this.actionCallbacks.forEach(cb => cb(message as ActionPayload));
          break;
        case EventType.Observation:
          this.observationCallbacks.forEach(cb => cb(message as ObservationPayload));
          break;
        case EventType.Notification:
          this.notificationCallbacks.forEach(cb => cb(message as NotificationEventPayload));
          // Default handler for notifications
          addNotification(message.message, message.level, message.details?.timeout as number || 5000);
          break;
        case EventType.System:
          this.systemCallbacks.forEach(cb => cb(message as SystemEventPayload));
          break;
        default:
          // Attempt to check if it might be a state update message that missed the initial check
          // This case should ideally not be hit if stateType is always present for state updates.
          if (Object.values(StateType).includes(rawMessage.stateType)) {
             console.warn('Message looks like StateUpdate but missed initial check, processing as StateUpdate:', rawMessage);
             this.handleStateUpdateMessage(rawMessage as StateUpdateMessage<any>);
             this.stateUpdateCallbacks.forEach(cb => cb(rawMessage as StateUpdateMessage<any>));
          } else {
            console.warn('Received unknown event type or malformed message:', message);
          }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  private handleStateUpdateMessage(message: StateUpdateMessage<any>): void {
    console.log(`Handling state update for ${message.stateType}`, message);
    switch (message.stateType) {
      case StateType.DevinTask:
        if (message.action === 'add' && message.payload) {
          addDevinTask(message.payload as any);
        } else if (message.action === 'update' && message.entityId && message.payload) {
          updateDevinTask({ id: message.entityId, ...(message.payload as any) });
        } else if (message.action === 'remove' && message.entityId) {
          removeDevinTask(message.entityId);
        } else if (message.action === 'set_all' && Array.isArray(message.payload)) {
          setDevinTasks(message.payload as any[]);
        }
        break;
        
      case StateType.BoltSession:
        if (message.action === 'add' && message.payload) {
          addBoltSession(message.payload as any);
        } else if (message.action === 'update' && message.entityId && message.payload) {
          updateBoltSession({ id: message.entityId, ...(message.payload as any) });
        } else if (message.action === 'remove' && message.entityId) {
          removeBoltSession(message.entityId);
        } else if (message.action === 'set_all' && Array.isArray(message.payload)) {
          boltSessions.set(message.payload as any[]);
        }
        break;
        
      case StateType.OpenHandsAgent:
        if (message.action === 'add' && message.payload) {
          addOpenHandsAgent(message.payload as any);
        } else if (message.action === 'update' && message.entityId && message.payload) {
          updateOpenHandsAgent({ id: message.entityId, ...(message.payload as any) });
        } else if (message.action === 'remove' && message.entityId) {
          removeOpenHandsAgent(message.entityId);
        } else if (message.action === 'set_all' && Array.isArray(message.payload)) {
          openHandsAgents.set(message.payload as any[]);
        }
        break;
        
      case StateType.UserPreferences:
        if (message.action === 'update' && message.payload) {
          const prefs = message.payload as any;
          if (prefs.theme !== undefined) {
            setTheme(prefs.theme);
          }
          // Add other preference updates as needed
        }
        break;
        
      default:
        console.warn(`No handler for state type: ${message.stateType}`);
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    // Error events do not provide much information, close event will follow
  }

  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
    isEventServiceConnected.set(false);
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect in ${this.reconnectInterval / 1000} seconds... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error('Max WebSocket reconnection attempts reached.');
      addNotification('Connection to server lost. Please refresh.', 'error', 0);
    }
  }

  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket.');
      this.socket.close();
    }
  }

  sendMessage(payload: WebSocketMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const messageString = JSON.stringify(payload);
        this.socket.send(messageString);
        console.debug('WebSocket message sent:', payload);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket is not connected. Message not sent:', payload);
      addNotification('Cannot send message: Not connected to server.', 'error');
    }
  }

  // --- Specific event sending helpers ---
  sendAction(actionType: string, details: Record<string, any>, source: string = "UserInterface"): void {
    const payload: ActionPayload = {
      eventId: crypto.randomUUID(), // Generate a unique ID for the event
      timestamp: new Date().toISOString(),
      source,
      type: EventType.Action,
      actionType,
      details,
    };
    this.sendMessage(payload);
  }

  sendSystemEvent(systemEventType: string, details?: Record<string, any>, source: string = "UserInterface"): void {
    const payload: SystemEventPayload = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source,
      type: EventType.System,
      systemEventType,
      details,
    };
    this.sendMessage(payload);
  }

  sendStateUpdate<T>(stateUpdate: StateUpdateMessage<T>): void {
    // Cast to any to bypass WebSocketMessage type check
    // StateUpdateMessage is a different message type than the standard event types
    this.sendMessage(stateUpdate as any);
  }


  // --- Subscription methods ---
  onAction(callback: EventCallback<ActionPayload>): () => void {
    this.actionCallbacks.push(callback);
    return () => {
      this.actionCallbacks = this.actionCallbacks.filter(cb => cb !== callback);
    };
  }

  onStateUpdate(callback: EventCallback<StateUpdateMessage<any>>): () => void {
    this.stateUpdateCallbacks.push(callback);
    return () => {
      this.stateUpdateCallbacks = this.stateUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  onObservation(callback: EventCallback<ObservationPayload>): () => void {
    this.observationCallbacks.push(callback);
    return () => {
      this.observationCallbacks = this.observationCallbacks.filter(cb => cb !== callback);
    };
  }

  onNotification(callback: EventCallback<NotificationEventPayload>): () => void {
    this.notificationCallbacks.push(callback);
    return () => {
      this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
    };
  }

  onSystemEvent(callback: EventCallback<SystemEventPayload>): () => void {
    this.systemCallbacks.push(callback);
    return () => {
      this.systemCallbacks = this.systemCallbacks.filter(cb => cb !== callback);
    };
  }

  private generateClientId(): string {
    // Generate a unique client ID for this session
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getClientId(): string {
    return this.clientId;
  }
}

// Singleton instance
const eventService = new EventService();
export default eventService;

// Automatically connect when the service is imported,
// or you can choose to connect manually at a later point (e.g., after login)
// eventService.connect();
// For now, let's make connection explicit, e.g. in App.tsx useEffect

[end of packages/ultracontrol-app/src/lib/services/EventService.ts]
