/**
 * Auth route group layout.
 *
 * Simple stack navigator for the authentication flow.
 * Users land here when they have no persisted session.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
