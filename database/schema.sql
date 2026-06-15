CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM (
    'consumer',
    'producer',
    'manager',
    'admin'
);

CREATE TYPE sale_session_status AS ENUM (
    'draft',
    'open',
    'closed',
    'distributed',
    'cancelled'
);

CREATE TYPE order_status AS ENUM (
    'pending_payment',
    'payment_submitted',
    'confirmed',
    'ready',
    'picked_up',
    'cancelled'
);

CREATE TYPE payment_method AS ENUM (
    'mvola',
    'orange_money',
    'airtel_money'
);

CREATE TYPE payment_verification_status AS ENUM (
    'pending',
    'accepted',
    'rejected'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(180) UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    default_pickup_point_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_picture_path TEXT NULL
);

CREATE TABLE pickup_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    manager_user_id UUID,
    distribution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pickup_points_manager
        FOREIGN KEY (manager_user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

ALTER TABLE users
ADD CONSTRAINT fk_users_default_pickup_point
FOREIGN KEY (default_pickup_point_id) REFERENCES pickup_points(id)
ON DELETE SET NULL;

CREATE TABLE producers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    farm_name VARCHAR(150) NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cover_picture_path TEXT NULL,
    logo_picture_path TEXT NULL,  
    CONSTRAINT fk_producers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE producer_pickup_points (
    producer_id UUID NOT NULL,
    pickup_point_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (producer_id, pickup_point_id),
    CONSTRAINT fk_producer_pickup_points_producer
        FOREIGN KEY (producer_id) REFERENCES producers(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_producer_pickup_points_pickup_point
        FOREIGN KEY (pickup_point_id) REFERENCES pickup_points(id)
        ON DELETE CASCADE
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID NOT NULL,
    category_id UUID,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    unit VARCHAR(30) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    image_path TEXT NULL,
    CONSTRAINT fk_products_producer
        FOREIGN KEY (producer_id) REFERENCES producers(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE SET NULL,
    CONSTRAINT uq_products_id_producer
        UNIQUE (id, producer_id),
    CONSTRAINT chk_products_unit_price_positive
        CHECK (unit_price >= 0)
);

CREATE TABLE sale_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_point_id UUID NOT NULL,
    opens_at TIMESTAMPTZ NOT NULL,
    closes_at TIMESTAMPTZ NOT NULL,
    pickup_date DATE NOT NULL,
    status sale_session_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sale_sessions_pickup_point
        FOREIGN KEY (pickup_point_id) REFERENCES pickup_points(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_sale_sessions_id_pickup_point
        UNIQUE (id, pickup_point_id),
    CONSTRAINT chk_sale_sessions_dates
        CHECK (opens_at < closes_at),
    CONSTRAINT chk_sale_sessions_pickup_after_close
        CHECK (pickup_date >= closes_at::DATE)
);

CREATE TABLE product_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    sale_session_id UUID NOT NULL,
    available_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
    reserved_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_product_stocks_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_stocks_sale_session
        FOREIGN KEY (sale_session_id) REFERENCES sale_sessions(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_product_stocks_product_session
        UNIQUE (product_id, sale_session_id),
    CONSTRAINT chk_product_stocks_available_quantity
        CHECK (available_quantity >= 0),
    CONSTRAINT chk_product_stocks_reserved_quantity
        CHECK (reserved_quantity >= 0),
    CONSTRAINT chk_product_stocks_reserved_lte_available
        CHECK (reserved_quantity <= available_quantity)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code VARCHAR(40) NOT NULL UNIQUE,
    consumer_user_id UUID NOT NULL,
    pickup_point_id UUID NOT NULL,
    sale_session_id UUID NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status order_status NOT NULL DEFAULT 'pending_payment',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_orders_consumer
        FOREIGN KEY (consumer_user_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_orders_pickup_point
        FOREIGN KEY (pickup_point_id) REFERENCES pickup_points(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_orders_sale_session
        FOREIGN KEY (sale_session_id) REFERENCES sale_sessions(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_orders_sale_session_pickup_point
        FOREIGN KEY (sale_session_id, pickup_point_id) REFERENCES sale_sessions(id, pickup_point_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_orders_total_amount_positive
        CHECK (total_amount >= 0)
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    producer_id UUID NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) GENERATED ALWAYS AS (ROUND((quantity * unit_price)::NUMERIC, 2)) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_order_items_producer
        FOREIGN KEY (producer_id) REFERENCES producers(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_order_items_product_producer
        FOREIGN KEY (product_id, producer_id) REFERENCES products(id, producer_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_order_items_quantity_positive
        CHECK (quantity > 0),
    CONSTRAINT chk_order_items_unit_price_positive
        CHECK (unit_price >= 0)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE,
    method payment_method NOT NULL,
    proof_file_path TEXT NOT NULL,
    verification_status payment_verification_status NOT NULL DEFAULT 'pending',
    verified_by_user_id UUID,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_payments_verified_by
        FOREIGN KEY (verified_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE handover_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE,
    manager_user_id UUID NOT NULL,
    handed_over_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_handover_confirmations_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_handover_confirmations_manager
        FOREIGN KEY (manager_user_id) REFERENCES users(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_orders_transaction_code ON orders(transaction_code);
CREATE INDEX idx_orders_consumer_user_id ON orders(consumer_user_id);
CREATE INDEX idx_orders_sale_session_id ON orders(sale_session_id);
CREATE INDEX idx_orders_pickup_point_id ON orders(pickup_point_id);
CREATE INDEX idx_products_producer_id ON products(producer_id);
CREATE INDEX idx_product_stocks_sale_session_id ON product_stocks(sale_session_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_producer_id ON order_items(producer_id);
CREATE INDEX idx_sale_sessions_pickup_point_status ON sale_sessions(pickup_point_id, status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pickup_points_updated_at
BEFORE UPDATE ON pickup_points
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_producers_updated_at
BEFORE UPDATE ON producers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sale_sessions_updated_at
BEFORE UPDATE ON sale_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_stocks_updated_at
BEFORE UPDATE ON product_stocks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_code IS NULL OR NEW.transaction_code = '' THEN
        NEW.transaction_code = 'TC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 8));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_transaction_code
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION generate_transaction_code();

CREATE OR REPLACE FUNCTION sync_order_total()
RETURNS TRIGGER AS $$
DECLARE
    target_order_id UUID;
BEGIN
    target_order_id = COALESCE(NEW.order_id, OLD.order_id);

    UPDATE orders
    SET total_amount = COALESCE((
        SELECT SUM(line_total)
        FROM order_items
        WHERE order_id = target_order_id
    ), 0)
    WHERE id = target_order_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_items_sync_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION sync_order_total();

CREATE OR REPLACE FUNCTION mark_order_picked_up()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET status = 'picked_up'
    WHERE id = NEW.order_id
      AND status <> 'cancelled';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_handover_confirmations_mark_picked_up
AFTER INSERT ON handover_confirmations
FOR EACH ROW EXECUTE FUNCTION mark_order_picked_up();

CREATE OR REPLACE FUNCTION update_order_status_from_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE orders SET status = 'payment_submitted' WHERE id = NEW.order_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.verification_status = 'accepted' AND OLD.verification_status <> 'accepted' THEN
            UPDATE orders SET status = 'confirmed' WHERE id = NEW.order_id;
        ELSIF NEW.verification_status = 'rejected' AND OLD.verification_status <> 'rejected' THEN
            UPDATE orders SET status = 'pending_payment' WHERE id = NEW.order_id;
        ELSIF NEW.proof_file_path <> OLD.proof_file_path AND OLD.verification_status = 'rejected' THEN
            NEW.verification_status = 'pending';
            UPDATE orders SET status = 'payment_submitted' WHERE id = NEW.order_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_update_order_status
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_order_status_from_payment();

CREATE OR REPLACE FUNCTION update_product_stocks_from_order_items()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE product_stocks 
        SET reserved_quantity = reserved_quantity + NEW.quantity 
        WHERE product_id = NEW.product_id AND sale_session_id = (SELECT sale_session_id FROM orders WHERE id = NEW.order_id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE product_stocks 
        SET reserved_quantity = reserved_quantity - OLD.quantity 
        WHERE product_id = OLD.product_id AND sale_session_id = (SELECT sale_session_id FROM orders WHERE id = OLD.order_id);
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.quantity <> OLD.quantity THEN
            UPDATE product_stocks 
            SET reserved_quantity = reserved_quantity - OLD.quantity + NEW.quantity 
            WHERE product_id = NEW.product_id AND sale_session_id = (SELECT sale_session_id FROM orders WHERE id = NEW.order_id);
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_items_update_stocks
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_product_stocks_from_order_items();

CREATE OR REPLACE FUNCTION release_stock_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
        UPDATE product_stocks ps
        SET reserved_quantity = ps.reserved_quantity - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id
          AND ps.product_id = oi.product_id
          AND ps.sale_session_id = NEW.sale_session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_release_stock_on_cancel
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION release_stock_on_order_cancel();

CREATE OR REPLACE VIEW unified_shop_view AS
SELECT
    ss.id AS sale_session_id,
    ss.pickup_point_id,
    pp.name AS pickup_point_name,
    p.id AS product_id,
    p.name AS product_name,
    p.description AS product_description,
    p.unit,
    p.unit_price,
    p.image_path AS product_image_path,
    c.name AS category_name,
    pr.id AS producer_id,
    pr.farm_name,
    pr.logo_picture_path AS farm_logo_picture_path,
    pr.cover_picture_path AS farm_cover_picture_path,
    ps.available_quantity,
    ps.reserved_quantity,
    (ps.available_quantity - ps.reserved_quantity) AS remaining_quantity,
    ss.opens_at,
    ss.closes_at,
    ss.pickup_date,
    ss.status AS sale_session_status
FROM sale_sessions ss
JOIN pickup_points pp ON pp.id = ss.pickup_point_id
JOIN producer_pickup_points ppp ON ppp.pickup_point_id = pp.id
JOIN producers pr ON pr.id = ppp.producer_id
JOIN products p ON p.producer_id = pr.id
JOIN product_stocks ps ON ps.product_id = p.id AND ps.sale_session_id = ss.id
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.is_active = TRUE;


CREATE OR REPLACE VIEW harvest_sheet_view AS
SELECT
    gen_random_uuid() AS id,
    o.sale_session_id,
    o.pickup_point_id,
    oi.producer_id,
    pr.farm_name,
    oi.product_id,
    p.name AS product_name,
    p.unit,
    SUM(oi.quantity) AS total_quantity_to_prepare,
    COUNT(DISTINCT o.id) AS order_count
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN producers pr ON pr.id = oi.producer_id
JOIN products p ON p.id = oi.product_id
WHERE o.status IN ('confirmed', 'ready', 'picked_up')
GROUP BY
    o.sale_session_id,
    o.pickup_point_id,
    oi.producer_id,
    pr.farm_name,
    oi.product_id,
    p.name,
    p.unit;
