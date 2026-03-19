import { memo } from "react";

const LineGradientWhite = memo(function LineGradientWhite({
  top = "-0.05rem",
  height = "0.5rem",
  color = "white",
}: {
  top?: string;
  height?: string;
  color?: string;
}) {
  return (
    <div
      className={`w-2/3  animate-fade-in-left animate-delay-300  absolute left-1/2  -translate-x-1/2 `}
      style={{
        height: height,
        background: `linear-gradient(to left, transparent, ${color}, transparent)`,
        top: top,
      }}
    ></div>
  );
});

export default LineGradientWhite;
