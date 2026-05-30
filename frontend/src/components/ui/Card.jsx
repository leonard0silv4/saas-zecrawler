const variants = {
  default: "bg-white border border-gray-200 shadow-sm",
  elevated: "bg-white border border-gray-100 shadow-md",
  bordered: "bg-white border-2 border-brand-300",
};

export function Card({ variant = "default", className = "", children, onClick }) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      className={[
        "rounded-xl p-6",
        variants[variant] ?? variants.default,
        interactive ? "cursor-pointer hover:shadow-md transition-shadow duration-150" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
