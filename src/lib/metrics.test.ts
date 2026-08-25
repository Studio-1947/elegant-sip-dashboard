import { describe, expect, it } from 'vitest'
import type { PlacedOrder } from '@storefront/lib/orders'
import {
  byWeekday,
  checkIntegrity,
  couponUsage,
  dailySeries,
  filterByRange,
  percentChange,
  previousPeriod,
  summarise,
} from './metrics'
import { customerBreakdown, productBreakdown } from './analysis'

const NOW = new Date('2026-08-24T12:00:00')

function order(overrides: Partial<PlacedOrder> & { number: string; date: string }): PlacedOrder {
  return {
    items: [{ id: 'first-flush-fannings', size: 'Basic · 100 g', name: 'First Flush Fannings', price: 100, imageSrc: '', quantity: 1 }],
    subtotal: 100,
    discount: 0,
    coupon: null,
    shippingFee: 150,
    tax: 13,
    total: 263,
    shippingMethod: 'standard',
    email: 'buyer@example.com',
    name: 'Test Buyer',
    address: '1 Test Road',
    city: 'Kolkata',
    zip: '700001',
    country: 'India',
    ...overrides,
  }
}

describe('summarise', () => {
  it('adds up every money column and derives the average order value', () => {
    const totals = summarise([
      order({ number: 'A', date: '2026-08-20T10:00:00', total: 500, subtotal: 300, tax: 20, discount: 30, shippingFee: 150 }),
      order({ number: 'B', date: '2026-08-21T10:00:00', total: 1000, subtotal: 800, tax: 45, discount: 0, shippingFee: 150 }),
    ])
    expect(totals.orders).toBe(2)
    expect(totals.revenue).toBe(1500)
    expect(totals.goods).toBe(1100)
    expect(totals.discount).toBe(30)
    expect(totals.tax).toBe(65)
    expect(totals.averageOrderValue).toBe(750)
  })

  it('reports zeroes rather than NaN for an empty period', () => {
    const totals = summarise([])
    expect(totals.averageOrderValue).toBe(0)
    expect(totals.revenue).toBe(0)
  })
})

describe('percentChange', () => {
  it('returns null when there is no baseline, so "no data" never reads as "flat"', () => {
    expect(percentChange(500, 0)).toBeNull()
  })

  it('computes a signed percentage', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
  })
})

describe('range filtering', () => {
  const orders = [
    order({ number: 'today', date: '2026-08-24T09:00:00' }),
    order({ number: 'week', date: '2026-08-20T09:00:00' }),
    order({ number: 'month', date: '2026-08-01T09:00:00' }),
    order({ number: 'old', date: '2026-01-01T09:00:00' }),
    order({ number: 'broken', date: 'not-a-date' }),
  ]

  it('includes the whole first day of the window', () => {
    expect(filterByRange(orders, '7d', NOW).map((entry) => entry.number)).toEqual(['today', 'week'])
  })

  it('drops records with an unparseable date instead of counting them as today', () => {
    expect(filterByRange(orders, 'all', NOW).some((entry) => entry.number === 'broken')).toBe(false)
  })

  it('has no previous period for all-time', () => {
    expect(previousPeriod(orders, 'all', NOW)).toBeNull()
  })

  it('takes the equally long window immediately before the current one', () => {
    const earlier = previousPeriod(orders, '7d', NOW)
    expect(earlier?.map((entry) => entry.number)).toEqual([])
    const earlier30 = previousPeriod(orders, '30d', NOW)
    expect(earlier30?.map((entry) => entry.number)).toEqual([])
  })
})

describe('dailySeries', () => {
  it('emits one point per calendar day, including days with no orders', () => {
    const series = dailySeries([order({ number: 'A', date: '2026-08-22T10:00:00', total: 400 })], '7d', NOW)
    expect(series).toHaveLength(7)
    expect(series[series.length - 1].key).toBe('2026-08-24')
    const busy = series.find((point) => point.key === '2026-08-22')
    expect(busy?.revenue).toBe(400)
    expect(series.filter((point) => point.revenue === 0)).toHaveLength(6)
  })
})

describe('byWeekday', () => {
  it('buckets Monday first', () => {
    // 2026-08-24 is a Monday.
    const buckets = byWeekday([order({ number: 'A', date: '2026-08-24T10:00:00', total: 300 })])
    expect(buckets[0]).toEqual({ label: 'Mon', orders: 1, revenue: 300 })
    expect(buckets[6].orders).toBe(0)
  })
})

describe('checkIntegrity', () => {
  it('passes an order whose total follows the pricing rules', () => {
    // 1 × ₹100 goods + ₹150 standard shipping + 5% GST on both = ₹263.
    expect(checkIntegrity([order({ number: 'A', date: '2026-08-24T10:00:00' })])).toEqual([])
  })

  it('flags a total that has been edited away from the rules', () => {
    const issues = checkIntegrity([order({ number: 'A', date: '2026-08-24T10:00:00', total: 1 })])
    expect(issues).toEqual([{ number: 'A', storedTotal: 1, expectedTotal: 263 }])
  })
})

describe('couponUsage', () => {
  it('groups by code and sums the discount given', () => {
    const usage = couponUsage([
      order({ number: 'A', date: '2026-08-24T10:00:00', coupon: 'SIP10', discount: 60 }),
      order({ number: 'B', date: '2026-08-23T10:00:00', coupon: 'SIP10', discount: 40 }),
      order({ number: 'C', date: '2026-08-22T10:00:00' }),
    ])
    expect(usage).toEqual([{ code: 'SIP10', orders: 2, discount: 100 }])
  })
})

describe('productBreakdown', () => {
  it('counts goods revenue per tea and separates lines whose product has left the catalogue', () => {
    const breakdown = productBreakdown(
      [
        order({
          number: 'A',
          date: '2026-08-24T10:00:00',
          items: [
            { id: 'first-flush-fannings', size: 'Basic · 100 g', name: 'First Flush Fannings', price: 100, imageSrc: '', quantity: 2 },
            { id: 'retired-tea', size: '100 g', name: 'Retired Tea', price: 400, imageSrc: '', quantity: 1 },
          ],
        }),
      ],
      {},
    )
    const fannings = breakdown.performance.find((row) => row.product.id === 'first-flush-fannings')
    expect(fannings?.units).toBe(2)
    expect(fannings?.revenue).toBe(200)
    expect(breakdown.orphans).toEqual([{ id: 'retired-tea', name: 'Retired Tea', units: 1, revenue: 400 }])
    expect(breakdown.goodsRevenue).toBe(600)
  })
})

describe('customerBreakdown', () => {
  it('groups by email regardless of case and keeps the most recent name', () => {
    const customers = customerBreakdown([
      order({ number: 'A', date: '2026-08-20T10:00:00', email: 'Buyer@Example.com', name: 'Old Name', total: 300 }),
      order({ number: 'B', date: '2026-08-24T10:00:00', email: 'buyer@example.com', name: 'New Name', total: 700 }),
    ])
    expect(customers).toHaveLength(1)
    expect(customers[0].name).toBe('New Name')
    expect(customers[0].spend).toBe(1000)
    expect(customers[0].orders).toBe(2)
    expect(customers[0].firstOrder).toBe('2026-08-20T10:00:00')
  })
})
