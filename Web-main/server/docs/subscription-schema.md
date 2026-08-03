# User Subscription Schema

Collection: user_subscriptions
interface UserSubscription {
  userId: number;
  packageId: number;
  status:
    | "ACTIVE"
    | "EXPIRED"
    | "CANCELLED";
  activatedAt: Date;






  expiresAt: Date;
  autoRenew: boolean;
  cycle: string;
  duration: number;
  cycleType: string;
}
