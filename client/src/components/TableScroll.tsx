interface TableScrollProps {
  children: React.ReactNode;
  hint?: string;
}

export function TableScroll({ children, hint = 'Deslize para ver mais colunas' }: TableScrollProps) {
  return (
    <div className="table-scroll-wrap">
      <p className="table-scroll-hint">{hint}</p>
      <div className="table-scroll">{children}</div>
    </div>
  );
}
