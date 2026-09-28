/*
# Subscription-based verification

1. New Function
- `sync_subscription_verification(p_user_id uuid)`: SECURITY DEFINER function that checks
  whether the given user has an active Stripe subscription. If active, sets
  is_verified=true and verification_type='subscription' on their profile.
  If no active subscription exists and they were verified via subscription,
  removes the verified badge. Does not touch lifetime or admin verified users.

2. Security
- SECURITY DEFINER so it can read stripe_subscriptions (which users cannot
  read directly via RLS) and update the protected is_verified/verification_type
  columns on profiles.
- REVOKE EXECUTE FROM anon; GRANT TO authenticated.
- The function is idempotent and safe to call on every webhook event.
*/

CREATE OR REPLACE FUNCTION sync_subscription_verification(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_customer_id text;
  v_sub_status text;
  v_current_type text;
  v_current_verified boolean;
BEGIN
  SELECT customer_id INTO v_customer_id
  FROM stripe_customers
  WHERE user_id = p_user_id AND deleted_at IS NULL
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN 'No Stripe customer found for user';
  END IF;

  SELECT status INTO v_sub_status
  FROM stripe_subscriptions
  WHERE customer_id = v_customer_id AND deleted_at IS NULL
  LIMIT 1;

  SELECT is_verified, verification_type INTO v_current_verified, v_current_type
  FROM profiles WHERE id = p_user_id;

  IF v_sub_status IN ('active', 'trialing') THEN
    IF coalesce(v_current_type, 'none') NOT IN ('lifetime', 'admin') THEN
      UPDATE profiles
      SET is_verified = true, verification_type = 'subscription'
      WHERE id = p_user_id;
    END IF;
    RETURN 'Subscription active - verified';
  ELSE
    IF coalesce(v_current_type, 'none') = 'subscription' THEN
      UPDATE profiles
      SET is_verified = false, verification_type = 'none'
      WHERE id = p_user_id;
    END IF;
    RETURN 'Subscription inactive - verification removed';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION sync_subscription_verification FROM anon;
GRANT EXECUTE ON FUNCTION sync_subscription_verification TO authenticated;
