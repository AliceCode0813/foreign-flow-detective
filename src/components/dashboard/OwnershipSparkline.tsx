/** 60일 외국인 지분율 미니 스파크라인 (SVG) */
export function OwnershipSparkline({
  data,
  width = 80,
  height = 28,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return <span className="text-[11px] text-slate-400">-</span>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const trend = data[data.length - 1] - data[0];
  const stroke = trend >= 0 ? "#10b981" : "#f43f5e";
  const fill = trend >= 0 ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)";

  const areaPoints = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;

  return (
    <svg
      width={width}
      height={height}
      className="inline-block shrink-0"
      aria-hidden
    >
      <title>
        {`60일 지분 ${data[0].toFixed(2)}% → ${data[data.length - 1].toFixed(2)}%`}
      </title>
      <polygon points={areaPoints} fill={fill} />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
