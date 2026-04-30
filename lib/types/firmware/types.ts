import { Types } from 'mongoose';

export type Firmware = {
  _id: string;
  product: string;
  version: string;
  versionDetails: string;
  fileId: Types.ObjectId;
  fileName: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};


