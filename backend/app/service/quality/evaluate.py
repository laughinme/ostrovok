from functools import partial
from pathlib import Path
from typing import Any

from app.db.database import Database
from app.domain.knowledge.curation import place_terms
from app.domain.partner.rules import RulesAnswerParser
from app.service.ports import Clock
from app.service.quality.claims import claims_metrics
from app.service.quality.datasets import read_yaml
from app.service.quality.knowledge import knowledge_metrics
from app.service.quality.parsing import (
    EVAL_TODAY,
    answer_metrics,
    curator_metrics,
    intent_metrics,
    rules_plan,
)
from app.service.quality.reports import QualityReports
from app.service.quality.search import search_metrics
from app.service.search.intents import IntentParser


async def evaluate(
    db: Database, data_dir: Path, clock: Clock, *, llm: dict[str, Any] | None = None
) -> dict[str, Any]:
    cases = await read_yaml(data_dir / "eval/intents.yaml")
    places = place_terms(await read_yaml(data_dir / "registry/osm_vocabulary.yaml"))
    answers = await answer_metrics(RulesAnswerParser(), data_dir / "eval/hotelier_answers.yaml")
    curator = await curator_metrics(data_dir / "eval/curator.yaml", rules_plan(places))
    async with db.unit_of_work() as uow:
        parser = IntentParser(uow, data_dir)
        rules = await intent_metrics(partial(parser.parse, today=EVAL_TODAY), cases)
        generated_at = clock.now()
        knowledge = await knowledge_metrics(uow, data_dir / "eval/gold.yaml", generated_at)
        claims = await claims_metrics(uow, data_dir / "eval/official_claims.yaml", generated_at)
        search = await search_metrics(uow, data_dir)
    intents: dict[str, Any] = {"rules": rules}
    answer_report: dict[str, Any] = {"rules": answers}
    curator_report: dict[str, Any] = {"rules": curator}
    if llm is not None:
        main = llm["sets"]["main"]
        intents["llm"] = main["intents"]["llm"]
        answer_report["llm"] = main["answers"]["llm"]
        curator_report["llm"] = main["curator"]["llm"]
    report = {
        "generatedAt": generated_at.isoformat(),
        **knowledge,
        "parseAccuracy": {"rules": answers["fieldAccuracy"]},
        "ndcg10": search["ndcg10"],
        "intents": intents,
        "hotelierAnswers": answer_report,
        "curator": curator_report,
        "search": search,
        "officialClaims": claims,
        "evaluationDate": EVAL_TODAY.isoformat(),
        "llmStatus": f"{llm['model']} ({llm['thinking']})" if llm else "не запускался",
        "llm": llm,
    }
    async with db.unit_of_work() as uow:
        await QualityReports(uow).save(report, generated_at)
    return report
