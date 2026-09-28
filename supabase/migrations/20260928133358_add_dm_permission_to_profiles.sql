/*
# Add DM permission to profiles

1. New Columns
- `profiles.dm_permission` (text, default 'everyone')
  - Controls who can start a direct message conversation with this user.
  - Values: 'everyone' (anyone can message), 'followers' (only followers can message), 'nobody' (no one can message).

2. Security
- No new RLS policies needed. The column is readable by anyone who can already read profiles (existing SELECT policy).
- The column is only updatable by the profile owner (existing UPDATE policy on profiles already enforces auth.uid() = id).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'dm_permission'
  ) THEN
    ALTER TABLE profiles ADD COLUMN dm_permission text NOT NULL DEFAULT 'everyone';
  END IF;
END $$;
