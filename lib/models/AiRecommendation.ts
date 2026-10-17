import mongoose, { Model, Schema } from "mongoose";

export interface IAiRecommendation {
  _id?: string;
  buyerAddress: string;
  serviceId?: mongoose.Types.ObjectId | string;
  serviceName: string;
  category: string;
  status: "PENDING" | "ACCEPTED" | "DISMISSED";
  callCount: number;
  payPerCallPriceUsdc: number;
  rentalPriceUsdc: number;
  rentalQuota: number;
  projectedPayPerCallCost: number;
  netSavingsUsdc: number;
  savingsPercent: number;
  llmAnalysis: string;
  dismissedBy?: "web" | "mobile" | "system";
  acceptedBy?: "web" | "mobile";
  createdAt: Date;
  updatedAt: Date;
}

const AiRecommendationSchema = new Schema<IAiRecommendation>(
  {
    buyerAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: false,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DISMISSED"],
      default: "PENDING",
      index: true,
    },
    callCount: {
      type: Number,
      required: true,
      default: 10000,
    },
    payPerCallPriceUsdc: {
      type: Number,
      required: true,
      default: 0.05,
    },
    rentalPriceUsdc: {
      type: Number,
      required: true,
      default: 1.0,
    },
    rentalQuota: {
      type: Number,
      required: true,
      default: 10000,
    },
    projectedPayPerCallCost: {
      type: Number,
      required: true,
      default: 500.0,
    },
    netSavingsUsdc: {
      type: Number,
      required: true,
      default: 499.0,
    },
    savingsPercent: {
      type: Number,
      required: true,
      default: 99.8,
    },
    llmAnalysis: {
      type: String,
      required: true,
      trim: true,
    },
    dismissedBy: {
      type: String,
      enum: ["web", "mobile", "system"],
      required: false,
    },
    acceptedBy: {
      type: String,
      enum: ["web", "mobile"],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const AiRecommendation: Model<IAiRecommendation> =
  mongoose.models.AiRecommendation ||
  mongoose.model<IAiRecommendation>("AiRecommendation", AiRecommendationSchema);

export default AiRecommendation;
