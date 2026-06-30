"""Evaluation metrics for Artha RAG quality."""

from __future__ import annotations

import statistics
from collections.abc import Sequence


def compute_context_recall(
    returned_sources: list[dict],
    expected_docs: list[str],
) -> float:
    """Proportion of expected source docs that appear in returned sources.

    Args:
        returned_sources: List of source dicts with 'filename' keys.
        expected_docs: List of expected document filenames.

    Returns:
        Float between 0.0 and 1.0.
    """
    if not expected_docs:
        return 1.0  # No expected docs = no recall requirement

    returned_filenames = {s.get("filename", "") for s in returned_sources}
    matched = sum(1 for doc in expected_docs if doc in returned_filenames)
    return matched / len(expected_docs)


def compute_faithfulness(answer_text: str, sources: list[dict]) -> float:
    """Estimate faithfulness via keyword overlap with source content.

    Uses a simple heuristic: extract keywords from the answer and check
    what proportion appear in the concatenated source texts.

    Args:
        answer_text: The generated answer.
        sources: List of source dicts with 'content' keys.

    Returns:
        Float between 0.0 and 1.0.
    """
    if not answer_text or not sources:
        return 0.0

    source_text = " ".join(s.get("content", "") for s in sources).lower()
    # Extract noun-phrase-like keywords from answer (words 4+ chars, not stop words)
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
        "been", "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "shall", "can", "need",
        "this", "that", "these", "those", "it", "its", "they", "them", "their",
        "not", "no", "nor", "so", "if", "than", "then", "also", "very", "just",
    }
    words = [w for w in answer_text.lower().split() if len(w) >= 4 and w not in stop_words]
    unique_keywords = set(words)

    if not unique_keywords:
        return 1.0

    supported = sum(1 for kw in unique_keywords if kw in source_text)
    return supported / len(unique_keywords)


def _lcs_length(x: str, y: str) -> int:
    """Compute Longest Common Subsequence length."""
    m, n = len(x), len(y)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if x[i - 1] == y[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]


def compute_rouge_l_f1(response: str, reference: str) -> float:
    """Compute ROUGE-L F1 score between response and reference.

    Self-contained implementation using LCS (no external dependencies).

    Args:
        response: The generated answer text.
        reference: The reference answer text.

    Returns:
        Float between 0.0 and 1.0.
    """
    if not response or not reference:
        return 0.0

    resp_words = response.lower().split()
    ref_words = reference.lower().split()

    lcs = _lcs_length(resp_words, ref_words)
    if lcs == 0:
        return 0.0

    precision = lcs / len(resp_words)
    recall = lcs / len(ref_words)

    if precision + recall == 0:
        return 0.0

    return 2 * precision * recall / (precision + recall)


def compute_latency_stats(latencies: Sequence[float]) -> dict[str, float]:
    """Compute latency statistics from a list of durations in seconds.

    Args:
        latencies: List of duration values in seconds.

    Returns:
        Dict with p50, p95, mean, min, max keys.
    """
    if not latencies:
        return {"p50": 0.0, "p95": 0.0, "mean": 0.0, "min": 0.0, "max": 0.0}

    sorted_lats = sorted(latencies)
    n = len(sorted_lats)

    def percentile(p: float) -> float:
        idx = max(0, min(n - 1, int(n * p / 100)))
        return sorted_lats[idx]

    return {
        "p50": percentile(50),
        "p95": percentile(95),
        "mean": statistics.mean(sorted_lats),
        "min": sorted_lats[0],
        "max": sorted_lats[-1],
    }


def compute_quality_gate_rate(results: list[dict]) -> dict[str, float]:
    """Compute quality gate pass/fail statistics.

    Args:
        results: List of result dicts with 'quality_gate_passed' key.

    Returns:
        Dict with pass_rate, fail_rate, total keys.
    """
    if not results:
        return {"pass_rate": 0.0, "fail_rate": 0.0, "total": 0}

    passed = sum(1 for r in results if r.get("quality_gate_passed", False))
    total = len(results)
    return {
        "pass_rate": passed / total,
        "fail_rate": 1.0 - (passed / total),
        "total": total,
    }


def compute_unanswerable_correct_rate(results: list[dict]) -> dict[str, float]:
    """Compute rate at which unanswerable queries correctly decline to answer.

    Args:
        results: List of result dicts with 'response' and 'category' keys.

    Returns:
        Dict with correct_rate, total_unanswerable keys.
    """
    unanswerable = [r for r in results if r.get("category") == "unanswerable"]
    if not unanswerable:
        return {"correct_rate": 1.0, "total_unanswerable": 0}

    decline_phrases = [
        "i don't know",
        "i don't have",
        "cannot",
        "not available",
        "not present",
        "do not contain",
        "no information",
    ]
    correct = 0
    for r in unanswerable:
        response_text = (r.get("response") or "").lower()
        if any(phrase in response_text for phrase in decline_phrases):
            correct += 1

    return {
        "correct_rate": correct / len(unanswerable),
        "total_unanswerable": len(unanswerable),
    }


def compute_summary_metrics(all_results: list[dict]) -> dict:
    """Compute all evaluation metrics across results.

    Args:
        all_results: List of per-question result dicts.

    Returns:
        Dict with all metrics.
    """
    if not all_results:
        return {"error": "no results"}

    latencies = [
        r.get("latency_seconds", 0.0)
        for r in all_results
        if r.get("latency_seconds") is not None
    ]

    context_recalls = [
        compute_context_recall(
            r.get("sources", []),
            r.get("expected_docs", []),
        )
        for r in all_results
    ]

    faithfulness_scores = [
        compute_faithfulness(
            r.get("response", ""),
            r.get("sources", []),
        )
        for r in all_results
    ]

    rouge_scores = [
        compute_rouge_l_f1(
            r.get("response", ""),
            r.get("reference_answer", ""),
        )
        for r in all_results
        if r.get("reference_answer")
    ]

    return {
        "context_recall_mean": statistics.mean(context_recalls) if context_recalls else 0.0,
        "faithfulness_mean": statistics.mean(faithfulness_scores) if faithfulness_scores else 0.0,
        "rouge_l_f1_mean": statistics.mean(rouge_scores) if rouge_scores else 0.0,
        "latency": compute_latency_stats(latencies),
        "quality_gate": compute_quality_gate_rate(all_results),
        "unanswerable": compute_unanswerable_correct_rate(all_results),
        "total_queries": len(all_results),
    }
