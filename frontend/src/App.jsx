import { useEffect, useMemo, useState } from 'react'

const RANGE_OPTIONS = [
  { value: 14, label: '14 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
]

const METRIC_CONFIG = [
  {
    key: 'weight',
    title: 'Вес',
    accent: '#60a5fa',
    suffix: 'кг',
    description: 'Ежедневная динамика веса.',
  },
  {
    key: 'calories',
    title: 'Калории',
    accent: '#f59e0b',
    suffix: 'ккал',
    description: 'Сколько съедено за день.',
  },
  {
    key: 'protein',
    title: 'Белок',
    accent: '#34d399',
    suffix: 'г',
    description: 'Суммарный белок за день.',
  },
  {
    key: 'fiber',
    title: 'Клетчатка',
    accent: '#f472b6',
    suffix: 'г',
    description: 'Суммарная клетчатка за день.',
  },
]

const emptyDashboard = {
  today: { date: '—', consumed: 0, target: 0, remaining: 0, weight: null, protein: 0, fiber: 0 },
  totals: { date: '—', consumed: 0, target: 0, remaining: 0, weight: null, protein: 0, fiber: 0 },
  range: { from: '', to: '', days: 30 },
  weight: [],
  calories: [],
  protein: [],
  fiber: [],
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function formatShortDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(new Date(value))
}

function MetricCard({ label, value, suffix, accent = false, helper }) {
  return (
    <article className={`metric ${accent ? 'metric--accent' : ''}`}>
      <span className="metric__label">{label}</span>
      <strong className="metric__value">
        {value}
        {suffix ? <span className="metric__suffix"> {suffix}</span> : null}
      </strong>
      {helper ? <span className="metric__helper">{helper}</span> : null}
    </article>
  )
}

function StatPill({ label, value, suffix }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>
        {value}
        {suffix ? <small>{suffix}</small> : null}
      </strong>
    </div>
  )
}

function ChartCard({ title, description, points, color, suffix }) {
  const cleanPoints = points.filter((point) => point.value !== null && point.value !== undefined)
  const chart = useMemo(() => createChartGeometry(cleanPoints), [cleanPoints])

  return (
    <section className="panel chart-card">
      <div className="chart-card__header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <div className="chart-card__meta">
          <span>{cleanPoints.length} точек</span>
          <strong>
            {cleanPoints.length ? `${formatNumber(cleanPoints.at(-1).value, suffix === 'кг' ? 2 : 0)} ${suffix}` : 'нет данных'}
          </strong>
        </div>
      </div>

      {cleanPoints.length ? (
        <>
          <svg viewBox="0 0 640 240" className="chart-svg" role="img" aria-label={`${title} chart`}>
            {chart.gridLines.map((line) => (
              <line
                key={line.y}
                x1="32"
                x2="608"
                y1={line.y}
                y2={line.y}
                className="chart-svg__grid"
              />
            ))}

            <polyline
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chart.linePoints}
            />

            {chart.coordinates.map((point) => (
              <g key={point.label}>
                <circle cx={point.x} cy={point.y} r="5" fill={color} />
              </g>
            ))}
          </svg>

          <div className="chart-axis-labels">
            <span>{formatShortDate(cleanPoints[0]?.date)}</span>
            <span>{formatShortDate(cleanPoints.at(-1)?.date)}</span>
          </div>

          <div className="chart-stats">
            <StatPill label="Мин" value={formatNumber(chart.min, suffix === 'кг' ? 2 : 0)} suffix={suffix} />
            <StatPill label="Среднее" value={formatNumber(chart.avg, suffix === 'кг' ? 2 : 0)} suffix={suffix} />
            <StatPill label="Макс" value={formatNumber(chart.max, suffix === 'кг' ? 2 : 0)} suffix={suffix} />
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>Нет данных для графика.</p>
          <p className="muted">После импорта CSV здесь появится история.</p>
        </div>
      )}
    </section>
  )
}

function createChartGeometry(points) {
  if (!points.length) {
    return { coordinates: [], linePoints: '', min: 0, max: 0, avg: 0, gridLines: [] }
  }

  const width = 576
  const height = 176
  const left = 32
  const top = 24
  const min = Math.min(...points.map((point) => Number(point.value)))
  const max = Math.max(...points.map((point) => Number(point.value)))
  const range = max - min || 1

  const coordinates = points.map((point, index) => {
    const x = left + (index * width) / Math.max(points.length - 1, 1)
    const y = top + height - ((Number(point.value) - min) / range) * height
    return { x, y, label: `${point.date}-${index}` }
  })

  return {
    coordinates,
    linePoints: coordinates.map((point) => `${point.x},${point.y}`).join(' '),
    min,
    max,
    avg: points.reduce((sum, point) => sum + Number(point.value), 0) / points.length,
    gridLines: [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({ y: top + height * ratio })),
  }
}

