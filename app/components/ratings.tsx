"use client";
export default function Ratings({
  disabled,
  onRate,
  value,
}: {
  disabled: boolean;
  onRate: (n: number) => void;
  value?: number | null;
}) {
  return (
    <fieldset className="rating-field" disabled={disabled}>
      <legend>How funny was that?</legend>
      <div className="rating-buttons">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            aria-label={`${n} out of 5`}
            aria-pressed={value === n}
            key={n}
            onClick={() => onRate(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="rating-scale">
        <span>A polite smile</span>
        <span>Actually laughed</span>
      </div>
    </fieldset>
  );
}
