# Artha Eval — RAG Quality Evaluation Framework

A self-contained evaluation framework for measuring Artha's RAG pipeline quality. No external eval services required — everything runs locally.

## Quick Start

```bash
# Validate the dataset (no API needed)
cd backend
uv run python -m eval.runner --dry-run

# Run a full eval against a running Artha instance
uv run python -m eval.runner --verbose

# Run against a specific API endpoint
uv run python -m eval.runner --api-url http://localhost:8000 --output /tmp/results.json
```

## Dataset

The dataset (`arthur_eval_dataset.json`) contains **50 labeled QA pairs** across 8 categories:

| Category | Count | Description |
|----------|-------|-------------|
| `direct_lookup` | 14 | Simple factual lookups from a single document |
| `synthesis` | 9 | Multi-document or multi-chunk synthesis questions |
| `comparison` | 4 | Compare-and-contrast across documents |
| `multi_document` | 3 | Questions requiring evidence from 2+ documents |
| `unanswerable` | 5 | Queries that cannot be answered from available docs |
| `code_technical` | 3 | API and technical documentation lookups |
| `paraphrase` | 6 | Rephrased versions of other questions |
| `edge_case` | 6 | Empty queries, typos, non-English, single-word inputs |

Each entry has: `id`, `category`, `difficulty` (easy/medium/hard), `question`, `reference_answer`, `source_docs`, `key_facts`, and optional `notes`.

## Metrics

All metrics are implemented in `metrics.py` with zero external dependencies (ROUGE-L computed from scratch).

### Context Recall
- **What**: Proportion of expected source documents that appear in the returned sources
- **Range**: 0.0–1.0
- **Target**: > 0.80
- **Calculation**: If 3 docs are expected and 2 match, recall = 0.67

### Faithfulness
- **What**: Keyword overlap between the generated answer and the source texts
- **Range**: 0.0–1.0
- **Target**: > 0.85
- **Calculation**: Extracts words >= 4 chars (excluding stop words) from the answer, measures what proportion appear in the source text

### ROUGE-L F1
- **What**: Longest Common Subsequence (LCS) based similarity between response and reference
- **Range**: 0.0–1.0
- **Target**: > 0.40 (lower bound; higher is better for factual answers)
- **Calculation**: F1 = 2 * P * R / (P + R) where P = LCS/response_length, R = LCS/reference_length

### Latency
- **What**: End-to-end time from API request to response
- **Metrics**: p50, p95, mean, min, max (seconds)
- **Target**: p50 < 10s, p95 < 20s

### Quality Gate Rate
- **What**: Percentage of queries where the cross-encoder reranker score passed the threshold
- **Target**: > 70% pass rate
- **Note**: Low pass rate may indicate the reranker threshold (0.05) needs calibration

### Unanswerable Correct Rate
- **What**: Percentage of intentionally unanswerable questions where the model correctly declines
- **Target**: 1.0 (100%)
- **Calculation**: Response checked for decline phrases like "I don't know", "cannot", "not available"

## CLI Reference

```
usage: python -m eval.runner [--api-url URL] [--dataset PATH]
                             [--output PATH] [--dry-run] [--verbose]

Arguments:
  --api-url   Artha API base URL (default: http://localhost:8000)
  --dataset   Path to dataset JSON (default: backend/eval/arthur_eval_dataset.json)
  --output    Output report path (default: backend/eval/last_run_report.json)
  --dry-run   Load and validate dataset, print stats, exit
  --verbose   Print per-question progress
```

## Interpreting Results

A healthy eval run should show:

```
  Context Recall:     0.850+
  Faithfulness:       0.900+
  ROUGE-L F1:         0.450+
  Latency p50:        < 10s
  Quality Gate:       > 70%
  Unanswerable:       100%
```

If scores are low:

1. **Low context recall** → retrieval is missing relevant documents. Check chunking strategy, embedding model, or reranker threshold.
2. **Low faithfulness** → model is hallucinating or extrapolating beyond retrieved context. Tighten the system prompt.
3. **Low ROUGE-L** → the response differs from the reference. May indicate correct but differently phrased answers (review manually).
4. **High latency** → model inference is slow. Consider a smaller model or hardware upgrade.
5. **Low quality gate** → cross-encoder confidence is low. Calibrate the threshold or improve retrieval.

## Adding New Test Cases

Add entries to `arthur_eval_dataset.json` following this structure:

```json
{
  "id": "artha-eval-051",
  "category": "direct_lookup",
  "difficulty": "easy",
  "question": "What is the question?",
  "reference_answer": "The expected correct answer.",
  "source_docs": ["source_document.pdf"],
  "key_facts": ["fact 1", "fact 2"],
  "notes": "Any context about this test case"
}
```

For unanswerable questions, set `source_docs` to an empty array and ensure the `reference_answer` contains a polite decline.

## CI Integration

Run the eval as a CI gate:

```bash
uv run python -m eval.runner --output ci_report.json
python3 -c "
import json
with open('ci_report.json') as f:
    r = json.load(f)
m = r['aggregate']
if m.get('context_recall_mean', 0) < 0.8 or m.get('faithfulness_mean', 0) < 0.85:
    exit(1)
"
```

The framework produces machine-readable JSON reports suitable for CI dashboards.
