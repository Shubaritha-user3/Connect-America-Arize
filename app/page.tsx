import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/chat');  // This should be outside of JSX
  
  // This return is technically unreachable but Next.js expects it
  return null;
}