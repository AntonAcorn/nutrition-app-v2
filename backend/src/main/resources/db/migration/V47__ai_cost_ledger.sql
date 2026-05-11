-- One row per UTC day, accumulates estimated AI cost in cents.
-- Used by AiCostBudgetService to hard-cap daily spend across all users.
create table ai_cost_ledger (
    day         date        primary key,
    cents_spent bigint      not null default 0,
    updated_at  timestamptz not null default now()
);
