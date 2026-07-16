-- Tokenized unsubscribe for the mailing list (docs/09's "Subscribers,
-- reconsidered" honesty gap: the signup form promises people can get off the
-- list, and until now the only mechanism was the owner hand-deleting a row).
-- Built before the list is ever mailed, deliberately — a tokenized opt-out is
-- also how CAN-SPAM's opt-out duty gets met once sending exists.
--
-- Two columns:
--   unsubscribe_token — the capability in the link. 32 random bytes as hex
--     (256 bits, URL-safe, no padding chars to escape). Per-row and unique, so
--     a link identifies exactly one subscriber and nothing is enumerable.
--   unsubscribed_at   — null = subscribed. Unsubscribing SUPPRESSES rather
--     than deletes: honoring an opt-out means remembering it, or the same
--     person could be silently re-added later by a manual entry or a re-import
--     and get mailed again — the exact thing an opt-out is supposed to
--     prevent. The owner can still hard-delete from /admin/subscribers when
--     they actually want the row gone (FIPA's disposal duty, docs/09).
--
-- Added nullable → backfilled → set not null, rather than relying on ADD
-- COLUMN ... DEFAULT to evaluate a volatile default once per existing row.
-- That does work (a volatile default forces a rewrite), but it's a subtle
-- guarantee to hang unique tokens on; being explicit is worth three lines.
alter table subscribers add column unsubscribe_token text;
alter table subscribers add column unsubscribed_at timestamptz;

update subscribers set unsubscribe_token = encode(gen_random_bytes(32), 'hex') where unsubscribe_token is null;

alter table subscribers alter column unsubscribe_token set not null;
alter table subscribers alter column unsubscribe_token set default encode(gen_random_bytes(32), 'hex');

create unique index subscribers_unsubscribe_token_idx on subscribers(unsubscribe_token);

-- No new RLS policy: the unsubscribe page has no user session (it's reached
-- from an email link), so it goes through the service-role client scoped by
-- the token itself — same pattern as the public subscribe insert. The token
-- IS the authorization; possession of it proves the holder received the mail.
