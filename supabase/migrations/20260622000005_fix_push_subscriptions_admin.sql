-- Allow admin users (without a linked soldier) to subscribe to push notifications
-- soldier_id becomes nullable so user_id-only subscriptions work

ALTER TABLE push_subscriptions ALTER COLUMN soldier_id DROP NOT NULL;

-- Add unique constraint for user-based subscriptions (admins who have no soldier)
ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint);