export default function App() {
  const [days, setDays] = useState(30)
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')
        const response = await fetch(`/api/dashboard?days=${days}`)
        if (!response.ok) {
          throw new Error(`dashboard request failed: ${response.status}`)
        }
        const payload = await response.json()
        if (active) {
          setDashboard(payload)
        }
      } catch (err) {
        if (active) {
          setDashboard(emptyDashboard)
          setError('Не удалось загрузить dashboard. Проверь backend/API.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()
    return () => {
      active = false
    }
  }, [days])

  const today = dashboard.today ?? emptyDashboard.today
  const totals = dashboard.totals ?? emptyDashboard.totals

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Nutrition App v2</p>
          <h1>Дневной summary и история метрик</h1>
          <p className="lead">
            Dashboard теперь читает данные из базы: today summary, исторические метрики и графики веса,
            калорий, белка и клетчатки.
          </p>
        </div>

        <div className="hero__actions">
          <div className="hero__status">
            <span className={`status-dot ${loading ? 'status-dot--loading' : ''}`} />
            <span>{loading ? 'Обновляем данные…' : `Диапазон: ${dashboard.range?.days ?? days} дней`}</span>
          </div>

          <label className="range-select">
            <span>Период</span>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <section className="panel banner banner--error">
          <strong>Данные пока недоступны.</strong>
          <p>{error}</p>
        </section>
      ) : null}

      <section className="summary-grid">
        <MetricCard
          label="Съедено сегодня"
          value={formatNumber(today.consumed)}
          suffix="ккал"
          accent
          helper={`Дата: ${formatShortDate(today.date)}`}
        />
        <MetricCard label="Дневная норма" value={formatNumber(today.target)} suffix="ккал" />
        <MetricCard label="Осталось" value={formatNumber(today.remaining)} suffix="ккал" />
        <MetricCard label="Вес" value={formatNumber(today.weight, 2)} suffix="кг" />
      </section>

      <section className="content-grid">
        <div className="content-grid__main">
          <section className="panel today-panel">
            <div className="today-panel__header">
              <div>
                <h2>Сегодня</h2>
                <p className="muted">Основной блок дневного экрана: consumed, target и remaining calories.</p>
              </div>
              <span className="date-badge">{formatShortDate(today.date)}</span>
            </div>

            <div className="today-panel__metrics">
              <StatPill label="Белок" value={formatNumber(today.protein)} suffix="г" />
              <StatPill label="Клетчатка" value={formatNumber(today.fiber)} suffix="г" />
              <StatPill label="Средний вес периода" value={formatNumber(totals.weight, 2)} suffix="кг" />
            </div>
          </section>

          <section className="charts-grid">
            {METRIC_CONFIG.map((metric) => (
              <ChartCard
                key={metric.key}
                title={metric.title}
                description={metric.description}
                points={dashboard[metric.key] ?? []}
                color={metric.accent}
                suffix={metric.suffix}
              />
            ))}
          </section>
        </div>

        <aside className="content-grid__side">
          <section className="panel info-panel">
            <h2>Период</h2>
            <div className="info-list">
              <div>
                <span>От</span>
                <strong>{formatShortDate(dashboard.range?.from)}</strong>
              </div>
              <div>
                <span>До</span>
                <strong>{formatShortDate(dashboard.range?.to)}</strong>
              </div>
              <div>
                <span>Дней в выборке</span>
                <strong>{dashboard.range?.days ?? 0}</strong>
              </div>
            </div>
          </section>

          <section className="panel info-panel">
            <h2>Итоги периода</h2>
            <div className="info-list">
              <div>
                <span>Калории съедено</span>
                <strong>{formatNumber(totals.consumed)} ккал</strong>
              </div>
              <div>
                <span>Калории target</span>
                <strong>{formatNumber(totals.target)} ккал</strong>
              </div>
              <div>
                <span>Remaining суммарно</span>
                <strong>{formatNumber(totals.remaining)} ккал</strong>
              </div>
              <div>
                <span>Белок</span>
                <strong>{formatNumber(totals.protein)} г</strong>
              </div>
              <div>
                <span>Клетчатка</span>
                <strong>{formatNumber(totals.fiber)} г</strong>
              </div>
            </div>
          </section>

          <section className="panel info-panel">
            <h2>Источник истины</h2>
            <p className="muted">
              Исторические daily metrics лежат в PostgreSQL. Derived-поля вроде отклонения и агрегатов по
              неделе/месяцу не хранятся как первичная истина — они рассчитываются из дневных данных.
            </p>
          </section>
        </aside>
      </section>
    </main>
  )
}
