CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- pg_bm25 was renamed to pg_search in newer ParadeDB releases
-- https://docs.paradedb.com/search/full-text
CREATE EXTENSION IF NOT EXISTS pg_search;
