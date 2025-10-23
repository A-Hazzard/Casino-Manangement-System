import { connectDB } from "@/app/api/lib/middleware/db";
import { Member } from "@/app/api/lib/models/members";
import { MachineSession } from "@/app/api/lib/models/machineSessions";
import { MachineEvent } from "@/app/api/lib/models/machineEvents";

/**
 * Creates aggressive indexes for optimal query performance
 * This should be run once during application setup
 */
export async function createAggressiveIndexes() {
  try {
    // console.log("Creating aggressive indexes for optimal performance...");
    await connectDB();

    // Member collection indexes
    // console.log("Creating Member indexes...");
    await Member.collection.createIndex(
      { "profile.firstName": 1, "profile.lastName": 1, _id: 1 },
      { name: "member_name_search" }
    );
    await Member.collection.createIndex(
      { _id: 1, createdAt: -1 },
      { name: "member_id_created" }
    );
    await Member.collection.createIndex(
      { points: -1, createdAt: -1 },
      { name: "member_points_created" }
    );
    try {
      // Drop unique username index if it exists, to avoid duplicate key issues
      const indexes = await Member.collection.indexes();
      const hasUsernameIdx = indexes.some((idx) => idx.name === "member_username");
      if (hasUsernameIdx) {
        try {
          await Member.collection.dropIndex("member_username");
          // console.log("Dropped existing member_username index (was unique)");
        } catch (dropErr) {
          console.warn("Could not drop member_username index:", dropErr);
        }
      }
      // Recreate as non-unique index
      await Member.collection.createIndex({ username: 1 }, { name: "member_username" });
    } catch (usernameIdxErr) {
      console.warn("Username index adjustment warning:", usernameIdxErr);
    }
    await Member.collection.createIndex(
      { phoneNumber: 1 },
      { name: "member_phone" }
    );
    await Member.collection.createIndex(
      { gamingLocation: 1, createdAt: -1 },
      { name: "member_location_created" }
    );

    // MachineSession collection indexes
    // console.log("Creating MachineSession indexes...");
    await MachineSession.collection.createIndex(
      { memberId: 1, startTime: -1 },
      { name: "session_member_start" }
    );
    await MachineSession.collection.createIndex(
      { memberId: 1, createdAt: -1 },
      { name: "session_member_created" }
    );
    await MachineSession.collection.createIndex(
      { startTime: -1 },
      { name: "session_start_desc" }
    );
    await MachineSession.collection.createIndex(
      { endTime: -1 },
      { name: "session_end_desc" }
    );
    await MachineSession.collection.createIndex(
      { memberId: 1, points: -1 },
      { name: "session_member_points" }
    );
    await MachineSession.collection.createIndex(
      { memberId: 1, handle: -1 },
      { name: "session_member_handle" }
    );

    // MachineEvent collection indexes
    // console.log("Creating MachineEvent indexes...");
    await MachineEvent.collection.createIndex(
      { currentSession: 1, date: -1 },
      { name: "event_session_date" }
    );
    await MachineEvent.collection.createIndex(
      { machine: 1, date: -1 },
      { name: "event_machine_date" }
    );
    await MachineEvent.collection.createIndex(
      { eventType: 1, date: -1 },
      { name: "event_type_date" }
    );
    await MachineEvent.collection.createIndex(
      { description: 1, date: -1 },
      { name: "event_description_date" }
    );
    await MachineEvent.collection.createIndex(
      { gameName: 1, date: -1 },
      { name: "event_game_date" }
    );
    await MachineEvent.collection.createIndex(
      { currentSession: 1, eventType: 1, date: -1 },
      { name: "event_session_type_date" }
    );
    await MachineEvent.collection.createIndex(
      { machine: 1, eventType: 1, date: -1 },
      { name: "event_machine_type_date" }
    );

    // Text search indexes for better search performance
    // console.log("Creating text search indexes...");
    await Member.collection.createIndex(
      { "profile.firstName": "text", "profile.lastName": "text", _id: "text" },
      { name: "member_text_search" }
    );
    await MachineEvent.collection.createIndex(
      { description: "text", gameName: "text" },
      { name: "event_text_search" }
    );

    // console.log("All aggressive indexes created successfully!");
    return { success: true, message: "Indexes created successfully" };
  } catch (error) {
    console.error("Error creating indexes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Creates indexes for a specific collection
 */
export async function createIndexesForCollection(collectionName: string) {
  try {
    await connectDB();

    switch (collectionName) {
      case "members":
        return await createMemberIndexes();
      case "machinesessions":
        return await createSessionIndexes();
      case "machineevents":
        return await createEventIndexes();
      default:
        throw new Error(`Unknown collection: ${collectionName}`);
    }
  } catch (error) {
    console.error(`Error creating indexes for ${collectionName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function createMemberIndexes() {
  // console.log("Creating Member indexes...");
  await Member.collection.createIndex(
    { "profile.firstName": 1, "profile.lastName": 1, _id: 1 },
    { name: "member_name_search" }
  );
  await Member.collection.createIndex(
    { _id: 1, createdAt: -1 },
    { name: "member_id_created" }
  );
  await Member.collection.createIndex(
    { points: -1, createdAt: -1 },
    { name: "member_points_created" }
  );
  await Member.collection.createIndex(
    { username: 1 },
    { name: "member_username", unique: true }
  );
  return { success: true, message: "Member indexes created" };
}

async function createSessionIndexes() {
  // console.log("Creating MachineSession indexes...");
  await MachineSession.collection.createIndex(
    { memberId: 1, startTime: -1 },
    { name: "session_member_start" }
  );
  await MachineSession.collection.createIndex(
    { memberId: 1, createdAt: -1 },
    { name: "session_member_created" }
  );
  await MachineSession.collection.createIndex(
    { startTime: -1 },
    { name: "session_start_desc" }
  );
  return { success: true, message: "Session indexes created" };
}

async function createEventIndexes() {
  // console.log("Creating MachineEvent indexes...");
  await MachineEvent.collection.createIndex(
    { currentSession: 1, date: -1 },
    { name: "event_session_date" }
  );
  await MachineEvent.collection.createIndex(
    { machine: 1, date: -1 },
    { name: "event_machine_date" }
  );
  await MachineEvent.collection.createIndex(
    { eventType: 1, date: -1 },
    { name: "event_type_date" }
  );
  return { success: true, message: "Event indexes created" };
}
