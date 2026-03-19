interface BottomBarProps {
  overlays?: React.ReactNode;
  title?: string;
  subTitle?: string;
  children?: React.ReactNode;
}

function BottomBar({
  overlays,
  title = "Título por defecto",
  children,
}: BottomBarProps) {
  return (
    <div className="w-full bg-bg-100 max-h-51 border-t border-t-border border-s border-s-border flex flex-col">
      <div className="p-2 flex items-center gap-2 justify-between">
        <h3>{title}</h3>
        {overlays}
      </div>
      <div className="flex-1 flex gap-5">{children}</div>
    </div>
  );
}

export default BottomBar;
