# Credit Repair Bot

Bot-first credit repair operations platform.

## Stack
- Next.js
- TypeScript
- Postgres
- Prisma
- Stripe (test mode first)

## Block one foundation
- tenant accounts
- tenant-scoped users and role limits
- billing subscription model
- token account model
- immutable token transaction ledger
- separate weekly mail billing model
- grace/suspension access behavior
- super-admin bootstrap support

## Block two scaffold
- company onboarding flow that creates a tenant + owner account
- sign-in flow with tenant slug + email + password
- protected dashboard shell
- staff-seat visibility
- staff invitation model and server action
- Stripe test-mode checkout + webhook scaffolding

## Block three scaffold
- staff invitation acceptance route at `/invite/[token]`
- Jotform-style intake webhook at `/api/intake/jotform`
- client + intake submission persistence in Prisma
- real Stripe checkout session creation for plans and token packs
- webhook processing for checkout completion and subscription status updates

## Block four scaffold
- tenant intake review queue at `/dashboard/intake`
- lifecycle-stage overview for tenant-scoped client records
- in-dashboard stage update action for intake-to-fulfillment movement
- dashboard summary card linking directly into intake operations

## Block five scaffold
- provider abstraction layer for CRC and tenant-selected credit provider
- tenant integration status page at `/dashboard/integrations`
- per-client downstream sync stub from the intake queue
- audit-log-based sync event trail for later live API mapping

## Block six scaffold
- tenant audit trail page at `/dashboard/audit`
- audit overview counts and recent event summary on the main dashboard
- event stream showing actor, reference, timestamps, and input/output snapshots
- cross-system visibility for onboarding, intake, billing, invites, and sync actions

## Block seven scaffold
- SMTP-based invite delivery transport
- automatic invite email attempt after staff invitation creation
- audit events for sent, skipped, and failed invite delivery
- team-page visibility into invite delivery status and manual fallback mode

## Block eight scaffold
- resend control for pending invitations
- revoke control for stale or unwanted pending invitations
- permission checks around invite management actions
- expired invite handling during resend attempts

## Block nine scaffold
- Credit Repair Cloud client skeleton based on CRC's XML-style API shape
- tenant CRC runtime resolution from env vars or `CRC_CONFIGS_JSON`
- dry-run versus live CRC sync mode
- integration status page now shows missing config vs ref-only vs ready CRC state

## Block ten scaffold
- credit provider client skeleton for Credit Hero and IdentityIQ style routing
- provider runtime resolution from env vars or `CREDIT_PROVIDER_CONFIGS_JSON`
- dry-run versus live provider sync mode
- integration status page now shows missing config vs ref-only vs ready provider state
- Credit Hero affiliate link can be stored and surfaced as the default person-facing signup link

## Block eleven scaffold
- Stripe checkout restricted to owner/admin billing roles
- Stripe checkout completion now fulfills token-pack purchases into the purchased balance ledger
- Stripe billing portal session route for self-serve billing management
- Stripe billing page now surfaces missing price IDs and webhook readiness

## Block twelve scaffold
- client-level Credit Hero signup progress states, including sent and completed markers
- one-click provider signup email delivery through configured SMTP from the intake queue
- reusable email and SMS outreach templates that point clients through the affiliate signup link
- stronger provider response parsing for external IDs, signup URLs, and failure signals

## Block thirteen scaffold
- one-click provider signup SMS delivery through Twilio-style REST delivery
- provider signup follow-up cadence logic (initial, 24h, 72h, 7d)
- automation endpoint at `/api/automation/provider-signup-followups` for cron or scheduler triggering
- intake queue visibility into follow-up state and recommended outreach channel

## Block fourteen scaffold
- automation center now includes manual dry-run and live-run controls
- follow-up automation runs now write explicit started, completed, and failed audit events
- automation center now shows recent run history and latest live-run status
- scheduler wiring guidance is surfaced directly in the UI and documented for production handoff

## Block fifteen scaffold
- CRC sync now attempts to parse returned record IDs and persist `crcClientId` on the client record
- CRC audit snapshots now preserve parsed response metadata in addition to raw previews
- provider response parsing now handles more ID, URL, and status patterns from imperfect live responses
- intake view now surfaces the stored CRC client ID next to provider state

