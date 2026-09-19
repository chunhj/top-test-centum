-- V7 re-normalized poll 1's ballots with an unconditional
--   DELETE FROM ballot WHERE poll_id = 1
-- which would silently destroy real user votes if it (or a similar
-- "reset the seed data" migration) ever ran again against an
-- environment that had already collected real votes on top of the
-- seed data. Flyway will not re-run V7 itself, but the same mistake
-- (a maintenance script that resets "the seed poll" by poll_id alone)
-- is easy to repeat without a way to tell seed rows apart from real ones.
--
-- This migration adds that distinction so any future seed-reset script
-- can target is_seed = TRUE instead of poll_id = 1, and backfills the
-- flag for the 50 deterministic seed voter_keys that V6/V7 created
-- (lpad(to_hex(1..50), 64, '0')).
ALTER TABLE ballot ADD COLUMN is_seed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE ballot
SET is_seed = TRUE
WHERE poll_id = 1
  AND voter_key IN (
      SELECT lpad(to_hex(number), 64, '0') FROM generate_series(1, 50) AS number
  );
