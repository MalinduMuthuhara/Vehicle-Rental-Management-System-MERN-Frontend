const API_URL = 'http://localhost:5000/api'

export interface Customer {
    _id: string
    name: string
    contact: string
}

// User Interface

export type UserRole = 'CUSTOMER' | 'EMPLOYEE' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface User {
  _id: string
  userName: string
  email: string
  contactNumber: string
  address: string
  role: UserRole
  status: UserStatus
}

export type CreateUserData = Omit<User, '_id'> & {
  password: string
}

export type UpdateUserData = Omit<User, '_id'> & {
  password?: string
}

//Vehicle Interface

export type VehicleTransmission = 'AUTOMATIC' | 'MANUAL'
export type FuelType = 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC'
export type Status = 'AVAILABLE' | 'BOOKED' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE'
export type VehicleStatus = Status

export interface Vehicle{
    _id:string
    registrationNumber:string
    brand:string
    model:string
    year:number
    color:string
    transmission:VehicleTransmission
    fuelType:FuelType
    seatingCapacity:number
    dailyRate:number
    status:Status
    categoryId:string | { _id: string; categoryName?: string }
    branchId:string | { _id: string; branchName?: string }
}

export type VehicleData = Omit<Vehicle, '_id' | 'categoryId' | 'branchId'> & {
    categoryId: string
    branchId: string
}

// Branch Interface
export interface Branch {
    _id: string
    branchName: string
    address: string
    city: string
    contactNumber: string
    email: string
    status: 'ACTIVE' | 'INACTIVE'
}

//Vehicle Category Interface
export interface VehicleCategory {
    _id: string
    categoryName: string
    description: string
    baseDailyRate: number
    status: 'ACTIVE' | 'INACTIVE'
}

// Booking Interface

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

type Ref<N extends string> = string | ({ _id: string } & Partial<Record<N, string>>)

export interface Booking {
    _id: string
    userId: string | { _id: string; userName?: string }
    vehicleId: string | { _id: string; registrationNumber?: string }
    pickupBranchId: Ref<'branchName'>
    returnBranchId: Ref<'branchName'>
    pickupDate: string
    returnDate: string
    totalAmount: number
    status: BookingStatus
    notes?: string
}

export type BookingData = Omit<Booking, '_id' | 'userId' | 'vehicleId' | 'pickupBranchId' | 'returnBranchId'> & {
    userId: string
    vehicleId: string
    pickupBranchId: string
    returnBranchId: string
}

// Rental Interface
export type RentalStatus = 'ONGOING' | 'COMPLETED' | 'CANCELLED'

export interface Rental {
    _id: string
    bookingId: string | { _id: string }
    userId: string | { _id: string; userName?: string }
    vehicleId: string | { _id: string; registrationNumber?: string }
    pickupDate: string
    expectedReturnDate: string
    actualReturnDate?: string
    startingMileage: number
    endingMileage?: number
    status: RentalStatus
}

export type RentalData = Omit<Rental, '_id' | 'bookingId' | 'userId' | 'vehicleId'> & {
    bookingId: string
    userId: string
    vehicleId: string
}

// Payment Interface
export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE'
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'

export interface Payment {
    _id: string
    bookingId: string | { _id: string }
    userId: string | { _id: string; userName?: string }
    amount: number
    paymentMethod: PaymentMethod
    transactionId: string
    paymentDate: string
    status: PaymentStatus
}
export type PaymentData = Omit<Payment,'_id'|'bookingId'|'userId' >&{
    bookingId : string
    userId: string
}



async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || 'Request failed')
  return body as T
}

async function getList<T>(path: string): Promise<T[]> {
  const body = await request<T[] | { data: T[] }>(path)
  return Array.isArray(body) ? body : body.data ?? []
}

function makeApi<
  T extends { _id: string },
  CreateBody = Omit<T, '_id'>,
  UpdateBody = CreateBody,
>(path: string) {
  return {
    getAll: () => getList<T>(path),
    create: (data: CreateBody) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateBody) =>
      request<T>(`${path}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<{ message?: string }>(`${path}/${id}`, { method: 'DELETE' }),
  }
}

export const customerApi = makeApi<Customer>('/customers')
export const userApi = makeApi<User, CreateUserData, UpdateUserData>('/users')
export const vehicleApi = makeApi<Vehicle, VehicleData>('/vehicles')
export const branchApi = makeApi<Branch>('/branches')
export const categoryApi = makeApi<VehicleCategory>('/vehicle-categories')
export const bookingApi = makeApi<Booking, BookingData>('/bookings')
export const rentalApi = makeApi<Rental, RentalData>('/rentals')
export const paymentApi = makeApi<Payment,PaymentData>('/payments')

