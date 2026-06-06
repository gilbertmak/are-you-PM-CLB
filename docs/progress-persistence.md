# Progress persistence API and data model

The flashcard client now treats browser storage as an offline cache and routes authenticated learners through backend endpoints. A learner is considered authenticated when the app has a bearer token in `pm_mandarin_auth_token`.

## API contract

### `GET /api/progress`

Returns the learner's full progress snapshot:

```json
{
  "version": 4,
  "progress": {
    "term-id": {
      "termId": "term-id",
      "attempts": 3,
      "correct": 2,
      "incorrect": 1,
      "streak": 2,
      "ease": 2.54,
      "intervalHours": 24,
      "dueAt": 1760000000000,
      "lastResult": "right",
      "lastReviewedAt": 1759913600000
    }
  },
  "reviews": []
}
```

### `POST /api/reviews`

Persists one immutable review event. The client sends one event per card rating:

```json
{
  "termId": "term-id",
  "attempt": "我 typed this before reveal",
  "validationResult": "correct",
  "selfRating": "got-it",
  "reviewedAt": 1759913600000,
  "nextDueAt": 1760000000000
}
```

### `PATCH /api/progress/:termId`

Upserts the learner's current scheduling state for one term after a review or JSON import.

## Suggested database tables

### `users`

| column | type | notes |
| --- | --- | --- |
| `id` | UUID / text primary key | Auth provider user id. |
| `email` | text nullable | Optional learner email. |
| `created_at` | timestamp | Account creation time. |

### `terms`

| column | type | notes |
| --- | --- | --- |
| `id` | text primary key | Matches the glossary term id shipped with the app. |
| `category` | text | `pm`, `ai`, or `rc`. |
| `english` | text | English prompt. |
| `simplified` | text | Mandarin answer. |

### `review_events`

| column | type | notes |
| --- | --- | --- |
| `id` | UUID primary key | Server-generated event id. |
| `user_id` | UUID / text foreign key | References `users.id`. |
| `term_id` | text foreign key | References `terms.id`. |
| `attempt` | text | Learner's typed answer before reveal. |
| `validation_result` | text | `correct` or `incorrect`. |
| `self_rating` | text | `got-it` or `needs-review`. |
| `reviewed_at` | timestamp | Client review timestamp. |
| `next_due_at` | timestamp | Due date computed by the scheduler. |
| `created_at` | timestamp | Server insert timestamp. |

### `term_scheduling_state`

| column | type | notes |
| --- | --- | --- |
| `user_id` | UUID / text foreign key | Composite primary key with `term_id`. |
| `term_id` | text foreign key | Composite primary key with `user_id`. |
| `attempts` | integer | Aggregate count for fast dashboard reads. |
| `correct` | integer | Aggregate correct count. |
| `incorrect` | integer | Aggregate incorrect count. |
| `streak` | integer | Current successful streak. |
| `ease` | decimal | Scheduler ease factor. |
| `interval_hours` | decimal | Current interval. |
| `due_at` | timestamp | Next due date. |
| `last_result` | text | `new`, `right`, or `left`. |
| `last_reviewed_at` | timestamp | Latest review timestamp. |
| `updated_at` | timestamp | Server update timestamp. |

Keep `review_events` append-only. Use `term_scheduling_state` as a materialized current state for quick `GET /api/progress` responses.
