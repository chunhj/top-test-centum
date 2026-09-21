-- Demo voters are random: no candidate is guaranteed a rank or vote count.
-- Only prior seed rows are replaced; real ballots are never reset by a migration.
DELETE FROM ballot WHERE poll_id = 1 AND is_seed = TRUE;

INSERT INTO ballot (poll_id, voter_key, is_seed)
SELECT 1, lpad(to_hex(number), 64, '0'), TRUE
FROM generate_series(1, 150) AS voter(number);

WITH random_choices AS (
    SELECT ballot.id AS ballot_id,
           option.id AS option_id,
           row_number() OVER (PARTITION BY ballot.id ORDER BY random()) AS choice
    FROM ballot
    JOIN poll_option option ON option.poll_id = ballot.poll_id
    WHERE ballot.poll_id = 1 AND ballot.is_seed = TRUE
)
INSERT INTO ballot_selection (ballot_id, option_id)
SELECT ballot_id, option_id
FROM random_choices
WHERE choice = 1;

UPDATE poll_option_counter counter
SET vote_count = (
    SELECT count(*) FROM ballot_selection selection WHERE selection.option_id = counter.option_id
)
WHERE counter.option_id IN (SELECT id FROM poll_option WHERE poll_id = 1);
