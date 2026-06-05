/**
 * Matrix Client-Server API types used by TextBean.
 * Reference: https://spec.matrix.org/v1.1/client-server-api/
 */

/** Credentials for Matrix login */
interface MatrixLoginCredentials {
  homeserverUrl: string;
  username: string;
  password: string;
}

/** Response from POST /_matrix/client/v3/login */
interface MatrixLoginResponse {
  user_id: string;
  access_token: string;
  device_id: string;
  home_server: string;
  well_known?: {
    'm.homeserver': { base_url: string };
  };
}

/** Persisted session data stored in expo-secure-store */
interface MatrixSession {
  userId: string;
  accessToken: string;
  deviceId: string;
  homeserverUrl: string;
}

/** Well-known auto-discovery response */
interface MatrixWellKnown {
  'm.homeserver': {
    base_url: string;
  };
  'm.identity_server'?: {
    base_url: string;
  };
}

/** Pusher registration for Expo Push Notifications */
interface MatrixPusherConfig {
  /** Unique pusher identifier */
  pushkey: string;
  /** "http" for push gateway */
  kind: 'http' | 'email';
  /** Application ID */
  app_id: string;
  /** Human-readable app name */
  app_display_name: string;
  /** Human-readable device name */
  device_display_name: string;
  /** Push gateway URL (Expo's push gateway) */
  url: string;
  /** Language preference */
  lang: string;
  data: {
    /** Expo push notification format */
    format?: string;
    url: string;
  };
}

/** Simplified sync filter for initial sync */
interface MatrixSyncFilter {
  room: {
    timeline: { limit: number };
    state: { lazy_load_members: boolean };
  };
  presence: { types: string[] };
}

export type {
  MatrixLoginCredentials,
  MatrixLoginResponse,
  MatrixSession,
  MatrixWellKnown,
  MatrixPusherConfig,
  MatrixSyncFilter,
};
