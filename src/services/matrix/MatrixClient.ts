/**
 * Matrix client wrapper for TextBean.
 *
 * Wraps matrix-js-sdk's MatrixClient for React Native usage.
 * Handles login, session persistence, sync lifecycle, and
 * provides a clean API for the rest of the app.
 *
 * No E2EE in v1 — no initCrypto() call.
 */

// Polyfills must be imported first
import '@/services/matrix/polyfills';

import {
  createClient,
  type MatrixClient as MatrixClientType,
  type ICreateClientOpts,
  type IStartClientOpts,
  ClientEvent,
  SyncState,
  type Room,
} from 'matrix-js-sdk';
import * as SecureStore from 'expo-secure-store';

import type { MatrixLoginCredentials, MatrixSession } from '@/types/matrix';

/** SecureStore keys for persisted session */
const SESSION_KEY = 'textbean_matrix_session';

/** Singleton client instance */
let client: MatrixClientType | null = null;

/**
 * Get the current Matrix client instance.
 * Throws if not initialized (call initClient or restoreSession first).
 */
const getClient = (): MatrixClientType => {
  if (!client) {
    throw new Error('Matrix client not initialized. Call initClient() or restoreSession() first.');
  }
  return client;
};

/**
 * Check if a client is currently initialized.
 */
const isClientInitialized = (): boolean => client !== null;

/**
 * Initialize a new Matrix client with the given options.
 * Does NOT start syncing — call startSync() separately.
 */
const initClient = (opts: ICreateClientOpts): MatrixClientType => {
  // Clean up existing client if any
  if (client) {
    client.stopClient();
  }

  client = createClient({
    ...opts,
    useAuthorizationHeader: true,
    timelineSupport: true,
    // Disable VoIP for v1 (Android only, no calling needed)
    disableVoip: true,
  });

  return client;
};

/**
 * Log in with username and password.
 * Stores the session in expo-secure-store on success.
 *
 * @returns The session data for the logged-in user
 */
const login = async (credentials: MatrixLoginCredentials): Promise<MatrixSession> => {
  // Initialize client with homeserver URL
  const matrixClient = initClient({
    baseUrl: credentials.homeserverUrl,
  });

  // Call the Matrix login API
  const response = await matrixClient.loginWithPassword(
    credentials.username,
    credentials.password,
  );

  const session: MatrixSession = {
    userId: response.user_id,
    accessToken: response.access_token,
    deviceId: response.device_id,
    homeserverUrl: credentials.homeserverUrl,
  };

  // Persist session
  await saveSession(session);

  // Reinitialize with credentials
  client = initClient({
    baseUrl: session.homeserverUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    deviceId: session.deviceId,
  });

  return session;
};

/**
 * Restore a previous session from expo-secure-store.
 * Returns null if no session exists.
 */
const restoreSession = async (): Promise<MatrixSession | null> => {
  const session = await loadSession();
  if (!session) return null;

  // Initialize client with stored credentials
  client = initClient({
    baseUrl: session.homeserverUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    deviceId: session.deviceId,
  });

  return session;
};

/**
 * Start the /sync loop.
 * The client must be initialized first via login() or restoreSession().
 */
const startSync = async (opts?: Partial<IStartClientOpts>): Promise<void> => {
  const matrixClient = getClient();

  await matrixClient.startClient({
    initialSyncLimit: 20,
    lazyLoadMembers: true,
    pollTimeout: 30000,
    disablePresence: false,
    ...opts,
  });
};

/**
 * Stop the /sync loop and clean up.
 */
const stopSync = (): void => {
  if (client) {
    client.stopClient();
  }
};

/**
 * Log out and clear the stored session.
 */
const logout = async (): Promise<void> => {
  if (client) {
    try {
      await client.logout(true);
    } catch {
      // Ignore logout errors (e.g. token already invalid)
    }
    client.stopClient();
    client = null;
  }
  await clearSession();
};

/**
 * Send a text message to a room.
 */
const sendTextMessage = async (roomId: string, body: string): Promise<string> => {
  const matrixClient = getClient();
  const response = await matrixClient.sendTextMessage(roomId, body);
  return response.event_id;
};

/**
 * Send a read receipt for an event.
 */
const sendReadReceipt = async (roomId: string, eventId: string): Promise<void> => {
  const matrixClient = getClient();
  const room = matrixClient.getRoom(roomId);
  if (!room) return;

  const event = room.findEventById(eventId);
  if (event) {
    await matrixClient.sendReadReceipt(event);
  }
};

/**
 * Send typing notification.
 */
const sendTyping = async (roomId: string, isTyping: boolean): Promise<void> => {
  const matrixClient = getClient();
  await matrixClient.sendTyping(roomId, isTyping, isTyping ? 30000 : 0);
};

/**
 * Get all rooms the user has joined.
 */
const getRooms = (): Room[] => {
  const matrixClient = getClient();
  return matrixClient.getRooms();
};

/**
 * Get a specific room by ID.
 */
const getRoom = (roomId: string): Room | null => {
  const matrixClient = getClient();
  return matrixClient.getRoom(roomId);
};

/**
 * Get the current user's ID.
 */
const getUserId = (): string | null => {
  return client?.getUserId() ?? null;
};

/**
 * Get the homeserver URL.
 */
const getHomeserverUrl = (): string | null => {
  return client?.getHomeserverUrl() ?? null;
};

/**
 * Convert an MXC URL to an HTTP URL for display.
 */
const mxcToHttpUrl = (mxcUrl: string | null | undefined, width?: number, height?: number): string | null => {
  if (!mxcUrl || !client) return null;
  if (width && height) {
    return client.mxcUrlToHttp(mxcUrl, width, height, 'crop') ?? null;
  }
  return client.mxcUrlToHttp(mxcUrl) ?? null;
};

/**
 * Register event listeners on the client.
 * Returns an unsubscribe function.
 */
const onSyncStateChange = (
  callback: (state: SyncState, prevState: SyncState | null) => void,
): (() => void) => {
  const matrixClient = getClient();
  const handler = (state: SyncState, prevState: SyncState | null) => {
    callback(state, prevState);
  };
  matrixClient.on(ClientEvent.Sync, handler);
  return () => matrixClient.off(ClientEvent.Sync, handler);
};

// --- Session persistence helpers ---

const saveSession = async (session: MatrixSession): Promise<void> => {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
};

const loadSession = async (): Promise<MatrixSession | null> => {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MatrixSession;
  } catch {
    return null;
  }
};

const clearSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};

export {
  getClient,
  isClientInitialized,
  initClient,
  login,
  restoreSession,
  startSync,
  stopSync,
  logout,
  sendTextMessage,
  sendReadReceipt,
  sendTyping,
  getRooms,
  getRoom,
  getUserId,
  getHomeserverUrl,
  mxcToHttpUrl,
  onSyncStateChange,
  ClientEvent,
  SyncState,
};
