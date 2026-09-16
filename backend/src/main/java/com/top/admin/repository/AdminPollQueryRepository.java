package com.top.admin.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.Tuple;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.top.admin.dto.AdminPollResponse;
import com.top.poll.domain.PollStatus;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.top.poll.domain.QPoll.poll;
import static com.top.vote.domain.QBallot.ballot;

@Repository
public class AdminPollQueryRepository {
	private final JPAQueryFactory query;

	public AdminPollQueryRepository(EntityManager entityManager) {
		this.query = new JPAQueryFactory(entityManager);
	}

	public Page<AdminPollResponse> find(long ownerId, String keyword, PollStatus status, String sort, Pageable pageable) {
		BooleanBuilder where = new BooleanBuilder(poll.ownerId.eq(ownerId));
		if (keyword != null && !keyword.isBlank()) where.and(poll.title.containsIgnoreCase(keyword.trim()));
		if (status != null) where.and(poll.status.eq(status));

		List<Tuple> rows = query.select(poll, ballot.id.countDistinct())
				.from(poll).leftJoin(ballot).on(ballot.poll.id.eq(poll.id))
				.where(where).groupBy(poll.id)
				.orderBy(order(sort)).offset(pageable.getOffset()).limit(pageable.getPageSize()).fetch();
		Long total = query.select(poll.count()).from(poll).where(where).fetchOne();
		List<AdminPollResponse> content = rows.stream()
				.map(row -> AdminPollResponse.from(row.get(poll), row.get(ballot.id.countDistinct())))
				.toList();
		return new PageImpl<>(content, pageable, total == null ? 0 : total);
	}

	private OrderSpecifier<?> order(String sort) {
		return switch (sort == null ? "createdAt" : sort) {
			case "title" -> poll.title.asc();
			case "endsAt" -> poll.endsAt.asc();
			case "participants" -> ballot.id.countDistinct().desc();
			default -> poll.createdAt.desc();
		};
	}
}
