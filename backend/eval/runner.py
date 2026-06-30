"""CLI runner for the Artha RAG evaluation suite.

Usage:
    uv run python -m eval.runner --dry-run
    uv run python -m eval.runner --verbose
    uv run python -m eval.runner --api-url http://localhost:8000 --output results.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-8s %(message)s",
)
logger = logging.getLogger("eval.runner")

_HERE = Path(__file__).resolve().parent
_DEFAULT_DATASET = _HERE / "arthur_eval_dataset.json"
_DEFAULT_OUTPUT = _HERE / "last_run_report.json"

# Add backend/ to sys.path so we can import eval.metrics
sys.path.insert(0, str(_HERE.parent))

from eval.metrics import (  # noqa: E402
    compute_context_recall,
    compute_faithfulness,
    compute_latency_stats,
    compute_quality_gate_rate,
    compute_rouge_l_f1,
    compute_summary_metrics,
    compute_unanswerable_correct_rate,
)


def load_dataset(path: str | Path) -> list[dict]:
    """Load the eval dataset from a JSON file."""
    path = Path(path)
    if not path.exists():
        logger.error("Dataset not found: %s", path)
        sys.exit(1)
    with open(path) as f:
        data = json.load(f)
    required_fields = {"id", "category", "question", "reference_answer"}
    for i, entry in enumerate(data):
        missing = required_fields - set(entry.keys())
        if missing:
            logger.warning("Entry %d (%s) missing fields: %s", i, entry.get("id"), missing)
    logger.info("Dataset loaded: %d entries from %s", len(data), path)
    return data


async def query_api(
    api_url: str,
    question: str,
    session,
) -> dict:
    """Send a single question to the Artha API and return the result."""
    import httpx
    payload = {
        "model": "qwen2.5:7b",
        "messages": [{"role": "user", "content": question}],
        "stream": False,
    }
    start = time.monotonic()
    try:
        resp = await session.post(
            f"{api_url.rstrip('/')}/api/chat/completions",
            json=payload,
            timeout=60.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as exc:
        return {
            "error": f"HTTP {exc.response.status_code}: {exc.response.text[:200]}",
            "latency_seconds": time.monotonic() - start,
        }
    except (httpx.RequestError, httpx.TimeoutException) as exc:
        return {
            "error": f"Request failed: {exc}",
            "latency_seconds": time.monotonic() - start,
        }
    elapsed = time.monotonic() - start
    response_text = ""
    try:
        response_text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        response_text = data.get("response", json.dumps(data))
    sources = data.get("sources", data.get("docs", []))
    return {
        "response": response_text,
        "sources": sources if isinstance(sources, list) else [],
        "latency_seconds": elapsed,
        "quality_gate_passed": data.get("quality_gate_passed", True),
        "raw": data,
    }


async def run_eval(
    dataset: list[dict],
    api_url: str,
    verbose: bool = False,
) -> list[dict]:
    """Run all eval questions against the API and collect results."""
    import httpx
    async with httpx.AsyncClient(timeout=60.0) as session:
        results: list[dict] = []
        for i, entry in enumerate(dataset):
            question = entry.get("question", "").strip()
            entry_id = entry.get("id", f"q-{i}")
            category = entry.get("category", "unknown")
            if verbose:
                logger.info(
                    "[%d/%d] %s (%s) — %s", i + 1, len(dataset), entry_id, category, question[:60]
                )
            if not question:
                results.append({
                    "id": entry_id, "category": category,
                    "difficulty": entry.get("difficulty"),
                    "question": question, "response": "",
                    "reference_answer": entry.get("reference_answer", ""),
                    "sources": [], "expected_docs": entry.get("source_docs", []),
                    "latency_seconds": 0.0, "quality_gate_passed": True,
                    "error": "empty question",
                    "context_recall": 1.0, "faithfulness": 1.0, "rouge_l_f1": 0.0,
                })
                continue
            api_result = await query_api(api_url, question, session)
            if "error" in api_result:
                result_entry = {
                    "id": entry_id, "category": category,
                    "difficulty": entry.get("difficulty"),
                    "question": question, "response": "",
                    "reference_answer": entry.get("reference_answer", ""),
                    "sources": [], "expected_docs": entry.get("source_docs", []),
                    "latency_seconds": api_result.get("latency_seconds", 0.0),
                    "quality_gate_passed": False, "error": api_result["error"],
                    "context_recall": 0.0, "faithfulness": 0.0, "rouge_l_f1": 0.0,
                }
            else:
                response_text = api_result.get("response", "")
                sources = api_result.get("sources", [])
                expected_docs = entry.get("source_docs", [])
                reference = entry.get("reference_answer", "")
                result_entry = {
                    "id": entry_id, "category": category,
                    "difficulty": entry.get("difficulty"),
                    "question": question, "response": response_text,
                    "reference_answer": reference,
                    "sources": sources, "expected_docs": expected_docs,
                    "latency_seconds": api_result.get("latency_seconds", 0.0),
                    "quality_gate_passed": api_result.get("quality_gate_passed", True),
                    "context_recall": compute_context_recall(sources, expected_docs),
                    "faithfulness": compute_faithfulness(response_text, sources),
                    "rouge_l_f1": compute_rouge_l_f1(response_text, reference),
                }
            results.append(result_entry)
    return results


def print_summary(results: list[dict]) -> None:
    """Print a human-readable summary of eval results."""
    total = len(results)
    errors = sum(1 for r in results if r.get("error"))
    latencies = [r["latency_seconds"] for r in results if r.get("latency_seconds") is not None]
    latency_stats = compute_latency_stats(latencies)
    summary = compute_summary_metrics(results)
    unanswerable = compute_unanswerable_correct_rate(results)
    quality = compute_quality_gate_rate(results)
    print()
    print("=" * 60)
    print("  ARTHA EVAL SUMMARY")
    print("=" * 60)
    print(f"  Total queries:      {total}")
    print(f"  Errors:             {errors}")
    print()
    print("  Quality Metrics:")
    print(f"    Context Recall:   {summary.get('context_recall_mean', 0):.3f}")
    print(f"    Faithfulness:     {summary.get('faithfulness_mean', 0):.3f}")
    print(f"    ROUGE-L F1:       {summary.get('rouge_l_f1_mean', 0):.3f}")
    print()
    print("  Latency (seconds):")
    print(f"    p50:   {latency_stats.get('p50', 0):.2f}")
    print(f"    p95:   {latency_stats.get('p95', 0):.2f}")
    print(f"    mean:  {latency_stats.get('mean', 0):.2f}")
    print(f"    min:   {latency_stats.get('min', 0):.2f}")
    print(f"    max:   {latency_stats.get('max', 0):.2f}")
    print()
    print("  Quality Gate:")
    print(f"    Pass rate:  {quality.get('pass_rate', 0)*100:.1f}%")
    print()
    print("  Unanswerable:")
    print(f"    Correct decline: {unanswerable.get('correct_rate', 0)*100:.1f}%")
    print(f"    Total:           {unanswerable.get('total_unanswerable', 0)}")
    print("=" * 60)


def print_dry_run_stats(dataset: list[dict]) -> None:
    """Print dataset statistics in dry-run mode."""
    categories: dict[str, int] = {}
    difficulties: dict[str, int] = {}
    empty_questions = 0
    for entry in dataset:
        cat = entry.get("category", "unknown")
        categories[cat] = categories.get(cat, 0) + 1
        diff = entry.get("difficulty", "unknown")
        difficulties[diff] = difficulties.get(diff, 0) + 1
        if not entry.get("question", "").strip():
            empty_questions += 1
    print()
    print("=" * 60)
    print("  DATASET VALIDATION")
    print("=" * 60)
    print(f"  Total entries:     {len(dataset)}")
    print(f"  Empty questions:   {empty_questions}")
    print()
    print("  Categories:")
    for cat, count in sorted(categories.items()):
        print(f"    {cat}: {count}")
    print()
    print("  Difficulty:")
    for diff, count in sorted(difficulties.items()):
        print(f"    {diff}: {count}")
    print("=" * 60)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Artha RAG Evaluation Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python -m eval.runner --dry-run\n"
            "  python -m eval.runner --verbose\n"
            "  python -m eval.runner --api-url http://localhost:8000\n"
        ),
    )
    parser.add_argument("--api-url", default=os.environ.get("ARTHA_API_URL", "http://localhost:8000"),
                        help="Artha API base URL (default: http://localhost:8000)")
    parser.add_argument("--dataset", default=str(_DEFAULT_DATASET),
                        help=f"Dataset path (default: {_DEFAULT_DATASET})")
    parser.add_argument("--output", default=str(_DEFAULT_OUTPUT),
                        help=f"Output path (default: {_DEFAULT_OUTPUT})")
    parser.add_argument("--dry-run", action="store_true", help="Validate dataset and exit")
    parser.add_argument("--verbose", action="store_true", help="Per-question progress")
    return parser.parse_args(argv)


async def main() -> None:
    args = parse_args()
    dataset = load_dataset(args.dataset)
    if args.dry_run:
        print_dry_run_stats(dataset)
        return
    logger.info("Starting eval against %s ...", args.api_url)
    results = await run_eval(dataset, args.api_url, verbose=args.verbose)
    summary = compute_summary_metrics(results)
    report = {
        "metadata": {
            "dataset": args.dataset, "api_url": args.api_url, "total_queries": len(results)
        },
        "aggregate": summary,
        "results": results,
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    logger.info("Report written to %s", output_path)
    print_summary(results)


if __name__ == "__main__":
    asyncio.run(main())