## Block sixteen scaffold
- dispute-engine foundation added in `src/lib/dispute-engine.ts`
- typed case schema for consumers, file context, case history, tradelines, evidence, scores, and routing outputs
- hard-stop and soft-stop guardrails aligned to the outcome-optimized dispute workflow
- identity-theft statutory-block eligibility checks and resistance scoring scaffold
- first-pass tradeline routing for bureau, furnisher, contradiction, complaint, and pre-claim paths
- packet ordering logic now has a formal place to rank items by funding priority, removability, resistance, evidence, and delta
- normalized dispute-engine reference stored at `artifacts/credit-repair-bot-v1/elite-credit-dispute-logic-engine-v2.md`
- live runtime helpers now exist for claim-readiness scoring and deterministic final-stage routing
- deterministic routing can now suppress stale state-law output, suppress arbitration language when gating fails, hold weak furnisher rounds, downgrade incomplete statutory-block lanes, and suppress repeat rounds without meaningful delta

## No-provider launch lane
- the app now has a no-API credit report ingestion foundation so launch does not depend on Credit Hero or IdentityIQ access
- operators can upload credit report files inside intake and tie them to a dispute case shell
- operators can manually seed tradelines into the dispute case from intake so the dispute engine can run without vendor-side report APIs
- provider integrations remain optional accelerators, not launch blockers

## Unified dispute framework rule
- the core legal/workflow engine is the base layer
- the optimization/moat layer sits on top of it and improves performance, but does not override truth or legal supportability
- if core legal guardrails conflict with optimization, the core engine wins
- unsupported claims, unsupported arbitration references, unsupported state-law references, and disputes of accurate information stay hard-blocked
- the combined framework should optimize for lawful removals/corrections, speed to funding-readiness, contradiction-heavy packet quality, and escalation readiness

## Last-mile moat layer
- deterministic production rules engine is the first build priority
- claim-readiness matrix is the second build priority
- live 50-state legal library is the third build priority
- bureau and furnisher playbooks are the fourth build priority
- outcome-trained packet optimization is the fifth build priority
- reference: `artifacts/credit-repair-bot-v1/last-mile-moat-layer.md`

## Defaults currently baked in
### Plans
- Starter: $299/month, 150 included tokens, 3 staff seats
- Growth: $599/month, 400 included tokens, 10 staff seats
- Scale: $999/month, 900 included tokens, 25 staff seats

### Token action costs
- Letter generation: 1 token
- Funding recommendation: 2 tokens

### Mail billing
- Regular mail: $4 billed weekly
- Certified mail: $10 billed weekly
- Mailing is not token-based

### Grace policy
- 7-day grace period
- read-only during grace
- current workflows continue during grace
- no new token-consuming actions during grace
- full lock after grace

## Local setup
1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL`
3. Set `SESSION_SECRET`
4. Add Stripe test keys when ready
5. Add Stripe price IDs for plans and token packs
6. Add `INTAKE_WEBHOOK_SECRET` if intake posts should be locked down
7. Add `APP_BASE_URL` and SMTP settings if invite emails should send automatically
8. Add CRC API credentials if tenant CRC sync should move beyond dry-run
9. Add provider API credentials if Credit Hero or IdentityIQ sync should move beyond dry-run
10. Optionally add `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` if using a custom Stripe portal configuration
11. Set `CREDIT_HERO_AFFILIATE_LINK` to the affiliate URL every customer should use
12. Add Twilio credentials if provider signup SMS delivery should send automatically
13. Set `FOLLOWUP_AUTOMATION_SECRET` if `/api/automation/provider-signup-followups` will be called by cron or an external scheduler

```bash
npm install
npm run prisma:generate
npm run dev
```

## Prisma commands
```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:studio
```

## Production scheduler handoff
Use any scheduler that can `POST` JSON with a bearer token.

Endpoint:

```text
POST /api/automation/provider-signup-followups
Authorization: Bearer <FOLLOWUP_AUTOMATION_SECRET>
Content-Type: application/json
```

Payload:

```json
{
  "tenantId": "<tenant-id>",
  "actorUserId": "<staff-user-id>",
  "dryRun": false
}
```

OpenClaw cron example:

```bash
openclaw cron add \
  --name "Provider follow-up run" \
  --every "30m" \
  --session isolated \
  --message "POST your production app /api/automation/provider-signup-followups with dryRun=false and the automation bearer token." \
  --announce
```

## Next recommended step
Block seventeen:
- turn the dispute-engine scaffold into persistent case/tradeline tables and a real strategy pipeline
- implement the deterministic production rules engine on top of the dispute core
- implement the claim-readiness matrix and expose it internally per case/tradeline
- invitation delivery provider abstraction beyond SMTP/Twilio single-provider mode
- live Credit Hero payload mapping once verified request and response examples are available
- production scheduler wiring on the final hosted domain
- richer billing subscription state surfacing in the dashboard
