/**
 * MQTT Types
 * Types for MQTT configuration and SMIB device settings.
 *
 * Includes MQTT broker configuration (URI, topics) and SMIB network/
 * communication settings for remote device management.
 */
export type MQTTConfig = {
  mqttURI: string;
  mqttPubTopic: string;
  mqttCfgTopic: string;
};

export type SMIBConfig = {
  net?: {
    netMode?: number;
    netStaSSID?: string;
    netStaPwd?: string;
    netStaChan?: number;
  };
  coms?: {
    comsMode?: number;
  };
  [key: string]: unknown;
};
