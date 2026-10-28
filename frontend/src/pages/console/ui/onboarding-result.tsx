import { Link } from "@tanstack/react-router";
import type { ApiRun } from "@/entities/agent-run";
import type { Schema, RegistryEntry } from "../api/console";
import { computedCharacteristics, confidenceRange, onboardingQuestions } from "../lib/onboarding";

export function OnboardingResult({
  hotel,
  facts,
  registry,
  run,
}: {
  hotel: Schema["HotelOut"];
  facts: Schema["FactOut"][];
  registry: RegistryEntry[];
  run: ApiRun;
}) {
  const computed = computedCharacteristics(registry, facts).filter((row) => row.facts.length > 0);
  const questions = onboardingQuestions(run);
  return (
    <section className="console-onboarding-result" aria-label="Результат изучения">
      <div>
        <h3 className="text-xl">Отель изучен</h3>
        <p className="mt-3 text-sm">
          Рассчитано характеристик: <strong>{computed.length}</strong>. Уверенность:{" "}
          <strong>{confidenceRange(computed.flatMap((row) => row.facts))}</strong>.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Каждый расчёт хранится с источником, датой и областью действия. Уверенность относится к
          расчёту, а не к качеству отеля.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="console-button" to="/hotel/$id" params={{ id: hotel.id }}>
            Открыть отель
          </Link>
          <Link
            className="console-button secondary"
            to="/results"
            search={{ q: "Все отели Сочи" }}
            hash={`hotel-${hotel.id}`}
          >
            Найти в подборе
          </Link>
        </div>
      </div>
      <div>
        <h3 className="font-semibold">Вопросов отельеру: {questions.length}</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Только то, чего нет в открытых данных: условия внутри отеля и связь номеров со сторонами
          здания.
        </p>
        {questions.length > 0 ? (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            {questions.map((question) => (
              <li key={question.id}>
                {question.text}
                <details className="mt-1 text-xs text-muted-foreground">
                  <summary>Почему спрашиваем</summary>
                  <p className="mt-1">{question.why}</p>
                </details>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm">В трассе нет отправленных вопросов.</p>
        )}
      </div>
    </section>
  );
}
