-- ============================================================================
-- setup-content.sql — one-shot Supabase setup for Spec 11 (content library).
-- Project: xgcrooajrdpcgpgoazti. Schema only — article bodies ship as static
-- markdown in the dashboard for the demo. Paste into the SQL Editor + Run.
-- Generated from migrations/011_content_library.sql
-- ============================================================================

-- 011_content_library.sql
-- Public content hub: articles + article series (Spec 11). Articles are publicly
-- readable when published (unlike the investor tables, this has a real anon read
-- policy). Bodies are bundled as static markdown in the app for the demo; this
-- schema is for a future DB-backed CMS.
-- (Spec called this "005"; renumbered to 011 to follow the migration sequence.)

CREATE TABLE articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    subtitle        TEXT,
    author          TEXT NOT NULL DEFAULT 'EcoXchange Team',
    pillar          TEXT NOT NULL
                    CHECK (pillar IN (
                        'solar_market_intelligence', 'tokenization_rwa',
                        'production_verification', 'developer_ecosystem',
                        'founder_journey', 'climate_finance')),
    tags            TEXT[] NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'review', 'published', 'archived')),

    excerpt         TEXT NOT NULL,
    body_markdown   TEXT NOT NULL,
    hero_image_url  TEXT,
    hero_image_alt  TEXT,

    meta_title      TEXT,
    meta_description TEXT,
    canonical_url   TEXT,

    estimated_read_minutes INTEGER NOT NULL DEFAULT 5,

    requires_counsel_review BOOLEAN NOT NULL DEFAULT false,
    counsel_approved        BOOLEAN DEFAULT false,
    counsel_review_date     TIMESTAMPTZ,

    published_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_pillar ON articles(pillar);
CREATE INDEX idx_articles_published ON articles(published_at DESC) WHERE status = 'published';

CREATE TABLE article_series (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    description   TEXT,
    article_order UUID[] NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published articles" ON articles
    FOR SELECT USING (status = 'published');
CREATE POLICY "Public read series" ON article_series
    FOR SELECT USING (true);
