export default function App() {
  return (
    <main className="page">
      <h1>Nutrition App v2</h1>
      <p>Новый отдельный проект. PostgreSQL как source of truth.</p>

      <section className="card">
        <h2>Planned flow</h2>
        <ol>
          <li>Upload photo</li>
          <li>Create analysis request</li>
          <li>Analyzer prepares draft</li>
          <li>User confirms draft</li>
          <li>Confirmed meal saved in DB</li>
        </ol>
      </section>
    </main>
  )
}
