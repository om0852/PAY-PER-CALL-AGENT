import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITransfer extends Document {
  txHash: string;
  from: string;
  to: string;
  amount: number; // Integer atomic units
  network: string;
  authorizationNonce: string;
  signature?: {
    v: number;
    r: string;
    s: string;
  };
  settledAt: Date;
}

const TransferSchema = new Schema<ITransfer>(
  {
    txHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
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
    amount: {
      type: Number,
      required: true,
    },
    network: {
      type: String,
      required: true,
      trim: true,
    },
    authorizationNonce: {
      type: String,
      required: true,
      trim: true,
    },
    signature: {
      v: Number,
      r: String,
      s: String,
    },
    settledAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

const Transfer: Model<ITransfer> =
  mongoose.models.Transfer ||
  mongoose.model<ITransfer>("Transfer", TransferSchema);

export default Transfer;
