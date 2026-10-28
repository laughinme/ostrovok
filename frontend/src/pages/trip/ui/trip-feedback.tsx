import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  feedbackError,
  feedbackPayload,
  promisedQuestions,
  sendTripFeedback,
  tripsQuery,
  type Trip,
} from "@/features/manage-trips";
import { ApiError } from "@/shared/api";

export function TripFeedback({ trip }: { trip: Trip }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const questions = promisedQuestions(trip.promised);
  const feedback = useMutation({
    mutationFn: () => sendTripFeedback(trip.booking.id, feedbackPayload(trip.promised, answers)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsQuery.queryKey });
    },
  });
  const alreadyAnswered = feedback.error instanceof ApiError && feedback.error.status === 409;
  const eligible = ["confirmed", "completed"].includes(trip.booking.status);
  const disabled = feedback.isPending || feedback.isSuccess || alreadyAnswered || !eligible;
  const complete = questions.some(({ id }) => typeof answers[id] === "boolean");
  return (
    <section>
      <h2 className="h-md">Всё было так, как мы обещали?</h2>
      <p className="muted">
        Оцените факты, которые удалось проверить. Ваш ответ поможет следующим гостям. Отзыв можно
        оставить после выезда.
      </p>
      {!eligible && <p className="trip-notice">Для отзыва нужна подтверждённая поездка.</p>}
      {!questions.length ? (
        <p className="trip-notice">У этой поездки нет обещанных фактов для оценки.</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (complete && !disabled) feedback.mutate();
          }}
        >
          <div className="fb card-w">
            {questions.map(({ id, statement, question, scopeText }) => (
              <div className="fb-row" key={id}>
                <div id={`promise-${id}`}>
                  <b>{question}</b>
                  <span>{statement}</span>
                  <span>{scopeText}</span>
                </div>
                <div
                  className="seg feedback-options"
                  role="group"
                  aria-labelledby={`promise-${id}`}
                >
                  {[true, false].map((answer) => (
                    <label key={String(answer)} className={answers[id] === answer ? "on" : ""}>
                      <input
                        type="radio"
                        name={`fact-${id}`}
                        value={String(answer)}
                        checked={answers[id] === answer}
                        disabled={disabled}
                        onChange={() => {
                          setAnswers((previous) => ({ ...previous, [id]: answer }));
                          feedback.reset();
                        }}
                      />
                      {answer ? "Да" : "Нет"}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="submit" className="trip-action" disabled={!complete || disabled}>
            {feedback.isPending ? "Отправляем…" : "Отправить отзыв"}
          </button>
          {feedback.isSuccess && (
            <p className="thanks" role="status">
              Спасибо! Ваши ответы сохранены.
            </p>
          )}
          {feedback.error && (
            <p className="trip-notice" role="alert">
              {feedbackError(feedback.error)}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
