import { useDataset } from '../../lib/datasetContext'
import { navigate } from '../../lib/router'
import { Button } from '../ui/Controls'
import { AlertIcon } from '../ui/Icons'

/**
 * The honesty banner.
 *
 * Demo mode is stated on every page, not buried in a settings screen: a
 * dashboard showing ₹2.4 lakh of invented revenue must never be mistakable for
 * a trading figure. In live mode the banner appears only when there is nothing
 * to show, where it explains *why* — usually a different browser origin — rather
 * than leaving an empty chart to be read as a bad month.
 */
export function ModeBanner() {
  const { mode, orders, demoPresent, seedDemo } = useDataset()

  if (mode === 'demo') {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-warn/35 bg-warn-soft px-4 py-2.5 text-sm text-ink md:px-6">
        <span className="h-4 w-4 shrink-0 text-ink">
          <AlertIcon />
        </span>
        <p className="min-w-0">
          <strong className="font-semibold">Demo data.</strong> Every figure below is simulated —
          order numbers start <code className="rounded bg-white/70 px-1 text-xs">ES-DEMO-</code> and
          all addresses use example.com. Nothing here is a real sale.
        </p>
        <button
          type="button"
          onClick={() => navigate('settings')}
          className="ml-auto text-xs font-semibold underline underline-offset-2"
        >
          Manage datasets
        </button>
      </div>
    )
  }

  if (orders.length > 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 bg-sunken px-4 py-2.5 text-sm text-body md:px-6">
      <p className="min-w-0">
        <strong className="font-semibold text-ink">No orders in this browser yet.</strong> Live mode
        reads the storefront's own localStorage, which browsers keep per origin — so it only sees
        orders placed at the same host and port as this page.
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => navigate('settings')} variant="ghost">
          Why?
        </Button>
        {!demoPresent && (
          <Button onClick={seedDemo} variant="primary">
            Load demo data
          </Button>
        )}
      </div>
    </div>
  )
}
