-- Rotates the admin seed account's password away from the value that was
-- previously committed in plaintext in V6. The plaintext value is now
-- supplied at deploy/run time via the ADMIN_SEED_PASSWORD environment
-- variable (see application.properties: spring.flyway.placeholders.adminSeedPassword)
-- and is never written to source control.
UPDATE member
SET password_hash = '{bcrypt}' || crypt('${adminSeedPassword}', gen_salt('bf', 12))
WHERE email = 'admin';
