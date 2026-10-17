import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRental extends Document {
  buyer: string; // Lowercase address
  serviceId?: mongoose.Types.ObjectId | string;
  serviceName: string;
  category: string;
  seller: string; // Lowercase recipient address
  rentalPrice: number; // Integer atomic units paid (e.g. 1000000 = 1.00 USDC)
  quotaTotal: number; // e.g. 10000 API calls
  quotaUsed: number; // Current consumed calls
  expiresAt: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RentalSchema = new Schema<IRental>(
  {
    buyer: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
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
      trim: true,
      index: true,
    },
    seller: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    rentalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quotaTotal: {
      type: Number,
      required: true,
      min: 1,
      default: 10000,
    },
    quotaUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
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

// Compound index for ultra-fast quota lookups
RentalSchema.index({ buyer: 1, category: 1, active: 1 });
RentalSchema.index({ buyer: 1, serviceName: 1, active: 1 });

const Rental: Model<IRental> =
  mongoose.models.Rental || mongoose.model<IRental>("Rental", RentalSchema);

export default Rental;
