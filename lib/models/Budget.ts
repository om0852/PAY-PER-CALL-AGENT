import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBudgetReservation {
  id: string;
  price: number;
  expiresAt: number; // Unix epoch ms
}

export interface IBudget extends Document {
  taskId: string;
  limit: number;
  spent: number;
  reserved: number;
  activeReservations: IBudgetReservation[];
  createdAt: Date;
  updatedAt: Date;
}

const BudgetReservationSchema = new Schema<IBudgetReservation>(
  {
    id: { type: String, required: true },
    price: { type: Number, required: true },
    expiresAt: { type: Number, required: true },
  },
  { _id: false }
);

const BudgetSchema = new Schema<IBudget>(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    limit: {
      type: Number,
      required: true,
      min: 0,
    },
    spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeReservations: {
      type: [BudgetReservationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Budget: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>("Budget", BudgetSchema);

export default Budget;
