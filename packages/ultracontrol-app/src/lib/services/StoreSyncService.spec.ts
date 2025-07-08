// packages/ultracontrol-app/src/lib/services/StoreSyncService.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { atom } from 'nanostores';
import storeSyncService from './StoreSyncService';
import eventService from './EventService';
import {
  boltSessions,
  devinTasks,
  openHandsAgents,
  addBoltSession,
  addDevinTask,
  addOpenHandsAgent,
  setBoltSessions,
  setDevinTasks,
  setOpenHandsAgents,
} from '../store';
import { StateType } from '../interfaces/state';
import type { BoltSession, DevinTask, OpenHandsAgent } from '../store/types';

// Mock EventService
vi.mock('./EventService', () => {
  const mockEventService = {
    sendStateUpdate: vi.fn(),
    onStateUpdate: vi.fn(() => () => {}),
  };
  return { default: mockEventService };
});

// Mock isEventServiceConnected atom
vi.mock('./EventService', async () => {
  const actual = await vi.importActual('./EventService');
  return {
    ...actual,
    isEventServiceConnected: atom(false),
    default: {
      sendStateUpdate: vi.fn(),
      onStateUpdate: vi.fn(() => () => {}),
    },
  };
});

describe('StoreSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset stores
    setBoltSessions([]);
    setDevinTasks([]);
    setOpenHandsAgents([]);
  });

  afterEach(() => {
    storeSyncService.stop();
    vi.useRealTimers();
  });

  describe('start/stop', () => {
    it('should start and stop the service', () => {
      expect(storeSyncService.getSyncStatus().isEnabled).toBe(false);
      
      storeSyncService.start();
      expect(storeSyncService.getSyncStatus().isEnabled).toBe(true);
      
      storeSyncService.stop();
      expect(storeSyncService.getSyncStatus().isEnabled).toBe(false);
    });

    it('should not start if already running', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      storeSyncService.start();
      storeSyncService.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('StoreSyncService is already running');
    });
  });

  describe('store synchronization', () => {
    beforeEach(() => {
      storeSyncService.start();
    });

    it('should sync BoltSession changes', async () => {
      const newSession: BoltSession = {
        id: 'bolt-1',
        name: 'Test Session',
      };

      addBoltSession(newSession);
      
      // Wait for debounce
      vi.advanceTimersByTime(150);

      expect(eventService.sendStateUpdate).toHaveBeenCalledWith({
        stateType: StateType.BoltSession,
        payload: [newSession],
        action: 'set_all',
      });
    });

    it('should sync DevinTask changes', async () => {
      const newTask: DevinTask = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
      };

      addDevinTask(newTask);
      
      // Wait for debounce
      vi.advanceTimersByTime(150);

      expect(eventService.sendStateUpdate).toHaveBeenCalledWith({
        stateType: StateType.DevinTask,
        payload: [newTask],
        action: 'set_all',
      });
    });

    it('should sync OpenHandsAgent changes', async () => {
      const newAgent: OpenHandsAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        status: 'idle',
      };

      addOpenHandsAgent(newAgent);
      
      // Wait for debounce
      vi.advanceTimersByTime(150);

      expect(eventService.sendStateUpdate).toHaveBeenCalledWith({
        stateType: StateType.OpenHandsAgent,
        payload: [newAgent],
        action: 'set_all',
      });
    });

    it('should debounce rapid changes', async () => {
      const task1: DevinTask = {
        id: 'task-1',
        title: 'Task 1',
        description: 'Description 1',
        status: 'pending',
      };

      const task2: DevinTask = {
        id: 'task-2',
        title: 'Task 2',
        description: 'Description 2',
        status: 'in_progress',
      };

      // Add two tasks rapidly
      addDevinTask(task1);
      vi.advanceTimersByTime(50); // Half of debounce delay
      addDevinTask(task2);
      
      // Should not have sent update yet
      expect(eventService.sendStateUpdate).not.toHaveBeenCalled();
      
      // Wait for full debounce
      vi.advanceTimersByTime(150);
      
      // Should send only one update with both tasks
      expect(eventService.sendStateUpdate).toHaveBeenCalledTimes(1);
      expect(eventService.sendStateUpdate).toHaveBeenCalledWith({
        stateType: StateType.DevinTask,
        payload: [task1, task2],
        action: 'set_all',
      });
    });
  });

  describe('incoming state updates', () => {
    it('should skip echo updates', () => {
      const consoleSpy = vi.spyOn(console, 'debug');
      
      storeSyncService.start();
      
      // Simulate sending an update
      const task: DevinTask = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test',
        status: 'pending',
      };
      
      addDevinTask(task);
      vi.advanceTimersByTime(150);
      
      // Simulate receiving the echo
      const mockCallback = vi.mocked(eventService.onStateUpdate).mock.calls[0][0];
      mockCallback({
        stateType: StateType.DevinTask,
        payload: [task],
        action: 'set_all',
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Skipping echo state update for devin_task'
      );
    });
  });

  describe('manual sync', () => {
    it('should trigger full sync on request', () => {
      storeSyncService.start();
      
      // Add some data
      addBoltSession({ id: 'bolt-1', name: 'Session 1' });
      addDevinTask({
        id: 'task-1',
        title: 'Task 1',
        description: 'Desc',
        status: 'pending',
      });
      
      vi.advanceTimersByTime(150);
      vi.clearAllMocks();
      
      // Request full sync
      storeSyncService.requestFullSync();
      vi.advanceTimersByTime(150);
      
      // Should send all states
      expect(eventService.sendStateUpdate).toHaveBeenCalledTimes(4); // All 4 state types
    });

    it('should not sync when service is stopped', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      
      storeSyncService.stop();
      storeSyncService.requestFullSync();
      
      expect(consoleSpy).toHaveBeenCalledWith('StoreSyncService is not running');
      expect(eventService.sendStateUpdate).not.toHaveBeenCalled();
    });
  });

  describe('sync status', () => {
    it('should report correct sync status', () => {
      const status = storeSyncService.getSyncStatus();
      
      expect(status).toEqual({
        isEnabled: false,
        lastSync: {},
        pendingSyncs: 0,
      });
      
      storeSyncService.start();
      
      // Add a task to create pending sync
      addDevinTask({
        id: 'task-1',
        title: 'Test',
        description: 'Test',
        status: 'pending',
      });
      
      const statusAfterChange = storeSyncService.getSyncStatus();
      expect(statusAfterChange.isEnabled).toBe(true);
      expect(statusAfterChange.pendingSyncs).toBe(1);
      
      // Wait for sync to complete
      vi.advanceTimersByTime(150);
      
      const statusAfterSync = storeSyncService.getSyncStatus();
      expect(statusAfterSync.pendingSyncs).toBe(0);
      expect(statusAfterSync.lastSync[StateType.DevinTask]).toBeDefined();
    });
  });
});