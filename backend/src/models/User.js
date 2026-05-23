import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "owner" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Subscription
    plan: { type: String, enum: ["free", "starter", "pro", "business"], default: "free" },
    planExpiresAt: { type: Date, default: null },

    // Stripe
    stripeCustomerId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null },
    stripeSubscriptionStatus: { type: String, default: null }, // active, past_due, canceled, etc.

    // Permissions (granular override)
    permissions: [{ type: String }],

    // Times aos quais este usuário pertence (apenas para role member)
    teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team", default: [] }],

    // Settings (conta — documento do owner; membros leem via getOwnerId)
    mySellerNames: [{ type: String, trim: true }],

    emailNotify: { type: String },
    cronInterval: { type: String, default: "0 * * * *" },
    sendEmail: { type: Boolean, default: false },

    // Password reset
    resetToken:          { type: String, default: null },
    resetTokenExpiresAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

// Virtual: is plan active?
userSchema.virtual("isPlanActive").get(function () {
  if (this.plan === "free") return true;
  // If managed by Stripe, check subscription status
  if (this.stripeSubscriptionId) {
    return ["active", "trialing"].includes(this.stripeSubscriptionStatus);
  }
  // Fallback: manual expiry
  if (!this.planExpiresAt) return false;
  return this.planExpiresAt > new Date();
});

userSchema.set("toJSON", { virtuals: true });

export default mongoose.model("User", userSchema);
