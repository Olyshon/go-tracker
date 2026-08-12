import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, SectionTitle } from "./ui-bits";

export function ProductivityChart({ data }: { data: { day: number; value: number }[] }) {
  return (
    <Panel className="min-w-0 p-4">
      <SectionTitle>Прогресс продуктивности</SectionTitle>
      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="oliveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--olive)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--olive)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              interval={1}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
              labelFormatter={(l) => `День ${l}`}
              formatter={(v: number) => [`${v}%`, "Привычки"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--olive)"
              strokeWidth={1.75}
              fill="url(#oliveFill)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function OverallDonut({ percent }: { percent: number }) {
  const data = [
    { name: "done", value: percent },
    { name: "rest", value: 100 - percent },
  ];
  return (
    <Panel className="flex min-w-0 flex-col p-4">
      <SectionTitle>Общий прогресс месяца</SectionTitle>
      <div className="relative h-[150px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="66%"
              outerRadius="88%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill="var(--olive)" />
              <Cell fill="var(--muted)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-3xl font-semibold tabular-nums">{percent}%</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              выполнено
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
