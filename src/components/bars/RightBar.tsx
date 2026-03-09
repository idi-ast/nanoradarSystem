interface RightBarProps {
  overlays?: React.ReactNode;
  title?: string;
  subTitle?: string;
  children?: React.ReactNode;
}

function RightBar({
  overlays,
  title = "Título por defecto",
  subTitle = "Subtítulo por defecto",
  children,
}: RightBarProps) {
  return (
    <div className="animate-slide-in-right w-full bg-bg-200 text-text-100 h-full border-s border-s-border flex flex-col p-1">
      <div className="p-5 bg-bg-100 rounded-xl">
        <h3>{title}</h3>
        <h5>{subTitle}</h5>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {overlays}
        <div className="p-3 flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export default RightBar;
