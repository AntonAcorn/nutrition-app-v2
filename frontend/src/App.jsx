const daySummary = {
  dateLabel: 'Сегодня',
  calories: 0,
  protein: 0,
  fiber: 0,
  goal: 2000,
}

const mealGroups = [
  {
    title: 'Завтрак',
    hint: 'Пока пусто',
    items: [],
  },
  {
    title: 'Обед',
    hint: 'Здесь появятся подтверждённые meal entries',
    items: [],
  },
  {
    title: 'Ужин',
    hint: 'После первой интеграции с backend сюда придут данные дня',
    items: [],
  },
]

const apiCards = [
  {
    title: 'GET /api/health',
    text: 'Smoke-check для live среды и CI.',
  },
  {
    title: 'GET /api/day/current',
    text: 'Следующий шаг: текущий день, summary и список подтверждённых приёмов пищи.',
  },
  {
    title: 'POST /api/photos',
    text: 'Дальше пойдёт загрузка фото и создание analysis request.',
  },
]

function Metric({ label, value, suffix, accent = false }) {
  return (
    <div className={`metric ${accent ? 'metric--accent' : ''}`}>
      <span className="metric__label">{label}</span>
      <strong className="metric__value">
        {value}
        {suffix ? <span className="metric__suffix"> {suffix}</span> : null}
      </strong>
    </div>
  )
}

function MealGroup({ title, hint, items }) {
  return (
    <section className="panel meal-group">
      <div className="meal-group__header">
        <h3>{title}</h3>
        <span>{items.length ? `${items.length} entries` : hint}</span>
      </div>

      {items.length ? (
        <ul className="meal-group__list">
          {items.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <p>Нет подтверждённых записей.</p>
          <p className="muted">Когда backend начнёт отдавать day view, этот блок заполнится автоматически.</p>
        </div>
      )}
    </section>
  )
}

export default function App() {
  const remainingCalories = daySummary.goal - daySummary.calories

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Nutrition App v2</p>
          <h1>Базовый frontend первой итерации</h1>
          <p className="lead">
            Новый стек: React + Spring Boot + PostgreSQL + отдельный analyzer. Источник истины — база,
            а не анализатор.
          </p>
        </div>

        <div className="hero__status">
          <span className="status-dot" />
          <span>Deploy target: standalone production frontend</span>
        </div>
      </section>

      <section className="summary-grid">
        <Metric label={daySummary.dateLabel} value={daySummary.calories} suffix="ккал" accent />
        <Metric label="Белок" value={daySummary.protein} suffix="г" />
        <Metric label="Клетчатка" value={daySummary.fiber} suffix="г" />
        <Metric label="Осталось" value={remainingCalories} suffix="ккал" />
      </section>

      <section className="content-grid">
        <div className="content-grid__main">
          <section className="panel section-head">
            <div>
              <h2>Текущий день</h2>
              <p className="muted">
                Этот экран — каркас под issue #5: app shell, current day view и место под meal list.
              </p>
            </div>
          </section>

          {mealGroups.map((group) => (
            <MealGroup key={group.title} {...group} />
          ))}
        </div>

        <aside className="content-grid__side">
          <section className="panel">
            <h2>API shape</h2>
            <div className="api-shape">
              {apiCards.map((card) => (
                <article key={card.title} className="api-card">
                  <strong>{card.title}</strong>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Planned flow</h2>
            <ol className="flow-list">
              <li>Загрузка фото</li>
              <li>Создание analysis request</li>
              <li>Analyzer подготавливает draft</li>
              <li>Пользователь подтверждает draft</li>
              <li>Подтверждённый meal entry сохраняется в DB</li>
            </ol>
          </section>
        </aside>
      </section>
    </main>
  )
}
