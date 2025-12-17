-- Allow moderators to view all tickets
CREATE POLICY "Moderators can view all tickets"
ON public.tickets FOR SELECT
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to update all tickets
CREATE POLICY "Moderators can update all tickets"
ON public.tickets FOR UPDATE
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to view all ticket replies
CREATE POLICY "Moderators can view all replies"
ON public.ticket_replies FOR SELECT
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to create replies on all tickets
CREATE POLICY "Moderators can create replies on all tickets"
ON public.ticket_replies FOR INSERT
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));