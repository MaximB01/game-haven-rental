-- Add assigned_to column for staff assignment
ALTER TABLE public.tickets 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add is_archived column for archiving tickets
ALTER TABLE public.tickets 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_is_archived ON public.tickets(is_archived);