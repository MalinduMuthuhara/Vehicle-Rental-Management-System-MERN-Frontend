import { useState } from 'react'

import Login from './components/Login'
import UserManagement from './components/UserManagement'
import VehicleManagement from './components/VehicleManagement'
import VehicleCategoryManagement from './components/VehicleCategoryManagement'
import BranchManagement from './components/BranchManagement'
import BookingManagement from './components/BookingManagement'
import RentalManagement from './components/RentalManagement'
import PaymentManagement from './components/PaymentManagement'
import InvoiceManagement from './components/InvoiceManagement'
import VehicleMaintenanceManagement from './components/VehicleMaintenanceManagement'
import VehicleDocument from './components/VehicleDocument'
import Review from './components/Review'
import DamageReportManagement from './components/DamageReportManagement'
import { logoutApi } from './services/api'
import ProfitManagement from './components/ProfitManagement'
import CustomerApp from './customer/CustomerApp'
import Logo from './customer/Logo'
import { BRAND } from './customer/lib'

type Role = 'ADMIN' | 'EMPLOYEE' | 'CUSTOMER'

type Page =
    | 'users'
    | 'vehicles'
    | 'vehicleCategories'
    | 'branch'
    | 'booking'
    | 'rental'
    | 'payments'
    | 'invoices'
    | 'vehicle-maintenance'
    | 'vehicle-document'
    | 'review'
    | 'damage-report'
    | 'profit'

const menu: {
    page: Page
    label: string
    roles: Role[]
}[] = [
    { page: 'users', label: 'Users', roles: ['ADMIN'] },
    { page: 'vehicles', label: 'Vehicles', roles: ['ADMIN', 'EMPLOYEE', 'CUSTOMER'] },
    { page: 'vehicleCategories', label: 'Vehicle Categories', roles: ['ADMIN', 'EMPLOYEE', 'CUSTOMER'] },
    { page: 'branch', label: 'Branches', roles: ['ADMIN', 'EMPLOYEE'] },
    { page: 'booking', label: 'Bookings', roles: ['ADMIN', 'EMPLOYEE', 'CUSTOMER'] },
    { page: 'rental', label: 'Rentals', roles: ['ADMIN', 'EMPLOYEE'] },
    { page: 'payments', label: 'Payments', roles: ['ADMIN', 'EMPLOYEE', 'CUSTOMER'] },
    { page: 'invoices', label: 'Invoices', roles: ['ADMIN', 'EMPLOYEE', 'CUSTOMER'] },
    { page: 'vehicle-maintenance', label: 'Vehicle Maintenance', roles: ['ADMIN', 'EMPLOYEE'] },
    { page: 'vehicle-document', label: 'Vehicle Documents', roles: ['ADMIN', 'EMPLOYEE'] },
    { page: 'review', label: 'Reviews', roles: ['ADMIN', 'CUSTOMER'] },
    { page: 'damage-report', label: 'Damage Reports', roles: ['ADMIN', 'EMPLOYEE'] },
    { page: 'profit', label: 'Profit Management', roles: ['ADMIN'] },
]

function App() {
    const [loggedIn, setLoggedIn] = useState(
        () => !!localStorage.getItem('token')
    )

    const [page, setPage] = useState<Page>('vehicles')

    const user = JSON.parse(
        localStorage.getItem('user') || 'null'
    ) as { userName: string; role: Role } | null

    const handleLogout = () => {
        logoutApi()
        setLoggedIn(false)
        setPage('vehicles')
    }

    if (!loggedIn || !user) {
        return <Login onLogin={() => setLoggedIn(true)} />
    }

    // Customers get a storefront; staff keep the admin panel below.
    if (user.role === 'CUSTOMER') {
        return <CustomerApp onLogout={handleLogout} />
    }

    const visibleMenu = menu.filter(item =>
        item.roles.includes(user.role)
    )

    return (
        <div className="flex min-h-screen flex-col bg-[#f3f4f6] font-body text-ink md:flex-row">

            <aside className="flex w-full shrink-0 flex-col bg-panel md:sticky md:top-0 md:h-screen md:w-[250px] md:overflow-y-auto">

                <button
                    onClick={() => setPage('vehicles')}
                    aria-label={`${BRAND} home`}
                    className="h-24 w-full shrink-0 cursor-pointer bg-brand"
                >
                    <Logo />
                </button>

                <div className="border-b border-white/10 px-5 py-4">
                    <p className="text-sm font-bold text-white">{user.userName}</p>
                    <p className="text-xs text-gray-400">
                        {user.role === 'ADMIN' ? 'Administrator' : 'Staff'}
                    </p>
                </div>

                <nav aria-label="Admin" className="flex-1 py-2">
                    {visibleMenu.map(item => (
                        <button
                            key={item.page}
                            aria-current={page === item.page ? 'page' : undefined}
                            className={`block w-full cursor-pointer border-0 px-5 py-3 text-left text-[15px] font-bold transition-colors ${
                                page === item.page
                                    ? 'bg-brand text-white'
                                    : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                            onClick={() => setPage(item.page)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <button
                    onClick={handleLogout}
                    className="m-4 cursor-pointer border border-white/25 px-4 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
                >
                    Log out
                </button>

            </aside>

            <div className="min-w-0 flex-1 p-4 md:p-8">

                {page === 'users' && user.role === 'ADMIN' && <UserManagement />}
                {page === 'vehicles' && <VehicleManagement />}
                {page === 'vehicleCategories' && <VehicleCategoryManagement />}
                {page === 'branch' && <BranchManagement />}
                {page === 'booking' && <BookingManagement />}
                {page === 'rental' && <RentalManagement />}
                {page === 'payments' && <PaymentManagement />}
                {page === 'invoices' && <InvoiceManagement />}
                {page === 'vehicle-maintenance' && <VehicleMaintenanceManagement />}
                {page === 'vehicle-document' && <VehicleDocument />}
                {page === 'review' && <Review />}
                {page === 'damage-report' && <DamageReportManagement />}
                {page === 'profit' && user.role === 'ADMIN' && <ProfitManagement />}

            </div>
        </div>
    )
}

export default App
