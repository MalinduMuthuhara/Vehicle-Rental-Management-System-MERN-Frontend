import { useState, type FormEvent } from 'react'
import { loginApi, registerApi } from '../services/api'
import { ui } from './ui'

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
        <div className={ui.authPage}>
            <div className={ui.authShell}>

                {/* Left side branding */}
                <div className={ui.authAside}>
                    <div className="relative z-10">
                        <h1 className={ui.authBrand}>
                            DRIVE<span className={ui.authBrandAccent}>EASE</span>
                        </h1>
                        <p className="mt-2 text-xs tracking-[0.3em] text-slate-400">
                            VEHICLE RENTAL SYSTEM
                        </p>
                    </div>

                    <div className={ui.authAsideContent}>
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-400/30 bg-teal-400/10 text-3xl">
                            🚘
                        </div>

                        <h2 className={ui.authAsideTitle}>
                            Your Journey,
                            <span className="block text-teal-400">
                                Our Priority.
                            </span>
                        </h2>

                        <p className={ui.authAsideText}>
                            Discover a better way to travel. Find your perfect
                            vehicle, enjoy a smooth booking experience and
                            make every journey memorable.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-slate-300">
                                ✓ Easy Booking
                            </span>
                            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-slate-300">
                                ✓ Reliable Vehicles
                            </span>
                        </div>
                    </div>

                    <p className={ui.authAsideFooter}>
                        © 2026 DriveEase. All rights reserved.
                    </p>

                    {/* Decorative circles */}
                    <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-teal-400/10" />
                    <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border border-teal-400/10" />
                    <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
                </div>

                {/* Right side form */}
                <div className={ui.authFormPanel}>

                    <div className={ui.authMobileBrand}>
                        DRIVE<span className="text-teal-600">EASE</span>
                    </div>

                    <div>
                        <div className="mb-4 inline-flex rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold tracking-wide text-teal-700">
                            {isRegister ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
                        </div>

                        <h2 className={ui.authHeading}>
                            {isRegister ? 'Create Account' : 'Welcome Back!'}
                        </h2>

                        <p className={ui.authDescription}>
                            {isRegister
                                ? 'Join us today and start your journey with us.'
                                : 'Please enter your details to access your account.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>

                        {isRegister && (
                            <div className={ui.authField}>
                                <label className={ui.authLabel}>
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className={ui.authInput}
                                    placeholder="Enter your full name"
                                    autoComplete="name"
                                    required
                                />
                            </div>
                        )}

                        <div className={ui.authField}>
                            <label className={ui.authLabel}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={ui.authInput}
                                placeholder="example@email.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className={ui.authField}>
                            <label className={ui.authLabel}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={ui.authInput}
                                placeholder="Enter your password"
                                autoComplete={isRegister ? 'new-password' : 'current-password'}
                                minLength={8}
                                required
                            />
                        </div>

                        {isRegister && (
                            <>
                                <div className={ui.authField}>
                                    <label className={ui.authLabel}>
                                        Contact Number
                                    </label>
                                    <input
                                        type="text"
                                        value={contactNumber}
                                        onChange={(e) => setContactNumber(e.target.value)}
                                        className={ui.authInput}
                                        placeholder="Enter your contact number"
                                        autoComplete="tel"
                                        required
                                    />
                                </div>

                                <div className={ui.authField}>
                                    <label className={ui.authLabel}>
                                        Address
                                    </label>
                                    <textarea
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className={ui.authTextarea}
                                        placeholder="Enter your address"
                                        autoComplete="street-address"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {error && (
                            <div className={ui.authError}>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className={ui.authSuccess}>
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={ui.authButton}
                        >
                            {loading
                                ? 'Please Wait...'
                                : isRegister
                                    ? 'Create My Account →'
                                    : 'Login to Account →'}
                        </button>
                    </form>

                    <div className="mt-8 border-t border-slate-100 pt-6 text-center">
                        <p className="text-sm text-slate-500">
                            {isRegister
                                ? 'Already have an account?'
                                : "Don't have an account?"}

                            <button
                                type="button"
                                onClick={switchMode}
                                className={`ml-2 ${ui.authSwitch}`}
                            >
                                {isRegister ? 'Login' : 'Create Account'}
                            </button>
                        </p>
                    </div>

                    <p className="mt-8 text-center text-xs text-slate-400">
                        Secure access to your vehicle rental account.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login
