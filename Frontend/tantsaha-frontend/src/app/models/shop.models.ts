export interface ShopProduct {
  product_id: string;
  sale_session_id: string;
  pickup_point_id: string;
  pickup_point_name: string;
  product_name: string;
  product_description: string;
  image_url?: string;
  unit: string;
  unit_price: string;
  category_name: string;
  producer_id: string;
  farm_name: string;
  available_quantity: string;
  reserved_quantity: string;
  remaining_quantity: string;
  opens_at: string;
  closes_at: string;
  pickup_date: string;
  sale_session_status: string;
  product_image_path?: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  producer_id: string;
  farm_name: string;
  unit_price: number;
  unit: string;
  quantity: number;
  pickup_point_id: string;
  pickup_point_name: string;
  sale_session_id: string;
  product_image_path?: string;
  closes_at: string;
  sale_session_status: string;
}

export interface CreatedOrder {
  id: string;
  transaction_code: string;
  status: string;
  total_amount: string;
  pickup_point: string;
  pickup_point_name?: string;
  sale_session: string;
  created_at?: string;
  items?: OrderItemSummary[];
}

export interface OrderItemSummary {
  product: string;
  producer: string;
  product_name?: string;
  quantity: number;
  unit_price: string;
  unit?: string;
}

export interface OrderSummary extends CreatedOrder {
  items: OrderItemSummary[];
  created_at: string;
}

export interface HarvestLine {
  id: string;
  sale_session_id: string;
  pickup_point_id: string;
  producer_id: string;
  farm_name: string;
  product_id: string;
  product_name: string;
  unit: string;
  total_quantity_to_prepare: string;
  order_count: number;
  is_promoted: boolean;
  image_url?: string | null;
  unit_price: number;
}

export interface ProductStock {
  id: string;
  product: string;
  sale_session: string;
  available_quantity: string;
  reserved_quantity: string;
  is_promoted: boolean;
}

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface ProducerProfile {
  id: string;
  farm_name: string;
  location: string;
  description: string;
  user: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
  };
}

export interface ManagerDelivery {
  id: string;
  transaction_code: string;
  status: string;
  total_amount?: string;
  consumer_name: string;
  consumer_phone: string;
  items: {
    product_name: string;
    quantity: number;
    unit: string;
  }[];
}
