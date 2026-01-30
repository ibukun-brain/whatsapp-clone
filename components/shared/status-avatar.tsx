import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface StatusAvatarProps {
  src?: string;
  fallback: string;
  unreadCount?: number;
  className?: string;
}

export const StatusAvatar = ({
  src,
  fallback,
  unreadCount = 0,
  className,
}: StatusAvatarProps) => {
  // If unreadCount is 0, we just show a normal avatar or maybe a gray border?
  // Usually WhatsApp shows a gray border if viewed, but dashed green if new.
  // The user specifically asked for the "dashed green border" based on unreadStatusCount.

  // Radius for the status circle
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  // If we want segments matching the count:
  // Each segment length = (circumference - (count * gap)) / count
  const gap = 5;
  const segmentLength =
    unreadCount > 0 ? (circumference - unreadCount * gap) / unreadCount : 0;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center w-[52px] h-[52px]",
        className,
      )}
    >
      {unreadCount > 0 && (
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeDasharray={
              unreadCount === 1 ? circumference : `${segmentLength} ${gap}`
            }
            strokeLinecap="round"
            className="text-accent-primary"
          />
        </svg>
      )}
      <Avatar
        className={cn(
          "h-[42px] w-[42px]",
          unreadCount > 0 ? "scale-100" : "scale-[1.1]",
        )}
      >
        <AvatarImage src={src} className="object-cover" />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    </div>
  );
};
