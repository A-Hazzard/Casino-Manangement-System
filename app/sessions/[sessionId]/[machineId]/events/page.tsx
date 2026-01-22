/**
 * Session Events Page
 *
 * This page displays detailed event information for a specific session and machine.
 * It acts as a lean wrapper around the SessionEventsPageContent component.
 *
 * @module app/sessions/[sessionId]/[machineId]/events/page
 */

import { SessionsEventsPageContent } from '@/components/CMS/sessions/SessionsEventsPageContent';
import { use } from 'react';

export default function SessionEventsPage({
  params,
}: {
  params: Promise<{ sessionId: string; machineId: string }>;
}) {
  const { sessionId, machineId } = use(params);

  return (
    <SessionsEventsPageContent sessionId={sessionId} machineId={machineId} />
  );
}
