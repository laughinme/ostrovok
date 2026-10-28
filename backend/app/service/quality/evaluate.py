from functools import partial
from pathlib import Path
from typing import Any

from app.db.database import Database
from app.domain.knowledge.curation import place_terms
from app.domain.partner.rules import RulesAnswerParser
from app.service.ports import Clock, LanguageModel
from app.service.quality.datasets import read_yaml
from app.service.quality.knowledge import knowledge_metrics
from app.service.quality.parsing import EVAL_TODAY, answer_metrics, curator_metrics, intent_metrics
from app.service.quality.reports import QualityReports
from app.service.quality.search import search_metrics
from app.service.search.intents import IntentParser


async def evaluate(
    db: Database, data_dir: Path, clock: Clock, *, llm: LanguageModel | None = None
) -> dict[str, Any]:
    cases = await read_yaml(data_dir / "eval/intents.yaml")
    places = place_terms(await read_yaml(data_dir / "registry/osm_vocabulary.yaml"))
    answers = await answer_metrics(RulesAnswerParser(), data_dir / "eval/hotelier_answers.yaml")
    curator = await curator_metrics(data_dir / "eval/curator.yaml", places)
    async with db.unit_of_work() as uow:
        parser = IntentParser(uow, data_dir)
        rules = await intent_metrics(partial(parser.parse, today=EVAL_TODAY), cases)
        generated_at = clock.now()
        knowledge = await knowledge_metrics(uow, data_dir / "eval/gold.yaml", generated_at)
        search = await search_metrics(uow, data_dir)
    intents = {"rules": rules}
    if llm is not None:
        async with db.unit_of_work() as uow:
            parser = IntentParser(uow, data_dir, llm)
            intents["llm"] = await intent_metrics(
                partial(parser.parse, today=EVAL_TODAY), cases, require_llm=True
            )
    report = {
        "generatedAt": generated_at.isoformat(),
        **knowledge,
        "parseAccuracy": {"rules": answers["fieldAccuracy"]},
        "ndcg10": search["ndcg10"],
        "intents": intents,
        "hotelierAnswers": {"rules": answers},
        "curator": {"rules": curator},
        "search": search,
        "evaluationDate": EVAL_TODAY.isoformat(),
        "llmStatus": "requested" if llm is not None else "не запускался",
    }
    async with db.unit_of_work() as uow:
        await QualityReports(uow).save(report, generated_at)
    return report
