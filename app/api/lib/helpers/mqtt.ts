/**
 * MQTT Helper Functions
 *
 * This module contains helper functions for MQTT-related API routes.
 * It handles MQTT configuration extraction and formatting.
 *
 * @module app/api/lib/helpers/mqtt
 */

import { machineSchema } from '@/app/api/lib/models/machines';
import type { InferSchemaType } from 'mongoose';

type MachineDocument = InferSchemaType<typeof machineSchema> & { _id: string };

/**
 * MQTT configuration object
 */
export type MQTTConfig = {
  smibId: string;
  netMode: string;
  networkSSID: string;
  networkPassword: string;
  networkChannel: string;
  communicationMode: string;
  comsMode: string;
  comsAddr: string;
  comsRateMs: string;
  comsRTE: string;
  comsGPC: string;
  firmwareVersion: string;
  mqttHost: string;
  mqttPort: string;
  mqttTLS: string;
  mqttQOS: string;
  mqttIdleTimeout: string;
  mqttUsername: string;
  mqttPassword: string;
  mqttPubTopic: string;
  mqttCfgTopic: string;
  mqttSubTopic: string;
  mqttURI: string;
  serverTopic: string;
  otaURL: string;
};

/**
 * Extracts host from MQTT URI
 *
 * @param uri - MQTT URI string
 * @returns Host string or null
 */
function extractHostFromUri(uri?: string): string | null {
  if (!uri) return null;
  const match = uri.match(/@(.+):/);
  return match?.[1] || null;
}

/**
 * Extracts port from MQTT URI
 *
 * @param uri - MQTT URI string
 * @returns Port string or null
 */
function extractPortFromUri(uri?: string): string | null {
  if (!uri) return null;
  const match = uri.match(/:(\d+)/);
  return match?.[1] || null;
}

/**
 * Formats communication mode from numeric value
 *
 * @param comsMode - Communication mode number
 * @returns Formatted communication mode string
 */
function formatCommunicationMode(comsMode?: number): string {
  if (comsMode === undefined) return 'No Value Provided';
  if (comsMode === 0) return 'sas';
  if (comsMode === 1) return 'non sas';
  if (comsMode === 2) return 'IGT';
  return 'No Value Provided';
}

/**
 * Extracts MQTT configuration from machine document
 *
 * @param cabinet - Machine document
 * @returns MQTT configuration object
 */
export function extractMQTTConfig(cabinet: MachineDocument): MQTTConfig {
  return {
    smibId: cabinet.relayId || cabinet.smibBoard || 'No Value Provided',
    netMode:
      cabinet.smibConfig?.net?.netMode?.toString() || 'No Value Provided',
    networkSSID: cabinet.smibConfig?.net?.netStaSSID || 'No Value Provided',
    networkPassword:
      cabinet.smibConfig?.net?.netStaPwd || 'No Value Provided',
    networkChannel:
      cabinet.smibConfig?.net?.netStaChan?.toString() || 'No Value Provided',
    communicationMode: formatCommunicationMode(
      cabinet.smibConfig?.coms?.comsMode ?? undefined
    ),
    comsMode:
      cabinet.smibConfig?.coms?.comsMode?.toString() || 'No Value Provided',
    comsAddr:
      cabinet.smibConfig?.coms?.comsAddr?.toString() || 'No Value Provided',
    comsRateMs:
      cabinet.smibConfig?.coms?.comsRateMs?.toString() || 'No Value Provided',
    comsRTE:
      cabinet.smibConfig?.coms?.comsRTE?.toString() || 'No Value Provided',
    comsGPC:
      cabinet.smibConfig?.coms?.comsGPC?.toString() || 'No Value Provided',
    firmwareVersion:
      cabinet.smibVersion?.firmware || 'No Value Provided',
    mqttHost:
      extractHostFromUri(cabinet.smibConfig?.mqtt?.mqttURI ?? undefined) ||
      'No Value Provided',
    mqttPort:
      extractPortFromUri(cabinet.smibConfig?.mqtt?.mqttURI ?? undefined) ||
      'No Value Provided',
    mqttTLS:
      cabinet.smibConfig?.mqtt?.mqttSecure?.toString() || 'No Value Provided',
    mqttQOS:
      cabinet.smibConfig?.mqtt?.mqttQOS?.toString() || 'No Value Provided',
    mqttIdleTimeout:
      cabinet.smibConfig?.mqtt?.mqttIdleTimeS?.toString() ||
      'No Value Provided',
    mqttUsername:
      cabinet.smibConfig?.mqtt?.mqttUsername || 'No Value Provided',
    mqttPassword:
      cabinet.smibConfig?.mqtt?.mqttPassword || 'No Value Provided',
    mqttPubTopic:
      cabinet.smibConfig?.mqtt?.mqttPubTopic || 'No Value Provided',
    mqttCfgTopic:
      cabinet.smibConfig?.mqtt?.mqttCfgTopic || 'No Value Provided',
    mqttSubTopic:
      cabinet.smibConfig?.mqtt?.mqttSubTopic || 'No Value Provided',
    mqttURI: cabinet.smibConfig?.mqtt?.mqttURI || 'No Value Provided',
    serverTopic:
      cabinet.smibConfig?.mqtt?.mqttPubTopic || 'No Value Provided',
    otaURL: cabinet.smibConfig?.ota?.otaURL || 'No Value Provided',
  };
}

/**
 * Validates MQTT config publish request body
 *
 * @param body - Request body
 * @returns Validation error message or null if valid
 */
export function validateMQTTConfigPublish(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'Request body is required';
  }

  const bodyObj = body as Record<string, unknown>;

  if (!bodyObj.relayId) {
    return 'relayId is required';
  }

  if (!bodyObj.config) {
    return 'config object is required';
  }

  const config = bodyObj.config as Record<string, unknown>;
  if (!config.typ || !config.comp) {
    return "config must include 'typ' and 'comp' fields";
  }

  return null;
}

/**
 * Validates MQTT config request body
 *
 * @param body - Request body
 * @returns Validation error message or null if valid
 */
export function validateMQTTConfigRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'Request body is required';
  }

  const bodyObj = body as Record<string, unknown>;

  if (!bodyObj.relayId) {
    return 'relayId is required';
  }

  if (!bodyObj.component) {
    return 'component is required';
  }

  return null;
}


