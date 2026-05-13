-- CRM Outreach Steps — editable playbook templates

CREATE TABLE public.crm_outreach_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_key text NOT NULL UNIQUE,
  step_order integer NOT NULL,
  day_label text NOT NULL,
  step_title text NOT NULL,
  description text,
  template_male text,
  template_female text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_outreach_steps_order ON public.crm_outreach_steps(step_order);

CREATE TRIGGER trg_crm_outreach_steps_updated_at
  BEFORE UPDATE ON public.crm_outreach_steps
  FOR EACH ROW EXECUTE FUNCTION public.tg_crm_set_updated_at();

ALTER TABLE public.crm_outreach_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PropPath admins manage crm_outreach_steps"
  ON public.crm_outreach_steps
  FOR ALL
  USING (public.is_proppath_admin())
  WITH CHECK (public.is_proppath_admin());

-- Seed the 7 canonical outreach steps

INSERT INTO public.crm_outreach_steps (step_key, step_order, day_label, step_title, description, template_male, template_female, notes) VALUES
(
  'day_0_invite',
  1,
  'Day 0',
  'Blank LinkedIn request',
  'First touch on a cold prospect. Sent from James''s LinkedIn account.',
  NULL,
  NULL,
  'Blank invites accept at higher rates than pitched invites. Add the Day 0 personalisation note to the contact''s CRM record — a specific thing about them you''ll reference in the Day +1 video.'
),
(
  'day_10_inmail',
  2,
  'Day 10',
  'InMail fallback',
  'Connection request still unaccepted at Day 10. Send InMail with the same content as the Day +1 DM.',
  'Hey mate — built something I think you''d find useful as a buyers agent. 90 seconds, no slides, tell me to piss off if it''s not your thing.

[Video link]',
  'Hey [Name] — built something I think you''d find useful as a buyers agent. 90 seconds, no slides, tell me to piss off if it''s not your thing.

[Video link]',
  'Uses an InMail credit. LinkedIn Premium Business = 15 InMails/month. Don''t dwell on the "we couldn''t connect" framing — reads as desperate.'
),
(
  'day_1_video_dm',
  3,
  'Day +1',
  'Video + DM',
  'The day after they accept the connection. Personalised 90-sec video + 2-sentence DM.',
  'Hey mate — built something I think you''d find useful. 90 sec, no slides. Tell me to piss off if it''s not your thing.',
  'Hey [Name] — built something I think you''d find useful. 90 sec, no slides. Tell me to piss off if it''s not your thing.',
  'Video script: first 15-20 sec is hyper-personal (name, firm, the specific thing noted on Day 0). Remaining ~70 sec is the platform doing the thing that matches their work. CTA inside video: "If you want to play with this on a real client of yours, happy to drop you a login — no calls, no pitch."'
),
(
  'day_4_soft_nudge',
  4,
  'Day +4',
  'Soft nudge',
  'Day +4 after the video DM. Only if they haven''t replied. One touch, then stop until Day +14.',
  'Hey mate — if you want to have a quick mess around with this on a real client, happy to drop you a login. Otherwise no harm done.',
  'Hey [Name] — if you want to have a quick mess around with this on a real client, happy to drop you a login. Otherwise no harm done.',
  'Don''t reference the previous message. Don''t say "just bumping this up." Don''t ask if they saw it. Just re-offer the value.'
),
(
  'day_14_remodel_hook',
  5,
  'Day +14',
  'Remodel hook',
  'Day +14 after the video DM. Only if they still haven''t replied. References recent property landscape changes.',
  'Hey mate — given the recent changes in the property landscape, our platform lets you remodel and re-engage all your clients'' scenarios in under a minute. Worth a look if you''re fielding "what does this mean for me" questions from clients right now.',
  'Hey [Name] — given the recent changes in the property landscape, our platform lets you remodel and re-engage all your clients'' scenarios in under a minute. Worth a look if you''re fielding "what does this mean for me" questions from clients right now.',
  'Update "recent changes in the property landscape" to reference the most recent specific event (rate move, budget announcement, tax change) — keep it current to the week you''re sending.'
),
(
  'day_28_email',
  6,
  'Day +28',
  'Email',
  'Channel switch from LinkedIn to email. Final touch in the cadence. Case study (once available) or budget/rate bridge version.',
  'Hey mate — last note from me. Most BAs we talk to are getting client questions about how the [recent rate / budget shift] plays into their existing portfolios. We built a quick way to remodel any client''s scenario in under a minute and show them the new picture.

60-sec walkthrough: [link]

If you want the platform login I mentioned on LinkedIn, happy to resend so it doesn''t get lost. Otherwise no further follow-ups from me — appreciate your time either way.',
  'Hey [Name] — last note from me. Most BAs we talk to are getting client questions about how the [recent rate / budget shift] plays into their existing portfolios. We built a quick way to remodel any client''s scenario in under a minute and show them the new picture.

60-sec walkthrough: [link]

If you want the platform login I mentioned on LinkedIn, happy to resend so it doesn''t get lost. Otherwise no further follow-ups from me — appreciate your time either way.',
  'Subject line: "Modelling [recent change] for investment clients in 30 seconds" OR "How [Beta tester firm] uses PropPath for [strategy]" once case study is ready. Swap the middle paragraph for case-study framing once you have a beta tester quote.'
),
(
  'day_120_reengage',
  7,
  'Day +120',
  'Optional re-engage',
  'Only if you have a genuinely new reason. Otherwise leave them alone permanently.',
  'Hey mate — appreciate it''s been a while. [Specific new thing — e.g. "Ben at Compound just told me his clients are leaning into [X] strategy and we shipped a feature for that this week"]. Thought you might want a fresh look. No follow-ups if not — just felt it''d be wrong not to mention.',
  'Hey [Name] — appreciate it''s been a while. [Specific new thing]. Thought you might want a fresh look. No follow-ups if not — just felt it''d be wrong not to mention.',
  'If you can''t fill in [Specific new thing] with a real, current, prospect-relevant fact, skip this step entirely. "Just thinking of you" sends don''t qualify.'
);
