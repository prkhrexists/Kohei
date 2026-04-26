"""Gemini AI explainer for bias findings and remediation strategies."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import firebase_admin
from firebase_admin import firestore

import google.generativeai as genai


logger = logging.getLogger("kohei.gemini_explainer")
logger.setLevel(logging.INFO)


MAX_RETRIES = 3
RPM_LIMIT = 15
RATE_LIMIT_SECONDS = int(60 / RPM_LIMIT)


def _hash_cache_key(finding: Dict[str, Any]) -> str:
    finding_type = finding.get("attribute", "unknown")
    air_score = finding.get("air_score", 0)
    air_bucket = round(float(air_score) / 0.05) * 0.05
    features = ",".join(sorted([str(x) for x in finding.get("top_features", [])]))
    key_raw = f"{finding_type}|{air_bucket}|{features}"
    return hashlib.sha256(key_raw.encode("utf-8")).hexdigest()


def _validate_response(payload: Dict[str, Any], required_keys: List[str]) -> None:
    missing = [key for key in required_keys if key not in payload]
    if missing:
        raise ValueError(f"Missing keys in Gemini response: {missing}")


def _fallback_explanation(finding: Dict[str, Any]) -> Dict[str, Any]:
    air = finding.get("air_score", "unknown")
    attribute = finding.get("attribute", "attribute")
    affected = finding.get("affected_count", "many")

    severity = "HIGH" if air != "unknown" and air < 0.8 else "MEDIUM"
    urgency = "IMMEDIATE" if severity == "HIGH" else "30_DAYS"

    return {
        "headline": f"Potential bias detected for {attribute} applicants",
        "what_it_means": (
            "Applicants with similar financial profiles received different outcomes "
            "based on a protected attribute. This pattern indicates potential "
            "fair-lending risk that requires remediation."
        ),
        "why_it_matters": (
            "Regulators can interpret adverse impact as discriminatory effect. "
            "This can trigger enforcement under ECOA and Fair Housing Act with penalties."
        ),
        "root_cause": "Likely proxy variables or biased training data distribution.",
        "recommended_fix": (
            "Audit proxy features, adjust model constraints, and re-train on balanced data."
        ),
        "severity": severity,
        "urgency": urgency,
        "regulatory_citations": ["ECOA (Regulation B)", "Fair Housing Act"],
    }


@dataclass
class GeminiExplainer:
    api_key: str

    def __post_init__(self) -> None:
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")
        self.db = firestore.client()
        self._last_call_time = 0.0

    async def explain_finding(self, finding: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        cache_key = _hash_cache_key(finding)
        cached = self._get_cached_response(cache_key)
        if cached:
            return cached

        prompt = self._construct_prompt(finding)
        required_keys = [
            "headline",
            "what_it_means",
            "why_it_matters",
            "root_cause",
            "recommended_fix",
            "severity",
            "urgency",
        ]

        for attempt in range(MAX_RETRIES):
            try:
                await self._rate_limit()
                response = await self._generate_text(prompt)
                payload = json.loads(response)
                _validate_response(payload, required_keys)
                payload["regulatory_citations"] = self._regulatory_citations(context)
                self._cache_response(cache_key, payload)
                return payload
            except Exception as exc:
                logger.warning("Gemini explain attempt %s failed: %s", attempt + 1, exc)
                await asyncio.sleep(2 ** attempt)

        fallback = _fallback_explanation(finding)
        self._cache_response(cache_key, fallback)
        return fallback

    async def generate_fix_strategy(
        self,
        validated_findings: List[Dict[str, Any]],
        bank_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        prompt = self._construct_strategy_prompt(validated_findings, bank_profile)
        required_keys = [
            "executive_summary",
            "quick_wins",
            "medium_term",
            "long_term",
            "projected_air_improvements",
            "implementation_roadmap",
            "monitoring_plan",
        ]

        for attempt in range(MAX_RETRIES):
            try:
                await self._rate_limit()
                response = await self._generate_text(prompt)
                payload = json.loads(response)
                _validate_response(payload, required_keys)
                return payload
            except Exception as exc:
                logger.warning("Gemini strategy attempt %s failed: %s", attempt + 1, exc)
                await asyncio.sleep(2 ** attempt)

        return {
            "executive_summary": "Remediation strategy could not be generated. Use manual review.",
            "quick_wins": [],
            "medium_term": [],
            "long_term": [],
            "projected_air_improvements": {},
            "implementation_roadmap": {},
            "monitoring_plan": {},
        }

    def _construct_prompt(self, finding: Dict[str, Any]) -> str:
        system = (
            "You are a regulatory compliance expert specializing in fair lending law "
            "(ECOA, Fair Housing Act, EU AI Act). You explain AI bias findings to bank "
            "compliance officers in clear, non-technical language. Always cite specific "
            "regulations and penalty exposure. Always provide actionable, specific fixes."
        )

        user = f"""
        A bank's loan approval AI has this bias finding:
        - Protected attribute: {finding.get('attribute')}
        - Adverse Impact Ratio: {finding.get('air_score')} (threshold: 0.8)
        - Twin divergence: {finding.get('twin_divergence_rate')}% of financially identical pairs had different outcomes
        - Top contributing features: {finding.get('top_features')}
        - Affected applicants: ~{finding.get('affected_count')}

        Respond with JSON matching this exact schema:
        {{
            "headline": "one sentence summary (max 15 words)",
            "what_it_means": "2-3 sentences for non-technical compliance officer",
            "why_it_matters": "regulation violated + penalty exposure",
            "root_cause": "technical cause (proxy variable | training data bias | feedback loop)",
            "recommended_fix": "specific, actionable remediation",
            "severity": "HIGH | MEDIUM | LOW",
            "urgency": "IMMEDIATE | 30_DAYS | 90_DAYS"
        }}
        """
        return system + "\n\n" + user

    def _construct_strategy_prompt(
        self,
        findings: List[Dict[str, Any]],
        bank_profile: Dict[str, Any],
    ) -> str:
        system = (
            "You are a regulatory compliance advisor designing remediation programs for fair lending. "
            "Provide actionable steps with timelines and expected impact."
        )
        user = f"""
        Bank profile: {json.dumps(bank_profile)}
        Bias findings: {json.dumps(findings)}

        Respond with JSON matching this exact schema:
        {{
            "executive_summary": "...",
            "quick_wins": [{{"action": "...", "timeline": "...", "impact": "..."}}],
            "medium_term": [{{"action": "...", "timeline": "...", "impact": "..."}}],
            "long_term": [{{"action": "...", "timeline": "...", "impact": "..."}}],
            "projected_air_improvements": {{"attribute": "delta"}},
            "implementation_roadmap": {{"milestones": []}},
            "monitoring_plan": {{"cadence": "...", "metrics": []}}
        }}
        """
        return system + "\n\n" + user

    async def _generate_text(self, prompt: str) -> str:
        response = await asyncio.to_thread(self.model.generate_content, prompt)
        return response.text

    async def _rate_limit(self) -> None:
        now = time.time()
        elapsed = now - self._last_call_time
        if elapsed < RATE_LIMIT_SECONDS:
            await asyncio.sleep(RATE_LIMIT_SECONDS - elapsed)
        self._last_call_time = time.time()

    def _get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        doc = self.db.collection("gemini_cache").document(cache_key).get()
        if doc.exists:
            return doc.to_dict().get("payload")
        return None

    def _cache_response(self, cache_key: str, payload: Dict[str, Any]) -> None:
        self.db.collection("gemini_cache").document(cache_key).set({
            "payload": payload,
            "created_at": firestore.SERVER_TIMESTAMP,
        })

    def _regulatory_citations(self, context: Dict[str, Any]) -> List[str]:
        citations = ["ECOA (Regulation B)", "Fair Housing Act"]
        if context.get("industry"):
            citations.append("EU AI Act (high-risk AI systems)")
        return citations
