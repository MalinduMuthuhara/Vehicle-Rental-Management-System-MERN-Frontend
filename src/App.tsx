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

    const visibleMenu = menu.filter(item =>
        item.roles.includes(user.role)
    )

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900 md:flex-row">

            <aside className="w-full shrink-0 bg-[#222] p-4 md:w-[220px]">

                <h2 className="mb-2 text-xl font-bold text-white">
                    Vehicle Rental
                </h2>

                <p className="mb-5 text-sm text-gray-300">
                    {user.userName} ({user.role})
                </p>

                {visibleMenu.map(item => (
                    <button
                        key={item.page}
                        className={`mb-1.5 w-full cursor-pointer border-0 px-2.5 py-2.5 text-left text-white ${
                            page === item.page
                                ? 'bg-blue-600'
                                : 'bg-[#444] hover:bg-[#555]'
                        }`}
                        onClick={() => setPage(item.page)}
                    >
                        {item.label}
                    </button>
                ))}

                <button
                    onClick={handleLogout}
                    className="mt-5 w-full rounded bg-red-600 p-2.5 text-white hover:bg-red-700"
                >
                    Logout
                </button>

            </aside>

            <div className="min-w-0 flex-1 p-4 md:p-6">

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

            </div>
        </div>
    )
}

export default App
