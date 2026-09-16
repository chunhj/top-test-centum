DELETE FROM idempotency_request WHERE poll_id = 1;
DELETE FROM ballot WHERE poll_id = 1;

INSERT INTO ballot (poll_id, voter_key)
SELECT 1, lpad(to_hex(number), 64, '0') FROM generate_series(1, 50) AS number;

INSERT INTO ballot_selection (ballot_id, option_id)
SELECT b.id, o.id
FROM generate_series(1, 50) AS seeded(number)
JOIN ballot b ON b.poll_id = 1 AND b.voter_key = lpad(to_hex(seeded.number), 64, '0')
JOIN poll_option o ON o.poll_id = b.poll_id AND o.display_order = CASE
    WHEN seeded.number <= 12 THEN 1
    WHEN seeded.number <= 22 THEN 2
    WHEN seeded.number <= 30 THEN 3
    WHEN seeded.number <= 36 THEN 4
    WHEN seeded.number <= 41 THEN 5
    WHEN seeded.number <= 45 THEN 6
    WHEN seeded.number <= 48 THEN 7
    ELSE 8 END;

UPDATE poll_option_counter c
SET vote_count = (SELECT count(*) FROM ballot_selection s WHERE s.option_id = c.option_id)
WHERE c.option_id IN (SELECT id FROM poll_option WHERE poll_id = 1);
