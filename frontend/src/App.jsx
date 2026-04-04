const daySummary = {
  dateLabel: 'Сегодня, 3 апреля',
  calories: 1640,
  protein: 108,
  fiber: 24,
  goal: 2100,
  water: '1.8 / 2.5 л',
  mood: 'Стабильная энергия',
  score: 82,
}

const macroProgress = [
  {
    label: 'Белок',
    value: 108,
    target: 135,
    unit: 'г',
    tone: 'emerald',
  },
  {
    label: 'Углеводы',
    value: 156,
    target: 220,
    unit: 'г',
    tone: 'amber',
  },
  {
    label: 'Жиры',
    value: 58,
    target: 72,
    unit: 'г',
    tone: 'violet',
  },
]

const mealGroups = [
  {
    title: 'Завтрак',
    timeRange: '08:10 · подтверждено',
    calories: 420,
    protein: 28,
    accent: 'sunrise',
    items: [
      'Овсянка с греческим йогуртом и ягодами',
      'Кофе без сахара',
    ],
  },
  {
    title: 'Обед',
    timeRange: '13:05 · подтверждено',
    calories: 610,
    protein: 42,
    accent: 'day',
    items: [
      'Куриная грудка, киноа, овощи гриль',
      'Салат с оливковым маслом',
    ],
  },
  {
    title: 'Ужин',
    timeRange: 'Запланирован на вечер',
    calories: 0,
    protein: 0,
    accent: 'night',
    items: [],
    hint: 'Оставь место для ужина или добавь фото, когда еда будет перед тобой.',
  },
]

const quickActions = [
  'Сфотографировать тарелку',
  'Подтвердить draft от analyzer',
  'Добавить воду или перекус',
]

const insightCards = [
  {
    label: 'Фокус дня',
    title: 'Нормальный баланс без перегруза интерфейса',
    text: 'Сводка сверху, детали дня ниже, а capture-flow держим рядом — это даёт ощущение реального продукта, а не лендинга.',
  },
  {
    label: 'Следующий шаг',
    title: 'Фото и analyzer — первый-class flow',
    text: 'Визуально выделили зону upload / analysis, чтобы будущая AI-функция уже имела естественное место в оболочке.',
  },
]

const upcomingModules = [
  'История дней и недельные тренды',
  'Draft review после фото-анализа',
  'Подтверждение meal entries из backend',
  'Карточка нутриентов / микроэлементов',
]

