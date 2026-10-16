import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWallet extends Document {
  address: string;
  privateKey?: string;
  balance: number; // Integer atomic units (e.g. 1000000 = 1.000000 USDC)
  role: "buyer" | "seller" | "facilitator";
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    privateKey: {
      type: String,
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ["buyer", "seller", "facilitator"],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Wallet: Model<IWallet> =
  mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", WalletSchema);

export default Wallet;
