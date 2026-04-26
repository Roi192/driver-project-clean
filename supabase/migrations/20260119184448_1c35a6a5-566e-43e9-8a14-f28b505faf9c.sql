-- Fix PUBLIC_DATA_EXPOSURE: safety_content table allows unauthenticated access
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view safety content" ON safety_content;

-- Create a proper policy that requires authentication
CREATE POLICY "Authenticated users can view safety content" 
  ON safety_content FOR SELECT 
  USING (auth.uid() IS NOT NULL);