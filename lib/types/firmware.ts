import { Types } from "mongoose";

export type Firmware = {
  _id: string;
  product: string;
  version: string;
  versionDetails: string;
  fileId: Types.ObjectId; // GridFS file ID
  fileName: string;
  fileSize: number;
  createdAt: string; // Using string for date serialization
  updatedAt: string;
  deletedAt?: string | null;
};

export type NewFirmware = Omit<Firmware, "_id" | "createdAt" | "updatedAt">;
