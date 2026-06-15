from django.db import migrations


UNIFIED_SHOP_VIEW_SQL = """
DROP VIEW IF EXISTS unified_shop_view;

CREATE VIEW unified_shop_view AS
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
"""


REVERSE_UNIFIED_SHOP_VIEW_SQL = """
DROP VIEW IF EXISTS unified_shop_view;

CREATE VIEW unified_shop_view AS
SELECT
    ss.id AS sale_session_id,
    ss.pickup_point_id,
    pp.name AS pickup_point_name,
    p.id AS product_id,
    p.name AS product_name,
    p.description AS product_description,
    p.unit,
    p.unit_price,
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
"""


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.RunSQL(
            sql=UNIFIED_SHOP_VIEW_SQL,
            reverse_sql=REVERSE_UNIFIED_SHOP_VIEW_SQL,
        ),
    ]
