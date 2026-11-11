import { useState } from 'react'
import { loginApi } from '../services/api'

interface LoginProps {
    onLogin: () => void
}

function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await loginApi({ email, password })
            onLogin()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login Failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <form
                onSubmit={handleLogin}
                className="w-full max-w-md rounded-lg bg-white p-8 shadow"
            >
                <h1 className="mb-6 text-center text-2xl font-bold">
                    Vehicle Rental System
                </h1>

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
                    required
                />

                {error && (
                    <p className="mb-4 text-sm text-red-600">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    )
}

export default Login
