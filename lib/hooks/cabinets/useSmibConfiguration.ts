/**
 * useSmibConfiguration Hook
 *
 * Main hook for managing SMIB (Slot Machine Interface Board) configuration.
 * Composes state management, MQTT communication, and configuration actions.
 *
 * @module lib/hooks/cabinets/useSmibConfiguration
 */

import { useSmibConfigState } from './useSmibConfigState';
import { useSmibMqtt } from './useSmibMqtt';
import { useSmibConfigActions } from './useSmibConfigActions';

export type {
  MqttConfigData,
  FormData,
  OriginalData,
  UseSmibConfigStateReturn,
} from './useSmibConfigState';

export type { UseSmibMqttReturn } from './useSmibMqtt';
export type { UseSmibConfigActionsReturn } from './useSmibConfigActions';

type UseSmibConfigurationReturn = ReturnType<typeof useSmibConfigState> &
  ReturnType<typeof useSmibMqtt> &
  ReturnType<typeof useSmibConfigActions>;

export function useSmibConfiguration(
  initialExpanded = false
): UseSmibConfigurationReturn {
  // ============================================================================
  // Compose Sub-Hooks
  // ============================================================================
  const configState = useSmibConfigState(initialExpanded);
  const mqttHook = useSmibMqtt(configState);

  const actions = useSmibConfigActions(configState, mqttHook);

  // ============================================================================
  // Return Combined API
  // ============================================================================
  return {
    ...configState,
    ...mqttHook,
    ...actions,
  };
}