import mongoose, { Model, Schema } from "mongoose";

export interface IService {
  name: string;
  category: "scraping" | "fx-rates" | "summarization";
  endpoint: string;
  price: number; // Integer atomic units (e.g. 50000 = 0.05 USDC)
  asset: string;
  network: string;
  payTo: string;
  schema: Record<string, unknown>;
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
      enum: ["scraping", "fx-rates", "summarization"],
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
