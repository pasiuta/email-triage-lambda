# Email Triage Lambda: text classifier and summarizer

An AWS Lambda function in Node.js that takes a batch of short texts (emails) and either:

- **classify**: assigns each one 1–3 predefined topics (`finance`, `technical`, `hr`, `marketing`, `sales`, `support`, `legal`, with `other` as the fallback), or
- **summarize**: writes a 1–2 sentence summary of each one.

The model backend can be swapped with one environment variable:

| `MODEL_PROVIDER`  | What it is                                                     | Keys needed         | Cost         |
| ----------------- | -------------------------------------------------------------- | ------------------- | ------------ |
| `local` (default) | Bundled offline model: Naive Bayes classifier + extractive summarizer | none                | **$0**       |
| `anthropic`       | Anthropic Messages API (`claude-haiku-5-5` by default)         | `ANTHROPIC_API_KEY` | pay per token |
| `openai`          | OpenAI Chat Completions (`gpt-4o-mini` by default)             | `OPENAI_API_KEY`    | pay per token |

The project has **zero runtime dependencies**. It uses only Node.js built-ins (`fetch`, `node:test`, `node:crypto`, `parseArgs`), so there is no supply-chain risk, the cold start is small and the deployment package is tiny.

---

## Quick start

Requirements: **Node.js ≥ 20.12** (22 recommended, see `.nvmrc`).

```bash
git clone <repo-url> && cd email-triage-lambda
npm ci            # nothing to download: no dependencies, but this checks the lockfile

# Run the Lambda locally (offline local model, no keys):
node app/run.js --input sample/emails.json --mode classify  --log-level INFO
node app/run.js --input sample/emails.json --mode summarize --log-level INFO

# Shortcuts for the same commands
npm run classify
npm run summarize

# Tests (18 tests, no network, no keys)
npm test
```

### Using an LLM instead of the local model

```bash
cp .env.example .env               # then put your key in .env (.env is git-ignored)
node app/run.js --input sample/emails.json --mode summarize --provider anthropic
# or: MODEL_PROVIDER=openai OPENAI_API_KEY=sk-... node app/run.js -i sample/emails.json -m classify
```

### CLI options (`app/run.js`)

| Flag                 | Default    | Description                                   |
| -------------------- | ---------- | --------------------------------------------- |
| `--input, -i`        | (required) | A JSON array of emails, or a Lambda event `{ mode, items }` |
| `--mode, -m`         | `classify` | `classify` or `summarize` (overrides `mode` in the file) |
| `--log-level`        | `INFO`     | `DEBUG`, `INFO`, `WARN` or `ERROR`            |
| `--provider, -p`     | env / `local` | `local`, `anthropic` or `openai`           |

The result (JSON) goes to **stdout** and the structured logs go to **stderr**, so you can redirect them separately:
`npm run -s classify > result.json`

---

## Example

Input (`sample/emails.json`, abridged):

```json
[
  { "id": 1, "subject": "Invoice #1234 overdue", "body": "Dear customer, Our records show that invoice #1234 ..." },
  { "id": 2, "subject": "Weekly engineering sync", "body": "Agenda: review the sprint backlog ..." },
  { "id": 3, "subject": "Company retreat announcement", "body": "We invite you to our annual company retreat ..." },
  { "id": 4, "subject": "", "body": " " }
]
```

`--mode classify` (local model):

```json
[
  { "id": 1, "topics": ["finance"] },
  { "id": 2, "topics": ["technical"] },
  { "id": 3, "topics": ["hr", "marketing"] },
  { "id": 4, "error": "empty_input" }
]
```

`--mode summarize` (local model):

```json
[
  { "id": 1, "summary": "Our records show that invoice #1234 for $2,450 was due on October 15 and remains unpaid. Please arrange payment within 7 days to avoid a late fee." },
  { "id": 2, "summary": "Agenda: review the sprint backlog, discuss last night's production incident and the database latency spike, and plan the Kubernetes cluster upgrade. ..." },
  { "id": 3, "summary": "We invite you to our annual company retreat in the mountains on June 12-14. Our marketing team will capture photos and video for a social media campaign about our culture." },
  { "id": 4, "error": "empty_input" }
]
```

The sample file also contains edge cases: a non-object item, wrong field types and a duplicate email (to show the cache).

