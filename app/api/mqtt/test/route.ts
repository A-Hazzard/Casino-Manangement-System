import { NextRequest, NextResponse } from "next/server";
import mqtt from "mqtt";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { action, relayId = "e831cdfa8384", message } = body;

    // MQTT configuration from environment
    const MQTT_URI =
      process.env.MQTT_URI || "mqtt://mqtt:mqtt@mq.sas.backoffice.ltd:1883";
    const RELAY_TOPIC = `sas/relay/${relayId}`;

    return new Promise<Response>((resolve) => {
      // Connect to MQTT broker
      const client = mqtt.connect(MQTT_URI, {
        clientId: `test-api-${Date.now()}`,
        clean: true,
        reconnectPeriod: 0, // Disable auto-reconnect for testing
      });

      const responseData: {
        success: boolean;
        action: string;
        relayId: string;
        topic: string;
        timestamp: string;
        messages: string[];
        error?: string;
        receivedMessage?: string;
        publishedMessage?: string;
      } = {
        success: false,
        action,
        relayId,
        topic: RELAY_TOPIC,
        timestamp: new Date().toISOString(),
        messages: [],
      };

      const timeout = setTimeout(() => {
        client.end();
        resolve(
          NextResponse.json(
            {
              ...responseData,
              error: "Connection timeout after 10 seconds",
              messages: responseData.messages,
            },
            { status: 408 }
          )
        );
      }, 10000);

      client.on("connect", () => {
        console.log("✅ MQTT connected successfully");
        responseData.messages.push("Connected to MQTT broker");

        if (action === "subscribe") {
          // Subscribe to the relay topic
          client.subscribe(RELAY_TOPIC, (err) => {
            if (err) {
              responseData.messages.push(`Subscribe error: ${err.message}`);
              responseData.error = err.message;
              client.end();
              clearTimeout(timeout);
              resolve(NextResponse.json(responseData, { status: 500 }));
            } else {
              responseData.messages.push(`Subscribed to ${RELAY_TOPIC}`);

              // Wait for messages for 5 seconds
              const messageTimeout = setTimeout(() => {
                responseData.messages.push("No messages received in 5 seconds");
                responseData.success = true;
                client.end();
                clearTimeout(timeout);
                resolve(NextResponse.json(responseData));
              }, 5000);

              client.on("message", (receivedTopic, receivedMessage) => {
                responseData.messages.push(
                  `Received on ${receivedTopic}: ${receivedMessage.toString()}`
                );
                responseData.receivedMessage = receivedMessage.toString();
                responseData.success = true;
                clearTimeout(messageTimeout);
                client.end();
                clearTimeout(timeout);
                resolve(NextResponse.json(responseData));
              });
            }
          });
        } else if (action === "publish") {
          // Publish a message to the relay topic
          const publishMessage =
            message ||
            JSON.stringify({
              command: "test",
              timestamp: new Date().toISOString(),
              source: "api-test",
            });

          client.publish(RELAY_TOPIC, publishMessage, (err) => {
            if (err) {
              responseData.messages.push(`Publish error: ${err.message}`);
              responseData.error = err.message;
              client.end();
              clearTimeout(timeout);
              resolve(NextResponse.json(responseData, { status: 500 }));
            } else {
              responseData.messages.push(
                `Published to ${RELAY_TOPIC}: ${publishMessage}`
              );
              responseData.publishedMessage = publishMessage;
              responseData.success = true;
              client.end();
              clearTimeout(timeout);
              resolve(NextResponse.json(responseData));
            }
          });
        } else if (action === "connect") {
          // Just test connection
          responseData.success = true;
          client.end();
          clearTimeout(timeout);
          resolve(NextResponse.json(responseData));
        } else {
          responseData.error =
            "Invalid action. Use 'connect', 'subscribe', or 'publish'";
          client.end();
          clearTimeout(timeout);
          resolve(NextResponse.json(responseData, { status: 400 }));
        }
      });

      client.on("error", (error) => {
        console.error("❌ MQTT connection error:", error);
        responseData.messages.push(`Connection error: ${error.message}`);
        responseData.error = error.message;
        client.end();
        clearTimeout(timeout);
        resolve(NextResponse.json(responseData, { status: 500 }));
      });

      client.on("close", () => {
        console.log("🔌 MQTT disconnected");
        responseData.messages.push("Disconnected from MQTT broker");
      });
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "MQTT Test API",
    usage: {
      connect: 'POST /api/mqtt/test with { "action": "connect" }',
      publish:
        'POST /api/mqtt/test with { "action": "publish", "message": "your message" }',
      subscribe: 'POST /api/mqtt/test with { "action": "subscribe" }',
      customRelayId:
        'POST /api/mqtt/test with { "action": "publish", "relayId": "your-relay-id" }',
    },
    defaultRelayId: "e831cdfa8384",
    topic: "sas/relay/[relayId]",
    timestamp: new Date().toISOString(),
  });
}
