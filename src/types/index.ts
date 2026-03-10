export type GameType = "pokemon" | "yugioh" | "riftbound";
export type ConditionType = "NM" | "LP" | "MP" | "HP" | "DMG";
export type UserRole = "free" | "pro" | "dealer" | "admin";
export type SubscriptionStatus = "active" | "canceled" | "past_due";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus | null;
  created_at: string;
  current_period_end: string | null;
  // ── Personal info fields ──
  full_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

export interface InventoryLot {
  id: string;
  user_id: string;
  game: GameType;
  card_name: string;
  set_name: string;
  variant: string;
  condition: ConditionType;
  qty_on_hand: number;
  qty_initial: number;
  purchase_date: string;
  vendor: string | null;
  total_cost: number;
  cost_per_card: number;
  created_at: string;
  // --- new price tracking fields ---
  price_query_key: string | null;
  last_estimate_price: number | null;
  last_estimate_at: string | null;
}

export interface Sale {
  id: string;
  user_id: string;
  sale_date: string;
  platform: string;
  card_name: string;
  game: GameType;
  set_name: string;
  variant: string;
  condition: ConditionType;
  qty_sold: number;
  sale_price_each: number;
  platform_fee: number;
  processing_fee: number;
  shipping_cost: number;
  other_fees: number;
  net_proceeds: number;
  cost_basis_used: number;
  realized_profit: number;
  created_at: string;
}

export interface FIFOConsumption {
  id: string;
  sale_id: string;
  inventory_lot_id: string;
  qty_taken: number;
  cost_per_card: number;
  cost_total: number;
}

export interface DashboardStats {
  total_profit: number;
  total_revenue: number;
  total_fees: number;
  cards_on_hand: number;
  active_lots: number;
  inventory_estimated_value: number;
  profit_by_period: { date: string; profit: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface InventoryFilters {
  game?: GameType;
  search?: string;
  condition?: ConditionType;
  page?: number;
  pageSize?: number;
}

export interface SaleFilters {
  game?: GameType;
  search?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
}

export interface CardIdentity {
  game: GameType;
  card_name: string;
  set_name: string;
  variant: string;
  condition: ConditionType;
}

export interface PriceEstimate {
  id: string;
  inventory_lot_id: string;
  user_id: string;
  estimated_price: number | null;
  source: string | null;
  source_url: string | null;
  fetched_at: string;
  currency: string;
  status: "ok" | "not_found" | "error";
}

export interface PriceHistoryResponse {
  estimates: Pick<PriceEstimate, "id" | "estimated_price" | "fetched_at" | "status" | "source_url">[];
  stats: {
    high: number;
    low: number;
    avg: number;
  } | null;
}

export interface RefreshPriceResponse {
  estimated_price: number | null;
  status: "ok" | "not_found" | "error";
  source_url: string | null;
  fetched_at: string;
}