import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Persistence backend for all zustand stores.
 *
 * AsyncStorage works in Expo Go. When the app moves to a development build
 * (needed anyway for later native modules), swap this for react-native-mmkv;
 * the stores won't need to change.
 */
export const persistStorage = createJSONStorage(() => AsyncStorage);