### Error codes (per item; the batch always continues)

| Code                | Meaning                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `empty_input`       | Subject and body are both empty or whitespace                    |
| `invalid_input`     | The item is not an object, or `subject`/`body` are not strings   |
| `processing_failed` | The model call failed after retries (details are in the ERROR log) |

Every failure is logged as a structured JSON line with `id` and the reason. Each batch also ends with one summary line:

```json
{"ts":"...","level":"INFO","msg":"Batch processed","mode":"classify","provider":"local","total":10,"failed":3,"durationMs":3}
```

---

## Architecture

```
app/
├── handler.js            Lambda entry point: parses the event, picks the mode, logs batch metrics
├── run.js                Local Lambda simulator (CLI)
├── config.js             All configuration, from env vars (frozen)
├── logger.js             Structured JSON logger with levels (stderr)
├── topics.js             Predefined topics shared by all providers
├── core/
│   ├── processor.js      Batch pipeline: validate → cache → provider, per-item error isolation
│   ├── input.js          Item validation and normalization (never throws)
│   ├── pool.js           Bounded-concurrency map that preserves order
│   ├── cache.js          Promise cache: dedupes identical emails, survives warm starts
│   └── http.js           fetch + timeout + exponential backoff for transient errors only
├── modes/                WHAT to do: one file per mode (output key, prompt, reply parser)
│   ├── index.js          Mode registry
│   ├── classify.js
│   └── summarize.js
├── providers/            HOW to do it: one file per backend (same interface)
│   ├── index.js          Provider factory
│   ├── llm.js            Shared LLM logic (Template Method), so each API needs only `complete()`
│   ├── anthropic.js
│   ├── openai.js
│   └── local.js
└── models/local/         Bundled offline model
    ├── classifier.js     Multinomial Naive Bayes, multi-label, trained at cold start (about 1 ms)
    ├── summarizer.js     Extractive, frequency-based sentence scoring
    ├── training.js       Small labelled corpus
    └── text.js           Tokenizer and sentence splitter
```

Request flow:

```
event ─► handler ─► processor ─► for each item (max N in parallel):
                                  validate ─✗─► { id, error }  (logged, batch continues)
                                      │
                                   cache hit? ─► reuse result (no model call)
                                      │
                                  provider.run(mode, doc) ─✗─► { id, error: "processing_failed" }
                                      │
                                  { id, [mode.outputKey]: result }
```

### Design decisions

- **Two independent axes, Mode × Provider (Strategy pattern).** A *mode* describes the task (its prompt, output key and reply parsing). A *provider* knows how to run a model. They meet through one interface, `provider.run(mode, doc)`, so neither knows the other's internals.
- **Dependency injection.** `createProcessor({ provider, cache, concurrency, logger })` takes its collaborators as parameters, so tests pass in fakes without any mocking framework.
- **Created once per cold start.** The provider, the trained model and the cache live in module scope. Warm invocations pay nothing for setup.
- **Fail-fast vs. fail-soft.** Configuration errors (unknown provider, missing key, unknown mode) throw immediately, because they mean the whole request is wrong. Problems with individual items never throw; they become `{ id, error }`.
- **Output order = input order**, even with concurrent processing.

---

## Cost awareness

| Technique | Where | Effect |
| --- | --- | --- |
| **Local model by default** | `providers/local.js` | Offline, deterministic, $0 per request, about 3 ms per batch |
| **Validate before calling the model** | `core/input.js` | Empty or invalid items never reach the paid API |
| **Dedup + cache** (SHA-1 of provider + mode + text) | `core/cache.js` | Identical emails in a batch or across warm invocations cost one call; concurrent duplicates share one in-flight request |
| **Input trimming** (`MAX_INPUT_CHARS=2000`) | `providers/llm.js` | Caps input tokens for long emails and threads |
| **Hard output caps** (`maxTokens` 20 / 80) | `modes/*.js` | Caps output tokens, the most expensive part |
| **Compact output format** (comma-separated topics, not JSON) | `modes/classify.js` | Fewer output tokens; tolerant parser, so no costly "fix your JSON" retries |
| **Cheapest model tier by default** | `providers/*.js` | Haiku / mini models are enough for short emails; override with `MODEL_NAME` |
| **`temperature: 0`** | `providers/*.js` | Deterministic replies, which makes caching valid |
| **Retry only transient errors** (429/5xx/timeouts) with backoff | `core/http.js` | A bad key (401) or bad request (400) is never retried |
| **Bounded concurrency** (`CONCURRENCY=5`) | `core/pool.js` | Stays under rate limits, so fewer 429 retries |
| **arm64 Lambda, 256 MB** | `template.yaml` | Graviton is about 20% cheaper per GB-second |

