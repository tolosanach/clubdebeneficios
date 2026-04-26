-- Migración v7 — Normalización de categorías al nuevo formato display-name
-- Convierte los IDs viejos de COMMERCE_CATS a los nombres de COMMERCE_FAMILIES

UPDATE commerces SET category = 'Cafetería'    WHERE category = 'cafe';
UPDATE commerces SET category = 'Restaurante'  WHERE category = 'restaurant';
UPDATE commerces SET category = 'Bar'          WHERE category = 'bar';
UPDATE commerces SET category = 'Panadería'    WHERE category = 'panaderia';
UPDATE commerces SET category = 'Heladería'    WHERE category = 'heladeria';
UPDATE commerces SET category = 'Pizzería'     WHERE category = 'pizzeria';
UPDATE commerces SET category = 'Barbería'     WHERE category = 'barber';
UPDATE commerces SET category = 'Peluquería'   WHERE category = 'peluqueria';
UPDATE commerces SET category = 'Gimnasio'     WHERE category = 'gym';
UPDATE commerces SET category = 'Indumentaria' WHERE category = 'fashion';
UPDATE commerces SET category = 'Farmacia'     WHERE category = 'health';
UPDATE commerces SET category = 'Otro'         WHERE category = 'services';
