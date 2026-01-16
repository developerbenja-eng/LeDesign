import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-ledesign-panel border border-ledesign-border rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 bg-ledesign-bg border border-ledesign-border rounded-md focus:outline-none focus:border-ledesign-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 bg-ledesign-bg border border-ledesign-border rounded-md focus:outline-none focus:border-ledesign-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-ledesign-accent text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          <Link href="/" className="hover:text-ledesign-accent">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
