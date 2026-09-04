import { Star } from "@phosphor-icons/react";

type Props = {
  rating: number;
  reviews?: number;
  compact?: boolean;
};

export default function RatingStars({
  rating,
  reviews,
  compact = false,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-[1px]">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={compact ? 13 : 15}
            weight={star <= rating ? "fill" : "regular"}
            className={
              star <= rating
                ? "text-[#e7ad00]"
                : "text-ink-300"
            }
          />
        ))}
      </div>

      {reviews !== undefined && (
        <span className="text-xs text-ink-500">
          ({reviews})
        </span>
      )}
    </div>
  );
}