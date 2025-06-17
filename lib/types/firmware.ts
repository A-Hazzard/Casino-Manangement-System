import { Types } from "mongoose";

export type Firmware = {
  _id: string;
  product: string;
  version: string;
  versionDetails: string;
  fileId: Types.ObjectId; // GridFS file ID
  createdAt: Date;
  updatedAt: Date;
};
