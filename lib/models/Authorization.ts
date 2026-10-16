import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuthorization extends Document {
  from: string;
  to: string;
  value: number; // Integer atomic units
  validAfter: number;
  validBefore: number;
  nonce: string; // 32-byte hex string (0x...)
  status: "verified" | "settled" | "expired";
  createdAt: Date;
}

const AuthorizationSchema = new Schema<IAuthorization>(
  {
    from: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    to: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    validAfter: {
      type: Number,
      required: true,
    },
    validBefore: {
      type: Number,
      required: true,
    },
    nonce: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["verified", "settled", "expired"],
      default: "verified",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Replay defense: single unique index on from + nonce
AuthorizationSchema.index({ from: 1, nonce: 1 }, { unique: true });

const Authorization: Model<IAuthorization> =
  mongoose.models.Authorization ||
  mongoose.model<IAuthorization>("Authorization", AuthorizationSchema);

export default Authorization;
