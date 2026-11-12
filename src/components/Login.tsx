import { useState, type FormEvent } from 'react'
import { loginApi, registerApi } from '../services/api'

interface LoginProps {
    onLogin: () => void
}

function Login({ onLogin }: LoginProps) {
    const [isRegister, setIsRegister] = useState(false)

    const [userName, setUserName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [contactNumber, setContactNumber] = useState('')
    const [address, setAddress] = useState('')

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (isRegister) {
                const response = await registerApi({
                    userName,
                    email,
                    password,
                    contactNumber,
                    address
                })

                setSuccess(response.message + '. Please Login.')

                setIsRegister(false)
                setPassword('')
                setUserName('')
                setContactNumber('')
                setAddress('')

            } else {
                await loginApi({ email, password })
                onLogin()
            }

        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Something Went Wrong'
            )
        } finally {
            setLoading(false)
        }
    }

    const switchMode = () => {
        setIsRegister(!isRegister)
        setError('')
        setSuccess('')
        setPassword('')
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md rounded-lg bg-white p-8 shadow"
            >
                <h1 className="mb-2 text-center text-2xl font-bold">
                    Vehicle Rental System
                </h1>

                <p className="mb-6 text-center text-gray-500">
                    {isRegister
                        ? 'Create Your Customer Account'
                        : 'Login To Your Account'}
                </p>

                {isRegister && (
                    <>
                        <label className="mb-2 block">User Name</label>
                        <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="mb-4 w-full rounded border p-3"
                            placeholder="Enter your name"
                            required
                        />

                    </>
                )}

                <label className="mb-2 block">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mb-4 w-full rounded border p-3"
                    placeholder="Enter your email"
                    required
                />

                <label className="mb-2 block">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mb-4 w-full rounded border p-3"
                    placeholder="Enter your password"
                    minLength={8}
                    required
                />

                {isRegister && (
                    <>
                        <label className="mb-2 block">Contact Number</label>
                        <input
                            type="text"
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            className="mb-4 w-full rounded border p-3"
                            placeholder="Enter your contact number"
                            required
                        />

                        <label className="mb-2 block">Address</label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="mb-4 w-full rounded border p-3"
                            placeholder="Enter your address"
                            required
                        />
                    </>
                )}

                {error && (
                    <p className="mb-4 text-sm text-red-600">
                        {error}
                    </p>
                )}

                {success && (
                    <p className="mb-4 text-sm text-green-600">
                        {success}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading
                        ? 'Please Wait...'
                        : isRegister
                            ? 'Register'
                            : 'Login'}
                </button>

                <p className="mt-6 text-center text-sm text-gray-600">
                    {isRegister
                        ? 'Already have an account?'
                        : "Don't have an account?"}

                    <button
                        type="button"
                        onClick={switchMode}
                        className="ml-2 font-semibold text-blue-600 hover:underline"
                    >
                        {isRegister ? 'Login' : 'Register'}
                    </button>
                </p>
            </form>
        </div>
    )
}

export default Login
