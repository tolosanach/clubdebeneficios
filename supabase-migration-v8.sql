-- Migration v8: brand_color field for commerce cards
-- Run in Supabase > SQL Editor before enabling brand color picker in commerce settings

ALTER TABLE commerces ADD COLUMN IF NOT EXISTS brand_color TEXT;

-- Once this migration runs, add brand_color to the memberships select query in page.js:
-- commerce:commerces(id,name,img_url,slug,prog_type,prog_goal,category,rating,brand_color,promotions(...))
-- And pass it to hashToCardColor fallback: club.commerce?.brand_color || hashToCardColor(name)
