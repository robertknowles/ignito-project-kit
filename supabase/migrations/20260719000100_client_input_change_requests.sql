-- Client-initiated input changes → notify the BA.
--
-- A portal client can update a small set of their own figures (base salary,
-- annual savings) and their existing portfolio. Per the product model the AI
-- roadmap is a point-in-time generation and is NOT auto-recomputed from these
-- edits; instead the BA is notified so they can regenerate. These two columns
-- carry that "needs review" signal onto the client record so the BA client list
-- can surface a badge (2026-07-19).
--
--   pending_client_update_at   - timestamp of the client's most recent change
--                                (cleared when the BA next saves/regenerates).
--   pending_client_update_note - short human-readable summary of what changed,
--                                e.g. "Base salary $150,000 → $550,000".

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS pending_client_update_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_client_update_note text;
