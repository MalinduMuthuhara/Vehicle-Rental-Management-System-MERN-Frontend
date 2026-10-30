import { useState } from 'react'
import UserManagement from './components/UserManagement'
import VehicleManagement from './components/VehicleManagement'
import VehicleCategoryManagement from './components/VehicleCategoryManagement'
import BranchManagement from './components/BranchManagement'
import BookingManagement from './components/BookingManagement'
import RentalManagement from './components/RentalManagement'
import PaymentManagement from './components/PaymentManagement'
import InvoiceManagement from './components/InvoiceManagement'
import VehicleMaintenanceManagement from "./components/VehicleMaintenanceManagement.tsx";
import VehicleDocument from "./components/VehicleDocument.tsx";
import Review from "./components/Review.tsx"

type Page = 'users' | 'vehicles' | 'vehicleCategories' | 'branch' | 'booking' | 'rental' | 'payments' | 'invoices' | 'vehicle-maintenance' | 'vehicle-document' | 'review'

const menu: { page: Page; label: string }[] = [
  { page: 'users', label: 'Users' },
  { page: 'vehicles', label: 'Vehicles' },
  { page: 'vehicleCategories', label: 'Vehicle Categories' },
  { page: 'branch', label: 'Branches' },
  { page: 'booking', label: 'Bookings' },
  { page: 'rental', label: 'Rentals' },
  { page: 'payments', label: 'Payments' },
  {page:'invoices',label:'Invoice'},
  {page:'vehicle-maintenance', label:'Vehicle Maintenance'},
  {page : 'vehicle-document', label:'Vehicle Document'},
  {page :'review',label:'Reviews' },
]

function App() {
  const [page, setPage] = useState<Page>('vehicles')

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900 md:flex-row">
      <aside className="w-full shrink-0 bg-[#222] p-4 md:w-[200px]">
        <h2 className="mb-5 text-xl font-bold text-white">Menu</h2>

        {menu.map((item) => (
          <button
            key={item.page}
            className={`mb-1.5 w-full cursor-pointer border-0 px-2.5 py-2.5 text-left text-white ${
              page === item.page ? 'bg-blue-600' : 'bg-[#444] hover:bg-[#555]'
            }`}
            onClick={() => setPage(item.page)}
          >
            {item.label}
          </button>
        ))}
      </aside>

      <div className="min-w-0 flex-1 p-4 md:p-6">
        {page === 'users' && <UserManagement />}
        {page === 'vehicles' && <VehicleManagement />}
        {page === 'vehicleCategories' && <VehicleCategoryManagement />}
        {page === 'branch' && <BranchManagement />}
        {page === 'booking' && <BookingManagement />}
        {page === 'rental' && <RentalManagement />}
        {page === 'payments' && <PaymentManagement />}
        {page === 'invoices' && <InvoiceManagement />}
        {page === 'vehicle-maintenance' && <VehicleMaintenanceManagement />}
        {page === 'vehicle-document' && <VehicleDocument />}
        {page === 'review' && <Review/>}
      </div>
    </div>
  )
}

export default App
