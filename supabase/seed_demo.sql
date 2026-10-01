-- Clean up older failed items for test@recall.app and others
DELETE FROM insights WHERE status = 'failed';

DO $$
DECLARE
  v_user_ids UUID[] := ARRAY[
    'dccaa635-1de3-4518-a427-e649c69de9df'::UUID,
    '5e3c59de-9f54-473e-bc30-c5d7f25805b7'::UUID,
    'be465379-6866-43b0-b829-0d7c77c066f6'::UUID
  ];
  uid UUID;
  ins_id UUID;
BEGIN
  FOREACH uid IN ARRAY v_user_ids
  LOOP
    -- Verify user exists before inserting
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = uid) THEN

      -- 1. YouTube: Huberman Lab (Productivity & Neuroplasticity)
      ins_id := gen_random_uuid();
      INSERT INTO insights (
        id, user_id, url, source, title, raw_input, tags, status, summary, content_type, is_favorited, created_at, updated_at
      ) VALUES (
        ins_id, uid, 'https://www.youtube.com/watch?v=gXDMoiEkyu8', 'youtube',
        'Huberman Lab: Neuroplasticity & Deep Work Protocols',
        'Key protocols for focus blocks and optimizing learning states.',
        ARRAY['Productivity', 'Mindset', 'Health'], 'ready',
        'A neurobiological framework for maximizing deep focus, utilizing ultradian rhythm 90-minute blocks and post-learning consolidation.',
        'youtube_video', true, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'
      );

      INSERT INTO insight_items (
        insight_id, user_id, content, order_index, headline, explanation, application, insight_type, recall_question,
        memorability_score, actionability_score, novelty_score, specificity_score, long_term_value_score, next_review_at
      ) VALUES
      (
        ins_id, uid,
        'Cap intense mental effort at 90-minute ultradian cycles. The brain operates in 90-minute cycles of high alertness followed by natural fatigue.',
        0, 'Cap intense mental effort at 90-minute ultradian cycles',
        'The brain operates in 90-minute cycles of high alertness followed by natural fatigue.',
        'Schedule your most demanding analytical or creative tasks in a single 90-minute uninterrupted block.',
        'principle', 'What is the optimal duration for a deep focus work bout according to ultradian cycles?',
        9, 10, 8, 9, 10, NOW()
      ),
      (
        ins_id, uid,
        'Use Non-Sleep Deep Rest (NSDR) for rapid memory consolidation. Taking a 10 to 20-minute relaxation pause after intense learning accelerates synaptic plasticity.',
        1, 'Use Non-Sleep Deep Rest (NSDR) for rapid memory consolidation',
        'Taking a 10 to 20-minute relaxation pause after intense learning accelerates synaptic plasticity.',
        'Lie down for 15 minutes after a complex study session without checking your phone.',
        'actionable_tip', 'How does NSDR accelerate neuroplasticity following a study session?',
        9, 9, 9, 9, 10, NOW() + INTERVAL '2 days'
      );

      -- 2. X / Twitter: Naval Ravikant (Wealth & Leverage)
      ins_id := gen_random_uuid();
      INSERT INTO insights (
        id, user_id, url, source, title, raw_input, tags, status, summary, content_type, is_favorited, created_at, updated_at
      ) VALUES (
        ins_id, uid, 'https://x.com/naval/status/1002103360646823936', 'twitter',
        'Naval: How to Get Rich Without Getting Lucky',
        'Timeless principles on building permissionless leverage and specific knowledge.',
        ARRAY['Business', 'Finance', 'Philosophy'], 'ready',
        'A definitive guide on acquiring specific knowledge, judgment, and permissionless leverage (code and media) to build long-term wealth.',
        'tweet', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
      );

      INSERT INTO insight_items (
        insight_id, user_id, content, order_index, headline, explanation, application, insight_type, recall_question,
        memorability_score, actionability_score, novelty_score, specificity_score, long_term_value_score, next_review_at
      ) VALUES
      (
        ins_id, uid,
        'Arm yourself with specific knowledge and permissionless leverage. Code and media are permissionless leverage that work while you sleep.',
        0, 'Arm yourself with specific knowledge and permissionless leverage',
        'Code and media are permissionless leverage that work while you sleep, unlike labor and capital which require permission.',
        'Invest your free time creating digital assets (software, writing, content) that reproduce at zero marginal cost.',
        'principle', 'Why are code and media considered the most egalitarian forms of leverage?',
        10, 9, 9, 10, 10, NOW()
      ),
      (
        ins_id, uid,
        'Play iterated long-term games with long-term people. All returns in life, whether in wealth, relationships, or knowledge, come from compound interest.',
        1, 'Play iterated long-term games with long-term people',
        'All returns in life, whether in wealth, relationships, or knowledge, come from compound interest.',
        'Prioritize high-integrity collaborators and projects where payoffs compound over decades.',
        'mental_model', 'In what areas does compound interest produce exponential life returns?',
        10, 8, 8, 8, 10, NOW() + INTERVAL '3 days'
      );

      -- 3. Instagram: Dieter Rams (Design Principles)
      ins_id := gen_random_uuid();
      INSERT INTO insights (
        id, user_id, url, source, title, raw_input, tags, status, summary, content_type, is_favorited, created_at, updated_at
      ) VALUES (
        ins_id, uid, 'https://www.instagram.com/reel/C8q_123design/', 'instagram',
        'Dieter Rams: 10 Principles of Good Design',
        'Simplicity and honesty in product craftsmanship.',
        ARRAY['Design', 'Creativity'], 'ready',
        'Ten foundational tenets of functional and aesthetic design emphasizing unobtrusiveness and radical clarity.',
        'short_form_video', false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
      );

      INSERT INTO insight_items (
        insight_id, user_id, content, order_index, headline, explanation, application, insight_type, recall_question,
        memorability_score, actionability_score, novelty_score, specificity_score, long_term_value_score, next_review_at
      ) VALUES
      (
        ins_id, uid,
        'Good design is as little design as possible. Less, but better — concentrates on essential aspects and strips away visual clutter.',
        0, 'Good design is as little design as possible',
        'Less, but better — concentrates on essential aspects and strips away non-functional clutter.',
        'Audit your UI and remove every component, shadow, or border that does not directly serve the user.',
        'principle', 'What is Dieter Rams’ famous motto regarding simplicity in design?',
        9, 10, 8, 9, 9, NOW()
      ),
      (
        ins_id, uid,
        'Good design is thorough down to the last detail. Nothing must be arbitrary or left to chance.',
        1, 'Good design is thorough down to the last detail',
        'Care and accuracy in the design process show respect towards the user.',
        'Standardize spacing tokens and edge radius consistency across all application screens.',
        'framework', 'Why does thoroughness down to the micro-detail matter in UX?',
        8, 9, 7, 8, 9, NOW() + INTERVAL '4 days'
      );

      -- 4. YouTube: Andrej Karpathy (Deep Learning / AI)
      ins_id := gen_random_uuid();
      INSERT INTO insights (
        id, user_id, url, source, title, raw_input, tags, status, summary, content_type, is_favorited, created_at, updated_at
      ) VALUES (
        ins_id, uid, 'https://www.youtube.com/watch?v=kCc8FmEb1nY', 'youtube',
        'Andrej Karpathy: Building GPT from Scratch',
        'How transformers and self-attention work under the hood.',
        ARRAY['Programming', 'Technology', 'Learning'], 'ready',
        'A comprehensive walkthrough of autoregressive Transformer architectures, multi-head attention mechanisms, and token generation.',
        'youtube_video', true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
      );

      INSERT INTO insight_items (
        insight_id, user_id, content, order_index, headline, explanation, application, insight_type, recall_question,
        memorability_score, actionability_score, novelty_score, specificity_score, long_term_value_score, next_review_at
      ) VALUES
      (
        ins_id, uid,
        'Self-attention is a dynamic weighted communication mechanism. Tokens broadcast queries and keys to dynamically aggregate relevant context.',
        0, 'Self-attention is a dynamic weighted communication mechanism',
        'Tokens broadcast queries and keys to aggregate context dynamically based on dot-product similarity.',
        'Think of Transformer self-attention as a data-dependent routing graph rather than a static matrix.',
        'mental_model', 'What is the fundamental role of Query, Key, and Value vectors in Transformer attention?',
        9, 8, 9, 10, 10, NOW()
      ),
      (
        ins_id, uid,
        'Residual connections enable deep gradient backpropagation. Skip connections prevent vanishing gradients by creating direct information superhighways.',
        1, 'Residual connections enable deep gradient backpropagation',
        'Skip connections prevent vanishing gradients by creating direct information superhighways through dozens of layers.',
        'Always include residual adds around layer normalization and attention blocks.',
        'principle', 'How do residual connections prevent vanishing gradients in deep neural networks?',
        9, 9, 8, 9, 10, NOW() + INTERVAL '5 days'
      );

      -- 5. X / Twitter: Paul Graham (Career & Work)
      ins_id := gen_random_uuid();
      INSERT INTO insights (
        id, user_id, url, source, title, raw_input, tags, status, summary, content_type, is_favorited, created_at, updated_at
      ) VALUES (
        ins_id, uid, 'https://x.com/paulg/status/1677321094007898112', 'twitter',
        'Paul Graham: How to Do Great Work',
        'Essays on ambition, curiosity, and choosing what to work on.',
        ARRAY['Career', 'Mindset', 'Creativity'], 'ready',
        'A rigorous blueprint for producing ambitious, high-impact creative and technical work through genuine curiosity and rigorous consistency.',
        'tweet', false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
      );

      INSERT INTO insight_items (
        insight_id, user_id, content, order_index, headline, explanation, application, insight_type, recall_question,
        memorability_score, actionability_score, novelty_score, specificity_score, long_term_value_score, next_review_at
      ) VALUES
      (
        ins_id, uid,
        'Follow your genuine, obsessive curiosity rather than market prestige. What you find interesting when no one is watching is your competitive edge.',
        0, 'Follow your genuine, obsessive curiosity rather than market prestige',
        'What you find naturally fascinating is where you will out-persevere everyone else.',
        'Pick projects where the learning itself feels like play to you but looks like work to others.',
        'strategy', 'Why is intrinsic curiosity a better career guide than chasing prestige?',
        10, 9, 9, 9, 10, NOW()
      ),
      (
        ins_id, uid,
        'Always be working on your own real projects. Reading and preparing only become effective when grounded in a real problem you are trying to solve.',
        1, 'Always be working on your own real projects',
        'Reading and preparing only become effective when grounded in a real problem you are actively solving.',
        'Learn new technologies by shipping small, live tools rather than passively watching tutorials.',
        'actionable_tip', 'Why is project-driven learning superior to passive study?',
        9, 10, 8, 9, 10, NOW() + INTERVAL '6 days'
      );

      -- 6. Instagram: Peter Attia / Dr. Andy Galpin (Fitness & Health)
      ins_id := gen_random_uuid();
      INSERT INTO insights (
        id, user_id, url, source, title, raw_input, tags, status, summary, content_type, is_favorited, created_at, updated_at
      ) VALUES (
        ins_id, uid, 'https://www.instagram.com/reel/C9x_fitnessProtocol/', 'instagram',
        'Zone 2 Cardio & Strength for Longevity',
        'Optimizing mitochondrial health and cardiovascular fitness.',
        ARRAY['Fitness', 'Health'], 'ready',
        'The dual-pillar protocol of Zone 2 endurance and progressive resistance training to optimize metabolic longevity and Vo2 max.',
        'short_form_video', false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
      );

      INSERT INTO insight_items (
        insight_id, user_id, content, order_index, headline, explanation, application, insight_type, recall_question,
        memorability_score, actionability_score, novelty_score, specificity_score, long_term_value_score, next_review_at
      ) VALUES
      (
        ins_id, uid,
        'Accumulate 150-180 minutes of Zone 2 cardio weekly. Exercising at conversational pace maximizes mitochondrial density and lactate clearance capacity.',
        0, 'Accumulate 150-180 minutes of Zone 2 cardio weekly',
        'Exercising at conversational pace maximizes mitochondrial density and lactate clearance capacity.',
        'Add 3x 45-minute steady-state stationary bike or brisk incline walking sessions per week.',
        'strategy', 'What physiological adaptation occurs when training in Zone 2 heart rate?',
        9, 10, 8, 10, 10, NOW()
      ),
      (
        ins_id, uid,
        'Train strength with 2-3 reps in reserve (RIR). Training near but not to complete failure yields maximum hypertrophy with minimal central nervous system fatigue.',
        1, 'Train strength with 2-3 reps in reserve (RIR)',
        'Training near but not to complete failure yields maximum hypertrophy with minimal CNS fatigue.',
        'Stop your heavy compound lift sets when you could have performed 2 more clean reps.',
        'actionable_tip', 'Why is training with 2 reps in reserve often superior to training to absolute failure?',
        8, 9, 8, 9, 9, NOW() + INTERVAL '7 days'
      );

      -- 7. YouTube: James Clear (Habits & Psychology)
      ins_id := gen_random_uuid();
      INSERT INTO insights (
        id, user_id, url, source, title, raw_input, tags, status, summary, content_type, is_favorited, created_at, updated_at
      ) VALUES (
        ins_id, uid, 'https://www.youtube.com/watch?v=PZ7lDrwYdZc', 'youtube',
        'Atomic Habits: The 4 Laws of Behavior Change',
        'Systems vs goals and designing habit friction.',
        ARRAY['Productivity', 'Psychology', 'Books'], 'ready',
        'An actionable framework for identity-based habits, cue structuring, and friction reduction to automate personal excellence.',
        'youtube_video', true, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'
      );

      INSERT INTO insight_items (
        insight_id, user_id, content, order_index, headline, explanation, application, insight_type, recall_question,
        memorability_score, actionability_score, novelty_score, specificity_score, long_term_value_score, next_review_at
      ) VALUES
      (
        ins_id, uid,
        'You do not rise to the level of your goals; you fall to the level of your systems. Focus on the daily process rather than fixing the outcome.',
        0, 'You do not rise to the level of your goals; you fall to the level of your systems',
        'Focus on the daily process and environment design rather than willpower or fixing the outcome.',
        'Design your workspace so good habits require 0 friction and distractions require 20 seconds of effort.',
        'mental_model', 'What is the primary difference between goal-oriented vs systems-oriented thinking?',
        10, 10, 8, 9, 10, NOW()
      ),
      (
        ins_id, uid,
        'Implement the 2-Minute Rule to defeat procrastination. When starting a new habit, scale it down to an action that takes under two minutes.',
        1, 'Implement the 2-Minute Rule to defeat procrastination',
        'When starting a new habit, scale it down so it takes under two minutes to perform, making starting inevitable.',
        'Instead of planning to read for an hour, commit simply to opening the book and reading one page.',
        'actionable_tip', 'How does the 2-Minute Rule bypass task initiation resistance?',
        9, 10, 8, 10, 9, NOW() + INTERVAL '8 days'
      );

      -- 8. X / Twitter: Lenny Rachitsky (Product & Growth)
      ins_id := gen_random_uuid();
      INSERT INTO insights (
        id, user_id, url, source, title, raw_input, tags, status, summary, content_type, is_favorited, created_at, updated_at
      ) VALUES (
        ins_id, uid, 'https://x.com/lennysan/status/1712491029384729100', 'twitter',
        'Lenny Rachitsky: Retention Benchmarks & Growth Loops',
        'Product-market fit signals and sustainable growth mechanics.',
        ARRAY['Marketing', 'Business', 'Entrepreneurship'], 'ready',
        'A data-driven breakdown of consumer and B2B retention curves, user activation milestones, and organic virality loops.',
        'tweet', false, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
      );

      INSERT INTO insight_items (
        insight_id, user_id, content, order_index, headline, explanation, application, insight_type, recall_question,
        memorability_score, actionability_score, novelty_score, specificity_score, long_term_value_score, next_review_at
      ) VALUES
      (
        ins_id, uid,
        'Retention is the single metric that validates Product-Market Fit. A cohort retention curve that flattens parallel to the x-axis proves real utility.',
        0, 'Retention is the single metric that validates Product-Market Fit',
        'A cohort retention curve that flattens parallel to the x-axis proves real utility, whereas one dropping to zero indicates a leaky bucket.',
        'Measure your 30-day and 90-day active user curves before investing budget into paid user acquisition.',
        'principle', 'What visual shape of a cohort retention curve signals true product-market fit?',
        10, 9, 8, 10, 10, NOW()
      ),
      (
        ins_id, uid,
        'Identify your Aha! moment within the first 60 seconds of onboarding. Get users to experience the core value proposition before asking for friction-heavy commitments.',
        1, 'Identify your Aha! moment within the first 60 seconds of onboarding',
        'Get users to experience the core value proposition before asking for friction-heavy commitments.',
        'Let users save and view their first AI insight before forcing signups or paywalls.',
        'strategy', 'Why must the product Aha! moment occur early in onboarding?',
        9, 10, 9, 10, 10, NOW() + INTERVAL '9 days'
      );

    END IF;
  END LOOP;
END $$;
