import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type ChartValue =
  | number
  | string
  | readonly (number | string)[]
  | undefined

export type AllocationChartItem = {
  id: string
  label: string
  value: number
  color: string
}

export type PerformanceDatum = {
  symbol: string
  pnl: number
  color: string
}

export type TrendPoint = {
  label: string
  invested: number
  marketValue: number
}

type ValueFormatter = (value: ChartValue) => string

type AllocationChartCardProps = {
  title: string
  description: string
  data: AllocationChartItem[]
  headerRight?: ReactNode
}

type PerformanceChartCardProps = {
  title: string
  description: string
  badge: string
  data: PerformanceDatum[]
  valueFormatter: ValueFormatter
  yAxisTickFormatter?: (value: number) => string
}

type TrendChartCardProps = {
  title: string
  description: string
  data: TrendPoint[]
  valueFormatter: ValueFormatter
}

export function AllocationChartCard({
  title,
  description,
  data,
  headerRight,
}: AllocationChartCardProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        {headerRight}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={72}
              outerRadius={108}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3">
        {data.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-gray-800">{item.label}</span>
            </div>
            <span className="text-sm text-gray-600">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PerformanceChartCard({
  title,
  description,
  badge,
  data,
  valueFormatter,
  yAxisTickFormatter,
}: PerformanceChartCardProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {badge}
        </span>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="symbol" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={yAxisTickFormatter}
            />
            <Tooltip formatter={(value) => valueFormatter(value)} />
            <Bar dataKey="pnl" radius={[10, 10, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.symbol} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function PortfolioTrendChartCard({
  title,
  description,
  data,
  valueFormatter,
}: TrendChartCardProps) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioInvestedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="portfolioValueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            />
            <Tooltip formatter={(value) => valueFormatter(value)} />
            <Area
              type="monotone"
              dataKey="invested"
              stroke="#64748b"
              fill="url(#portfolioInvestedGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="marketValue"
              stroke="#2563eb"
              fill="url(#portfolioValueGradient)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export function HoldingTrendChartCard({
  title,
  description,
  data,
  valueFormatter,
}: TrendChartCardProps) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="selectedHoldingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip formatter={(value) => valueFormatter(value)} />
            <Area
              type="monotone"
              dataKey="marketValue"
              stroke="#2563eb"
              fill="url(#selectedHoldingGradient)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
