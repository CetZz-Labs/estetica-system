interface Props {
    caption: string;
    firstHeader: string;
    countHeader?: string;
    rows: { label: string; count: number }[];
}

export default function ReportDataTable({ caption, firstHeader, countHeader = 'Turnos', rows }: Props) {
    return (
        <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
                <caption className="sr-only">{caption}</caption>
                <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-text-3">
                        <th scope="col" className="py-2 font-semibold">{firstHeader}</th>
                        <th scope="col" className="py-2 text-right font-semibold">{countHeader}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={`${row.label}-${i}`} className="border-b border-border-soft">
                            <td className="py-2 text-text">{row.label}</td>
                            <td className="py-2 text-right font-semibold text-text">{row.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
