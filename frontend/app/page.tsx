import { redirect } from 'next/navigation'

export default function Home() {
  // Make gallery the home page
  redirect('/gallery')
}