Next steps for higher volumes:

- **Hybrid routing**: run the local model first and call the LLM only when its confidence is low.
- **Batch APIs** (Anthropic Message Batches / OpenAI Batch): about 50% cheaper for offline jobs.
- **Prompt caching** once system prompts grow (few-shot examples).
- **Persistent cache** (DynamoDB with TTL) shared across containers.

---

## Extending

**Add a mode** (e.g. `sentiment`): create `app/modes/sentiment.js` and register it in `app/modes/index.js`.

```js
export const sentiment = {
  name: 'sentiment',
  outputKey: 'sentiment',
  prompt: { system: 'Reply with one word: positive, neutral or negative.', maxTokens: 3 },
  parse: (raw) => raw.trim().toLowerCase(),
};
```

All LLM providers support the new mode right away. For the local provider, add one entry to `tasks` in `providers/local.js`.

**Add a provider** (e.g. AWS Bedrock, Gemini, a local ONNX model): create `app/providers/<name>.js` that returns `{ name, run(mode, doc) }`. For an HTTP LLM, wrap a `complete({ system, text, maxTokens })` function with `createLlmProvider`, which is about 15 lines. Then register it in `app/providers/index.js`.

**Improve the local classifier**: add labelled examples to `app/models/local/training.js`. **Add a topic**: add it to `app/topics.js` and add training examples for it.

---

## Lambda usage and deployment

Handler: `app/handler.handler`. Event shape:

```json
{ "mode": "classify", "items": [{ "id": 1, "subject": "...", "body": "..." }] }
```

A bare array is also accepted; the mode then comes from `DEFAULT_MODE`.

Deploy with AWS SAM:

```bash
sam build && sam deploy --guided            # ModelProvider=local by default
sam local invoke EmailTriageFunction -e sample/event.json  # local invocation in a Lambda container
```

Or zip it manually: `npm run package`, then upload `function.zip` (Node.js 22.x runtime, handler `app/handler.handler`).
For LLM providers, keep the API key in **AWS Secrets Manager / SSM Parameter Store** and pass it as an environment variable. Never commit it.

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `MODEL_PROVIDER` | `local` | `local`, `anthropic` or `openai` |
| `MODEL_NAME` | provider default | Model override |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | none | Needed only for that provider |
| `DEFAULT_MODE` | `classify` | Used when the event has no `mode` |
| `CONCURRENCY` | `5` | Max parallel model calls |
| `MAX_INPUT_CHARS` | `2000` | Input trim for LLM calls |
| `REQUEST_TIMEOUT_MS` | `10000` | Per-request timeout |
| `MAX_RETRIES` | `2` | Retries for transient errors |
| `CACHE_SIZE` | `1000` | In-memory cache entries |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARN` or `ERROR` |

---

## Testing

```bash
npm test
```

The suite uses the built-in `node:test` runner (18 tests, about 1 s, no network):

- `core.test.js`: input validation, the concurrency limit and output order, cache dedup and not caching failures, per-item error isolation.
- `modes.test.js`: parsing of LLM replies (unknown topics, order, fallback).
- `local-model.test.js`: expected topics for every sample email, summary length and sentence-count limits.
- `providers.test.js`: Anthropic and OpenAI with a **mocked `fetch`**: request shape, input trimming, retry on 429, no retry on 401, missing-key errors.
- `handler.test.js`: end-to-end runs of both modes, bare-array events, invalid events.

---

## Trade-offs and limitations

- The local model is intentionally small and transparent. It works well for clear-cut business emails. For nuanced or multilingual text, switch to an LLM provider (one env var) or plug in a transformer model, for example with ONNX via `transformers.js`, as a new provider.
- The local summarizer is **extractive**: it picks real sentences from the email. LLM providers produce **abstractive** summaries.
- The in-memory cache is per container. Use DynamoDB/Redis for a cache shared across containers.
