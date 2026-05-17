-- 1.1 Sender assignment on crm_contacts (single field, nullable)

ALTER TABLE public.crm_contacts
  ADD COLUMN assigned_to text;

ALTER TABLE public.crm_contacts
  ADD CONSTRAINT crm_contacts_assigned_to_check
  CHECK (assigned_to IS NULL OR assigned_to IN ('rob', 'james'));

-- 1.2 Outreach steps: drop female variant, rename male → body

ALTER TABLE public.crm_outreach_steps
  DROP COLUMN IF EXISTS template_female;

ALTER TABLE public.crm_outreach_steps
  RENAME COLUMN template_male TO template_body;

-- 1.3 Wipe existing template rows — we're replacing the entire set

DELETE FROM public.crm_outreach_steps;

-- 1.4 Insert the 5 new content templates

INSERT INTO public.crm_outreach_steps (step_key, step_order, day_label, step_title, description, template_body, notes) VALUES
(
  'demo_video_cofounder',
  1,
  '',
  'Demo video — cofounder',
  'Pre-recorded video where Rob and James walk through the problem and the product. Single asset, not personalised. The default video for higher-volume outreach when there''s no time for a personalised Loom.',
  'Hey [Name] — [hook]. Quick 2-min video below where we walk through what we built and the problem it solves for buyers agents working with investment clients.',
  'The accompanying DM still needs a specific hook in the [hook] slot. The video does the heavy lifting; the DM only earns the click.'
),
(
  'demo_video_loom',
  2,
  '',
  'Demo video — personalised Loom',
  'Recorded fresh for a specific prospect. Mirror their business — if they''re a Brisbane BA targeting first-home investors, build a Brisbane first-home-investor roadmap on screen. ~2-3 min.',
  'Hey [Name] — built this one for you specifically. Walked through what a [their client type, e.g. Sydney investment client] roadmap looks like inside PropPath. ~2 min below.',
  'Reserved for high-value prospects (whales, content creators, named warm-list contacts). Reciprocity-heavy — even prospects who weren''t interested often respond because you put in real effort for them.'
),
(
  'case_study_message',
  3,
  '',
  'Case study — beta tester quote',
  'Reference a beta tester''s experience. Use once Ben at Compound (or another tester) gives a quotable line.',
  'Hey [Name] — [hook]. [Beta tester name] from [their firm] has been using PropPath for [time period] and said [quote]. Thought it might be relevant given [specific thing about their work]. Quick walkthrough below if you want a look.',
  'Only deploy when you have a real, specific, attributable quote. Generic case-study framing without a name kills credibility.'
),
(
  'reengage_clients_message',
  4,
  '',
  'Re-engage existing clients — market change hook',
  'Hook the BA around a specific recent market event (rate move, budget change, negative gearing change, regulatory shift) and PropPath''s ability to remodel client scenarios in under a minute.',
  'Hey [Name] — with [specific recent event — rate move, budget change, regulatory shift this week], your investment clients are about to be asking "what does this mean for my plan?" Built a tool that lets you remodel any client''s scenario in under a minute and show them the new picture. Quick walkthrough below.',
  'The [specific recent event] slot is non-negotiable. Update to the most relevant news of the sending week. Generic "recent changes" reads as mail-merge and kills the message.'
),
(
  'pricing_positioning',
  5,
  '',
  'Pricing positioning',
  'Standing positioning for any pricing conversation — applies across every touch and call.',
  'Charge from day one. Money-back guarantee, not free trials. Payment signals real value and self-selects serious users.',
  'Beta access is the exception — but every conversation that gets past beta should anchor to the paid tier, not a free runway.'
);
