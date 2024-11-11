import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      <div className="flex items-center space-x-3">
        <span className="text-xl font-bold" onClick={() => router.push('/')}>Stocked</span>
      </div>
      <w3m-button label="Login" balance="hide" />
    </nav>
  )
}