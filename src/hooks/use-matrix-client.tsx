/**
 * useMatrixClient — React context hook for accessing the Matrix client.
 *
 * Provides a React Context + Provider that initialises the Matrix client
 * (via restoreSession or login) and exposes it to the component tree.
 * Components use `useMatrixClient()` to get the client without prop-drilling.
 *
 * The provider should be placed inside the root _layout.tsx, after the
 * auth gate confirms the user is logged in.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  getClient,
  isClientInitialized,
  restoreSession,
  startSync,
  stopSync,
} from '@/services/matrix/MatrixClient';
import type { MatrixClient as MatrixClientType } from 'matrix-js-sdk';

/* ─── Context ────────────────────────────────────────────── */

interface MatrixClientContextValue {
  /** The initialised Matrix client instance, or null if not ready. */
  client: MatrixClientType | null;
  /** Whether the client is currently initialising. */
  isInitializing: boolean;
  /** Error encountered during initialisation, if any. */
  error: string | null;
}

const MatrixClientContext = createContext<MatrixClientContextValue>({
  client: null,
  isInitializing: true,
  error: null,
});

/* ─── Provider ───────────────────────────────────────────── */

interface MatrixClientProviderProps {
  children: ReactNode;
  /**
   * Whether to automatically start the /sync loop after restoring the session.
   * Defaults to true.
   */
  autoSync?: boolean;
}

/**
 * Wraps children with Matrix client context.
 * Attempts to restore the previous session on mount.
 */
function MatrixClientProvider({ children, autoSync = true }: MatrixClientProviderProps) {
  const [state, setState] = useState<MatrixClientContextValue>({
    client: null,
    isInitializing: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // If already initialized (e.g., login just completed), use existing client
        if (isClientInitialized()) {
          const client = getClient();
          if (mounted) {
            setState({ client, isInitializing: false, error: null });
          }
          if (autoSync) {
            await startSync();
          }
          return;
        }

        // Try to restore a saved session
        const session = await restoreSession();
        if (!session) {
          if (mounted) {
            setState({ client: null, isInitializing: false, error: null });
          }
          return;
        }

        const client = getClient();
        if (mounted) {
          setState({ client, isInitializing: false, error: null });
        }

        if (autoSync) {
          await startSync();
        }
      } catch (err) {
        if (mounted) {
          setState({
            client: null,
            isInitializing: false,
            error: err instanceof Error ? err.message : 'Failed to initialize Matrix client',
          });
        }
      }
    };

    init();

    return () => {
      mounted = false;
      stopSync();
    };
  }, [autoSync]);

  return (
    <MatrixClientContext.Provider value={state}>
      {children}
    </MatrixClientContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────── */

/**
 * Access the Matrix client from any component within the MatrixClientProvider.
 *
 * @throws if used outside of MatrixClientProvider
 */
function useMatrixClient(): MatrixClientContextValue {
  const context = useContext(MatrixClientContext);
  if (context === undefined) {
    throw new Error('useMatrixClient must be used within a MatrixClientProvider');
  }
  return context;
}

export { MatrixClientProvider, useMatrixClient };
