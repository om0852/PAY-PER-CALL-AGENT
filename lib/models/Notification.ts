import mongoose, { Model, Schema } from "mongoose";

export interface INotification {
  _id?: string;
  serviceId?: mongoose.Types.ObjectId | string;
  serviceName: string;
  type: "HEALTH_ALERT" | "ENDPOINT_DOWN" | "SCHEMA_MISMATCH" | "INFO";
  severity: "info" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
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
    type: {
      type: String,
      enum: ["HEALTH_ALERT", "ENDPOINT_DOWN", "SCHEMA_MISMATCH", "INFO"],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "error"],
      default: "info",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ read: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
