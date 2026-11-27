# Database Layout

Use the files in `db/migrations/` as the ordered source of truth for database changes.

Current migration order:

1. `0001_extensions.sql`
2. `0002_entries.sql`
3. `0003_chat_tables.sql`
4. `0004_chat_triggers.sql`
5. `0005_match_entries.sql`
6. `0006_auth_ownership.sql`
7. `0007_rate_limits.sql`
8. `0008_harden_database_access.sql`

`db/schema.sql` is the full snapshot of the current schema for reference and fresh bootstrap setup. It mirrors the migrations, but it is not the preferred place to add new changes.

For the next database change:

1. Add a new numbered SQL file in `db/migrations/`
2. Apply that file to Supabase
3. Update `db/schema.sql` so the snapshot stays current

For an existing deployment, apply `0008` to the Supabase database and deploy
the matching app update. The migration restricts the memory-search and
rate-limit functions to the server role, drops obsolete memory-search
overloads, and replaces saved assistant error text with a generic message.
Use the SQL Editor or your migration runner with the database owner role.
