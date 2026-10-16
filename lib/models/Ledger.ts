import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILedger extends Document {
  taskId: string;
  buyer: string;
  seller: string;
  serviceName: string;
  category: string;
  listedPrice: number;
  askedPrice: number;
  paidPrice: number;
  txHash: string | null;
  status:
    | "SETTLED"
    | "REFUSED_PRICE_MISMATCH"
    | "FAILED_OUTPUT_REJECTED"
    | "FAILED_DOWNSTREAM";
  latencyMs: number;
  userRating?: number;
  ratingFeedback?: string;
  gasFeeSponsored?: string;
  scoreBreakdown?: {
    quality: number;
    latencyScore: number;
    costScore: number;
    overallRating: number;
  };
  createdAt: Date;
}

const LedgerSchema = new Schema<ILedger>(
  {
    taskId: {
      type: String,
      required: true,
      index: true,
    },
    buyer: {
      type: String,
      required: true,
      lowercase: true,
    },
    seller: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    listedPrice: {
      type: Number,
      required: true,
    },
    askedPrice: {
      type: Number,
      required: true,
    },
    paidPrice: {
      type: Number,
      required: true,
    },
    txHash: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "SETTLED",
        "REFUSED_PRICE_MISMATCH",
        "FAILED_OUTPUT_REJECTED",
        "FAILED_DOWNSTREAM",
      ],
      required: true,
      index: true,
    },
    latencyMs: {
      type: Number,
      required: true,
    },
    userRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    ratingFeedback: {
      type: String,
      default: null,
    },
    gasFeeSponsored: {
      type: String,
      default: "Sponsored by Relayer (~$0.0001 L2 Gas)",
    },
    scoreBreakdown: {
      quality: { type: Number, default: 100 },
      latencyScore: { type: Number, default: 95 },
      costScore: { type: Number, default: 100 },
      overallRating: { type: Number, default: 4.9 },
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

const Ledger: Model<ILedger> =
  mongoose.models.Ledger || mongoose.model<ILedger>("Ledger", LedgerSchema);

export default Ledger;

