# SMS with AgooSMS

How the ChurchMS SMS broadcast feature works, how to configure it, and how to test it safely.

## How it works

1. Staff compose a broadcast on **Communication**, choose an audience and an approved sender ID, and review the **server-calculated** recipient count. It shows valid numbers, invalid numbers, missing numbers and duplicates removed.
2. **Send** (`POST /api/v1/communications/campaigns/{id}/send/`) atomically moves the draft to *Queued* and records one row per recipient. A second click or a replay returns `409` and is not queued again. Broadcasts at or above `SMS_LARGE_BROADCAST_THRESHOLD` recipients require `confirm_recipient_count` to equal the server's count.
3. A **Celery** worker processes the queue in batches of `AGOOSMS_MAX_BULK` using `POST /v1/sms/send-bulk` (or `/v1/sms/send` for a single number), inside the church's tenant schema.
4. Each recipient ends in one of these states:

| Status | Meaning |
|---|---|
| `sent` ("Accepted by provider") | AgooSMS accepted the request. **Not** proof of delivery to the phone. |
| `delivered` / `failed` (after status check) | Result of *Check delivery status* (`GET /v1/sms/:id/status`) when AgooSMS returned a message ID. |
| `failed` | Definitely not sent (rejected, bad credentials, no credit, retries exhausted). Can be retried, except invalid numbers and content rejections. |
| `unknown` ("Unclear") | The provider may or may not have sent it (read timeout, HTTP 5xx, unreadable response). **Never resent automatically.** An admin reviews it and marks it sent or not sent. |
| `skipped` | No valid Ghana mobile number on file. |
| `simulated` | Test mode; nothing was sent. |

The campaign ends as **Sent**, **Partially sent**, **Needs review** (any unclear) or **Failed**. Counts come from the recipient rows, never from assumptions.

### Duplicate-send protection
- The draft → queued transition is atomic; only drafts can be sent.
- There is one row per destination number per campaign (unique constraint), so household members sharing a number get one SMS.
- The worker claims a batch (`pending → sending`) before calling the provider. A redelivered task only touches `pending` rows. Rows left in `sending` by a crash become `unknown`, not resent.
- Rate limits (HTTP 429) and connections that never reached AgooSMS (DNS failure, refused, connect timeout) are retried with backoff (max 3). Read timeouts and 5xx errors are **not** retried.
- **Retry failed** only resends `failed` rows, and asks for confirmation of the exact count.

## Configuration

Set these in the backend environment (`backend/.env` locally; AWS secrets in production). `.env` is git-ignored. Never commit a real key.

