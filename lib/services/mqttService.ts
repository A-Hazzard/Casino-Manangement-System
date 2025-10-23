import mqtt from "mqtt";
import type { SmibConfig } from "@/shared/types/entities";

type MQTTConfig = {
  mqttURI: string;
  mqttPubTopic: string;
  mqttCfgTopic: string;
  mqttGliTopic: string;
};

type ConfigCallback = (message: Record<string, unknown>) => void;

class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private config: MQTTConfig;
  private isConnected = false;
  private configCallbacks: Map<string, ConfigCallback[]> = new Map();
  private isSubscribedToConfig = false;

  constructor() {
    this.config = {
      mqttURI: process.env.MQTT_URI || "mqtt://localhost:1883",
      mqttPubTopic: process.env.MQTT_PUB_TOPIC || "sas/relay/",
      mqttCfgTopic: process.env.MQTT_CFG_TOPIC || "smib/config",
      mqttGliTopic: process.env.MQTT_GLI_TOPIC || "sas/gli/server/",
    };
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    // If we are already connected, resolve immediately
    if (this.client && this.isConnected) {
      return Promise.resolve();
    }

    try {
      // Connect using the standard mqtt.js pattern with explicit protocol
      this.client = mqtt.connect(this.config.mqttURI, {
        protocol: "mqtt",
        port: 1883,
      });

      // Set up event handlers
      this.client.on("connect", () => {
        console.log("✅ MQTT connected successfully");
        console.log(`🔍 [MQTT] Connected to broker: ${this.config.mqttURI}`);
        this.isConnected = true;
        // Subscribe to config topic if not already subscribed
        this.ensureConfigSubscription();
      });

      this.client.on("error", (error) => {
        console.error("❌ MQTT connection error:", error);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        console.log("🔌 MQTT disconnected");
        this.isConnected = false;
        this.isSubscribedToConfig = false;
      });

      // Set up message routing for config responses
      this.client.on("message", (topic, message) => {
        console.log(`🔍 [MQTT] Received message on topic: ${topic}`);
        console.log(`🔍 [MQTT] Raw message: ${message.toString()}`);

        // Listen for messages on server topics where SMIB devices publish responses
        if (topic === "smib/config" || topic === "sas/server") {
          try {
            const payload = JSON.parse(message.toString());
            const relayId = payload.rly;

            console.log(
              `🔍 [MQTT] Parsed payload:`,
              JSON.stringify(payload, null, 2)
            );
            console.log(`🔍 [MQTT] Extracted relayId: ${relayId}`);
            console.log(
              `🔍 [MQTT] Available callbacks for relayIds:`,
              Array.from(this.configCallbacks.keys())
            );

            if (relayId && this.configCallbacks.has(relayId)) {
              const callbacks = this.configCallbacks.get(relayId);
              console.log(
                `✅ [MQTT] Found ${
                  callbacks?.length || 0
                } callbacks for relayId: ${relayId}`
              );
              if (callbacks) {
                callbacks.forEach((callback, index) => {
                  console.log(
                    `📡 [MQTT] Calling callback ${
                      index + 1
                    } for relayId: ${relayId}`
                  );
                  callback(payload);
                });
              }
            } else {
              console.log(
                `❌ [MQTT] No callbacks found for relayId: ${relayId}`
              );
            }
          } catch (error) {
            console.error("❌ [MQTT] Error parsing server message:", error);
            console.error(
              "❌ [MQTT] Raw message that failed to parse:",
              message.toString()
            );
          }
        } else {
          console.log(
            `🔍 [MQTT] Message on topic ${topic} (not a server topic)`
          );
        }
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error("MQTT client not initialized"));
          return;
        }

        this.client.once("connect", () => resolve());
        this.client.once("error", reject);

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error("MQTT connection timeout"));
        }, 10000);
      });
      console.log("END OF CONNECT FUNCTION");
    } catch (error) {
      console.error("❌ Failed to connect to MQTT:", error);
      throw error;
    }
  }

  /**
   * Send machine control command via MQTT
   */
  async sendMachineControlCommand(
    cabinetId: string,
    command: string
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    if (!this.client || !this.isConnected) {
      throw new Error("MQTT client not connected");
    }

    const topic = `sas/relay/${cabinetId}`;
    const payload = JSON.stringify({
      command,
      timestamp: new Date().toISOString(),
      action: command.toLowerCase().replace(/\s+/g, "_"),
    });

    console.log(`📡 Sending machine control command via MQTT:`, {
      topic,
      command,
      payload,
    });

    return new Promise<void>((resolve, reject) => {
      if (!this.client) {
        reject(new Error("MQTT client not available"));
        return;
      }

      this.client.publish(topic, payload, (error) => {
        if (error) {
          console.error("❌ Failed to publish machine control command:", error);
          reject(error);
        } else {
          console.log("✅ Machine control command published successfully");
          resolve();
        }
      });
    });
  }

  /**
   * Send SMIB configuration update via MQTT
   */
  async sendSMIBConfigUpdate(
    cabinetId: string,
    smibConfig: SmibConfig
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error("MQTT client not available");
    }

    try {
      const message = {
        cabinetId,
        smibConfig,
        timestamp: new Date().toISOString(),
        action: "update_config",
      };

      const topic = `sas/relay/${cabinetId}`;
      const payload = JSON.stringify(message);

      await new Promise<void>((resolve, reject) => {
        this.client!.publish(topic, payload, (error) => {
          if (error) {
            console.error("❌ Failed to publish MQTT message:", error);
            reject(error);
          } else {
            console.log(`✅ SMIB config update sent via MQTT to ${topic}`);
            resolve();
          }
        });
      });
    } catch (error) {
      console.error("❌ Error sending SMIB config update:", error);
      throw error;
    }
  }

  /**
   * Send network configuration update
   */
  async sendNetworkConfigUpdate(
    cabinetId: string,
    networkConfig: {
      netMode: number;
      netStaSSID: string;
      netStaPwd: string;
    }
  ): Promise<void> {
    const smibConfig: SmibConfig = {
      net: {
        netMode: networkConfig.netMode,
        netStaSSID: networkConfig.netStaSSID,
        netStaPwd: networkConfig.netStaPwd,
      },
    };

    await this.sendSMIBConfigUpdate(cabinetId, smibConfig);
  }

  /**
   * Send communication mode update
   */
  async sendCommunicationModeUpdate(
    cabinetId: string,
    comsMode: number
  ): Promise<void> {
    const smibConfig: SmibConfig = {
      coms: {
        comsMode: comsMode,
      },
    };

    await this.sendSMIBConfigUpdate(cabinetId, smibConfig);
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(topic: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error("MQTT client not available");
    }

    return new Promise<void>((resolve, reject) => {
      this.client!.subscribe(topic, (error) => {
        if (error) {
          console.error(`❌ Failed to subscribe to topic ${topic}:`, error);
          reject(error);
        } else {
          console.log(`✅ Subscribed to topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Set up message handler
   */
  onMessage(callback: (topic: string, message: Buffer) => void): void {
    if (this.client) {
      this.client.on("message", callback);
    }
  }

  /**
   * Ensure subscription to config topics
   */
  private async ensureConfigSubscription(): Promise<void> {
    console.log(
      `🔍 [MQTT] Config subscription check: isSubscribed=${
        this.isSubscribedToConfig
      }, client=${!!this.client}, connected=${this.isConnected}`
    );

    if (!this.isSubscribedToConfig && this.client && this.isConnected) {
      try {
        // Subscribe to both server topics where SMIB devices publish responses
        console.log(
          `🔍 [MQTT] Subscribing to server topics: smib/config and sas/server`
        );
        // await this.subscribe("sas/gy/server");
        // await this.subscribe("sas/server");
        await this.subscribe("smib/config");

        this.isSubscribedToConfig = true;
        console.log(
          `✅ Subscribed to server topics: smib/config and sas/server`
        );
      } catch (error) {
        console.error("❌ Failed to subscribe to server topics:", error);
      }
    } else {
      console.log(
        `🔍 [MQTT] Skipping config subscription - already subscribed or not ready`
      );
    }
  }

  /**
   * Subscribe to config topic and register callback for specific relayId
   */
  async subscribeToConfig(
    relayId: string,
    callback: ConfigCallback
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    await this.ensureConfigSubscription();

    // Register callback for this relayId
    if (!this.configCallbacks.has(relayId)) {
      this.configCallbacks.set(relayId, []);
    }
    this.configCallbacks.get(relayId)!.push(callback);

    console.log(`📡 Registered config callback for relayId: ${relayId}`);
    console.log(
      `🔍 [MQTT] Total callbacks registered: ${this.configCallbacks.size}`
    );
    console.log(
      `🔍 [MQTT] Callbacks for ${relayId}: ${
        this.configCallbacks.get(relayId)?.length || 0
      }`
    );
  }

  /**
   * Register callback and request config in one atomic operation
   * This ensures the callback is registered BEFORE the request is sent
   */
  async subscribeAndRequestConfig(
    relayId: string,
    component: string,
    callback: ConfigCallback
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    await this.ensureConfigSubscription();

    // Register callback FIRST
    if (!this.configCallbacks.has(relayId)) {
      this.configCallbacks.set(relayId, []);
    }
    this.configCallbacks.get(relayId)!.push(callback);

    console.log(`📡 Registered config callback for relayId: ${relayId}`);

    // Wait a moment to ensure callback is registered
    await new Promise((resolve) => setTimeout(resolve, 200));

    // CORRECTED: Publish to sas/relay/[relayId] to request from specific SMIB
    const topic = `sas/relay/${relayId}`;
    const payload = JSON.stringify({
      typ: "cfg",
      comp: component,
    });

    console.log(
      `📡 [MQTT] Requesting config for ${component} from relayId: ${relayId}`
    );
    console.log(`📡 [MQTT] Publishing to topic: ${topic}`);
    console.log(`📡 [MQTT] Payload: ${payload}`);

    return new Promise<void>((resolve, reject) => {
      if (!this.client) {
        reject(new Error("MQTT client not available"));
        return;
      }

      this.client.publish(topic, payload, (error) => {
        if (error) {
          console.error(`❌ Failed to request config for ${component}:`, error);
          reject(error);
        } else {
          console.log(`✅ Config request sent for ${component} to ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Unsubscribe callback for specific relayId
   */
  unsubscribeFromConfig(relayId: string): void {
    if (this.configCallbacks.has(relayId)) {
      this.configCallbacks.delete(relayId);
      console.log(`📡 Unregistered config callback for relayId: ${relayId}`);
    }
  }

  /**
   * Unsubscribe specific callback for relayId (for multiple clients)
   */
  unsubscribeCallback(relayId: string, callback: ConfigCallback): void {
    if (this.configCallbacks.has(relayId)) {
      const callbacks = this.configCallbacks.get(relayId)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        console.log(
          `📡 Unregistered specific callback for relayId: ${relayId}`
        );

        // If no more callbacks, remove the relayId entry
        if (callbacks.length === 0) {
          this.configCallbacks.delete(relayId);
          console.log(
            `📡 No more callbacks for relayId: ${relayId}, removed entry`
          );
        }
      }
    }
  }

  /**
   * Request current configuration from SMIB
   */
  async requestConfig(relayId: string, component: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
      console.log("✅ MQTT client connected");
    }

    // CORRECTED: Publish to sas/relay/[relayId] to request from specific SMIB
    const topic = `sas/relay/${relayId}`;
    const payload = JSON.stringify({
      typ: "cfg",
      comp: component,
    });

    console.log(
      `📡 [MQTT] Requesting config for ${component} from relayId: ${relayId}`
    );
    console.log(`📡 [MQTT] Publishing to topic: ${topic}`);
    console.log(`📡 [MQTT] Payload: ${payload}`);

    return new Promise<void>((resolve, reject) => {
      if (!this.client) {
        reject(new Error("MQTT client not available"));
        return;
      }

      this.client.publish(topic, payload, (error) => {
        if (error) {
          console.error(`❌ Failed to request config for ${component}:`, error);
          reject(error);
        } else {
          console.log(`✅ Config request sent for ${component} to ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Publish configuration update to SMIB
   */
  async publishConfig(relayId: string, config: object): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    const topic = `sas/relay/${relayId}`;
    const payload = JSON.stringify(config);

    console.log(`📡 Publishing config update to relayId: ${relayId}`);

    return new Promise<void>((resolve, reject) => {
      if (!this.client) {
        reject(new Error("MQTT client not available"));
        return;
      }

      this.client.publish(topic, payload, (error) => {
        if (error) {
          console.error(`❌ Failed to publish config update:`, error);
          reject(error);
        } else {
          console.log(`✅ Config update published to ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Subscribe to general SMIB server data
   */
  async subscribeToServerData(
    relayId: string,
    callback: ConfigCallback
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    const topic = `${this.config.mqttGliTopic}${relayId}`;

    // Subscribe to the specific SMIB server data topic
    await this.subscribe(topic);

    // Set up message handler for this specific topic
    const messageHandler = (receivedTopic: string, message: Buffer) => {
      if (receivedTopic === topic) {
        try {
          const payload = JSON.parse(message.toString());
          callback(payload);
        } catch (error) {
          console.error("❌ Error parsing server data message:", error);
        }
      }
    };

    this.client?.on("message", messageHandler);

    console.log(
      `📡 Subscribed to server data for relayId: ${relayId} on topic: ${topic}`
    );
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
      console.log("🔌 MQTT disconnected");
    }
  }

  /**
   * Get connection status
   */
  isMQTTConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current MQTT configuration (for debugging)
   */
  getConfig(): MQTTConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const mqttService = new MQTTService();
export default mqttService;
