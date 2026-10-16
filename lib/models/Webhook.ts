import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWebhook extends Document {
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  description?: string;
  lastDeliveredAt?: Date;
  lastStatusCode?: number;
  deliveryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      default: ["settlement.completed", "balance.low", "task.failed"],
    },
    active: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
    lastDeliveredAt: {
      type: Date,
    },
    lastStatusCode: {
      type: Number,
    },
    deliveryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Webhook: Model<IWebhook> =
  mongoose.models.Webhook || mongoose.model<IWebhook>("Webhook", WebhookSchema);

export default Webhook;
