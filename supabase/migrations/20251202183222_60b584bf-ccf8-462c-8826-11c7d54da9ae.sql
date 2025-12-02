-- Add display_order column to pool_models
ALTER TABLE pool_models ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Update display order to match catalog sequence
UPDATE pool_models SET display_order = 1 WHERE name = 'Zâmbia';
UPDATE pool_models SET display_order = 2 WHERE name = 'Quênia';
UPDATE pool_models SET display_order = 3 WHERE name = 'Mali';
UPDATE pool_models SET display_order = 4 WHERE name = 'Capela';
UPDATE pool_models SET display_order = 5 WHERE name = 'Vega';
UPDATE pool_models SET display_order = 6 WHERE name = 'Polaris';
UPDATE pool_models SET display_order = 7 WHERE name = 'Átria';
UPDATE pool_models SET display_order = 8 WHERE name = 'Numai';
UPDATE pool_models SET display_order = 9 WHERE name = 'Bara';
UPDATE pool_models SET display_order = 10 WHERE name = 'Solum';
UPDATE pool_models SET display_order = 11 WHERE name = 'Samô';
UPDATE pool_models SET display_order = 12 WHERE name = 'Colorado';
UPDATE pool_models SET display_order = 13 WHERE name = 'Flórida';
UPDATE pool_models SET display_order = 14 WHERE name = 'Dakota';
UPDATE pool_models SET display_order = 15 WHERE name = 'Texas';
UPDATE pool_models SET display_order = 16 WHERE name = 'Indiana';
UPDATE pool_models SET display_order = 17 WHERE name = 'Arizona';