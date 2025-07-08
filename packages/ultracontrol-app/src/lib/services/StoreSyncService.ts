// packages/ultracontrol-app/src/lib/services/StoreSyncService.ts
import { onMount, onSet } from 'nanostores';
import eventService from './EventService';
import {
  boltSessions,
  devinTasks,
  openHandsAgents,
  userPreferences,
  currentUser,
} from '../store';
import { StateType } from '../interfaces/state';
import type { StateUpdateMessage, } from '../interfaces/state';
import type { BoltSession, DevinTask, OpenHandsAgent, UserPreferences } from '../store/types';

class StoreSyncService {
  private unsubscribers: Array<() => void> = [];
  private isEnabled = false;
  private lastSyncTimestamp: Record<StateType, number> = {} as Record<StateType, number>;
  private syncDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_DELAY = 100; // 100ms debounce

  start(): void {
    if (this.isEnabled) {
      console.log('StoreSyncService is already running');
      return;
    }

    console.log('Starting StoreSyncService...');
    this.isEnabled = true;

    // Subscribe to BoltSessions changes
    const unsubBolt = onSet(boltSessions, ({ newValue }) => {
      this.handleStoreChange(StateType.BoltSession, newValue, 'set_all');
    });
    this.unsubscribers.push(unsubBolt);

    // Subscribe to DevinTasks changes
    const unsubDevin = onSet(devinTasks, ({ newValue }) => {
      this.handleStoreChange(StateType.DevinTask, newValue, 'set_all');
    });
    this.unsubscribers.push(unsubDevin);

    // Subscribe to OpenHandsAgents changes
    const unsubAgents = onSet(openHandsAgents, ({ newValue }) => {
      this.handleStoreChange(StateType.OpenHandsAgent, newValue, 'set_all');
    });
    this.unsubscribers.push(unsubAgents);

    // Subscribe to UserPreferences changes
    const unsubPrefs = onMount(userPreferences, () => {
      // For map stores, we need to listen to individual key changes
      return userPreferences.subscribe((value) => {
        this.handleStoreChange(StateType.UserPreferences, value, 'update');
      });
    });
    this.unsubscribers.push(unsubPrefs);

    // Listen for incoming state updates from WebSocket
    const unsubStateUpdate = eventService.onStateUpdate((message) => {
      this.handleIncomingStateUpdate(message);
    });
    this.unsubscribers.push(unsubStateUpdate);

    console.log('StoreSyncService started successfully');
  }

  stop(): void {
    if (!this.isEnabled) {
      console.log('StoreSyncService is not running');
      return;
    }

    console.log('Stopping StoreSyncService...');
    this.isEnabled = false;

    // Clear all debounce timers
    this.syncDebounceTimers.forEach(timer => clearTimeout(timer));
    this.syncDebounceTimers.clear();

    // Unsubscribe from all store changes
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    console.log('StoreSyncService stopped');
  }

  private handleStoreChange<T>(
    stateType: StateType,
    payload: T[] | T,
    action: 'update' | 'add' | 'remove' | 'set_all'
  ): void {
    if (!this.isEnabled) return;

    // Debounce rapid changes
    const debounceKey = `${stateType}_${action}`;
    const existingTimer = this.syncDebounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.syncDebounceTimers.delete(debounceKey);
      
      // Check if WebSocket is connected
      if (!eventService || typeof eventService.sendStateUpdate !== 'function') {
        console.warn('EventService not ready for state sync');
        return;
      }

      // Create and send state update message
      const stateUpdate: StateUpdateMessage<T> = {
        stateType,
        payload,
        action,
      };

      try {
        eventService.sendStateUpdate(stateUpdate);
        this.lastSyncTimestamp[stateType] = Date.now();
        console.debug(`State update sent for ${stateType}`, stateUpdate);
      } catch (error) {
        console.error(`Failed to send state update for ${stateType}:`, error);
      }
    }, this.DEBOUNCE_DELAY);

    this.syncDebounceTimers.set(debounceKey, timer);
  }

  private handleIncomingStateUpdate(message: StateUpdateMessage<any>): void {
    // Skip updates that originated from this client (echo prevention)
    const lastSync = this.lastSyncTimestamp[message.stateType];
    if (lastSync && Date.now() - lastSync < 500) {
      console.debug(`Skipping echo state update for ${message.stateType}`);
      return;
    }

    // The actual state update is handled by EventService's handleStateUpdateMessage
    // This method is for any additional processing or conflict resolution if needed
    console.debug(`Incoming state update processed for ${message.stateType}`);
  }

  // Method to manually trigger a full state sync
  requestFullSync(): void {
    if (!this.isEnabled) {
      console.warn('StoreSyncService is not running');
      return;
    }

    // Send current state of all stores
    this.handleStoreChange(StateType.BoltSession, boltSessions.get(), 'set_all');
    this.handleStoreChange(StateType.DevinTask, devinTasks.get(), 'set_all');
    this.handleStoreChange(StateType.OpenHandsAgent, openHandsAgents.get(), 'set_all');
    this.handleStoreChange(StateType.UserPreferences, userPreferences.get(), 'update');
  }

  // Get sync status
  getSyncStatus(): {
    isEnabled: boolean;
    lastSync: Record<StateType, number>;
    pendingSyncs: number;
  } {
    return {
      isEnabled: this.isEnabled,
      lastSync: { ...this.lastSyncTimestamp },
      pendingSyncs: this.syncDebounceTimers.size,
    };
  }
}

// Singleton instance
const storeSyncService = new StoreSyncService();
export default storeSyncService;

// Auto-start when EventService is connected
import { isEventServiceConnected } from './EventService';
onSet(isEventServiceConnected, ({ newValue }) => {
  if (newValue && !storeSyncService.getSyncStatus().isEnabled) {
    storeSyncService.start();
  } else if (!newValue && storeSyncService.getSyncStatus().isEnabled) {
    storeSyncService.stop();
  }
});