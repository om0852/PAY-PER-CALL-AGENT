import mongoose, { Model, Schema } from "mongoose";

export interface IServiceHealth {
  status: "HEALTHY" | "DEGRADED" | "DOWN" | "SCHEMA_MISMATCH";
  lastChecked: Date;
  latencyMs: number;
  message?: string;
}

export interface IService {
  name: string;
  category: "scraping" | "fx-rates" | "summarization" | "data" | "inference";
  endpoint: string;
  price: number; // Integer atomic units (e.g. 50000 = 0.05 USDC)
  asset: string;
  network: string;
  payTo: string;
  schema: Record<string, unknown>;
  health?: IServiceHealth;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["scraping", "fx-rates", "summarization", "data", "inference"],
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    asset: {
      type: String,
      required: true,
      trim: true,
    },
    network: {
      type: String,
      required: true,
      trim: true,
    },
    payTo: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    schema: {
      type: Schema.Types.Mixed,
      required: true,
    },
    health: {
      status: {
        type: String,
        enum: ["HEALTHY", "DEGRADED", "DOWN", "SCHEMA_MISMATCH"],
        default: "DOWN",
      },
      lastChecked: {
        type: Date,
        default: Date.now,
      },
      latencyMs: {
        type: Number,
        default: 0,
      },
      message: {
        type: String,
        default: "Awaiting initial health audit",
      },
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ServiceSchema.index({ category: 1, active: 1, price: 1 });

const Service: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>("Service", ServiceSchema);

export default Service;
