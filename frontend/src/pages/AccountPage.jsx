import './AccountPage.css'

export default function AccountPage() {
  return (
    <div className="account-page">
      <div className="account-header">
        <div className="account-avatar">
          <span>?</span>
        </div>
        <div className="account-identity">
          <h1>Guest User</h1>
          <p>Not signed in</p>
        </div>
      </div>

      <div className="account-sections">
        <section className="account-section">
          <h2>Tracked Games</h2>
          <p className="placeholder-text">Sign in to track your games.</p>
        </section>

        <section className="account-section">
          <h2>Activity</h2>
          <p className="placeholder-text">No recent activity.</p>
        </section>

        <section className="account-section">
          <h2>Settings</h2>
          <p className="placeholder-text">Account settings coming soon.</p>
        </section>
      </div>
    </div>
  )
}
