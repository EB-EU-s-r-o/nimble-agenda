import logoIcon from "@/assets/logo-icon.webp";

interface LogoIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

export function LogoIcon({ className = "", size = "md" }: LogoIconProps) {
  return (
    <img
      src={logoIcon}
      alt="PAPI HAIR DESIGN"
      className={`${sizeMap[size]} rounded-full object-cover ${className}`}
    />
  );
}
