import { cn, getInitials, dicebearUrl } from "../../lib/utils";

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

export function Avatar({ name, photoUrl, size = "md", className }: AvatarProps) {
  const src = photoUrl || dicebearUrl(name);

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden ring-2 ring-white/20 dark:ring-slate-700/50 flex-shrink-0",
        sizes[size],
        className
      )}
    >
      <img
        src={src}
        alt={name}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to initials div on image error
          const target = e.currentTarget;
          const parent = target.parentElement;
          if (parent) {
            parent.style.background =
              "linear-gradient(135deg, #4f46e5, #7c3aed)";
            parent.style.display = "flex";
            parent.style.alignItems = "center";
            parent.style.justifyContent = "center";
            parent.style.color = "white";
            parent.style.fontWeight = "700";
            parent.style.fontFamily = "Inter, sans-serif";
            parent.innerHTML = `<span>${getInitials(name)}</span>`;
          }
        }}
      />
    </div>
  );
}
