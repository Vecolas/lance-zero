import { redirect } from 'next/navigation'

export default async function FinalAliasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/endgames/${slug}`)
}
