type UserAvatarProps = {
  name: string;
  imageUrl?: string | null;
  fallback?: string;
  className?: string;
};

export function getInitials(name: string, fallback = "U") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || fallback
  );
}

export function UserAvatar({
  name,
  imageUrl,
  fallback = "U",
  className = "h-9 w-9",
}: UserAvatarProps) {
  const initials = getInitials(name, fallback);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary ${className}`}
    >
      {imageUrl?.trim() ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}
