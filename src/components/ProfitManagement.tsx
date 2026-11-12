import { useEffect, useState } from 'react'
import { profitApi } from '../services/api'
import type { Profit } from '../services/api'

function ProfitManagement() {
    const [profit, setProfit] = useState<Profit | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const loadProfit = async () => {
        try {
            setLoading(true)
            setError('')

            const data = await profitApi.getProfit()
            setProfit(data)

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed To Load Profit Data'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadProfit()
    }, [])

    const formatMoney = (amount: number) =>
        `Rs. ${amount.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`

    const cards = profit ? [
        {
            title: 'Total Revenue',
            amount: profit.totalRevenue,
            color: 'bg-blue-100 text-blue-700',
        },
        {
            title: 'Maintenance Expenses',
            amount: profit.maintenanceExpenses,
            color: 'bg-yellow-100 text-yellow-700',
        },
        {
            title: 'Damage Expenses',
            amount: profit.damageExpenses,
            color: 'bg-orange-100 text-orange-700',
        },
        {
            title: 'Total Expenses',
            amount: profit.totalExpenses,
            color: 'bg-red-100 text-red-700',
        },
        {
            title: 'Net Profit',
            amount: profit.netProfit,
            color: profit.netProfit >= 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700',
        },
    ] : []

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-600">
                Loading Profit Data...
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-lg bg-white p-6 shadow">
                <p className="mb-4 text-red-600">{error}</p>

                <button
                    onClick={() => void loadProfit()}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Profit Management
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Vehicle Rental Business Financial Summary
                    </p>
                </div>

                <button
                    onClick={() => void loadProfit()}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

                {cards.map(card => (
                    <div
                        key={card.title}
                        className="rounded-xl bg-white p-5 shadow"
                    >
                        <h3 className="text-sm font-medium text-gray-500">
                            {card.title}
                        </h3>

                        <p className={`mt-3 inline-block rounded-lg px-3 py-2 text-xl font-bold ${card.color}`}>
                            {formatMoney(card.amount)}
                        </p>
                    </div>
                ))}

            </div>

            {profit && (
                <div className="rounded-xl bg-white p-6 shadow">
                    <h2 className="mb-4 text-lg font-bold text-gray-800">
                        Profit Summary
                    </h2>

                    <div className="space-y-3 text-sm">

                        <div className="flex justify-between border-b pb-3">
                            <span>Total Revenue</span>
                            <span className="font-semibold">
                                {formatMoney(profit.totalRevenue)}
                            </span>
                        </div>

                        <div className="flex justify-between border-b pb-3">
                            <span>Total Expenses</span>
                            <span className="font-semibold text-red-600">
                                {formatMoney(profit.totalExpenses)}
                            </span>
                        </div>

                        <div className="flex justify-between pt-2 text-base">
                            <span className="font-bold">Net Profit</span>

                            <span className={`font-bold ${
                                profit.netProfit >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                            }`}>
                                {formatMoney(profit.netProfit)}
                            </span>
                        </div>

                    </div>
                </div>
            )}

        </div>
    )
}

export default ProfitManagement
