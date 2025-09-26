-- Enable Row Level Security on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

-- CLIENTS TABLE POLICIES (4 policies)
-- Users can create their own clients
CREATE POLICY "Users can create their own clients" 
ON public.clients 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own clients
CREATE POLICY "Users can view their own clients" 
ON public.clients 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can update their own clients
CREATE POLICY "Users can update their own clients" 
ON public.clients 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can delete their own clients
CREATE POLICY "Users can delete their own clients" 
ON public.clients 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- PROFILES TABLE POLICIES (3 policies)
-- Users can create their own profile
CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- SCENARIOS TABLE POLICIES (4 policies)
-- Users can create scenarios for their own clients
CREATE POLICY "Users can create scenarios for their own clients" 
ON public.scenarios 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = scenarios.client_id 
    AND clients.user_id = auth.uid()
  )
);

-- Users can view scenarios for their own clients
CREATE POLICY "Users can view scenarios for their own clients" 
ON public.scenarios 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = scenarios.client_id 
    AND clients.user_id = auth.uid()
  )
);

-- Users can update scenarios for their own clients
CREATE POLICY "Users can update scenarios for their own clients" 
ON public.scenarios 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = scenarios.client_id 
    AND clients.user_id = auth.uid()
  )
);

-- Users can delete scenarios for their own clients
CREATE POLICY "Users can delete scenarios for their own clients" 
ON public.scenarios 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = scenarios.client_id 
    AND clients.user_id = auth.uid()
  )
);