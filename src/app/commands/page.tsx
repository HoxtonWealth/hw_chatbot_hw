import { supabaseAdmin } from '@/lib/supabase'
import { CommandTable } from '@/components/commands/CommandTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppHeader } from '@/components/layout/AppHeader'

export const dynamic = 'force-dynamic'

async function getCommands() {
  const { data: commands, error } = await supabaseAdmin
    .from('custom_commands')
    .select('*')
    .order('is_builtin', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching commands:', error)
    return []
  }

  return commands || []
}

export default async function CommandsPage() {
  const commands = await getCommands()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <CommandTable commands={commands} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