| Variable | Default | Purpose |
|---|---|---|
| `AGOOSMS_API_KEY` | — | API key (sent as `X-API-Key`). Never exposed to the browser or written to logs. |
| `AGOOSMS_API_KEY_SSM_PARAMETER` | — | Production: name of an SSM **SecureString** holding the key. |
| `AGOOSMS_API_KEY_SECRET_ID` | — | Production: Secrets Manager id/ARN; plain string or JSON `{"api_key": "…"}`. |
| `AWS_REGION` | — | Region for SSM/Secrets Manager (the app's IAM role needs `ssm:GetParameter` with decryption, or `secretsmanager:GetSecretValue`). |
| `AGOOSMS_SENDER_ID` | — | Approved sender ID(s), comma-separated; the first is the default. Staff can only choose from this list. |
| `AGOOSMS_BASE_URL` | `https://api.agoosms.com` | API base URL. |
| `AGOOSMS_TIMEOUT` | `30` | Request timeout in seconds. |
| `AGOOSMS_MAX_BULK` | `100` | Recipients per bulk request. Conservative because AgooSMS hasn't published a limit; raise once confirmed. |
| `SMS_DRY_RUN` | `True` | **Test mode.** Messages are processed and recorded as `simulated`; nothing is sent. Set to `False` to send real SMS. |
| `SMS_LARGE_BROADCAST_THRESHOLD` | `25` | At or above this many recipients, explicit confirmation is required. |
| `SMS_MAX_RECIPIENTS` | `5000` | Hard limit per broadcast. |
| `SMS_MAX_MESSAGE_LENGTH` | `918` | Maximum characters (6 GSM-7 segments). |
| `SMS_SEND_RATE` | `20/hour` | Send/retry requests per user (throttle). |

The API key is resolved in order: `AGOOSMS_API_KEY`, then SSM, then Secrets Manager. If none is found and test mode is off, the UI shows "SMS sending isn't set up yet" and `send` returns `503 sms_not_configured`. It never crashes.

### Approved sender ID
1. In the AgooSMS dashboard (or via `POST /v1/sender-ids`), request a sender ID, usually the church's short name (max 11 characters).
2. Wait for approval. Unapproved IDs are typically rejected by the provider, and would show as *Failed* with a validation or auth error.
3. Add the approved ID to `AGOOSMS_SENDER_ID` and restart the backend and worker.

### Phone numbers
Only Ghana mobile numbers are sent. Stored numbers in formats like `024 123 4567`, `0241234567`, `233241234567` and `+233241234567` are normalised to `+233XXXXXXXXX`. Numbers with an unknown mobile prefix or non-Ghana numbers are **skipped** and listed in the preview so staff can fix them on the person's profile.

## Running locally

```bash
# Redis must be running (REDIS_URL, default redis://localhost:6379/0)
cd backend
python manage.py migrate_schemas            # applies communications 0002 to every church schema
python manage.py runserver
celery -A config.celery worker -l info      # Windows: add --pool=solo
```

Without a running worker, broadcasts stay **Queued**. If Redis is down, `send` returns `503 queue_unavailable` and the draft is left unchanged.

## Testing safely

- **Automated tests never call AgooSMS.** The HTTP layer is mocked, `SMS_DRY_RUN=True`, and the test settings refuse to run against a Neon database.
  ```bash
  cd backend
  TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/churchms pytest apps/communications
  ```
- **Manual testing:** keep `SMS_DRY_RUN=True`. The whole flow (preview, confirm, queue, worker, history, retry and review) works and records `simulated` results with no SMS and no credit used.
- **First real send (with approval):**
  1. Set the key and sender ID.
  2. Call `POST /api/v1/communications/sms/check-connection/` as an admin (API only; there's no UI button yet). It calls `GET /v1/balance` and sends nothing.
  3. Set `SMS_DRY_RUN=False`.
  4. Send to the **One phone number** audience with a staff member's own number.
  5. Confirm receipt and check History before any group broadcast.

## API reference (ChurchMS)

All endpoints require staff role or above. Items marked *admin* need Church Admin or Super Admin.

| Method & path | Purpose |
|---|---|
| `GET /communications/sms/config/` | Test mode, configured state, approved sender IDs, limits (no key). |
| `POST /communications/sms/check-connection/` *admin* | Balance lookup to verify credentials. |
| `POST /communications/campaigns/preview/` | Recipient counts for an audience, before saving. |
| `POST /communications/campaigns/` | Create draft (`recipients_filter` is a typed audience: `active`, `everyone`, `visitors`, `group`, `life_stage`, `members`, `phone`). |
| `POST /communications/campaigns/{id}/send/` | Queue a draft (`confirm_recipient_count` for large audiences). |
| `POST /communications/campaigns/{id}/retry-failed/` | Re-queue definitively failed recipients (confirm count). |
| `POST /communications/campaigns/{id}/resolve-unknown/` *admin* | Mark unclear outcomes as `sent` or `failed`. |
| `POST /communications/campaigns/{id}/refresh-status/` | Queue a delivery-status lookup for accepted messages. |
| `GET /communications/campaigns/{id}/recipients/` | Per-recipient results. Numbers are masked unless the user is an admin or pastor. |
| `GET /communications/campaigns/{id}/audit/` | Who created, queued, retried and reviewed the broadcast, and when. |

Only drafts can be edited or deleted. Sent broadcasts are kept as a record.

## Not yet confirmed with AgooSMS

The public API index lists the endpoints, but no public documentation of request/response details was available. Confirm these with AgooSMS before going live, and adjust `apps/communications/sms/agoosms.py` if needed:

- **Response format** of `/v1/sms/send` and `/v1/sms/send-bulk`: message ID field names and per-recipient results. The parser accepts several common shapes. If no IDs are returned, delivery-status lookups aren't possible.
- **Bulk limit** per request (`AGOOSMS_MAX_BULK`).
- **Error codes and format**, especially for invalid sender ID, low balance and rate limiting.
- **Status values** returned by `GET /v1/sms/:id/status`.
- **Idempotency:** none is assumed. That's why timeouts become *Unclear* instead of being retried.
- **Delivery-report webhooks:** not assumed. Status is only checked on request.