function StatChip({ label, value }) {
  return (
    <div className="stat-chip">
      <span className="stat-chip__label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function MetricCard({ label, value, suffix, accent = false, detail }) {
  return (
    <article className={`metric-card ${accent ? 'metric-card--accent' : ''}`}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">
        {value}
        {suffix ? <span className="metric-card__suffix"> {suffix}</span> : null}
      </strong>
      {detail ? <p className="metric-card__detail">{detail}</p> : null}
    </article>
  )
}

function MacroBar({ label, value, target, unit, tone }) {
  const progress = Math.min(100, Math.round((value / target) * 100))

  return (
    <article className="macro-bar">
      <div className="macro-bar__header">
        <div>
          <span className={`macro-bar__tone macro-bar__tone--${tone}`} />
          <strong>{label}</strong>
        </div>
        <span>
          {value}/{target} {unit}
        </span>
      </div>
      <div className="macro-bar__track">
        <div
          className={`macro-bar__fill macro-bar__fill--${tone}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="macro-bar__caption">{progress}% дневной цели</p>
    </article>
  )
}

function MealCard({ title, timeRange, calories, protein, items, hint, accent }) {
  const hasItems = items.length > 0

  return (
    <article className={`meal-card meal-card--${accent}`}>
      <div className="meal-card__header">
        <div>
          <p className="meal-card__eyebrow">{timeRange}</p>
          <h3>{title}</h3>
        </div>
        <div className="meal-card__totals">
          <StatChip label="ккал" value={calories || '—'} />
          <StatChip label="белок" value={protein ? `${protein} г` : '—'} />
        </div>
      </div>

      {hasItems ? (
        <ul className="meal-card__list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="meal-card__empty">
          <p>Пока без записей.</p>
          <p>{hint}</p>
        </div>
      )}
    </article>
  )
}

export default function App() {
  const remainingCalories = daySummary.goal - daySummary.calories

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Nutrition App v2</p>
          <h1>Дневной экран, который уже выглядит как продукт</h1>
        </div>
        <div className="topbar__badge">
          <span className="status-dot" />
          <span>Current day · meal logging · analyzer-ready shell</span>
        </div>
      </section>

      <section className="hero-card panel">
        <div className="hero-card__main">
          <div>
            <p className="eyebrow eyebrow--soft">Сводка дня</p>
            <h2>Спокойный wellness-dashboard вместо placeholder-каркаса</h2>
            <p className="lead">
              Интерфейс собран вокруг реальных паттернов nutrition apps: крупная daily summary, быстрый доступ к
              логированию, визуально лёгкие meal cards и отдельная зона для будущего photo-analysis flow.
            </p>
          </div>

          <div className="hero-card__highlights">
            <StatChip label="Nutrition score" value={`${daySummary.score}/100`} />
            <StatChip label="Вода" value={daySummary.water} />
            <StatChip label="Самочувствие" value={daySummary.mood} />
          </div>
        </div>

        <div className="hero-card__side">
          <div className="hero-orb" aria-hidden="true">
            <div className="hero-orb__inner">
              <span>Осталось</span>
              <strong>{remainingCalories}</strong>
              <small>ккал до цели</small>
            </div>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label={daySummary.dateLabel} value={daySummary.calories} suffix="ккал" accent detail="Из подтверждённых meal entries" />
        <MetricCard label="Белок" value={daySummary.protein} suffix="г" detail="Сильнее всего закрыт после обеда" />
        <MetricCard label="Клетчатка" value={daySummary.fiber} suffix="г" detail="Нужно ещё немного овощей вечером" />
        <MetricCard label="До цели" value={remainingCalories} suffix="ккал" detail="Можно закрыть ужином без перегруза" />
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-grid__main">
          <section className="panel section-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow eyebrow--soft">Текущий день</p>
                <h2>Meals laid out as a timeline</h2>
              </div>
              <p className="muted">Паттерн ближе к Yazio / Lifesum: день читается сверху вниз и не прячется за tabs.</p>
            </div>

            <div className="meal-stack">
              {mealGroups.map((group) => (
                <MealCard key={group.title} {...group} />
              ))}
            </div>
          </section>

          <section className="panel section-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow eyebrow--soft">Питательные цели</p>
                <h2>Macro progress без тяжёлых charts</h2>
              </div>
              <p className="muted">Достаточно на стартовом этапе: быстро видно, где дефицит, но код остаётся простым.</p>
            </div>

            <div className="macro-grid">
              {macroProgress.map((item) => (
                <MacroBar key={item.label} {...item} />
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-grid__side">
          <section className="panel section-panel capture-panel">
            <div>
              <p className="eyebrow eyebrow--soft">Capture flow</p>
              <h2>Фото и анализ должны быть под рукой</h2>
              <p className="muted">
                Вместо generic marketing hero здесь сразу показан рабочий сценарий: снять фото, получить draft,
                подтвердить meal entry.
              </p>
            </div>

            <div className="capture-preview" aria-hidden="true">
              <div className="capture-preview__plate" />
              <div className="capture-preview__card capture-preview__card--primary">
                <span>Photo uploaded</span>
                <strong>Analyzer draft · 86% confident</strong>
              </div>
              <div className="capture-preview__card capture-preview__card--secondary">
                <span>Next</span>
                <strong>Confirm portions & save meal</strong>
              </div>
            </div>

            <ul className="action-list">
              {quickActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </section>

          <section className="panel section-panel insights-panel">
            <div className="section-head section-head--stacked">
              <div>
                <p className="eyebrow eyebrow--soft">Почему так</p>
                <h2>Research-informed direction</h2>
              </div>
            </div>

            <div className="insight-stack">
              {insightCards.map((card) => (
                <article key={card.title} className="insight-card">
                  <span>{card.label}</span>
                  <strong>{card.title}</strong>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel section-panel roadmap-panel">
            <p className="eyebrow eyebrow--soft">Path forward</p>
            <h2>Модули, которые сюда естественно добавятся</h2>
            <ul className="roadmap-list">
              {upcomingModules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  )
}
