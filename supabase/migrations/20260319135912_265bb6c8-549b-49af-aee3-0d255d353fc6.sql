-- Drop the existing overly-permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- Create a restrictive UPDATE policy that prevents changes to plan, status, and trial_ends_at
-- Users should NOT be able to self-escalate their subscription
-- Only allow viewing, not updating (plan changes should happen server-side only)
