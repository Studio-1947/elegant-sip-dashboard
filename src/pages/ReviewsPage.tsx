import { useMemo, useState } from 'react'
import { PRODUCTS } from '@storefront/data/products'
import { useDataset } from '../lib/datasetContext'
import { flattenReviews, ratingDistribution } from '../lib/analysis'
import { formatCount, pluralise } from '../lib/format'
import { FilterBar, SearchInput, Select } from '../components/ui/Controls'
import { Card, CardHeader, Chip, EmptyState } from '../components/ui/Card'
import { StatTile } from '../components/ui/StatTile'
import { ChartCard } from '../components/charts/ChartCard'
import { ColumnChart } from '../components/charts/ColumnChart'
import { StarIcon, TrashIcon } from '../components/ui/Icons'
import { useToast } from '../components/ui/Toast'

export default function ReviewsPage() {
  const { reviews, mode, deleteReview, restoreReview } = useDataset()
  const notify = useToast()
  const [query, setQuery] = useState('')
  const [productId, setProductId] = useState<string>('all')
  const [rating, setRating] = useState<string>('all')

  const all = useMemo(() => flattenReviews(reviews), [reviews])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return all.filter((row) => {
      if (productId !== 'all' && row.productId !== productId) return false
      if (rating !== 'all' && Math.round(row.review.rating) !== Number(rating)) return false
      if (!needle) return true
      return `${row.review.author} ${row.review.text} ${row.productName}`.toLowerCase().includes(needle)
    })
  }, [all, query, productId, rating])

  const distribution = useMemo(() => ratingDistribution(all), [all])
  const average =
    all.length === 0 ? 0 : all.reduce((sum, row) => sum + row.review.rating, 0) / all.length
  const verified = all.filter((row) => row.review.verified).length

  return (
    <div className="flex flex-col gap-3">
      <FilterBar>
        <SearchInput value={query} onChange={setQuery} label="Search reviews" placeholder="Author, text or tea" />
        <Select
          label="Tea"
          value={productId}
          onChange={setProductId}
          options={[
            { id: 'all', label: 'All teas' },
            ...PRODUCTS.map((product) => ({ id: product.id, label: product.name })),
          ]}
        />
        <Select
          label="Rating"
          value={rating}
          onChange={setRating}
          options={[
            { id: 'all', label: 'Any rating' },
            ...[5, 4, 3, 2, 1].map((value) => ({ id: String(value), label: `${value} star${value === 1 ? '' : 's'}` })),
          ]}
        />
      </FilterBar>

      <section aria-label="Review figures" className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatTile
          label="Reviews"
          value={formatCount(all.length)}
          hint={`Across ${pluralise(Object.keys(reviews).length, 'tea')}`}
        />
        <StatTile
          label="Average rating"
          value={all.length === 0 ? '' : `${average.toFixed(1)} / 5`}
          hint={all.length === 0 ? 'No reviews yet – no star rating is shown anywhere' : undefined}
        />
        <StatTile
          label="Verified purchases"
          value={formatCount(verified)}
          hint="Granted only when an order on that device contained the tea"
        />
      </section>

      <ChartCard
        title="Rating distribution"
        subtitle={`${pluralise(all.length, 'review')} in this dataset`}
        table={{
          columns: ['Rating', 'Reviews'],
          rows: distribution.map((count, index) => [`${index + 1} star${index === 0 ? '' : 's'}`, count]),
        }}
      >
        <ColumnChart
          columns={distribution.map((count, index) => ({ label: `${index + 1}★`, value: count }))}
          formatValue={formatCount}
          seriesLabel="Reviews by star rating"
          height={180}
        />
      </ChartCard>

      <Card>
        <CardHeader
          title="All reviews"
          subtitle={
            mode === 'demo'
              ? 'Demo reviews – deleting one affects the demo dataset only.'
              : 'Deleting a review removes it from the storefront product page on this browser.'
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? 'No reviews yet' : 'No reviews match'}
            message={
              all.length === 0
                ? 'Reviews arrive from the product page form. Until one is written, the storefront deliberately shows no star rating at all.'
                : 'Clear the filters to see every review.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const key = `${row.productId}__${row.review.id}`
              return (
                <li key={key} className="flex flex-col gap-2 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={row.review.rating} />
                    <span className="text-sm font-semibold text-ink">{row.review.author}</span>
                    {row.review.verified && <Chip tone="accent">Verified purchase</Chip>}
                    <span className="text-xs text-muted">{row.review.date}</span>
                    <span className="ml-auto text-xs text-muted">{row.productName}</span>
                  </div>
                  <p className="text-sm text-body">{row.review.text}</p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        /* Deleted immediately, with the way back in the toast.
                           A confirm dialog here would be dismissed by the same
                           reflex that opened it; an undo is read at leisure. */
                        const index = (reviews[row.productId] ?? []).findIndex(
                          (entry) => entry.id === row.review.id,
                        )
                        if (!deleteReview(row.productId, row.review.id)) {
                          notify('Could not write to storage – the review is still there', 'error')
                          return
                        }
                        notify(`Review by ${row.review.author} deleted`, {
                          action: {
                            label: 'Undo',
                            onClick: () => {
                              if (!restoreReview(row.productId, row.review, index)) {
                                notify('Could not write to storage – the review is still deleted', 'error')
                              }
                            },
                          },
                        })
                      }}
                      className="inline-flex h-7 items-center gap-1.5 rounded-sm px-1.5 text-xs font-semibold text-muted hover:bg-critical-soft hover:text-critical"
                    >
                      <span className="h-3.5 w-3.5">
                        <TrashIcon />
                      </span>
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <p className="text-xs text-muted">
        Reviews live in this browser's localStorage, so this list is what a visitor on this device
        would see – not every review ever written. A shared review store needs the first API.
      </p>
    </div>
  )
}

/** Stars are decorative; the rating is announced as text beside them. */
function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-0.5" title={`${rating} out of 5`}>
      <span className="sr-only">{rating} out of 5</span>
      {[1, 2, 3, 4, 5].map((value) => (
        <span
          key={value}
          className={`h-3.5 w-3.5 ${value <= rounded ? 'text-accent' : 'text-rule'}`}
          aria-hidden="true"
        >
          <StarIcon filled={value <= rounded} />
        </span>
      ))}
    </span>
  )
}
