package com.top.vote;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VoteProtectionComparisonTest {
    @Test
    void comparesUniqueAndAtomicCounterWithUnprotectedWrites() throws Exception {
        try (var db = new PostgreSQLContainer<>("postgres:17-alpine")) {
            db.start();
            Flyway.configure().dataSource(db.getJdbcUrl(), db.getUsername(), db.getPassword())
                    .placeholders(Map.of("adminSeedPassword", "test-admin-password")).load().migrate();

            assertEquals(new Counts(1, 1, 1), race(db, fixture(db, "unique-protected"), true, true));
            // Only the disposable Testcontainers database loses this production constraint.
            try (var c = db.createConnection("")) {
                c.createStatement().execute("ALTER TABLE ballot DROP CONSTRAINT uq_ballot_poll_voter");
            }
            assertEquals(new Counts(2, 2, 2), race(db, fixture(db, "unique-removed"), true, true));
            assertEquals(new Counts(2, 2, 1), race(db, fixture(db, "read-modify-write"), false, false));
            assertEquals(new Counts(2, 2, 2), race(db, fixture(db, "atomic-update"), false, true));
        }
    }

    private Poll fixture(PostgreSQLContainer<?> db, String name) throws Exception {
        try (var c = db.createConnection("")) {
            long poll = scalar(c, """
                    INSERT INTO poll(owner_id,title,poll_type,max_selections,status,starts_at,ends_at)
                    VALUES (1,'comparison','SINGLE',1,'OPEN',now()-interval '1 hour',now()+interval '1 hour')
                    RETURNING id""");
            long option = scalar(c, "INSERT INTO poll_option(poll_id,name,display_order) VALUES (" + poll
                    + ",'option',1) RETURNING id");
            c.createStatement().executeUpdate("INSERT INTO poll_option_counter(option_id) VALUES (" + option + ")");
            return new Poll(poll, option, name);
        }
    }

    private Counts race(PostgreSQLContainer<?> db, Poll poll, boolean sameVoter, boolean atomic) throws Exception {
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var futures = List.of(0, 1).stream().map(i -> executor.submit(() -> {
                try (var c = db.createConnection("")) {
                    c.setAutoCommit(false);
                    try {
                        String voter = sameVoter ? "d".repeat(64) : "%064d".formatted(poll.id * 10 + i);
                        if (sameVoter) {
                            assertEquals(0, scalar(c, "SELECT count(*) FROM ballot WHERE poll_id=" + poll.id
                                    + " AND voter_key='" + voter + "'"));
                            ready.countDown();
                            assertTrue(start.await(10, TimeUnit.SECONDS));
                        }
                        long ballot;
                        try (var s = c.prepareStatement("INSERT INTO ballot(poll_id,voter_key) VALUES (?,?) RETURNING id")) {
                            s.setLong(1, poll.id);
                            s.setString(2, voter);
                            try (var r = s.executeQuery()) { r.next(); ballot = r.getLong(1); }
                        }
                        try (var s = c.prepareStatement("INSERT INTO ballot_selection(ballot_id,option_id) VALUES (?,?)")) {
                            s.setLong(1, ballot);
                            s.setLong(2, poll.option);
                            s.executeUpdate();
                        }
                        long read = 0;
                        if (!sameVoter) {
                            read = scalar(c, "SELECT vote_count FROM poll_option_counter WHERE option_id=" + poll.option);
                            ready.countDown();
                            assertTrue(start.await(10, TimeUnit.SECONDS));
                        }
                        try (var s = c.prepareStatement(atomic
                                ? "UPDATE poll_option_counter SET vote_count=vote_count+1 WHERE option_id=?"
                                : "UPDATE poll_option_counter SET vote_count=? WHERE option_id=?")) {
                            if (atomic) s.setLong(1, poll.option);
                            else { s.setLong(1, read + 1); s.setLong(2, poll.option); }
                            s.executeUpdate();
                        }
                        c.commit();
                        return true;
                    } catch (SQLException e) {
                        c.rollback();
                        if (sameVoter && "23505".equals(e.getSQLState())) return false;
                        throw e;
                    } catch (Exception e) {
                        c.rollback();
                        throw e;
                    }
                }
            })).toList();
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            int successful = 0;
            for (var future : futures) if (future.get(20, TimeUnit.SECONDS)) successful++;
            var counts = counts(db, poll);
            assertEquals(successful, counts.ballots);
            System.out.printf("%s: ballot=%d selection=%d counter=%d%n",
                    poll.name, counts.ballots, counts.selections, counts.counter);
            return counts;
        }
    }

    private Counts counts(PostgreSQLContainer<?> db, Poll poll) throws Exception {
        try (var c = db.createConnection("")) {
            return new Counts(
                    scalar(c, "SELECT count(*) FROM ballot WHERE poll_id=" + poll.id),
                    scalar(c, "SELECT count(*) FROM ballot_selection s JOIN ballot b ON b.id=s.ballot_id WHERE b.poll_id=" + poll.id),
                    scalar(c, "SELECT vote_count FROM poll_option_counter WHERE option_id=" + poll.option));
        }
    }

    private long scalar(Connection c, String sql) throws SQLException {
        try (var s = c.createStatement(); var r = s.executeQuery(sql)) { r.next(); return r.getLong(1); }
    }

    private record Poll(long id, long option, String name) {}
    private record Counts(long ballots, long selections, long counter) {}
}
