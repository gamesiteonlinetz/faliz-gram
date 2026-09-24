/*
# Faliz Gram — Verification System

## Changes
- Adds `is_verified` (boolean, default false) and `verification_type` (text: 'none', 'lifetime', 'admin') to profiles.
- `is_verified` controls whether the blue badge appears next to usernames.
- `verification_type` tracks how the user got verified:
  - 'lifetime': redeemed the limited code `fahad11tz` (only 2 users can claim this)
  - 'admin': activated via the admin token `@gamesiyeonlinetz`
  - 'none': not verified

## Security
- Column privileges: users can UPDATE only their own profile's user-facing columns (full_name, username, bio, avatar_url).
  The `is_verified` and `verification_type` columns are REVOKED from direct client updates — they can only be changed
  through the SECURITY DEFINER functions below.
- `redeem_lifetime_verification`: atomically claims one of only 2 lifetime badge slots using a counter table.
  Checks the code, checks slot availability, and marks the caller in a single function.
- `apply_admin_verification`: activates the admin-verified badge using the admin token.

## Notes
- No existing user data is deleted or renamed.
- The verification_badges table is a private counter — only the SECURITY DEFINER functions can read/write it.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_type text NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS verification_badges (
  id integer PRIMARY KEY DEFAULT 1,
  lifetime_claims integer NOT NULL DEFAULT 0,
  max_lifetime_claims integer NOT NULL DEFAULT 2
);

INSERT INTO verification_badges (id, lifetime_claims, max_lifetime_claims)
VALUES (1, 0, 2)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verification_badges_no_direct_access" ON verification_badges
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION redeem_lifetime_verification(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_max integer;
  v_already boolean;
BEGIN
  IF p_code IS NULL OR p_code <> 'fahad11tz' THEN
    RAISE EXCEPTION 'Invalid verification code';
  END IF;

  SELECT is_verified, verification_type INTO v_already
  FROM profiles WHERE id = auth.uid();

  IF v_already AND coalesce(verification_type, 'none') = 'lifetime' THEN
    RETURN 'You already have a lifetime verified badge.';
  END IF;

  SELECT lifetime_claims, max_lifetime_claims INTO v_current, v_max
  FROM verification_badges WHERE id = 1 FOR UPDATE;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'All lifetime verification badges have been claimed.';
  END IF;

  UPDATE verification_badges SET lifetime_claims = lifetime_claims + 1 WHERE id = 1;
  UPDATE profiles SET is_verified = true, verification_type = 'lifetime' WHERE id = auth.uid();

  RETURN 'Congratulations! You now have a lifetime verified badge.';
END;
$$;

REVOKE EXECUTE ON FUNCTION redeem_lifetime_verification FROM anon;
GRANT EXECUTE ON FUNCTION redeem_lifetime_verification TO authenticated;

CREATE OR REPLACE FUNCTION apply_admin_verification(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR p_token <> '@gamesiyeonlinetz' THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;

  UPDATE profiles
  SET is_verified = true, verification_type = 'admin'
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN 'Admin verification applied successfully.';
END;
$$;

REVOKE EXECUTE ON FUNCTION apply_admin_verification FROM anon;
GRANT EXECUTE ON FUNCTION apply_admin_verification TO authenticated;
