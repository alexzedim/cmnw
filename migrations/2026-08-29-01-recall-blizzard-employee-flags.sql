-- Migration: 2026-08-29-01 recall Blizzard employee flags
--
-- Problem:
--   52,887 characters carry is_blizzard_employee = true with evidence
--   CE_FOS_SAME_DAY, several orders of magnitude more than plausible staff.
--   The same-day CE FoS clusters behind these flags are not hire dates:
--   98.9% of flagged characters are level-boosted, and the boost achievement
--   re-evaluation surfaces account-wide FoS onto the boosted character, with
--   timestamps inherited from the account's redemption history. Cluster days
--   routinely predate character creation, land on impossible hire dates
--   (Jan 1), and spike on 2008-10-15 (3.0.2 achievement-launch retro-grant).
--   Flagged characters own 5-7 of 13 CE pets on average, matching collectors
--   who redeemed several CE codes bought from third parties, not staff who
--   hold every edition released before their hire date.
--
-- What this does:
--   Recalls every is_blizzard_employee = true verdict back to NULL, together
--   with its derived evidence and hire date. blizzard_employee_pets is kept:
--   it is the factual CE pet list, not a verdict. NULL re-opens
--   isScanNeeded in CharactersWorker, so the achievements endpoint is
--   refetched on the next sync and the character is reclassified by the
--   hardened detector (retro-grant cutoff, boost-day disqualification,
--   every-released-edition cluster rule).
--
-- Expected effect (measured 2026-08-29):
--   52,887 rows recalled; true flags afterwards come only from characters
--   re-scanned under the fixed logic.
--
-- Run with osint workers stopped to avoid lost updates between recall and
-- rescan:
--   psql "$DATABASE_URL" -f migrations/2026-08-29-01-recall-blizzard-employee-flags.sql

BEGIN;

UPDATE characters
SET is_blizzard_employee = NULL,
    blizzard_employee_evidence = NULL,
    hired_approx = NULL
WHERE is_blizzard_employee = true;

DO $$
DECLARE
  remaining int;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM characters
  WHERE is_blizzard_employee = true;

  IF remaining > 0 THEN
    RAISE EXCEPTION 'recall incomplete: % employee flags remain', remaining;
  END IF;
END $$;

COMMIT;
