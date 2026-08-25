import { useDataset } from '../../lib/datasetContext'
import { formatDateTime } from '../../lib/format'
import { Button, SegmentedControl } from '../ui/Controls'
import { RefreshIcon } from '../ui/Icons'

export function TopBar({ title, description }: { title: string; description: string }) {
  const { mode, setMode, demoPresent, refresh, now } = useDataset()

  return (
    <header className="border-b border-ink/10 bg-white px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink md:text-lg">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-body">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* The dataset switch is deliberately in the chrome, on every page:
              which numbers you are looking at is never more than a glance away. */}
          <SegmentedControl
            label="Dataset"
            value={mode}
            onChange={setMode}
            segments={[
              { id: 'live', label: 'Live data' },
              { id: 'demo', label: demoPresent ? 'Demo data' : 'Demo (not loaded)' },
            ]}
          />
          <Button onClick={refresh} title={`Last read ${formatDateTime(now.toISOString())}`}>
            <span className="h-4 w-4">
              <RefreshIcon />
            </span>
            Refresh
          </Button>
        </div>
      </div>
    </header>
  )
}
