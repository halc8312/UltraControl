// packages/ultracontrol-app/src/lib/store/index.ts
import { atom, map } from 'nanostores';
import { persistentAtom, persistentMap } from '@nanostores/persistent';
import type {
  BoltSession,
  DevinTask,
  OpenHandsAgent,
  Notification,
  IntegratedWorkspace,
  UserPreferences,
  Theme,
} from './types';

// --- Core Application State ---
export const isLoading = atom(false);
// export const currentUser = atom<string | null>(null); // Replaced with persistentAtom
export const currentUser = persistentAtom<string | null>('currentUser', null); // Persisted

// --- Project Specific Stores ---

// bolt.new-any-llm-main
export const boltSessions = atom<BoltSession[]>([]);
export const activeBoltSessionId = atom<string | null>(null);

// devin-clone-mvp
export const devinTasks = atom<DevinTask[]>([]);
export const activeDevinTaskId = atom<string | null>(null);

// OpenHands-main
export const openHandsAgents = atom<OpenHandsAgent[]>([]);
export const activeOpenHandsAgentId = atom<string | null>(null);

// --- UI and User Preferences ---
// export const userPreferences = map<UserPreferences>({
//   theme: 'system', // Default theme
// });
export const userPreferences = persistentMap<UserPreferences>('userPreferences:', { // Colon for prefixing keys in localStorage
  theme: 'system',
});
export const notifications = atom<Notification[]>([]);

// --- Integrated Workspace State ---
export const integratedWorkspace = map<IntegratedWorkspace>({
  activeProjectId: null,
});

// --- Helper Functions / Actions ---

// Loading State
export const setLoading = (loading: boolean) => isLoading.set(loading);

// User State
export const setUser = (userId: string | null) => currentUser.set(userId);

// Bolt Session Management
export const addBoltSession = (session: BoltSession) => {
  boltSessions.set([...boltSessions.get(), session]);
};
export const removeBoltSession = (sessionId: string) => {
  boltSessions.set(boltSessions.get().filter(s => s.id !== sessionId));
  if (activeBoltSessionId.get() === sessionId) {
    activeBoltSessionId.set(null);
  }
};
export const setActiveBoltSession = (sessionId: string | null) => {
  activeBoltSessionId.set(sessionId);
};
export const updateBoltSession = (updatedSession: Partial<BoltSession> & Pick<BoltSession, 'id'>) => {
  boltSessions.set(
    boltSessions.get().map(s => s.id === updatedSession.id ? { ...s, ...updatedSession } : s)
  );
};

// Devin Task Management
export const addDevinTask = (task: DevinTask) => {
  devinTasks.set([...devinTasks.get(), task]);
};
export const updateDevinTask = (updatedTask: Partial<DevinTask> & Pick<DevinTask, 'id'>) => {
  devinTasks.set(
    devinTasks.get().map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t)
  );
};
export const removeDevinTask = (taskId: string) => {
  devinTasks.set(devinTasks.get().filter(t => t.id !== taskId));
  if (activeDevinTaskId.get() === taskId) {
    activeDevinTaskId.set(null);
  }
};
export const setActiveDevinTask = (taskId: string | null) => {
  activeDevinTaskId.set(taskId);
};

// OpenHands Agent Management
export const addOpenHandsAgent = (agent: OpenHandsAgent) => {
  openHandsAgents.set([...openHandsAgents.get(), agent]);
};
export const updateOpenHandsAgent = (updatedAgent: Partial<OpenHandsAgent> & Pick<OpenHandsAgent, 'id'>) => {
  openHandsAgents.set(
    openHandsAgents.get().map(a => a.id === updatedAgent.id ? { ...a, ...updatedAgent } : a)
  );
};
export const removeOpenHandsAgent = (agentId: string) => {
  openHandsAgents.set(openHandsAgents.get().filter(a => a.id !== agentId));
  if (activeOpenHandsAgentId.get() === agentId) {
    activeOpenHandsAgentId.set(null);
  }
};
export const setActiveOpenHandsAgent = (agentId: string | null) => {
  activeOpenHandsAgentId.set(agentId);
};


// Notifications
export const addNotification = (message: string, type: Notification['type'] = 'info', timeout: number = 5000) => {
  const newNotification: Notification = {
    id: Date.now().toString() + Math.random().toString(36).substring(2,9), // More unique ID
    message,
    type,
    timestamp: Date.now(),
  };
  notifications.set([...notifications.get(), newNotification]);

  if (timeout > 0) {
    setTimeout(() => removeNotification(newNotification.id), timeout);
  }
  return newNotification.id;
};
export const removeNotification = (id: string) => {
  notifications.set(notifications.get().filter(n => n.id !== id));
};
export const clearNotifications = () => notifications.set([]);


// User Preferences
export const setTheme = (theme: Theme) => {
  userPreferences.setKey('theme', theme);
  // Potentially apply theme to DOM here e.g. document.documentElement.className
};

// Integrated Workspace
export const setActiveIntegratedProject = (projectId: string | null) => {
  integratedWorkspace.setKey('activeProjectId', projectId);
};


console.log('Nanostores for UltraControl initialized with new structure.');

// Example usage (for testing, can be removed)
// addBoltSession({ id: 'bolt-1', name: 'My Bolt Session' });
// addDevinTask({ id: 'devin-1', title: 'Implement feature X', description: '...', status: 'pending' });
// addOpenHandsAgent({ id: 'oha-1', name: 'Code Generator', status: 'idle' });
// addNotification('Welcome to UltraControl!', 'info');
// setTheme('dark');

// --- Store Actions for EventService Integration ---

export const setDevinTasks = (tasks: DevinTask[]) => {
  devinTasks.set(tasks);
};

export const setBoltSessions = (sessions: BoltSession[]) => {
  boltSessions.set(sessions);
};

export const setOpenHandsAgents = (agents: OpenHandsAgent[]) => {
  openHandsAgents.set(agents);
};
