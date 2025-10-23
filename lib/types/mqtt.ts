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
